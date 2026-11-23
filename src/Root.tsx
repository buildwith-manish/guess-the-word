import React from 'react';
import { Composition } from 'remotion';
import './fonts';
import { Main } from './Main';
import { HEIGHT, RENDER_FPS, RENDER_TOTAL_FRAMES, WIDTH } from './timing';
import { Part1, part1Frames } from './gta6/parts/Part1';
import { Part2, part2Frames } from './gta6/parts/Part2';
import { Part3, part3Frames } from './gta6/parts/Part3';
import { Part4, part4Frames } from './gta6/parts/Part4';
import { Gta6Full } from './gta6/Full';
import { Hook as DontSayHook } from './dontsay/scenes/Hook';
import { Round45Callback, round45Frames } from './dontsay/scenes/Round45Callback';
import { LevelCard as DontSayLevelCard } from './dontsay/scenes/LevelCard';
import { SettingsCard as DontSaySettingsCard } from './dontsay/scenes/SettingsCard';
import { HeartCheckIn as DontSayHeartCheckIn } from './dontsay/scenes/HeartCheckIn';
import { BonusTripleLock, bonusTripleLockFrames } from './dontsay/scenes/BonusTripleLock';
import { BonusChainReaction as DontSayBonusChain } from './dontsay/scenes/BonusChainReaction';
import { BonusMindReader, bonusMindReaderFrames } from './dontsay/scenes/BonusMindReader';
import { BonusOppositeDay, bonusOppositeDayFrames } from './dontsay/scenes/BonusOppositeDay';
import { BonusVoiceOnly as DontSayBonusVoice } from './dontsay/scenes/BonusVoiceOnly';
import { Part4 as DontSayPart4, part4Frames as dsPart4Frames } from './dontsay/parts/Part4';
import { Part6 as DontSayPart6, part6Frames as dsPart6Frames } from './dontsay/parts/Part6';
import { RankCard as DontSayRankCard, rankCardFrames as dsRankCardFrames } from './dontsay/scenes/RankCard';
import { Scoreboard as DontSayScoreboard, scoreboardFrames as dsScoreboardFrames } from './dontsay/scenes/Scoreboard';
import { WIDTH as DS_WIDTH, HEIGHT as DS_HEIGHT, RENDER_FPS as DS_FPS, hookSec as DS_HOOK_SEC, levelCardSec as DS_LEVEL_SEC, settingsCardSec as DS_SETTINGS_SEC, heartCheckInSec as DS_CHECKIN_SEC, bonusSec as DS_BONUS_SEC, secToFrames as dsSecToFrames } from './dontsay/timing';
import { RENDER_TOTAL_FRAMES as GTA6_TOTAL_FRAMES } from './gta6/timing';
import { RoundPreview, RoundPreviewAll, ROUND_ALL_FRAMES, ROUND_PREVIEW_DEFAULTS, roundPreviewFrames } from './dontsay/Preview';
import { ALL_FRAMES, Gta6Preview, Gta6PreviewAll, PREVIEW_DEFAULTS, previewFrames } from './gta6/Preview';

/**
 * One composition. Its duration comes from the timeline (settings.json +
 * questions.js), so adding questions changes the runtime automatically — no
 * second place to keep in sync.
 */
export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="GuessTheWord"
        component={Main}
        durationInFrames={RENDER_TOTAL_FRAMES}
        fps={RENDER_FPS}
        width={WIDTH}
        height={HEIGHT}
      />
      <Composition
        id="GTA6-Q"
        component={Gta6Preview}
        durationInFrames={previewFrames(PREVIEW_DEFAULTS.order)}
        fps={RENDER_FPS}
        width={WIDTH}
        height={HEIGHT}
        defaultProps={PREVIEW_DEFAULTS}
        calculateMetadata={({ props }) => ({ durationInFrames: previewFrames(props.order) })}
      />
      <Composition
        id="GTA6-Q-All"
        component={Gta6PreviewAll}
        durationInFrames={ALL_FRAMES}
        fps={RENDER_FPS}
        width={WIDTH}
        height={HEIGHT}
      />
      <Composition id="GTA6-P1" component={Part1} durationInFrames={part1Frames} fps={RENDER_FPS} width={WIDTH} height={HEIGHT} />
      <Composition id="GTA6-P2" component={Part2} durationInFrames={part2Frames} fps={RENDER_FPS} width={WIDTH} height={HEIGHT} defaultProps={{ showVerifyTags: false }} />
      <Composition id="GTA6-P3" component={Part3} durationInFrames={part3Frames} fps={RENDER_FPS} width={WIDTH} height={HEIGHT} />
      <Composition id="GTA6-P4" component={Part4} durationInFrames={part4Frames} fps={RENDER_FPS} width={WIDTH} height={HEIGHT} />
      <Composition id="DontSay-Hook" component={DontSayHook} durationInFrames={dsSecToFrames(DS_HOOK_SEC)} fps={DS_FPS} width={DS_WIDTH} height={DS_HEIGHT} />
      <Composition id="DontSay-LevelCard-L1" component={DontSayLevelCard} durationInFrames={dsSecToFrames(DS_LEVEL_SEC)} fps={DS_FPS} width={DS_WIDTH} height={DS_HEIGHT} defaultProps={{ level: 1 as const, sheet: false }} />
      <Composition id="DontSay-LevelCard-L2" component={DontSayLevelCard} durationInFrames={dsSecToFrames(DS_LEVEL_SEC)} fps={DS_FPS} width={DS_WIDTH} height={DS_HEIGHT} defaultProps={{ level: 2 as const, sheet: true }} />
      <Composition id="DontSay-LevelCard-L3" component={DontSayLevelCard} durationInFrames={dsSecToFrames(DS_LEVEL_SEC)} fps={DS_FPS} width={DS_WIDTH} height={DS_HEIGHT} defaultProps={{ level: 3 as const, sheet: false }} />
      <Composition id="DontSay-LevelCard-L4" component={DontSayLevelCard} durationInFrames={dsSecToFrames(DS_LEVEL_SEC)} fps={DS_FPS} width={DS_WIDTH} height={DS_HEIGHT} defaultProps={{ level: 4 as const, sheet: false }} />
      <Composition id="DontSay-LevelCard-L5" component={DontSayLevelCard} durationInFrames={dsSecToFrames(DS_LEVEL_SEC)} fps={DS_FPS} width={DS_WIDTH} height={DS_HEIGHT} defaultProps={{ level: 5 as const, sheet: false }} />
      <Composition id="DontSay-SettingsCard-L2" component={DontSaySettingsCard} durationInFrames={dsSecToFrames(DS_SETTINGS_SEC)} fps={DS_FPS} width={DS_WIDTH} height={DS_HEIGHT} defaultProps={{ level: 2 as const }} />
      <Composition id="DontSay-HeartCheckIn" component={DontSayHeartCheckIn} durationInFrames={dsSecToFrames(DS_CHECKIN_SEC)} fps={DS_FPS} width={DS_WIDTH} height={DS_HEIGHT} />
      <Composition id="DontSay-Bonus-3" component={DontSayBonusChain} durationInFrames={dsSecToFrames(DS_BONUS_SEC)} fps={DS_FPS} width={DS_WIDTH} height={DS_HEIGHT} />
      <Composition id="DontSay-Bonus-5" component={DontSayBonusVoice} durationInFrames={dsSecToFrames(DS_BONUS_SEC)} fps={DS_FPS} width={DS_WIDTH} height={DS_HEIGHT} />
      <Composition id="DontSay-P4" component={DontSayPart4} durationInFrames={dsPart4Frames} fps={DS_FPS} width={DS_WIDTH} height={DS_HEIGHT} />
      <Composition id="DontSay-P6" component={DontSayPart6} durationInFrames={dsPart6Frames} fps={DS_FPS} width={DS_WIDTH} height={DS_HEIGHT} />
      <Composition id="DontSay-RankCard" component={DontSayRankCard} durationInFrames={dsRankCardFrames()} fps={DS_FPS} width={DS_WIDTH} height={DS_HEIGHT} />
      <Composition id="DontSay-Scoreboard" component={DontSayScoreboard} durationInFrames={dsScoreboardFrames()} fps={DS_FPS} width={DS_WIDTH} height={DS_HEIGHT} />
      <Composition id="GTA6-Full" component={Gta6Full} durationInFrames={GTA6_TOTAL_FRAMES} fps={RENDER_FPS} width={WIDTH} height={HEIGHT} />
      <Composition
        id="DontSay-Round"
        component={RoundPreview}
        durationInFrames={roundPreviewFrames(ROUND_PREVIEW_DEFAULTS.n)}
        fps={RENDER_FPS}
        width={WIDTH}
        height={HEIGHT}
        defaultProps={ROUND_PREVIEW_DEFAULTS}
        calculateMetadata={({ props }) => ({ durationInFrames: roundPreviewFrames(props.n) })}
      />
      <Composition id="DontSay-Round-All" component={RoundPreviewAll} durationInFrames={ROUND_ALL_FRAMES} fps={RENDER_FPS} width={WIDTH} height={HEIGHT} />
      <Composition id="DontSay-Round45Callback" component={Round45Callback} durationInFrames={round45Frames()} fps={DS_FPS} width={DS_WIDTH} height={DS_HEIGHT} />
      <Composition id="DontSay-Bonus-2" component={BonusTripleLock} durationInFrames={bonusTripleLockFrames()} fps={DS_FPS} width={DS_WIDTH} height={DS_HEIGHT} />
      <Composition id="DontSay-Bonus-4" component={BonusOppositeDay} durationInFrames={bonusOppositeDayFrames()} fps={DS_FPS} width={DS_WIDTH} height={DS_HEIGHT} />
      <Composition id="DontSay-Bonus-1" component={BonusMindReader} durationInFrames={bonusMindReaderFrames()} fps={DS_FPS} width={DS_WIDTH} height={DS_HEIGHT} />
    </>
  );
};
