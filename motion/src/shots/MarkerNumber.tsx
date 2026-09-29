// 改编自 ShotCraft typography/marker-underline-title（MarkerUnderlineTitle.tsx）：
// 保留——buildStroke 马克笔笔形（中轴左低右高微上斜 + 缓波、变宽、首尾收细、毛糙）、
// 标题从下方弹入（ease-out cubic）、落定后停一拍再用 clipPath 从左到右 10f 描画。
// 改动——强调词换成口播里的数字「20%」并在他说到时才出现；笔色换朱红；字体换中文；
// 上方加两行口播原话做铺垫。
import React, { useId } from 'react';
import { interpolate, useCurrentFrame } from 'remotion';
import { Card, RED, MUTED } from '../kit/Card';

const mulberry32 = (a: number) => () => {
  let t = (a += 0x6d2b79f5);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const buildStroke = (len: number, seed: number) => {
  const rand = mulberry32(seed);
  const N = 40, top: string[] = [], bot: string[] = [];
  const wob = Array.from({ length: N + 1 }, () => rand() - 0.5);
  for (let i = 0; i <= N; i++) {
    const t = i / N, x = t * len;
    const mid = 19 - t * 9 + Math.sin(t * Math.PI * 1.6 + 0.4) * 2.6 + wob[i] * 1.6;
    const wBase = 14 + Math.sin(t * Math.PI) * 6 - Math.max(0, t - 0.86) * 46;
    const w = Math.max(2.2, wBase + wob[i] * 3) * 1.6;
    top.push(`${x.toFixed(1)},${(mid - w / 2).toFixed(1)}`);
    bot.push(`${x.toFixed(1)},${(mid + w / 2).toFixed(1)}`);
  }
  return `M${top.join('L')}L${bot.reverse().join('L')}Z`;
};

export const MarkerNumber: React.FC<{ lines: string[]; big: string; bigAt: number }> = ({ lines, big, bigAt }) => {
  const frame = useCurrentFrame();
  const revealId = `reveal-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const LEN = 330;
  const enter = interpolate(frame, [bigAt, bigAt + 16], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const eo = 1 - Math.pow(1 - enter, 3);
  const draw = interpolate(frame, [bigAt + 20, bigAt + 30], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const drawE = 1 - Math.pow(1 - draw, 2.2);
  return (
    <Card>
      {lines.map((l, i) => (
        <div key={i} style={{ fontSize: i === 0 ? 50 : 42, fontWeight: i === 0 ? 700 : 600, color: i === 0 ? undefined : MUTED, lineHeight: 1.35 }}>{l}</div>
      ))}
      <div style={{ height: 190, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ position: 'relative', display: 'inline-block', fontSize: 168, fontWeight: 800, lineHeight: 1, opacity: Math.min(1, enter * 1.6), transform: `translateY(${(1 - eo) * 36}px)`, fontVariantNumeric: 'tabular-nums' }}>
          {big}
          <svg width={LEN} height={60} viewBox={`0 0 ${LEN} 44`} style={{ position: 'absolute', left: -16, bottom: -34, overflow: 'visible' }}>
            <defs><clipPath id={revealId}><rect x={0} y={-30} width={drawE * (LEN + 6)} height={90} /></clipPath></defs>
            {draw > 0 && <path d={buildStroke(LEN, 77)} fill={RED} clipPath={`url(#${revealId})`} />}
          </svg>
        </span>
      </div>
    </Card>
  );
};
