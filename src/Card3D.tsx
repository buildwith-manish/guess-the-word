/**
 * Card3D.tsx — the answer card as a real 3D object (Remotion + @remotion/three + React Three Fiber).
 *
 *   - a rounded gold frame (bevelled extrusion) carrying the photo on its face, lit by real lights
 *   - the card spins in from its back, overshoots, settles, then keeps a slow 3D sway
 *   - a moving point light sweeps across the glossy face as it lands (replaces the 2D sheen)
 *   - the answer word floats in front of the card as extruded, bevelled 3D letters that
 *     tumble up one by one
 *
 * Like every scene in this project it is a pure function of the frame: nothing keeps state, so the
 * timeline still scrubs both ways and renders are deterministic. World units are screen pixels at
 * the z = 0 plane (camera distance is derived from the canvas height and the field of view).
 */
import React from 'react';
import { delayRender, continueRender } from 'remotion';
import { ThreeCanvas } from '@remotion/three';
import { useLoader } from '@react-three/fiber';
import {
  ExtrudeGeometry,
  Shape,
  ShapeGeometry,
  SRGBColorSpace,
  TextureLoader,
  type Texture,
} from 'three';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';
import helvetikerBold from 'three/examples/fonts/helvetiker_bold.typeface.json';
import { bounceEase, clamp01, cssEaseIn, cssEaseInOut, cssEaseOut, htmlEase, ms } from './anim';
import { S } from './style';
import { imageSrc } from './assets';

const CARD_W = S.resultImageW;
const CARD_H = S.resultH;
const FRAME_PAD = 28; // gold frame thickness around the photo
const FRAME_DEPTH = 28; // extrusion depth of the frame
const BEVEL = 8;
const FACE_Z = FRAME_DEPTH / 2 + BEVEL + 1; // photo plane sits just in front of the frame

/** The canvas is a little bigger than the card so the spin, the sway and the letters never clip. */
export const CARD3D_CANVAS_W = S.resultW + 100;
export const CARD3D_CANVAS_H = S.resultH + 156;

const FOV = 30;
const CAMERA_Z = CARD3D_CANVAS_H / 2 / Math.tan((FOV / 2) * (Math.PI / 180));

const TEXT_SIZE = 170;
const TEXT_DEPTH = 46;
const TEXT_MAX_W = CARD_W * 0.88;
const TEXT_BASELINE = -CARD_H / 2 + 64; // letters sit across the lower part of the photo

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

/** Holds the frame open while the photo texture loads, so a frame is never rendered without it. */
const WaitForTexture: React.FC = () => {
  React.useEffect(() => {
    const handle = delayRender('Loading the 3D answer card texture');
    return () => continueRender(handle);
  }, []);
  return null;
};

type LetterGeo = { geometry: TextGeometry; x: number };

/** One TextGeometry per letter, centred on its own origin, laid out left to right. */
const buildLetters = (word: string): { letters: LetterGeo[]; fit: number } => {
  const font = new FontLoader().parse(helvetikerBold as any);
  const gap = TEXT_SIZE * 0.07;
  const items: { geometry: TextGeometry; w: number }[] = [];
  for (const ch of Array.from(word.toUpperCase())) {
    if (ch.trim() === '') {
      items.push({ geometry: null as unknown as TextGeometry, w: TEXT_SIZE * 0.4 });
      continue;
    }
    const geometry = new TextGeometry(ch, {
      font,
      size: TEXT_SIZE,
      // three >= r163 renamed `height` to `depth`; pass both so either version extrudes
      depth: TEXT_DEPTH,
      height: TEXT_DEPTH,
      curveSegments: 8,
      bevelEnabled: true,
      bevelThickness: 7,
      bevelSize: 4,
      bevelSegments: 3,
    } as any);
    geometry.computeBoundingBox();
    const bb = geometry.boundingBox!;
    const w = bb.max.x - bb.min.x;
    geometry.translate(-(bb.min.x + w / 2), 0, -TEXT_DEPTH / 2);
    items.push({ geometry, w });
  }
  const total = items.reduce((sum, it) => sum + it.w, 0) + gap * Math.max(0, items.length - 1);
  const letters: LetterGeo[] = [];
  let cursor = -total / 2;
  for (const it of items) {
    if (it.geometry) letters.push({ geometry: it.geometry, x: cursor + it.w / 2 });
    cursor += it.w + gap;
  }
  return { letters, fit: Math.min(1, TEXT_MAX_W / Math.max(1, total)) };
};

const Scene: React.FC<{
  frame: number;
  start: number;
  exit: number;
  index: number;
  word: string;
}> = ({ frame, start, exit, index, word }) => {
  const texture = useLoader(TextureLoader, imageSrc(index)) as Texture;

  // ---- geometry (built once per card) ----
  const frameGeo = React.useMemo(() => {
    const g = new ExtrudeGeometry(roundedRect(CARD_W + FRAME_PAD * 2, CARD_H + FRAME_PAD * 2, 56), {
      depth: FRAME_DEPTH,
      bevelEnabled: true,
      bevelThickness: BEVEL,
      bevelSize: BEVEL,
      bevelSegments: 4,
      curveSegments: 16,
    });
    g.translate(0, 0, -FRAME_DEPTH / 2);
    return g;
  }, []);

  const faceGeo = React.useMemo(() => {
    const g = new ShapeGeometry(roundedRect(CARD_W, CARD_H, 34), 16);
    // ShapeGeometry UVs are raw positions: normalise them to 0..1 across the photo
    const pos = g.attributes.position;
    const uv = g.attributes.uv;
    for (let i = 0; i < pos.count; i++) {
      uv.setXY(i, (pos.getX(i) + CARD_W / 2) / CARD_W, (pos.getY(i) + CARD_H / 2) / CARD_H);
    }
    uv.needsUpdate = true;
    return g;
  }, []);

  const { letters, fit } = React.useMemo(() => buildLetters(word), [word]);

  // ---- timeline ----
  const f = frame - start;
  const t = clamp01(f / ms(900));
  const land = htmlEase(t);
  const settle = bounceEase(t); // overshoots a little, then settles
  const idleRamp = clamp01((f - ms(700)) / ms(500));
  const kb = cssEaseOut(clamp01(f / Math.max(1, exit - start))); // slow push-in while the card is up
  const eo = cssEaseIn(clamp01((frame - exit) / ms(380))); // exit

  const swayY = 0.1 * Math.sin((2 * Math.PI * f) / ms(3600)) * idleRamp;
  const swayX = 0.045 * Math.sin((2 * Math.PI * f) / ms(4400) + 1) * idleRamp;

  const cardRotY = -(1 - settle) * Math.PI + swayY;
  const cardRotX = swayX + eo * 0.45;
  const cardRotZ = 0.14 * (1 - settle);
  const cardX = 0;
  const cardY = 140 * (1 - land) + eo * 150;
  const cardZ = -700 * (1 - land) + 70 * kb;
  const cardScale = (0.6 + 0.4 * land) * (1 - 0.6 * eo);

  // ---- Ken Burns on the photo: cover-crop to the card, then a slow zoom and drift ----
  const img = texture.image as { width?: number; height?: number } | undefined;
  const imgAspect = img && img.width && img.height ? img.width / img.height : 16 / 9;
  const cardAspect = CARD_W / CARD_H;
  const zoom = 1.02 + 0.11 * kb;
  const rx = (imgAspect >= cardAspect ? cardAspect / imgAspect : 1) / zoom;
  const ry = (imgAspect >= cardAspect ? 1 : imgAspect / cardAspect) / zoom;
  texture.colorSpace = SRGBColorSpace;
  texture.repeat.set(rx, ry);
  texture.offset.set((1 - rx) / 2 + 0.014 * kb, (1 - ry) / 2 - 0.009 * kb);

  // ---- light sweep across the glossy face as the card lands ----
  const sweep = (f - ms(320)) / ms(750);
  const sweepOn = sweep > 0 && sweep < 1;
  const sweepX = -1300 + 2600 * cssEaseInOut(clamp01(sweep));

  return (
    <>
      <ambientLight intensity={1.5} />
      <directionalLight position={[-700, 900, 900]} intensity={3.2} color="#fff4d6" />
      <directionalLight position={[900, -300, 700]} intensity={1.1} color="#8fd8ff" />
      {sweepOn ? <pointLight position={[sweepX, 120, 520]} intensity={16} decay={0} color="#ffffff" /> : null}

      <group position={[cardX, cardY, cardZ]} rotation={[cardRotX, cardRotY, cardRotZ]} scale={cardScale}>
        <mesh geometry={frameGeo}>
          <meshStandardMaterial
            color="#FFC93C"
            metalness={0.55}
            roughness={0.35}
            emissive="#FFB020"
            emissiveIntensity={0.18}
          />
        </mesh>
        <mesh geometry={faceGeo} position={[0, 0, FACE_Z]}>
          <meshStandardMaterial
            map={texture}
            emissiveMap={texture}
            emissive="#ffffff"
            emissiveIntensity={0.55}
            roughness={0.28}
            metalness={0}
          />
        </mesh>
      </group>

      {/* the answer word: extruded letters that tumble up in front of the card */}
      <group
        position={[0, cardY * 0.6, 0]}
        rotation={[cardRotX * 0.5, swayY * 0.5 + (1 - settle) * -0.4, 0]}
        scale={cardScale}
      >
        <group scale={fit} position={[0, TEXT_BASELINE, 0]}>
          {letters.map((l, i) => {
            const lf = f - (ms(560) + i * ms(60));
            if (lf < 0) return null;
            const lt = clamp01(lf / ms(520));
            const lLand = htmlEase(lt);
            const lSettle = bounceEase(lt);
            return (
              <mesh
                key={i}
                geometry={l.geometry}
                position={[l.x, -260 * (1 - lLand), FACE_Z + 70 + 260 * (1 - lLand)]}
                rotation={[-(1 - lSettle) * Math.PI * 0.6, 0, 0]}
                scale={0.3 + 0.7 * lLand}
              >
                <meshStandardMaterial
                  color="#FFE9A8"
                  metalness={0.5}
                  roughness={0.3}
                  emissive="#FFB020"
                  emissiveIntensity={0.22}
                />
              </mesh>
            );
          })}
        </group>
      </group>
    </>
  );
};

export const Card3D: React.FC<{
  frame: number;
  start: number;
  exit: number;
  index: number;
  word: string;
}> = ({ frame, start, exit, index, word }) => {
  const fadeOut = 1 - cssEaseIn(clamp01((frame - exit) / ms(380)));
  return (
    <div
      style={{
        position: 'absolute',
        left: '50%',
        top: '50%',
        width: CARD3D_CANVAS_W,
        height: CARD3D_CANVAS_H,
        marginLeft: -CARD3D_CANVAS_W / 2,
        marginTop: -CARD3D_CANVAS_H / 2,
        opacity: fadeOut,
        // grounds the object on the dark backdrop
        filter: 'drop-shadow(0 40px 60px rgba(0,0,0,0.6))',
        pointerEvents: 'none',
      }}
    >
      <ThreeCanvas
        width={CARD3D_CANVAS_W}
        height={CARD3D_CANVAS_H}
        flat
        gl={{ antialias: true, alpha: true }}
        camera={{ fov: FOV, position: [0, 0, CAMERA_Z], near: 10, far: 8000 }}
      >
        <React.Suspense fallback={<WaitForTexture />}>
          <Scene frame={frame} start={start} exit={exit} index={index} word={word} />
        </React.Suspense>
      </ThreeCanvas>
    </div>
  );
};
