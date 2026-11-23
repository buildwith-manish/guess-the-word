import React from 'react';
import { partRanges } from '../timing';
import { PartScenes } from './PartScenes';

/** Part2: slots 21 to 40. Ranges and offsets come from timing.ts `partRanges`. Composition: XMAS-P2. */
const part = partRanges[1];
export const part2Frames: number = part.renderFrames;
export const Part2: React.FC = () => <PartScenes part={part} />;
export default Part2;
