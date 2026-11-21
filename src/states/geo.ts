/**
 * geo.ts: typed access to states-geo.json (built by `npm run states:geo`).
 */
import geoJson from './states-geo.json';
import { getState } from './states-data';

export interface GeoState {
  fips: string;
  name: string;
  /** SVG path fitted into the shape box (aspect kept, centred). */
  shape: string;
  /** Width / height of the fitted shape, in shape-box units. */
  w: number;
  h: number;
  /** Path in the 975x610 map system (AK and HI insets). */
  mini: string;
  miniBBox: [number, number, number, number];
  miniCentroid: [number, number];
  borders: string[];
  /** Bit strings, keyed by cells per side (12, 24, 48). */
  cells: Record<string, string>;
}

interface GeoFile {
  credit: string;
  /** Side of the square the shapes are fitted into. */
  shapeBox: number;
  miniBox: [number, number];
  cellResolutions: number[];
  states: GeoState[];
}

const GEO = geoJson as unknown as GeoFile;
const BY_NAME = new Map(GEO.states.map((s) => [s.name, s]));

/** Side of the square every shape is fitted into (path units). */
export const SHAPE_BOX: number = GEO.shapeBox;

/** Map system of `mini` paths. */
export const MINI_BOX: [number, number] = GEO.miniBox;

/** Geometry for a state, by two-letter key or full name. Throws if unknown or missing. */
export function getShape(key: string): GeoState {
  const info = getState(key);
  const hit = BY_NAME.get(info.name);
  if (!hit) throw new Error(`No geometry for ${info.name}`);
  return hit;
}
