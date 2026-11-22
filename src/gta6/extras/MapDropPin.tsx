import React from 'react';
import { DroppedPin, PinLabel } from './pinParts';
import { PlainMap } from './PlainMap';
import { u } from '../system';

export type MapDropPinProps = {
  frame: number;
  /** Local frame the first pin starts dropping. */
  at: number;
  /** The four labels (scene supplies them), left to right. */
  labels: string[];
  /** Index of the pin that gets knocked off. */
  wrongIndex: number;
  /** Local frame the wrong pin is knocked off (wiggle 6 ticks, then falls). */
  dropAt: number;
  /** Ticks between the pins landing. */
  stagger?: number;
  width?: number;
  height?: number;
};

/** Pin tip positions as fractions of the box (staggered so labels do not collide). */
const SPOTS: ReadonlyArray<readonly [number, number]> = [
  [0.14, 0.52],
  [0.38, 0.32],
  [0.62, 0.56],
  [0.86, 0.36],
];

/**
 * Four pins on a plain map land one after another; at `dropAt` the wrong one wiggles and falls off the map while its
 * label fades. The other three stay. Pure function of frame, at, dropAt.
 */
export const MapDropPin: React.FC<MapDropPinProps> = ({ frame, at, labels, wrongIndex, dropAt, stagger = 6, width = 1500, height = 700 }) => (
  <PlainMap width={width} height={height}>
    {labels.slice(0, 4).map((text, i) => {
      const [fx, fy] = SPOTS[i];
      const landAt = at + i * stagger;
      const wrong = i === wrongIndex;
      return (
        <React.Fragment key={i}>
          <div style={{ position: 'absolute', left: u(width * fx), top: u(height * fy), width: 0, height: 0 }}>
            <DroppedPin frame={frame} at={landAt} fallAt={wrong ? dropAt : undefined} />
          </div>
          <div style={{ position: 'absolute', left: u(width * fx), top: u(height * fy + 20), transform: 'translateX(-50%)' }}>
            <PinLabel text={text} frame={frame} at={landAt + 6} outAt={wrong ? dropAt + 6 : undefined} />
          </div>
        </React.Fragment>
      );
    })}
  </PlainMap>
);
