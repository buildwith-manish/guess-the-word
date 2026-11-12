/**
 * brand-bonus.ts — the four brand-photo bonus rounds for "Guess the Brand: Pixelated".
 *
 * They replace the generic icon rounds (odd / count / spot / math) in the pixel quiz and
 * use only the 46 photos already in public/pixel-brands, so no new images are needed.
 * Everything here is hand-picked and static (no seeds), so every render is identical.
 *
 *   after Q12 : COLOR MATCH    (easy)   3-colour strip -> which brand?
 *   after Q25 : MEMORY FLASH   (medium) 6 packs for 3 s, one vanishes -> which one?
 *   after Q38 : EXTREME ZOOM   (medium) a tiny crop of a pack zooms out -> which brand?
 *   after Q46 : ODD BRAND OUT  (finale) 3 yellow packs + 1 blue pack -> which one differs?
 *
 * Colours were checked against the photos themselves (public/pixel-brands/NN.jpg).
 */
import type { BonusKind, BonusPuzzle } from '../bonus-engine';
import { BRANDS } from './brands';

export type BrandBonusKind = 'colormatch' | 'memory' | 'zoom' | 'oddbrand';
export const BRAND_BONUS_KINDS: BrandBonusKind[] = ['colormatch', 'memory', 'zoom', 'oddbrand'];
export const isBrandBonus = (k: BonusKind): k is BrandBonusKind =>
  (BRAND_BONUS_KINDS as string[]).includes(k);

export const BRAND_BONUS_ORDER: BonusKind[] = ['colormatch', 'memory', 'zoom', 'oddbrand'];

const brand = (id: number) => {
  const b = BRANDS.find((x) => x.id === id);
  if (!b) throw new Error(`brand-bonus: no brand with id ${id}`);
  return b;
};

/** seconds the memory round shows all six packs before one vanishes */
export const MEMORY_SHOW_SECONDS = 3;

export const buildBrandBonusPuzzles = (): BonusPuzzle[] => {
  // 1) COLOR MATCH — Tropicana's palette (orange / white / green) vs two clearly different brands
  const cmAnswer = brand(8);
  const cmOptions = [25, 8, 13]; // Hot Pockets (red), Tropicana, Kraft Mac & Cheese (blue)
  const colorMatch: BonusPuzzle = {
    kind: 'colormatch' as BonusKind,
    name: 'COLOR MATCH',
    question: 'WHICH BRAND WEARS THESE COLORS?',
    answer: `Orange, white and green is ${cmAnswer.name}!`,
    seconds: 8,
    data: {
      palette: cmAnswer.palette,
      options: cmOptions,
      names: cmOptions.map((id) => brand(id).name),
      answerIndex: cmOptions.indexOf(cmAnswer.id),
    },
  };

  // 2) MEMORY FLASH — six packs from the first 25 questions, the Heinz bottle vanishes
  const memTiles = [5, 15, 13, 8, 25, 11]; // Lucky Charms, Heinz, Kraft, Tropicana, Hot Pockets, Smucker's
  const memMissing = 1; // index into memTiles -> Heinz Ketchup
  const memory: BonusPuzzle = {
    kind: 'memory' as BonusKind,
    name: 'MEMORY FLASH',
    question: 'WHICH PACK VANISHED?',
    answer: `The ${brand(memTiles[memMissing]).name} pack vanished!`,
    seconds: 10,
    data: { tiles: memTiles, missingIndex: memMissing, showSeconds: MEMORY_SHOW_SECONDS },
  };

  // 3) EXTREME ZOOM — the embossed Oreo cookie (focal point measured on 36.jpg), zooming out
  const zoomBrand = brand(36);
  const zoom: BonusPuzzle = {
    kind: 'zoom' as BonusKind,
    name: 'EXTREME ZOOM',
    question: 'WHAT BRAND IS THIS?',
    answer: `It's the ${zoomBrand.name} cookie!`,
    seconds: 8,
    data: { id: zoomBrand.id, fx: 0.53, fy: 0.56, startScale: 9, endScale: 2.4 },
  };

  // 4) ODD BRAND OUT — three yellow packs and one blue one (colours checked on the photos)
  const oddTiles = [3, 2, 1, 30]; // Cheerios (yellow), Eggo (yellow), Pop-Tarts (BLUE), Lay's (yellow)
  const oddIndex = 2;
  const oddBrand: BonusPuzzle = {
    kind: 'oddbrand' as BonusKind,
    name: 'ODD BRAND OUT',
    question: 'WHICH PACK IS THE ODD ONE OUT?',
    answer: `${brand(oddTiles[oddIndex]).name} is blue. The rest are yellow.`,
    seconds: 8,
    data: { tiles: oddTiles, answerIndex: oddIndex },
  };

  return [colorMatch, memory, zoom, oddBrand];
};
