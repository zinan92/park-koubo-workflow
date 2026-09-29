// 全屏挡脸的底板（Park 9/29：「I invite you to block my face once in a while」）。
// 全屏就整屏盖满，字幕也盖（Park 9/29：看全屏动效时没精力看字幕，听就好）。
// 内容仍放在 y 150–1650：抖音底部的账号/文案栏会压在 1650 以下。
// 三种进出场，来自 ShotCraft：
//  step  = transition/color-block-step-wipe（零缓动硬跳，4 跳不等距）
//  rise  = ui-entrance/platform-hinge-rise 的铰点翻起（底边为铰点 rotateX 回正 + 一次阻尼回摆）
//  cut   = 硬切进、下推出
import React from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import { E, lerp, seg } from './Motion';

export const H_COVER = 1920;
export const INK = '#15171C';
export const RED = '#E2461F';
export const PAPER = '#F4F1EA';
export const STONE = '#B7B0A3';
export const LINE = '#E4DFD4';
export const MUTED = '#6B655B';
export const FONT = '"PingFang SC", "Noto Sans SC", "Hiragino Sans GB", sans-serif';
export const SERIF = '"Songti SC", "Noto Serif SC", serif';

const stepVal = (f: number, steps: [number, number][]) => {
  let v = steps[0][1];
  for (const [at, val] of steps) if (f >= at) v = val;
  return v;
};

export const Stage: React.FC<{ bg: string; mode: 'step' | 'cut'; children: React.ReactNode }> = ({ bg, mode, children }) => {
  const f = useCurrentFrame();
  const { durationInFrames: D } = useVideoConfig();
  let clip = 'none';
  let ty = 0;
  let contentOp = 1;
  if (mode === 'step') {
    // 进：高度 0→260→700→1180→满（0/5/13/19/24f），出：反向 4 跳
    const hIn = stepVal(f, [[0, 0], [1, 320], [6, 840], [14, 1420], [20, H_COVER]]);
    const o = D - f;
    const hOut = stepVal(o, [[0, 0], [2, 460], [7, 1080], [12, 1560], [16, H_COVER]]);
    const h = Math.min(hIn, hOut);
    clip = `inset(0 0 ${H_COVER - h}px 0)`;
    contentOp = seg(f, 20, 30, E.outQuad) * seg(o, 12, 20, E.linear);
  } else {
    const pOut = seg(f, D - 12, D - 1, E.inCubic);
    ty = pOut * (H_COVER + 60);
  }
  return (
    <div style={{ position: 'absolute', left: 0, top: 0, width: 1080, height: 1920, overflow: 'hidden' }}>
      <div style={{ position: 'absolute', left: 0, top: 0, width: 1080, height: H_COVER, background: bg, clipPath: clip,
        transform: `translateY(${ty}px)`, boxShadow: '0 16px 40px rgba(0,0,0,0.35)', fontFamily: FONT, overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, opacity: contentOp }}>{children}</div>
      </div>
    </div>
  );
};

export { E, lerp, seg };
