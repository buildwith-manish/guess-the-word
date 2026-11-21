import { px } from '../style';

/**
 * iOS look: design tokens shared by every video that opts in (import from '../ios'). Nothing here is video-specific.
 * Colours follow the iOS dark-mode system palette. Sizes are 1280x720 reference units: pass them through px().
 */
export const IOS = {
  font: '"Inter", -apple-system, "SF Pro Text", system-ui, "Noto Color Emoji", sans-serif',
  weight: { regular: 400, medium: 500, semibold: 600, bold: 700 },
  color: {
    bg: '#000000',
    bgRaised: '#0B0B12',
    label: '#FFFFFF',
    secondary: 'rgba(235,235,245,0.60)',
    tertiary: 'rgba(235,235,245,0.30)',
    fill: 'rgba(255,255,255,0.10)',
    fillStrong: 'rgba(255,255,255,0.16)',
    hairline: 'rgba(255,255,255,0.12)',
    blue: '#0A84FF',
    green: '#30D158',
    orange: '#FF9F0A',
    red: '#FF453A',
  },
  /** Corner radii in reference units. Use the largest that fits; keep a surface and what sits inside it in proportion. */
  radius: { sm: 8, md: 14, lg: 22, xl: 30 },
  /** 8-pt spacing scale, reference units. */
  space: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 },
  blurPx: 22,
} as const;

/** A frosted surface: translucent fill, hairline edge, soft shadow. `radius` and the result are in screen px. */
export const iosSurface = (radius: number, shadow = 1): React.CSSProperties => ({
  background: IOS.color.fill,
  borderRadius: radius,
  backdropFilter: `blur(${px(IOS.blurPx)}px) saturate(1.4)`,
  border: `${px(1)}px solid ${IOS.color.fillStrong}`,
  boxShadow: `0 ${px(8) * shadow}px ${px(28) * shadow}px rgba(0,0,0,0.30)`,
  boxSizing: 'border-box',
});
