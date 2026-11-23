/**
 * shared/index.ts — barrel for the Dont Say Same As Me shared layer.
 *
 * Everything here is copied (not imported) from src/gta6/components/ and src/ios/,
 * with import paths fixed to ../system and ../timing. Nothing in this folder
 * imports from src/gta6/ or src/nfl/ — QA (task 6c) greps to enforce this.
 */
export { useDesignFrame } from './clock';
export { clamp01, fadeWindow } from './fade';
export { presence } from './presence';
export { timerMath, URGENT_SECONDS } from './timerMath';
export { seeded, Shake } from './Shake';
export type { ShakeProps } from './Shake';
export { EdgeGlow } from './EdgeGlow';
export type { EdgeGlowProps } from './EdgeGlow';
export { LowPowerTint } from './LowPowerTint';
export type { LowPowerTintProps } from './LowPowerTint';
export { FrostCard } from './FrostCard';
export type { FrostCardProps } from './FrostCard';
export { TimerRing } from './TimerRing';
export type { TimerRingProps } from './TimerRing';
export { LockNotification, LOCK_NOTIFICATION_TICKS, LOCK_BEATS, lockNotificationEnd } from './LockNotification';
export type { LockNotificationProps } from './LockNotification';
export { NotificationBanner } from './NotificationBanner';
export type { NotificationBannerProps } from './NotificationBanner';
export { ScoreHud } from './ScoreHud';
export type { ScoreHudProps } from './ScoreHud';
export { levelCardLaunch, levelCardExit } from './levelCard';
export type { LevelCardLaunch } from './levelCard';
