import os from 'os';
import { Config } from '@remotion/cli/config';
import settings from './settings.json';

// Authored on a 1920x1080 / 30 fps design grid; OUTPUT is 2560x1440 @ 60 fps.
//  - 60 fps: the composition runs at settings.output.fps and src/clock.ts maps it back to the
//    30 fps design frames, so every animation is sampled twice as often with identical timing.
//  - 1440p: Remotion's output scale (2560 / 1920 = 4/3) re-renders the same layout at a higher
//    device-pixel ratio, so text and vector art stay crisp and nothing is re-laid-out.
// Every animated value is derived from the current frame, so renders are frame-perfect and
// identical across runs.
Config.setVideoImageFormat('jpeg');
Config.setJpegQuality(95);
Config.setScale(settings.output.width / settings.width);
Config.setCodec('h264');
Config.setPixelFormat('yuv420p');
Config.setCrf(16); // high quality for 1440p60 (lower = better/larger)
Config.setOverwriteOutput(true);
Config.setConcurrency(
  Number(process.env.GTW_CONCURRENCY) || Math.max(1, Math.min(2, os.cpus().length)),
);
Config.setChromiumOpenGlRenderer('swangle');
Config.setDelayRenderTimeoutInMilliseconds(120000);
