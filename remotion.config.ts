import os from 'os';
import { Config } from '@remotion/cli/config';

// Native 2560x1440 @ 60 fps (settings.json): the composition is rendered 1:1, no output scale.
// Every animated value is derived from the current frame, so renders are frame-perfect and
// identical across runs.
Config.setVideoImageFormat('jpeg');
Config.setJpegQuality(95);
Config.setCodec('h264');
Config.setPixelFormat('yuv420p');
Config.setCrf(18); // visually lossless after YouTube re-encodes; much smaller than 16
Config.setOverwriteOutput(true);
Config.setConcurrency(
  Number(process.env.GTW_CONCURRENCY) || Math.max(1, Math.min(2, os.cpus().length)),
);
Config.setChromiumOpenGlRenderer('swangle');
Config.setDelayRenderTimeoutInMilliseconds(120000);
