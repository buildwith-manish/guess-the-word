import React from 'react';
import { DroppedPin, PinLabel } from './pinParts';
import { PlainMap } from './PlainMap';
import { u } from '../system';

export type MapPinProps = {
  frame: number;
  /** Local frame the pin starts dropping. */
  at: number;
  /** Pin tip position as fractions (0..1) of the box. */
  x: number;
  y: number;
  /** Optional label (slides in at `at + 6`); the scene supplies the text. */
  label?: string;
  width?: number;
  height?: number;
};

/** A pin that drops on a plain map. Beats: pin lands about `at + 8`, ripple `at + 8` to `at + 26`, label from `at + 6`. */
export const MapPin: React.FC<MapPinProps> = ({ frame, at, x, y, label, width = 1100, height = 620 }) => (
  <PlainMap width={width} height={height}>
    <div style={{ position: 'absolute', left: u(width * x), top: u(height * y), width: 0, height: 0 }}>
      <DroppedPin frame={frame} at={at} />
    </div>
    {label ? (
      <div style={{ position: 'absolute', left: u(width * x + 50), top: u(height * y - 96) }}>
        <PinLabel text={label} frame={frame} at={at + 6} />
      </div>
    ) : null}
  </PlainMap>
);
