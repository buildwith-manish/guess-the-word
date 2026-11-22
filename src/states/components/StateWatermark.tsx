/**
 * StateWatermark: the States QUIZ MATRIX badge, top right. The drawing and the entrance live in the shared
 * src/ios/QuizMatrixBadge.tsx (same component as the Search History video); this file only places it and says where
 * the logo sprite is. The shared src/Watermark.tsx is untouched (the word quiz and the pixel video still use it).
 *
 * Same corner as before (BADGE.top / BADGE.right) and the same height as the HUD pill, so the two line up. It is
 * mounted inside several scenes, so it reads the clock of the whole video: the logo loop and the entrance never restart
 * at a scene change. The entrance (logo alone, then QUIZ over MATRIX) plays from the first stage scene.
 */
import React from 'react';
import { useDesignFrame } from '../../clock';
import { px } from '../../style';
import settings from '../../../settings.json';
import { QuizMatrixBadge } from '../../ios/QuizMatrixBadge';
import { BADGE } from '../look';
import { TIMELINE } from '../state-timing';

/** HUD pill height, ref px: 8 + 8 padding around a 24 px Inter line (StateStage). */
const HEIGHT = 45;

/** The tick the badge first appears: the first scene that shows the stage (question, reminder, or a wipe that keeps it). */
const SINCE =
  TIMELINE.segments.find((s) => s.kind === 'question' || s.kind === 'reminder' || (s.kind === 'iris' && s.watermark))?.from ?? 0;

export const StateWatermark: React.FC = () => {
  const frame = useDesignFrame();
  return (
    <div style={{ position: 'absolute', zIndex: 13, top: px(BADGE.top), right: px(BADGE.right), height: px(HEIGHT), pointerEvents: 'none' }}>
      <QuizMatrixBadge
        frame={frame}
        since={SINCE}
        height={px(HEIGHT)}
        logo={BADGE.logo}
        quiz={settings.brand.quiz}
        matrix={settings.brand.matrix}
      />
    </div>
  );
};
