import React from 'react';
import { partRanges } from '../timing';
import { PartScenes } from './PartScenes';

/** Part3: slots 41 to 50, the score scene and the outro. Ranges and offsets come from timing.ts `partRanges`. Composition: XMAS-P3. */
const part = partRanges[2];
export const part3Frames: number = part.renderFrames;
export const Part3: React.FC = () => <PartScenes part={part} />;
export default Part3;
