/**
 * Layout margins for any video that opts in to the iOS look. All values are 1280x720 reference units (wrap in px()
 * for screen pixels) and sit on the 8-pt grid. src/style.ts keeps its own SAFE_X / SAFE_Y (screen px) for the older
 * videos; import these from '../ios' instead, never both in one file.
 *
 *  - SAFE_X: left and right margin. The HUD pill's left edge, the content column and any right-aligned element
 *    all start/end here (CONTENT.left / CONTENT.right).
 *  - SAFE_TOP: the top margin line. The HUD pill is centred on it (pill top = SAFE_TOP - HUD_H / 2).
 *  - SAFE_BOTTOM: the bottom margin. Nothing sits below CONTENT.bottom.
 */
export const FRAME = { w: 1280, h: 720 } as const;

export const SAFE_X = 64;
export const SAFE_TOP = 56;
export const SAFE_BOTTOM = 40;

/** HUD pill height (8-pt). */
export const HUD_H = 48;

/** The content box inside the margins. `top` is the pill's top edge, so the pill and the content share one box. */
export const CONTENT = {
  left: SAFE_X,
  right: FRAME.w - SAFE_X,
  top: SAFE_TOP - HUD_H / 2,
  bottom: FRAME.h - SAFE_BOTTOM,
  w: FRAME.w - 2 * SAFE_X,
  h: FRAME.h - SAFE_BOTTOM - (SAFE_TOP - HUD_H / 2),
} as const;
