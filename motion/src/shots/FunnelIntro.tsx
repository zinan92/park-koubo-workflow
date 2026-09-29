// 销售漏斗 · 第一次出场（全屏）：几层一起描出来，只点亮顶层，顶层数字随口播滚动变大；下面几层先灰着，留给后面的 FunnelLight。
// Park 9/29 认可（2026-09-28 那条的 10:28，1 万 → 8 万 → 24 万）。
// ShotCraft 来源：
//  - 底板进出：transition/color-block-step-wipe（Stage mode="step"）
//  - 漏斗描出来：ui-entrance/draw-svg-trace（pathLength=1 + 可见笔头 + 闭合闪）
//  - 流量粒子雨：data/particle-sand-fill 的落体语法（重力加速、错峰；数字每变大一档雨更密）
//  - 数字：data/odometer-digit-roll 的滚轮（减速 + 半格回弹，最后一档变朱红并脉冲）
// 所有 at 都是口播原片里的绝对秒，对准他说出那个词的时刻（查 words.json 词级时间）。
import React from 'react';
import { useCurrentFrame, interpolate } from 'remotion';
import { Stage, INK, RED, PAPER, STONE, LINE, MUTED, SERIF, E, lerp, seg } from '../kit/Stage';
import { rand } from '../kit/Motion';
import { frameAt, Cue } from '../kit/time';

export type FunnelIntroProps = {
  t0: number;
  caption: string; // 数字上方的小字，如「每天触达」
  unit: string; // 数字单位，如「万」
  steps: { at: number; value: string }[]; // 顶层数字每一档
  chips?: Cue[]; // 数字下方的乘数胶囊，如「× 8 个平台」
  layers: string[]; // 从上到下每层的名字（3–5 层）
  chain?: Cue[]; // 底部一句「流量 → 触达 → 转化」，最后一项朱红，同时画一支往下的箭头
};

const TOP = 710, GAP = 18, CX = 540;
const RATES = [1, 4, 10, 16];

export const FunnelIntro: React.FC<FunnelIntroProps> = ({ t0, caption, unit, steps, chips = [], layers, chain = [] }) => {
  const f = useCurrentFrame();
  const at = frameAt(t0);
  const n = layers.length;
  const LH = Math.round((1524 - TOP - GAP * (n - 1)) / n);
  const ws = n === 4 ? [900, 700, 520, 360] : layers.map((_, i) => 900 - i * (540 / Math.max(1, n - 1)));
  const trap = (i: number) => {
    const y0 = TOP + i * (LH + GAP), y1 = y0 + LH;
    const w0 = ws[i], w1 = (ws[i + 1] ?? ws[n - 1] - 110) + 26;
    return { y0, y1, d: `M ${CX - w0 / 2} ${y0} L ${CX + w0 / 2} ${y0} L ${CX + w1 / 2} ${y1} L ${CX - w1 / 2} ${y1} Z` };
  };
  const S = steps.map((s) => ({ a: at(s.at), v: s.value }));
  const last = S[S.length - 1]?.a ?? 1e6;
  const first = S[0]?.a ?? 1e6;
  const draw = 26;
  const litTop = seg(f, first, first + 8, E.outQuad);
  const chainF = chain.map((c) => ({ a: at(c.at), text: c.text }));
  const lastChain = chainF[chainF.length - 1]?.a ?? 1e6;
  const arrow = chain.length ? seg(f, lastChain, lastChain + 24, E.inOutCubic) : 0;

  // 滚轮
  let cur = '', from = '', start = -99;
  for (const s of S) if (f >= s.a) { from = cur; cur = s.v; start = s.a; }
  const p = seg(f, start, start + 16, E.outCubic);
  const over = f < start + 16 ? 0 : interpolate(f, [start + 16, start + 19, start + 24], [0, 0.18, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const pulse = interpolate(f, [last + 16, last + 20, last + 26], [1, 1.06, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const numColor = f >= last + 16 ? RED : INK;
  const ROW = 200;

  // 粒子雨：第 k 档数字对应 RATES[k]
  const rateAt = (fr: number) => { let r = 0; S.forEach((s, k) => { if (fr >= s.a) r = RATES[Math.min(k, RATES.length - 1)]; }); return r; };
  const drops: React.ReactNode[] = [];
  const FALL = 20, Y0 = 570, Y1 = TOP + 6;
  for (let born = Math.max(first, f - FALL); born <= f; born++) {
    const r = rateAt(born);
    for (let k = 0; k < r; k++) {
      const seed = born * 13 + k;
      const age = (f - born) / FALL;
      if (age < 0 || age > 1) continue;
      drops.push(<div key={`${born}-${k}`} style={{ position: 'absolute', left: CX - 380 + rand(seed) * 760, top: Y0 + (Y1 - Y0) * age * age, width: 14, height: 14, background: rand(seed + 7) < 0.15 ? RED : INK, opacity: 0.85 * (1 - age * 0.3) }} />);
    }
  }

  return (
    <Stage bg={PAPER} mode="step">
      <div style={{ position: 'absolute', top: 220, width: 1080, textAlign: 'center', fontSize: 44, fontWeight: 700, color: MUTED, letterSpacing: '0.06em', opacity: seg(f, 22, 34) }}>{caption}</div>
      <div style={{ position: 'absolute', top: 280, width: 1080 }}>
        {cur && (
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', fontSize: 200, fontWeight: 900, color: numColor, transform: `scale(${pulse})`, fontVariantNumeric: 'tabular-nums' }}>
            <div style={{ filter: f < start + 16 && 1 - p > 0.1 ? `blur(${(1 - p) * 5}px)` : undefined, transform: `translateY(${over * 60}px)` }}>
              <div style={{ height: ROW, overflow: 'hidden' }}>
                <div style={{ transform: `translateY(${-p * ROW}px)` }}>
                  {[from, cur].map((d, k) => <div key={k} style={{ height: ROW, lineHeight: `${ROW}px`, textAlign: 'center' }}>{d}</div>)}
                </div>
              </div>
            </div>
            <div style={{ fontSize: 96, lineHeight: '150px', marginLeft: 8, fontWeight: 800 }}>{unit}</div>
          </div>
        )}
      </div>
      {drops}
      <div style={{ position: 'absolute', top: 500, width: 1080, display: 'flex', justifyContent: 'center', gap: 20 }}>
        {chips.map((c, k) => {
          const a = at(c.at);
          if (f < a) return null;
          const q = seg(f, a, a + 10, (t) => E.outBack(t, 2.2));
          return <div key={k} style={{ opacity: seg(f, a, a + 4), transform: `scale(${lerp(q, 0.6, 1)})`, background: INK, color: PAPER, fontSize: 40, fontWeight: 700, padding: '10px 26px', borderRadius: 40 }}>{c.text}</div>;
        })}
      </div>
      <svg width={1080} height={1920} style={{ position: 'absolute', left: 0, top: 0 }}>
        {layers.map((name, i) => {
          const t = trap(i);
          const a = draw + i * 7;
          const q = seg(f, a, a + 34, E.inOutCubic);
          const flash = interpolate(f, [a + 34, a + 36, a + 42], [0, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
          const fillOp = seg(f, a + 34, a + 44, E.outQuad);
          const fill = i === 0 && litTop > 0 ? (f >= last + 16 ? RED : INK) : LINE;
          return (
            <g key={i}>
              <path d={t.d} fill={fill} opacity={i === 0 ? Math.max(fillOp * 0.9, litTop) : fillOp * 0.9} />
              <path d={t.d} pathLength={1} fill="none" stroke={i === 0 ? INK : STONE} strokeWidth={4 + 4 * flash} strokeDasharray="1" strokeDashoffset={1 - q} strokeLinejoin="round" opacity={1 - fillOp * 0.6} />
              {q > 0 && q < 1 && <path d={t.d} pathLength={1} fill="none" stroke={RED} strokeWidth={10} strokeLinecap="round" strokeDasharray="0.03 0.97" strokeDashoffset={0.03 - q} />}
              <text x={CX} y={(t.y0 + t.y1) / 2 + 20} textAnchor="middle" fontSize={i === 0 ? 60 : 54} fontWeight={800}
                fill={i === 0 && litTop > 0.5 ? PAPER : STONE} opacity={fillOp} fontFamily='"PingFang SC", sans-serif'>{name}</text>
            </g>
          );
        })}
        {arrow > 0 && (
          <path d={`M ${CX - 470} ${TOP + LH / 2} C ${CX - 520} ${TOP + LH * 1.4}, ${CX - 470} ${TOP + LH * 2.4}, ${CX - 330} ${TOP + LH * 2.9}`} pathLength={1}
            fill="none" stroke={RED} strokeWidth={8} strokeLinecap="round" strokeDasharray="1" strokeDashoffset={1 - arrow} />
        )}
      </svg>
      {chain.length > 0 && (
        <div style={{ position: 'absolute', top: 1548, width: 1080, display: 'flex', justifyContent: 'center', alignItems: 'baseline', gap: 18, fontFamily: SERIF, fontWeight: 900, fontSize: 60, color: INK }}>
          {chainF.map((c, k) => {
            const q = seg(f, c.a, c.a + 14, E.outCubic);
            const isLast = k === chainF.length - 1;
            return (
              <React.Fragment key={k}>
                {k > 0 && <span style={{ opacity: q, color: STONE }}>→</span>}
                <span style={{ opacity: q, color: isLast ? RED : INK, transform: `translateY(${lerp(q, 20, 0)}px)` }}>{c.text}</span>
              </React.Fragment>
            );
          })}
        </div>
      )}
    </Stage>
  );
};
