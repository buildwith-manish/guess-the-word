/**
 * INVENTED ART. The map in MapsLook is a generic, hand-drawn, Florida-like peninsula made of a few SVG paths.
 * It is not traced from any real map, satellite image or game asset, and it does not show real places:
 * no labels, no real roads, no Rockstar or other third-party material. Coordinates live in a 1920x1080 space;
 * MAP_SHIFT moves the land to the left so the answer tiles sit over open sea on the right.
 */
export const MAP_SHIFT = -300;

/** Land mass: a panhandle across the top and a peninsula running south. */
export const LAND_PATH =
  'M -50 -50 L 1250 -50 L 1250 140 ' +
  'C 1235 260, 1260 340, 1235 440 C 1215 560, 1260 650, 1240 760 C 1225 860, 1190 940, 1150 990 ' +
  'C 1120 1030, 1085 1030, 1075 985 C 1060 930, 1010 900, 985 840 C 960 780, 990 700, 960 640 ' +
  'C 930 570, 880 560, 860 500 C 840 440, 880 380, 840 330 ' +
  'C 800 300, 700 330, 620 345 C 520 360, 380 340, 260 345 C 150 350, 60 330, -50 340 Z';

/** Small islands off the southern tip. */
export const ISLANDS: ReadonlyArray<{ cx: number; cy: number; rx: number; ry: number; rot: number }> = [
  { cx: 1010, cy: 1030, rx: 26, ry: 9, rot: -28 },
  { cx: 940, cy: 1052, rx: 18, ry: 7, rot: -18 },
  { cx: 880, cy: 1066, rx: 12, ry: 5, rot: -10 },
  { cx: 1230, cy: 880, rx: 8, ry: 28, rot: 12 },
];

/** Inland lake (cut out of the land colour). */
export const LAKE = { cx: 1100, cy: 790, rx: 52, ry: 38, rot: -12 };

/** Faint inland roads, purely decorative. */
export const ROADS: readonly string[] = [
  'M 300 120 C 500 160, 700 90, 900 150 S 1150 120, 1250 170',
  'M 880 150 C 930 300, 1000 420, 1040 560 S 1120 700, 1160 840',
  'M 1230 300 C 1160 380, 1120 460, 1090 540',
  'M 420 340 C 440 250, 520 190, 640 160',
];

/** Generic town dots (no names). */
export const TOWNS: ReadonlyArray<readonly [number, number]> = [
  [340, 210], [610, 230], [900, 170], [1130, 250], [1060, 520], [1150, 640], [1010, 700], [1120, 880],
];

export type RouteVariant = {
  /** Route path, base coordinates. */
  d: string;
  start: { x: number; y: number };
  end: { x: number; y: number };
};

/** Three invented routes; MapsLook picks one from the item order so the map is not identical every time. */
export const ROUTES: readonly RouteVariant[] = [
  {
    d: 'M 520 255 C 640 330, 820 370, 920 470 C 1000 560, 1050 620, 1085 720 C 1120 810, 1100 880, 1105 930',
    start: { x: 520, y: 255 }, end: { x: 1105, y: 930 },
  },
  {
    d: 'M 760 260 C 900 320, 1000 370, 1090 430 C 1170 480, 1190 600, 1180 700',
    start: { x: 760, y: 260 }, end: { x: 1180, y: 700 },
  },
  {
    d: 'M 440 250 C 600 300, 720 360, 830 410 C 920 450, 960 530, 1000 610',
    start: { x: 440, y: 250 }, end: { x: 1000, y: 610 },
  },
];
