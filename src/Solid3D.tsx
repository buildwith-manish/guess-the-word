/**
 * Solid3D.tsx — the three small 3D accents that sit next to the 3D answer card (Card3D.tsx):
 *
 *   Title3D          the level name on the level cards ("EASY / MEDIUM / HARD") as bevelled letters
 *   RankBadge3D      a gold crown for the top rank (LEGEND) on the scoreboard
 *   SubscribeButton3D the red subscribe button on the end screen
 *
 * They are deliberately the only other 3D in the video: each shows up a handful of times, so the
 * render cost stays tiny, while the clue, timer and text stay flat and readable. Like Card3D they are
 * pure functions of the frame (nothing keeps state), so the timeline scrubs both ways and renders are
 * deterministic. World units are screen pixels at the z = 0 plane.
 */
import React from 'react';
import { ThreeCanvas } from '@remotion/three';
import { ExtrudeGeometry, Shape } from 'three';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';
import helvetikerBold from 'three/examples/fonts/helvetiker_bold.typeface.json';
import { bounceEase, clamp01, cssEaseInOut, htmlEase, ms } from './anim';

const FOV = 30;
const cameraZ = (h: number) => h / 2 / Math.tan((FOV / 2) * (Math.PI / 180));

const font = new FontLoader().parse(helvetikerBold as any);

const roundedRect = (w: number, h: number, r: number): Shape => {
  const s = new Shape();
  const x = -w / 2;
  const y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.absarc(x + w - r, y + r, r, -Math.PI / 2, 0, false);
  s.lineTo(x + w, y + h - r);
  s.absarc(x + w - r, y + h - r, r, 0, Math.PI / 2, false);
  s.lineTo(x + r, y + h);
  s.absarc(x + r, y + h - r, r, Math.PI / 2, Math.PI, false);
  s.lineTo(x, y + r);
  s.absarc(x + r, y + r, r, Math.PI, Math.PI * 1.5, false);
  return s;
};

type Glyph = { geometry: TextGeometry; x: number };

/** One TextGeometry per letter (so letters can animate on their own), centred on its own origin. */
const layoutText = (text: string, size: number, depth: number, bevel: number): { glyphs: Glyph[]; total: number } => {
  const gap = size * 0.06;
  const items: { geometry: TextGeometry | null; w: number }[] = [];
  for (const ch of Array.from(text.toUpperCase())) {
    if (ch.trim() === '') {
      items.push({ geometry: null, w: size * 0.35 });
      continue;
    }
    const geometry = new TextGeometry(ch, {
      font,
      size,
      depth,
      height: depth, // three >= r163 renamed `height` to `depth`; pass both so either version extrudes
      curveSegments: 8,
      bevelEnabled: true,
      bevelThickness: bevel,
      bevelSize: bevel * 0.6,
      bevelSegments: 3,
    } as any);
    geometry.computeBoundingBox();
    const bb = geometry.boundingBox!;
    const w = bb.max.x - bb.min.x;
    // centre horizontally and in depth; keep the baseline at y = 0
    geometry.translate(-(bb.min.x + w / 2), -size * 0.36, -depth / 2);
    items.push({ geometry, w });
  }
  const total = items.reduce((sum, it) => sum + it.w, 0) + gap * Math.max(0, items.length - 1);
  const glyphs: Glyph[] = [];
  let cursor = -total / 2;
  for (const it of items) {
    if (it.geometry) glyphs.push({ geometry: it.geometry, x: cursor + it.w / 2 });
    cursor += it.w + gap;
  }
  return { glyphs, total };
};

const Stage: React.FC<{
  width: number;
  height: number;
  opacity?: number;
  shadow?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}> = ({ width, height, opacity = 1, shadow, style, children }) => (
  <div style={{ position: 'relative', width, height, opacity, filter: shadow, pointerEvents: 'none', ...style }}>
    <ThreeCanvas
      width={width}
      height={height}
      flat
      gl={{ antialias: true, alpha: true }}
      camera={{ fov: FOV, position: [0, 0, cameraZ(height)], near: 10, far: 8000 }}
    >
      {children}
    </ThreeCanvas>
  </div>
);

const Lights: React.FC<{ sweep?: number }> = ({ sweep }) => (
  <>
    <ambientLight intensity={1.5} />
    <directionalLight position={[-700, 900, 900]} intensity={3.2} color="#fff4d6" />
    <directionalLight position={[900, -300, 700]} intensity={1.1} color="#8fd8ff" />
    {sweep !== undefined && sweep > 0 && sweep < 1 ? (
      <pointLight position={[-1300 + 2600 * cssEaseInOut(sweep), 120, 520]} intensity={16} decay={0} color="#ffffff" />
    ) : null}
  </>
);

/* ------------------------------------------------------------------ level title */

const TitleScene: React.FC<{ frame: number; start: number; text: string; color: string; width: number; height: number }> = ({
  frame,
  start,
  text,
  color,
  width,
  height,
}) => {
  const size = height * 0.62;
  const depth = size * 0.2;
  const { glyphs, total } = React.useMemo(() => layoutText(text, size, depth, size * 0.035), [text, size, depth]);
  const fit = Math.min(1, (width * 0.94) / Math.max(1, total));
  const f = frame - start;
  // a slow sway gives the letters light depth without ever hiding them
  const idle = clamp01((f - ms(500)) / ms(500));
  const swayY = 0.16 * Math.sin((2 * Math.PI * f) / ms(3200)) * idle;
  const swayX = 0.05 * Math.sin((2 * Math.PI * f) / ms(4100) + 1) * idle;
  const sweep = (f - ms(520)) / ms(800);

  return (
    <>
      <Lights sweep={sweep} />
      <group rotation={[swayX, swayY, 0]} scale={fit}>
        {glyphs.map((g, i) => {
          const lf = f - i * ms(55);
          if (lf < 0) return null;
          const lt = clamp01(lf / ms(520));
          const land = htmlEase(lt);
          const settle = bounceEase(lt);
          return (
            <mesh
              key={i}
              geometry={g.geometry}
              position={[g.x, -200 * (1 - land), 260 * (1 - land)]}
              rotation={[-(1 - settle) * Math.PI * 0.55, 0, 0]}
              scale={0.4 + 0.6 * land}
            >
              <meshStandardMaterial color={color} metalness={0.45} roughness={0.32} emissive={color} emissiveIntensity={0.22} />
            </mesh>
          );
        })}
      </group>
    </>
  );
};

export const Title3D: React.FC<{
  frame: number;
  start?: number;
  text: string;
  color: string;
  width: number;
  height: number;
  opacity?: number;
}> = ({ frame, start = 0, text, color, width, height, opacity = 1 }) => (
  <Stage width={width} height={height} opacity={opacity} shadow={`drop-shadow(0 ${height * 0.06}px ${height * 0.12}px ${color}77)`}>
    <TitleScene frame={frame} start={start} text={text} color={color} width={width} height={height} />
  </Stage>
);

/* ------------------------------------------------------------------ rank badge (crown) */

const crownShape = (): Shape => {
  const s = new Shape();
  s.moveTo(-50, -32);
  s.lineTo(50, -32);
  s.lineTo(60, 30);
  s.lineTo(26, 2);
  s.lineTo(0, 42);
  s.lineTo(-26, 2);
  s.lineTo(-60, 30);
  s.closePath();
  return s;
};

const CrownScene: React.FC<{ frame: number; start: number; flashAt: number; size: number }> = ({ frame, start, flashAt, size }) => {
  const geo = React.useMemo(() => {
    const g = new ExtrudeGeometry(crownShape(), {
      depth: 26,
      bevelEnabled: true,
      bevelThickness: 7,
      bevelSize: 6,
      bevelSegments: 4,
    });
    g.translate(0, 0, -13);
    return g;
  }, []);
  const f = frame - start;
  const t = clamp01(f / ms(700));
  const settle = bounceEase(t);
  const land = htmlEase(t);
  // spin in once, then a gentle turn so the lighting keeps moving across the bevels
  const spin = (1 - settle) * Math.PI * 2 + 0.55 * Math.sin((2 * Math.PI * f) / ms(3000));
  const scale = (size / 150) * (0.3 + 0.7 * land);
  const sweep = (frame - flashAt) / ms(700);
  const tips: [number, number][] = [[60, 30], [0, 42], [-60, 30]];

  return (
    <>
      <Lights sweep={sweep} />
      <group rotation={[0.08, spin, 0]} scale={scale}>
        <mesh geometry={geo}>
          <meshStandardMaterial color="#FFC93C" metalness={0.6} roughness={0.28} emissive="#FFB020" emissiveIntensity={0.25} />
        </mesh>
        {tips.map(([x, y], i) => (
          <mesh key={i} position={[x, y + 8, 0]}>
            <sphereGeometry args={[11, 20, 20]} />
            <meshStandardMaterial color="#FFE9A8" metalness={0.5} roughness={0.2} emissive="#FFD76A" emissiveIntensity={0.35} />
          </mesh>
        ))}
      </group>
    </>
  );
};

export const RankBadge3D: React.FC<{ frame: number; start: number; flashAt: number; size: number }> = ({
  frame,
  start,
  flashAt,
  size,
}) => (
  <Stage width={size} height={size} shadow="drop-shadow(0 6px 14px rgba(255,176,32,0.55))">
    <CrownScene frame={frame} start={start} flashAt={flashAt} size={size} />
  </Stage>
);

/* ------------------------------------------------------------------ subscribe button */

const ButtonScene: React.FC<{ frame: number; start: number; label: string; width: number; height: number }> = ({
  frame,
  start,
  label,
  width,
  height,
}) => {
  const bw = width * 0.9;
  const bh = height * 0.66;
  const depth = bh * 0.34;
  const bevel = bh * 0.07;
  const pill = React.useMemo(() => {
    const g = new ExtrudeGeometry(roundedRect(bw, bh, bh / 2), {
      depth,
      bevelEnabled: true,
      bevelThickness: bevel,
      bevelSize: bevel,
      bevelSegments: 4,
      curveSegments: 20,
    });
    g.translate(0, 0, -depth / 2);
    return g;
  }, [bw, bh, depth, bevel]);
  const textSize = bh * 0.34;
  const { glyphs, total } = React.useMemo(() => layoutText(label, textSize, depth * 0.35, textSize * 0.06), [label, textSize, depth]);
  const fit = Math.min(1, (bw * 0.78) / Math.max(1, total));

  const f = frame - start;
  const t = clamp01(f / ms(650));
  const pop = bounceEase(t);
  const land = htmlEase(t);
  // a "press" every couple of seconds draws the eye to the button, then it settles back
  const cyc = (f - ms(1200)) % ms(2400);
  const press = f > ms(1200) ? Math.sin(Math.PI * clamp01(cyc / ms(420))) * (cyc < ms(420) ? 1 : 0) : 0;
  const idle = clamp01((f - ms(600)) / ms(500));
  const swayY = 0.14 * Math.sin((2 * Math.PI * f) / ms(3400)) * idle;
  const swayX = 0.05 * Math.sin((2 * Math.PI * f) / ms(4200) + 1) * idle;
  const sweep = (f - ms(450)) / ms(800);
  const scale = (0.5 + 0.5 * pop) * (1 - 0.05 * press);

  return (
    <>
      <Lights sweep={sweep} />
      <group
        position={[0, -120 * (1 - land) - bh * 0.03 * press, -bh * 0.1 * press]}
        rotation={[swayX - 0.12 * press, swayY + (1 - pop) * -0.9, 0]}
        scale={scale}
      >
        <mesh geometry={pill}>
          <meshStandardMaterial color="#FF1F45" metalness={0.25} roughness={0.32} emissive="#FF1F45" emissiveIntensity={0.3} />
        </mesh>
        <group scale={fit} position={[0, 0, depth / 2 + bevel + 2]}>
          {glyphs.map((g, i) => (
            <mesh key={i} geometry={g.geometry} position={[g.x, 0, 0]}>
              <meshStandardMaterial color="#FFFFFF" metalness={0.1} roughness={0.3} emissive="#FFFFFF" emissiveIntensity={0.28} />
            </mesh>
          ))}
        </group>
      </group>
    </>
  );
};

export const SubscribeButton3D: React.FC<{
  frame: number;
  start: number;
  label: string;
  width: number;
  height: number;
}> = ({ frame, start, label, width, height }) => (
  <Stage width={width} height={height} shadow="drop-shadow(0 14px 26px rgba(0,0,0,0.5))">
    <ButtonScene frame={frame} start={start} label={label} width={width} height={height} />
  </Stage>
);
