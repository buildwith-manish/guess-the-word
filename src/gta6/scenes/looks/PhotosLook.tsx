import React from 'react';
import {FrostCard} from '../../components';
import type {ShellContext} from '../../components';
import {colors, springAt, textStyle, u} from '../../system';

/**
 * PhotosLook (task 3c).
 *
 * A grid of tiles with name labels only (no real photos, no game art).
 * One tile is a heavily blurred silhouette; at reveal the blur snaps to
 * sharp and its name appears. Music questions show a silent (static,
 * unanimated) waveform instead of the silhouette.
 *
 * Every string and index comes from the item (q, options, answer). All
 * timing is read from the shell context (local design ticks), never
 * from constants of its own except the visual ones below.
 */

// Amber accent (iOS orange). Not in system.ts, so it lives here.
const AMBER = '#FF9F0A';
const AMBER_SOFT = 'rgba(255, 159, 10, 0.16)';

// Visual constants (reference units, scaled with u()).
const TILE_W = 440;
const TILE_H = 300;
const TILE_GAP = 28;
const COLUMNS = 2;
const LABEL_H = 72;
const BLUR_REF = 34; // heavy blur on the silhouette, in reference units
const ENTER_STAGGER = 4; // ticks between tiles
const QUESTION_MAX_W = 1300;

// Silhouette tile: generic head and shoulders, no likeness of anyone.
const Silhouette: React.FC<{blurPx: number}> = ({blurPx}) => (
  <svg
    viewBox="0 0 200 200"
    style={{
      position: 'absolute',
      inset: 0,
      width: '100%',
      height: '100%',
      filter: `blur(${blurPx}px)`,
    }}
  >
    <defs>
      <linearGradient id="photos-sil" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor={AMBER} stopOpacity={0.95} />
        <stop offset="1" stopColor={AMBER} stopOpacity={0.55} />
      </linearGradient>
    </defs>
    <circle cx={100} cy={78} r={38} fill="url(#photos-sil)" />
    <path
      d="M28 200 C28 140 68 120 100 120 C132 120 172 140 172 200 Z"
      fill="url(#photos-sil)"
    />
  </svg>
);

// Silent waveform: a fixed, deterministic bar shape. It does not animate
// and nothing in it depends on the frame except the blur.
const WAVE_BARS = 41;
const Waveform: React.FC<{blurPx: number}> = ({blurPx}) => {
  const bars = Array.from({length: WAVE_BARS}, (_, i) => {
    const a = Math.abs(Math.sin(i * 0.55));
    const b = Math.abs(Math.sin(i * 0.17 + 1));
    const edge = Math.sin((Math.PI * (i + 0.5)) / WAVE_BARS);
    return 6 + 74 * a * (0.35 + 0.65 * b) * (0.4 + 0.6 * edge);
  });
  return (
    <svg
      viewBox="0 0 200 100"
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        filter: `blur(${blurPx}px)`,
      }}
    >
      {bars.map((h, i) => (
        <rect
          key={i}
          x={8 + i * 4.6}
          y={50 - h / 2}
          width={3.2}
          height={h}
          rx={1.6}
          fill={AMBER}
          opacity={0.9}
        />
      ))}
    </svg>
  );
};

export type PhotosLookProps = {
  ctx: ShellContext;
  /** Music question: show the silent waveform instead of the silhouette. */
  music?: boolean;
};

export const PhotosLook: React.FC<PhotosLookProps> = ({ctx, music = false}) => {
  const {item, level, localFrame: frame, phases} = ctx;
  const enterBase = phases.read.from;
  const snapAt = phases.reveal.from;

  // 0 before the reveal, springs to 1 on the snap.
  const snap = springAt(frame, snapAt, 'snappy');
  const blurPx = u(BLUR_REF) * (1 - snap);

  const qIn = springAt(frame, enterBase, 'gentle');

  const tileW = u(TILE_W);
  const tileH = u(TILE_H);
  const gap = u(TILE_GAP);
  const labelH = u(LABEL_H);

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: u(44),
      }}
    >
      <div
        style={{
          ...textStyle('question'),
          color: colors.ink,
          maxWidth: u(QUESTION_MAX_W),
          textAlign: 'center',
          opacity: qIn,
          transform: `translateY(${(1 - qIn) * u(16)}px)`,
        }}
      >
        {item.q}
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${COLUMNS}, ${tileW}px)`,
          gap,
        }}
      >
        {item.options.map((name, i) => {
          const isSubject = i === item.answer;
          const enterAt = enterBase + 6 + i * ENTER_STAGGER;
          // The subject tile's name stays hidden until the snap.
          const nameIn = isSubject ? snap : 1;
          return (
            <FrostCard
              key={i}
              frame={frame}
              at={enterAt}
              level={level}
              width={tileW}
              height={tileH}
              padding={0}
            >
              <div
                style={{
                  position: 'relative',
                  width: '100%',
                  height: '100%',
                  overflow: 'hidden',
                  borderRadius: u(34),
                }}
              >
                {/* picture area */}
                <div
                  style={{
                    position: 'absolute',
                    left: 0,
                    right: 0,
                    top: 0,
                    bottom: labelH,
                    background: isSubject
                      ? `linear-gradient(160deg, ${AMBER_SOFT}, rgba(0,0,0,0.25))`
                      : 'linear-gradient(160deg, rgba(255,255,255,0.08), rgba(0,0,0,0.25))',
                    overflow: 'hidden',
                  }}
                >
                  {isSubject ? (
                    music ? (
                      <Waveform blurPx={blurPx} />
                    ) : (
                      <Silhouette blurPx={blurPx} />
                    )
                  ) : null}
                </div>

                {/* name label */}
                <div
                  style={{
                    position: 'absolute',
                    left: 0,
                    right: 0,
                    bottom: 0,
                    height: labelH,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: `0 ${u(20)}px`,
                    borderTop: `1px solid ${colors.hairline}`,
                    ...textStyle('choice'),
                    color: isSubject ? AMBER : colors.ink,
                    textAlign: 'center',
                    opacity: nameIn,
                    transform: `translateY(${(1 - nameIn) * u(10)}px)`,
                  }}
                >
                  {name}
                </div>

                {/* amber ring on the subject tile once revealed */}
                {isSubject ? (
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      borderRadius: u(34),
                      boxShadow: `inset 0 0 0 ${u(3)}px ${AMBER}`,
                      opacity: snap,
                      pointerEvents: 'none',
                    }}
                  />
                ) : null}
              </div>
            </FrostCard>
          );
        })}
      </div>
    </div>
  );
};

export default PhotosLook;
