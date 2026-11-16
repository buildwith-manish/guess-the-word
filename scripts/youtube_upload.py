#!/usr/bin/env python3
"""Upload one video to YouTube using a stored OAuth refresh token. Reads everything from env vars."""
import os, sys
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request
from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload
from googleapiclient.errors import HttpError


def need(name):
    v = os.environ.get(name, '')
    if not v:
        sys.exit(f"::error::missing {name} (add it as a repository secret)" if name.startswith('YT_C') or name == 'YT_REFRESH_TOKEN' else f"::error::missing {name}")
    return v


import glob

path = need('VIDEO_FILE')
if not os.path.isfile(path):
    # The artifact's file name may differ from video_name: use the only .mp4 inside it if there is exactly one.
    folder = os.path.dirname(path) or '.'
    found = sorted(glob.glob(os.path.join(folder, '**', '*.mp4'), recursive=True))
    if len(found) == 1:
        print(f"::warning::{path} not found; using the only .mp4 in the artifact: {found[0]}")
        path = found[0]
    else:
        listing = ', '.join(sorted(os.listdir(folder))) if os.path.isdir(folder) else '(folder missing)'
        sys.exit(f"::error::{path} not found in the downloaded artifact. Files present: {listing}")

title = need('YT_TITLE')
description = os.environ.get('YT_DESCRIPTION', '').replace('\\n', '\n')
tags = [t.strip() for t in os.environ.get('YT_KEYWORDS', '').split(',') if t.strip()]
if len(title) > 100:
    sys.exit("::error::title is over 100 characters")
if len(description) > 5000:
    sys.exit("::error::description is over 5000 characters")
if sum(len(t) + 1 for t in tags) > 480:
    sys.exit("::error::keywords are too long (YouTube allows about 500 characters in total)")

import json


def parse_client():
    """Return (client_id, client_secret). YT_CLIENT_SECRET may be the whole client_secret.json
    (contains the client ID) or just the plain secret string plus a separate YT_CLIENT_ID."""
    raw = need('YT_CLIENT_SECRET').strip()
    if raw.startswith('{'):
        try:
            data = json.loads(raw)
        except json.JSONDecodeError:
            sys.exit("::error::YT_CLIENT_SECRET looks like JSON but is not valid JSON - paste the full file again")
        block = data.get('installed') or data.get('web') or data
        cid, sec = block.get('client_id'), block.get('client_secret')
        if not cid or not sec:
            sys.exit("::error::YT_CLIENT_SECRET JSON has no client_id / client_secret")
        return cid, sec
    return need('YT_CLIENT_ID'), raw


def parse_refresh():
    raw = need('YT_REFRESH_TOKEN').strip()
    if raw.startswith('{'):  # whole token.json pasted
        raw = json.loads(raw).get('refresh_token', '')
        if not raw:
            sys.exit("::error::YT_REFRESH_TOKEN JSON has no refresh_token")
    return raw


client_id, client_secret = parse_client()
creds = Credentials(
    token=None,
    refresh_token=parse_refresh(),
    client_id=client_id,
    client_secret=client_secret,
    token_uri='https://oauth2.googleapis.com/token',
    scopes=['https://www.googleapis.com/auth/youtube.upload'],
)
try:
    creds.refresh(Request())
except Exception as e:
    msg = str(e)
    hint = ''
    if 'invalid_grant' in msg:
        hint = (' The refresh token was rejected (expired or revoked). If the Google OAuth consent screen is in Testing mode, '
                'refresh tokens expire after 7 days: set the app to In production, create a new refresh token and update '
                'the YOUTUBE_REFRESH_TOKEN secret.')
    elif 'invalid_client' in msg or 'unauthorized_client' in msg:
        hint = ' The client ID/secret do not match the client that created the refresh token.'
    sys.exit(f"::error::Could not get a YouTube access token: {msg}.{hint}")
yt = build('youtube', 'v3', credentials=creds, cache_discovery=False)

body = {
    'snippet': {
        'title': title,
        'description': description,
        'tags': tags,
        'categoryId': os.environ.get('YT_CATEGORY', '24'),
    },
    'status': {
        'privacyStatus': os.environ.get('YT_PRIVACY', 'private'),
        'selfDeclaredMadeForKids': os.environ.get('YT_KIDS', 'no') == 'yes',
    },
}

size_mb = os.path.getsize(path) / 1e6
print(f"Uploading {path} ({size_mb:.0f} MB) as '{title}' [{body['status']['privacyStatus']}]")
media = MediaFileUpload(path, mimetype='video/mp4', chunksize=64 * 1024 * 1024, resumable=True)
req = yt.videos().insert(part='snippet,status', body=body, media_body=media)

resp = None
try:
    while resp is None:
        status, resp = req.next_chunk()
        if status:
            print(f"  {int(status.progress() * 100)}%")
except HttpError as e:
    sys.exit(f"::error::YouTube rejected the upload: {e}")
except Exception as e:
    sys.exit(f"::error::Upload failed: {type(e).__name__}: {e}")

vid = resp['id']
url = f"https://youtu.be/{vid}"
print(f"Done: {url}")
with open(os.environ.get('GITHUB_STEP_SUMMARY', os.devnull), 'a') as f:
    f.write(f"### Uploaded\n\n[{title}]({url}) - {body['status']['privacyStatus']}\n")
