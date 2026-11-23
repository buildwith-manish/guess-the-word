import React from 'react';
import { partRanges } from '../timing';
import { PartScenes } from './PartScenes';

/** Part1: Hook, then slots 1 to 20. Ranges and offsets come from timing.ts `partRanges`. Composition: XMAS-P1. */
const part = partRanges[0];
export const part1Frames: number = part.renderFrames;
export const Part1: React.FC = () => <PartScenes part={part} />;
export default Part1;
