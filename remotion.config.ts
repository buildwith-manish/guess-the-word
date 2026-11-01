import { Config } from '@remotion/cli/config';

// 1920x1080 landscape, 30 fps. Every animated value is derived from useCurrentFrame(),
// so renders are frame-perfect and identical across runs.
Config.setVideoImageFormat('jpeg');
Config.setJpegQuality(92);
Config.setOverwriteOutput(true);
Config.setConcurrency(2);
Config.setChromiumOpenGlRenderer('swangle');
Config.setDelayRenderTimeoutInMilliseconds(120000);
