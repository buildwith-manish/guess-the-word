import React from 'react';
import { ThreeCanvas } from '@remotion/three';
import { useThree } from '@react-three/fiber';
import { Color, Euler, ExtrudeGeometry, MeshPhysicalMaterial, PMREMGenerator, Shape, ShapeGeometry, type Texture } from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import type { Card } from '../data';
import { FPS, HEIGHT, WIDTH } from '../shared/clock';
import { colors, px, radius, springAt } from '../system';
import { heroDriftPitchSec, heroDriftYawSec } from '../timing';
import { Hero3DContext } from './hero3dContext';
import { STACK_SCALE, WALLET_LAYOUT, cornerBox } from './WalletCard';

/**
 * Hero version of the Wallet card (task B1). Layers, back to front inside this component:
 *   1. a WebGL canvas (transparent, full frame): rounded frosted-glass body, the answer slab that flips, one key light,
 *      one rim light, a soft room environment for reflections, a slow camera drift;
 *   2. the existing DOM card (children), carrying ALL text, tilted by the same small angle as the camera drift.
 * Everything is a pure function of the frame (sine of the frame, no randomness, no state).
 *
 * World units are render pixels at z = 0 (camera distance from the canvas height and the field of view), origin at the
 * frame centre, +y up. The card front face is the z = 0 plane; the DOM layer sits on that plane.
 *
 * Drift = the camera orbits the card by (yaw, pitch), looking at the centre. The DOM layer gets the equal and opposite
 * rotation, so both layers show the same view of the card. Yaw and pitch stay inside `HERO_TILT_MAX_DEG` (3 degrees).
 */

export const HERO_TILT_MAX_DEG = 3;
const YAW_DEG = 2;
const PITCH_DEG = 1.5; // hypot(YAW_DEG, PITCH_DEG) = 2.5, inside the 3 degree limit
const FOV = 24;
const CAMERA_Z = HEIGHT / 2 / Math.tan((FOV / 2) * (Math.PI / 180));

/** Camera drift in degrees at a design tick `frame`. 0 at frame 0, so cuts between cards do not jump. */
export const heroPose = (frame: number): { yaw: number; pitch: number } => ({
  yaw: YAW_DEG * Math.sin((2 * Math.PI * frame) / (heroDriftYawSec * FPS)),
  pitch: PITCH_DEG * Math.sin((2 * Math.PI * frame) / (heroDriftPitchSec * FPS)),
});

/** CSS transform for the DOM layer that matches a camera orbit of (yaw, pitch) degrees. */
export const heroDomTransform = (yaw: number, pitch: number): string => `rotateX(${-pitch}deg) rotateY(${-yaw}deg)`;

const BODY_DEPTH = 26;
const BODY_BEVEL = 6;
const SLAB_DEPTH = 6;
const SLAB_BEVEL = 2;
const SLAB_Z = SLAB_DEPTH / 2 + 1; // just in front of the card face

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
const clamp01 = (v: number): number => Math.min(1, Math.max(0, v));

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

/** Soft studio reflections without a network fetch: three's RoomEnvironment, prefiltered once per GL context. */
const useRoomEnvironment = (): Texture => {
  const gl = useThree((s) => s.gl);
  const env = React.useMemo(() => {
    const pmrem = new PMREMGenerator(gl);
    const target = pmrem.fromScene(new RoomEnvironment(), 0.04);
    pmrem.dispose();
    return target;
  }, [gl]);
  React.useEffect(() => () => env.dispose(), [env]);
  return env.texture;
};

type SceneProps = {
  card: Card;
  frame: number;
  enterAt: number;
  openAt: number;
  stackAt: number;
};

const Scene: React.FC<SceneProps> = ({ card, frame, enterAt, openAt, stackAt }) => {
  const env = useRoomEnvironment();
  const level = colors.level[card.level];

  const W = px(WALLET_LAYOUT.card.w);
  const H = px(WALLET_LAYOUT.card.h);
  const R = px(radius.xl);
  const A = WALLET_LAYOUT.answer;
  const slabW = px(A.w);
  const slabH = px(A.h);
  const slabR = px(radius.lg);
  const slabX = px(A.left + A.w / 2 - WALLET_LAYOUT.card.w / 2);
  const slabY = -px(A.top + A.h / 2 - WALLET_LAYOUT.card.h / 2);

  // ---- geometry (sizes are constants: built once) ----
  const bodyGeo = React.useMemo(() => {
    const g = new ExtrudeGeometry(roundedRect(W - BODY_BEVEL * 2, H - BODY_BEVEL * 2, R - BODY_BEVEL), {
      depth: BODY_DEPTH,
      bevelEnabled: true,
      bevelThickness: BODY_BEVEL,
      bevelSize: BODY_BEVEL,
      bevelSegments: 5,
      curveSegments: 20,
    });
    g.translate(0, 0, -(BODY_DEPTH + BODY_BEVEL)); // front face on z = 0
    return g;
  }, [W, H, R]);
  const slabGeo = React.useMemo(() => {
    const g = new ExtrudeGeometry(roundedRect(slabW - SLAB_BEVEL * 2, slabH - SLAB_BEVEL * 2, slabR - SLAB_BEVEL), {
      depth: SLAB_DEPTH,
      bevelEnabled: true,
      bevelThickness: SLAB_BEVEL,
      bevelSize: SLAB_BEVEL,
      bevelSegments: 3,
      curveSegments: 16,
    });
    g.translate(0, 0, -SLAB_DEPTH / 2);
    return g;
  }, [slabW, slabH, slabR]);
  const slabFaceGeo = React.useMemo(() => new ShapeGeometry(roundedRect(slabW - 4, slabH - 4, slabR - 2), 16), [slabW, slabH, slabR]);

  // ---- same pose maths as WalletCard (blank enter, open flip, stack into the corner), from the same springs ----
  const enter = springAt(frame, enterAt, 'gentle');
  const flip = springAt(frame, openAt, 'slow');
  const stack = springAt(frame, stackAt, 'gentle');
  const target = cornerBox('bottom-left');
  const left = lerp(WALLET_LAYOUT.card.left, target.left, stack);
  const top = lerp(WALLET_LAYOUT.card.top, target.top, stack);
  const scale = lerp(1, STACK_SCALE, stack) * lerp(0.94, 1, enter);
  const rise = (1 - enter) * 48;
  const cx = px(left + (WALLET_LAYOUT.card.w * scale) / 2);
  const cy = px(top + rise + (WALLET_LAYOUT.card.h * scale) / 2);
  const x = cx - WIDTH / 2;
  const y = HEIGHT / 2 - cy;
  const alpha = clamp01(enter * 1.4);

  // ---- materials: transparent frosted glass (transmission needs an opaque scene behind it, and the real background is DOM) ----
  const glassTint = React.useMemo(() => new Color(level).lerp(new Color('#ffffff'), 0.82), [level]);
  const slabTint = React.useMemo(() => new Color(level), [level]);
  const bodyMat = React.useMemo(
    () =>
      new MeshPhysicalMaterial({
        color: glassTint,
        roughness: 0.42,
        metalness: 0,
        clearcoat: 1,
        clearcoatRoughness: 0.28,
        ior: 1.45,
        specularIntensity: 1,
        envMap: env,
        envMapIntensity: 1.1,
        transparent: true,
        depthWrite: false,
      }),
    [glassTint, env],
  );
  bodyMat.opacity = 0.5 * alpha;
  const slabMat = React.useMemo(
    () =>
      new MeshPhysicalMaterial({
        color: glassTint,
        roughness: 0.3,
        metalness: 0,
        clearcoat: 1,
        clearcoatRoughness: 0.2,
        envMap: env,
        envMapIntensity: 1.2,
        transparent: true,
        depthWrite: false,
      }),
    [glassTint, env],
  );
  slabMat.opacity = 0.6 * alpha;

  // ---- camera drift ----
  const pose = heroPose(frame);
  const yaw = (pose.yaw * Math.PI) / 180;
  const pitch = (pose.pitch * Math.PI) / 180;
  const camPos: [number, number, number] = [
    CAMERA_Z * Math.sin(yaw) * Math.cos(pitch),
    CAMERA_Z * Math.sin(pitch),
    CAMERA_Z * Math.cos(yaw) * Math.cos(pitch),
  ];
  // Set on the default camera during render, so it is in place before this frame is drawn (no effect, no one-frame lag).
  const camera = useThree((st) => st.camera);
  camera.position.set(camPos[0], camPos[1], camPos[2]);
  camera.rotation.copy(new Euler(-pitch, yaw, 0, 'YXZ'));
  camera.updateMatrixWorld();

  return (
    <>
      {/* key light: upper left, front; rim light: low right, behind the card, grazing the bevel */}
      <directionalLight position={[-900, 1000, 1100]} intensity={2.2} color="#fff6e6" />
      <pointLight position={[1500, -500, -500]} intensity={18} decay={0} color="#9fd2ff" />

      <group position={[x, y, 0]} scale={scale}>
        <mesh geometry={bodyGeo} material={bodyMat} renderOrder={1} />
        <group position={[slabX, slabY, SLAB_Z]} rotation={[0, flip * Math.PI, 0]}>
          <mesh geometry={slabGeo} material={slabMat} renderOrder={2} />
          {/* front: dark "?" face; back: level-tinted name face */}
          <mesh geometry={slabFaceGeo} position={[0, 0, SLAB_DEPTH / 2 + SLAB_BEVEL + 0.5]} renderOrder={3}>
            <meshBasicMaterial color="#000000" transparent opacity={0.22 * alpha} depthWrite={false} />
          </mesh>
          <mesh geometry={slabFaceGeo} position={[0, 0, -(SLAB_DEPTH / 2 + SLAB_BEVEL + 0.5)]} rotation={[0, Math.PI, 0]} renderOrder={3}>
            <meshBasicMaterial color={slabTint} transparent opacity={0.16 * alpha} depthWrite={false} />
          </mesh>
        </group>
      </group>
    </>
  );
};

export type WalletCard3DProps = {
  card: Card;
  /** Scene-local design tick (30 fps), the same clock the card scene uses. */
  frame: number;
  /** Tick the blank card springs in (use a very negative tick when the card is already in). */
  enterAt: number;
  /** Tick the lock opens and the answer panel flips. */
  openAt: number;
  /** Tick the card shrinks into the corner stack (default: never). */
  stackAt?: number;
  /** The DOM card: WalletCard, or RevealEngine, which renders one. */
  children: React.ReactNode;
};

export const WalletCard3D: React.FC<WalletCard3DProps> = ({ card, frame, enterAt, openAt, stackAt = 1e9, children }) => {
  const { yaw, pitch } = heroPose(frame);
  return (
    <>
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        <ThreeCanvas width={WIDTH} height={HEIGHT} flat gl={{ antialias: true, alpha: true }} camera={{ fov: FOV, position: [0, 0, CAMERA_Z], near: 50, far: 9000 }}>
          <Scene card={card} frame={frame} enterAt={enterAt} openAt={openAt} stackAt={stackAt} />
        </ThreeCanvas>
      </div>
      <div style={{ position: 'absolute', inset: 0, perspective: CAMERA_Z, perspectiveOrigin: '50% 50%' }}>
        <div style={{ position: 'absolute', inset: 0, transformOrigin: '50% 50%', transform: heroDomTransform(yaw, pitch) }}>
          <Hero3DContext.Provider value={{ perspective: CAMERA_Z }}>{children}</Hero3DContext.Provider>
        </div>
      </div>
    </>
  );
};
