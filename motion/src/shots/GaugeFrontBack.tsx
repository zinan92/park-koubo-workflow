// 仪表盘占比（胸前卡片）：270° 表盘，指针「点火自检」甩满全弧再回落到占比值（如 90%），读数弹出；
// 说到大头时内侧落字（如「前端」），剩下那一截从暗石色点亮朱红并标名（如「后端」），下面一句小字（如「没有人想过」）。
// 什么时候用：「大多数人把 X% 的精力放在 A，剩下那一小截 B 没人管」——一个百分比把整体切成大头和被忽略的一截。
// Park 9/29 认可（2026-09-28 那条的 15:19，「99% 的人 · 90% 在前端 · 后端没有人想过」）。
// ShotCraft 来源：data/gauge-readout-moves 的 A 式 needle-sweep-selftest（NeedleSweepSelftest.tsx）
//  保留——270° 自绘表盘（大刻度每 27°、小刻度每 9°）+ 末段红区；指针去程 12f ease-out 甩满全弧，
//        回程 13f inOutCubic 落过真值 8°，再 7f ease-out 回摆锁定；数值在落定时 [0.3 → 1.18 → 1] 弹出；落定后全锁死。
//  改动——三表并排改成单表（竖屏胸前卡片，表盘略偏左给右侧标签留位）；琥珀指针换墨黑、红区用朱红；
//        加一条跟指针走的墨黑读数弧；剩下那一截先暗、说到时点亮朱红 + 一次描边脉冲。
// 时间：所有 at 都是口播原片绝对秒。顶部小字随卡片出现；value.at = 他说出这个百分比的时刻（指针提前 28 帧点火，
//  读数在此前 2 帧弹出）；main / rest / note 都提前 3 帧出，rest 同时点亮那一截。
import React from 'react';
import { useCurrentFrame, interpolate, Easing } from 'remotion';
import { INK, RED, STONE, LINE, MUTED, FONT, E, lerp, seg } from '../kit/Stage';
import { Card } from '../kit/Card';
import { frameAt, Cue } from '../kit/time';

export type GaugeFrontBackProps = {
  t0: number;
  caption: { strong: string; rest: string }; // 顶部小字，如「99%」「的人」
  value: { at: number; pct: number; text: string; unit?: string }; // 指针落到 pct（0–100），读数如「90」「%」
  main: Cue; // 大头的名字，落在表盘内侧，如「前端」
  rest: Cue; // 剩下那一截的名字（朱红），如「后端」
  note?: Cue; // rest 下面的小字，如「没有人想过」
};

const LEAD = 3, FIRE = 28;

const W = 752, H = 560;
const CX = 320, CY = 318, R = 214, SW = 30; // 表盘略偏左，给右侧标签留位

const polar = (a: number, r: number): [number, number] => [CX + r * Math.cos((a * Math.PI) / 180), CY + r * Math.sin((a * Math.PI) / 180)];
const arcPath = (d0: number, d1: number, r: number) => {
  const [x0, y0] = polar(135 + d0, r);
  const [x1, y1] = polar(135 + d1, r);
  return `M ${x0.toFixed(2)} ${y0.toFixed(2)} A ${r} ${r} 0 ${d1 - d0 > 180 ? 1 : 0} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`;
};

const cl = { extrapolateLeft: 'clamp' as const, extrapolateRight: 'clamp' as const };
const needle = (f: number, s: number, TARGET: number) => {
  if (f <= s) return 0;
  if (f <= s + 12) return interpolate(f, [s, s + 12], [0, 270], { ...cl, easing: Easing.out(Easing.cubic) });
  if (f <= s + 25) return interpolate(f, [s + 12, s + 25], [270, TARGET - 8], { ...cl, easing: Easing.inOut(Easing.cubic) });
  return interpolate(f, [s + 25, s + 32], [TARGET - 8, TARGET], { ...cl, easing: Easing.out(Easing.cubic) });
};

const blurIn = (p: number, dy = 20) => ({ opacity: p, transform: `translateY(${lerp(p, dy, 0)}px)`, filter: `blur(${(1 - p) * 8}px)` });

export const GaugeFrontBack: React.FC<GaugeFrontBackProps> = ({ t0, caption, value, main, rest, note }) => {
  const f = useCurrentFrame();
  const at = frameAt(t0);
  const TARGET = (270 * value.pct) / 100;
  const K = { cap: 2, fire: at(value.at) - FIRE, front: at(main.at) - LEAD, zone: at(rest.at) - LEAD, nobody: note ? at(note.at) - LEAD : 1e6 };
  const d = needle(f, K.fire, TARGET);
  const settle = K.fire + 32;
  const popS = interpolate(f, [settle - 6, settle - 2, settle + 2], [0.3, 1.18, 1], cl);
  const popO = interpolate(f, [settle - 6, settle - 3], [0, 1], cl);
  const cap = seg(f, K.cap, K.cap + 12, E.outCubic);
  const dial = seg(f, 4, 16, E.outQuad);
  const front = seg(f, K.front, K.front + 12, E.outCubic);
  const zone = seg(f, K.zone, K.zone + 6, E.outQuad);
  const zPulse = interpolate(f, [K.zone, K.zone + 4, K.zone + 16], [0, 1, 0], cl);
  const back = seg(f, K.zone, K.zone + 12, (t) => E.outBack(t, 2.2));
  const nobody = seg(f, K.nobody, K.nobody + 12, E.outCubic);

  const ticks: React.ReactNode[] = [];
  for (let k = 0; k <= 30; k++) {
    const dd = k * 9, major = k % 3 === 0;
    const [x0, y0] = polar(135 + dd, R - SW / 2 - 10);
    const [x1, y1] = polar(135 + dd, R - SW / 2 - (major ? 34 : 22));
    ticks.push(<line key={k} x1={x0} y1={y0} x2={x1} y2={y1} stroke={dd > TARGET ? (zone > 0.5 ? RED : STONE) : STONE} strokeWidth={major ? 5 : 3} strokeLinecap="round" />);
  }
  const [tipX, tipY] = polar(135, R - 44);
  const [tailX, tailY] = polar(315, 34);
  // 标签位置：main = 大头弧中段内侧；rest = 红区右侧（x 556 起）
  const [fx, fy] = polar(135 + TARGET / 2, R - 100);

  return (
    <Card>
      <div style={{ position: 'relative', width: W, height: H, fontFamily: FONT }}>
        <div style={{ position: 'absolute', left: 0, top: 0, fontSize: 48, fontWeight: 700, color: MUTED, lineHeight: 1.1, ...blurIn(cap) }}>
          <span style={{ color: INK, fontWeight: 900, fontSize: 56 }}>{caption.strong}</span> {caption.rest}
        </div>
        <svg width={W} height={H} style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible', opacity: dial }}>
          <path d={arcPath(0, 270, R)} fill="none" stroke={LINE} strokeWidth={SW} strokeLinecap="round" />
          {/* 剩下那一截：暗石色 → 朱红 */}
          <path d={arcPath(TARGET + 2, 270, R)} fill="none" stroke={zone > 0 ? RED : STONE} strokeOpacity={zone > 0 ? zone : 0.55} strokeWidth={SW + zPulse * 16} strokeLinecap="round" />
          {/* 读数弧跟着指针 */}
          {d > 0.5 && <path d={arcPath(0, d, R)} fill="none" stroke={INK} strokeWidth={SW} strokeLinecap="round" />}
          {ticks}
          <g transform={`rotate(${d.toFixed(3)} ${CX} ${CY})`}>
            <line x1={tailX} y1={tailY} x2={tipX} y2={tipY} stroke={INK} strokeWidth={12} strokeLinecap="round" />
          </g>
          <circle cx={CX} cy={CY} r={22} fill={INK} />
          <circle cx={CX} cy={CY} r={8} fill={RED} />
        </svg>
        {/* 读数 */}
        <div style={{ position: 'absolute', left: CX - 150, width: 300, top: CY + 58, textAlign: 'center', opacity: popO, transform: `scale(${popS.toFixed(4)})`, color: INK, fontWeight: 900, lineHeight: 1 }}>
          <span style={{ fontSize: 104, letterSpacing: '-0.03em', fontVariantNumeric: 'tabular-nums' }}>{value.text}</span>
          {value.unit ? <span style={{ fontSize: 52, marginLeft: 4 }}>{value.unit}</span> : null}
        </div>
        {/* 大头 */}
        <div style={{ position: 'absolute', left: fx - 100, width: 200, top: fy - 34, textAlign: 'center', fontSize: 64, fontWeight: 900, color: INK, lineHeight: 1, ...blurIn(front) }}>{main.text}</div>
        {/* 剩下那一截 + 小字 */}
        <div style={{ position: 'absolute', left: 556, width: 196, top: 388, textAlign: 'center', fontSize: 72, fontWeight: 900, color: RED, lineHeight: 1,
          opacity: seg(f, K.zone, K.zone + 4), transform: `scale(${lerp(back, 0.5, 1)})` }}>{rest.text}</div>
        <div style={{ position: 'absolute', left: 536, width: 216, top: 474, textAlign: 'center', fontSize: 42, fontWeight: 700, color: MUTED, lineHeight: 1.1, ...blurIn(nobody, 14) }}>{note?.text}</div>
      </div>
    </Card>
  );
};
