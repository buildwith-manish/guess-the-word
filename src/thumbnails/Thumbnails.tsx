import React from 'react';
import { AbsoluteFill } from 'remotion';
import { Backdrop, Chip, H, Headline, Hero, SafeZone, THEMES, W } from './kit';

/**
 * Three premium thumbnails for "Guess the Brand: Pixelated" (1280x720).
 *
 *   ThumbZero    "ZERO WRONG?"   one hero product, half pixels / half sharp   (challenge + curiosity gap)
 *   ThumbLadder  "46/46?"        blurry -> sharp trio, the video's resolution ladder (score hook)
 *   ThumbEasy    "TOO EASY?"     mascot lens split through the sunglasses     (ego challenge)
 *
 * Props: showSafeZone draws YouTube's duration badge so you can see nothing important is under it.
 * Render:  npx remotion still src/index.ts ThumbZero out/thumb-zero.png
 */
type P = { showSafeZone?: boolean };

const Frame: React.FC<React.PropsWithChildren<P>> = ({ children, showSafeZone }) => (
  <AbsoluteFill style={{ width: W, height: H, background: '#000', overflow: 'hidden', fontFamily: 'Poppins, sans-serif' }}>
    {children}
    {showSafeZone ? <SafeZone /> : null}
  </AbsoluteFill>
);

const Row: React.FC<React.PropsWithChildren<{ left: number; top: number; gap?: number }>> = ({ left, top, gap = 18, children }) => (
  <div style={{ position: 'absolute', left, top, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap }}>{children}</div>
);

/* ------------------------------------------------------------------ 1 */
export const ThumbZero: React.FC<P> = ({ showSafeZone }) => (
  <Frame showSafeZone={showSafeZone}>
    <Backdrop theme={THEMES.blue} focus={{ x: 930, y: 360 }} seed={11} />
    <Hero
      src="thumb/cut-28.png"
      w={494}
      h={655}
      x={690}
      y={46}
      rotate={5}
      mode="split"
      cells={11}
      seam={{ top: 0.7, bottom: 0.34 }}
      accent="#34e4ff"
      halo="#ff3b3b"
      sparkColors={['#ff3b3b', '#ffd21f', '#ffffff', '#ff8a00']}
      seed={3}
    />
    <Headline size={150} fill="white" style={{ left: 54, top: 30 }}>
      ZERO
    </Headline>
    <Headline size={236} fill="gold" style={{ left: 44, top: 214 }}>
      WRONG?
    </Headline>
    <Row left={60} top={540}>
      <div style={{ display: 'flex', gap: 18, position: 'relative' }}>
        <Chip tone="glass" size={42} style={{ position: 'relative' }}>
          46 brands
        </Chip>
        <Chip tone="gold" size={42} style={{ position: 'relative' }}>
          <span style={{ fontFamily: 'Noto Color Emoji' }}>👑</span> legend
        </Chip>
      </div>
    </Row>
  </Frame>
);

/* ------------------------------------------------------------------ 2 */
export const ThumbLadder: React.FC<P> = ({ showSafeZone }) => (
  <Frame showSafeZone={showSafeZone}>
    <Backdrop theme={THEMES.purple} focus={{ x: 640, y: 470 }} seed={23} />
    <Hero src="thumb/cut-36.png" w={400} h={315} x={111} y={350} rotate={-4} mode="pixel" cells={7} accent="#ff58dc" halo="#2f6bff" seed={5} />
    <Hero
      src="thumb/cut-31.png"
      w={290}
      h={396}
      x={545}
      y={269}
      mode="split"
      cells={12}
      seam={{ top: 0.72, bottom: 0.3 }}
      accent="#ff58dc"
      halo="#ff8a00"
      sparkColors={['#ff8a00', '#ffd21f', '#ffffff']}
      seed={7}
    />
    <Hero src="thumb/cut-40.png" w={300} h={394} x={869} y={271} rotate={3} mode="sharp" accent="#ff58dc" halo="#ff2d2d" seed={9} />
    {/* progression chevrons */}
    {[528, 852].map((cx) => (
      <svg key={cx} width={46} height={56} viewBox="0 0 46 56" style={{ position: 'absolute', left: cx - 23, top: 440, filter: 'drop-shadow(0 0 12px #ff58dc)' }}>
        <path d="M4 6 L22 28 L4 50 M24 6 L42 28 L24 50" fill="none" stroke="#fff" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ))}
    <Headline size={206} fill="gold" style={{ left: 0, width: W, top: 24, display: 'flex', justifyContent: 'center' }}>
      46/46?
    </Headline>
    <Chip tone="glass" size={30} tilt={-5} style={{ left: 36, top: 198 }}>
      46 brands
    </Chip>
    <Chip tone="gold" size={30} tilt={4} style={{ right: 30, top: 196 }}>
      only legends <span style={{ fontFamily: 'Noto Color Emoji' }}>👑</span>
    </Chip>
  </Frame>
);

/* ------------------------------------------------------------------ 3 */
export const ThumbEasy: React.FC<P> = ({ showSafeZone }) => {
  const D = 600;
  const lx = 650;
  const ly = 60;
  return (
    <Frame showSafeZone={showSafeZone}>
      <Backdrop theme={THEMES.teal} focus={{ x: lx + D / 2, y: ly + D / 2 }} seed={37} />
      {/* gold ring + glow behind the lens */}
      <div
        style={{
          position: 'absolute',
          left: lx - 16,
          top: ly - 16,
          width: D + 32,
          height: D + 32,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #fff6b0 0%, #ffc21a 45%, #ff7a00 100%)',
          boxShadow: '0 0 0 7px #061c24, 0 0 80px rgba(255,190,50,0.55), 0 30px 60px rgba(0,0,0,0.6)',
        }}
      />
      <Hero
        src="pixel-brands/31.jpg"
        w={D}
        h={D}
        x={lx}
        y={ly}
        crop={[0.348, 0.27, 0.34, 0.34]}
        round
        alphaMask={false}
        floorShadow={false}
        mode="split"
        cells={13}
        seam={{ top: 0.64, bottom: 0.36 }}
        accent="#7bfff0"
        halo="#ff7a00"
        sparkColors={['#ff8a00', '#ffd21f', '#ffffff', '#17d6c6']}
        seed={13}
      />
      {/* target on the sunglasses */}
      <div
        style={{
          position: 'absolute',
          left: lx + 132,
          top: ly + 214,
          width: 336,
          height: 168,
          borderRadius: '50%',
          border: '13px solid #ff1f3d',
          boxShadow: '0 0 0 5px #fff, 0 0 32px 4px #ff1f3d, inset 0 0 0 4px rgba(255,255,255,0.85)',
          transform: 'rotate(-6deg)',
        }}
      />
      <Headline size={170} fill="white" style={{ left: 54, top: 38 }}>
        TOO
      </Headline>
      <Headline size={232} fill="gold" style={{ left: 44, top: 252 }}>
        EASY?
      </Headline>
      <Row left={58} top={540}>
        <div style={{ display: 'flex', gap: 18, position: 'relative' }}>
          <Chip tone="glass" size={42} style={{ position: 'relative' }}>
            46 brands
          </Chip>
        </div>
        <Chip tone="gold" size={36} style={{ position: 'relative' }}>
          <span style={{ fontFamily: 'Noto Color Emoji' }}>👑</span> 0 wrong = legend
        </Chip>
      </Row>
    </Frame>
  );
};
