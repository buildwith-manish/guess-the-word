import React from 'react';
import { springAt } from '../shared/springs';
import { bonusTileGlass, colors, px, textStyle, useXmasFrame } from '../system';
import { todoBonus } from '../ui';
import type { RoundProps } from './registry';

/**
 * PlaceholderRound: the visible stand-in for a bonus round that is not built yet. A gold glass tile with "TODO bonus N"
 * and the round's name from data. Obeys the round contract (registry.ts): it springs in 6 ticks before playFrom.
 */
export const PlaceholderRound: React.FC<RoundProps> = ({ slot, playFrom }) => {
  const t = useXmasFrame();
  const k = springAt(t, playFrom - 6, 'pop');
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        ...bonusTileGlass(),
        borderRadius: px(60),
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: px(14),
        opacity: Math.min(1, k * 2),
        transform: `scale(${0.94 + 0.06 * k})`,
      }}
    >
      <div style={{ ...textStyle('hero'), color: colors.gold }}>{todoBonus(slot.bonus)}</div>
      <div style={textStyle('label')}>{slot.name}</div>
    </div>
  );
};

export default PlaceholderRound;
