// 装不下的第三根柱（全屏，纸底）：前两根柱正常长出 → 第三根长到顶后加速冲破图表上沿、插进标题区、图表一震 →
// 停半拍 → y 轴「哗」地重标（旧刻度下飞、新刻度上滑、网格加密、前两根压成地平线）→ 第三根落回新刻度的顶 →
// 说到它的数时弹出朱红真值标签，静止到结束。讲「三条路 / 三种做法，前两种有上限，第三种没有天花板」时用。
// Park 9/29 认可（2026-09-28 那条的 8:33.5，「都按 10 万粉丝算」：广告 2 万/月、流量几千/月、咨询课程长期服务 50 万/月）。
// ShotCraft 来源：data/chart-live-moves 的 C 式 axis-rescale-shock
//  保留：真语境（真标题/真单位/真刻度）；历史段 inOutCubic 画出 → 爆表段 in-cubic 冲出图表上沿、真的插进标题字区；
//        冲顶同帧整图 ±8px 衰减震 8f（只震图表组，不震整个画面，R4）；悬停半拍再重标；
//        重标 12f out-cubic：旧刻度向下 30px 飞出淡出、新刻度从上方滑入、网格 3→5 根同帧加密、旧数据被量程压扁；
//        爆表段换强调色；真值标签 back(1.8) 弹出；收尾 ≥36f 真静止。
//  改了：折线改成三根柱；琥珀换朱红；横屏卡片换成竖屏全屏；冲破点加一枚胶囊标签钉在天花板线上。
// 数值：value 用同一个单位（如「万」），before/after 是重标前后 y 轴的顶；前两根 ≤ before，第三根 = after。
//       第三根在冲顶前先长到 before 的 85%。标题一行 ≤9 个字（88px 宋体）；第三根的类目最多 3 行。
// 对时：bars/hero/tag/rescaleAt 写他说出那个词的绝对秒（组件提前 4f）；pierce.at 是冲破天花板线的那一刻（不提前，
//       第三根在它前 12f 开始加速）；rescaleAt 起 12f 完成重标。
import React from 'react';
import { useCurrentFrame, interpolate, Easing } from 'remotion';
import { Stage, INK, RED, PAPER, STONE, LINE, MUTED, SERIF, FONT, E, lerp, seg } from '../kit/Stage';
import { frameAt, Cue } from '../kit/time';

type Bar = { at: number; value: number; label: string; cat: string[] };
export type CeilingBreakProps = {
  t0: number;
  title: string; // 顶部标题（真语境），如「都按 10 万粉丝算」
  max: { before: number; after: number }; // 重标前 / 后 y 轴的顶
  ticks: { before: [string, string]; after: [string, string] }; // [顶, 中] 刻度文字
  bars: [Bar, Bar]; // 前两根：墨、灰；label 是柱顶数值文字
  hero: { at: number; value: number; cat: string[]; tag: Cue }; // 第三根（冲破的那根）+ 最后弹出的真值标签
  pierce: Cue; // 冲破天花板线时钉上的胶囊，如「没有天花板」
  rescaleAt: number; // y 轴重标的时刻
};

// 绘图区
const AX = 190, AR = 900, TOP = 640, BOT = 1380, PH = BOT - TOP;
const SLOT = (AR - AX) / 3;
const CX = [0, 1, 2].map((i) => AX + SLOT * (i + 0.5));
const BW = 150;
const SHOCK_Y = 196; // 冲顶位置：插进标题字区

const CLAMP = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

export const CeilingBreak: React.FC<CeilingBreakProps> = ({ t0, title, max, ticks, bars, hero, pierce, rescaleAt }) => {
  const f = useCurrentFrame();
  const fa = frameAt(t0);
  const at = (sec: number) => fa(sec) - 4;
  const K = {
    title: 20,
    ad: at(bars[0].at),
    flow: at(bars[1].at),
    third: at(hero.at),
    pierce: fa(pierce.at), // 冲破天花板线的那一帧
    beat: at(rescaleAt), // 重标
    tag: at(hero.tag.at),
  };
  const GROW_END = K.pierce - 12; // 第三根先正常长到 before 的 85%
  const SHOCK_END = GROW_END + 20; // in-cubic 冲顶
  const RESCALE_END = K.beat + 12;
  const rescale = interpolate(f, [K.beat, RESCALE_END], [0, 1], { ...CLAMP, easing: Easing.out(Easing.cubic) });
  const range = lerp(rescale, max.before, max.after);
  const yOf = (v: number) => BOT - (v / range) * PH;
  const swap = interpolate(f, [K.beat, K.beat + 10], [0, 1], { ...CLAMP, easing: Easing.out(Easing.cubic) });

  const adV = bars[0].value * seg(f, K.ad, K.ad + 24, E.outCubic);
  const flowV = bars[1].value * seg(f, K.flow, K.flow + 24, E.outCubic);
  // 第三根：正常长 → 冲顶 → 悬停 → 随重标落回它的真值（新量程的顶）
  const grow = interpolate(f, [K.third, GROW_END], [0, 0.85 * max.before], { ...CLAMP, easing: Easing.inOut(Easing.cubic) });
  const shock = interpolate(f, [GROW_END, SHOCK_END], [0, 1], { ...CLAMP, easing: Easing.in(Easing.cubic) });
  const y3grow = BOT - (grow / max.before) * PH;
  const y3shock = lerp(shock, y3grow, SHOCK_Y);
  const y3 = lerp(rescale, y3shock, yOf(hero.value));
  const shocked = f >= GROW_END;

  const kick = f >= SHOCK_END && f < SHOCK_END + 8 ? 8 * (1 - (f - SHOCK_END) / 8) * Math.sin((f - SHOCK_END) * 2.6) : 0;
  const titleIn = seg(f, K.title, K.title + 14, E.outCubic);
  const chip = seg(f, K.pierce, K.pierce + 10, (t) => E.outBack(t, 2.2));
  const tag = seg(f, K.tag, K.tag + 10, (t) => E.outBack(t, 1.8));

  const bar = (i: number, top: number, color: string, a: number) => (
    <div style={{ position: 'absolute', left: CX[i] - BW / 2, top, width: BW, height: Math.max(0, BOT - top), background: color, opacity: seg(f, a, a + 3) }} />
  );
  const val = (i: number, top: number, text: string, a: number) => {
    const t = seg(f, a + 14, a + 24, E.outCubic);
    return <div style={{ position: 'absolute', left: CX[i] - 140, top: top - 74, width: 280, textAlign: 'center', fontFamily: FONT, fontSize: 48, fontWeight: 900, color: INK,
      opacity: t, transform: `translateY(${lerp(t, 10, 0)}px)` }}>{text}</div>;
  };
  const cat = (i: number, rows: string[], a: number, size: number) => {
    const t = seg(f, a, a + 12, E.outCubic);
    return <div style={{ position: 'absolute', left: CX[i] - SLOT / 2, top: BOT + 26, width: SLOT, textAlign: 'center', fontFamily: FONT, fontSize: size, fontWeight: 800,
      lineHeight: 1.22, color: i === 2 ? RED : INK, opacity: t, transform: `translateY(${lerp(t, 14, 0)}px)` }}>{rows.map((r, k) => <div key={k}>{r}</div>)}</div>;
  };

  return (
    <Stage bg={PAPER} mode="step">
      <div style={{ position: 'absolute', top: 196, width: 1080, textAlign: 'center', fontFamily: SERIF, fontWeight: 900, fontSize: 88, lineHeight: 1.2, color: INK,
        opacity: titleIn, transform: `translateY(${lerp(titleIn, 24, 0)}px)` }}>{title}</div>

      <div style={{ position: 'absolute', inset: 0, transform: `translateY(${kick}px)` }}>
        {/* 网格：3 根 + 重标同帧加密 2 根 */}
        {[0, 1].map((k) => <div key={k} style={{ position: 'absolute', left: AX, width: AR - AX + 40, top: TOP + (PH / 2) * k - 1, height: 3, background: k === 0 ? INK : LINE }} />)}
        {[0.25, 0.75].map((k) => <div key={k} style={{ position: 'absolute', left: AX, width: AR - AX + 40, top: TOP + PH * k - 1, height: 2, background: LINE, opacity: swap }} />)}

        {/* 刻度：旧下飞淡出 / 新上滑 */}
        {[[ticks.before[0], ticks.after[0]], [ticks.before[1], ticks.after[1]]].map(([o, n], k) => {
          const y = TOP + (PH / 2) * k - 26;
          return (
            <div key={k} style={{ position: 'absolute', left: 20, top: y, width: AX - 40, height: 52, fontFamily: FONT, fontSize: 44, fontWeight: 800, textAlign: 'right' }}>
              <div style={{ position: 'absolute', inset: 0, color: MUTED, opacity: 1 - swap, transform: `translateY(${swap * 30}px)` }}>{o}</div>
              <div style={{ position: 'absolute', inset: 0, color: INK, opacity: swap, transform: `translateY(${(swap - 1) * 30}px)` }}>{n}</div>
            </div>
          );
        })}
        <div style={{ position: 'absolute', left: 20, top: BOT - 26, width: AX - 40, textAlign: 'right', fontFamily: FONT, fontSize: 44, fontWeight: 800, color: MUTED }}>0</div>

        {/* 柱 */}
        {f >= K.ad && bar(0, yOf(adV), INK, K.ad)}
        {f >= K.flow && bar(1, yOf(flowV), STONE, K.flow)}
        {f >= K.third && bar(2, y3, shocked ? RED : INK, K.third)}

        {/* 坐标轴 */}
        <div style={{ position: 'absolute', left: AX - 3, top: TOP - 20, width: 6, height: PH + 23, background: INK }} />
        <div style={{ position: 'absolute', left: AX - 3, top: BOT - 3, width: AR - AX + 43, height: 6, background: INK }} />

        {f >= K.ad && val(0, yOf(adV), bars[0].label, K.ad)}
        {f >= K.flow && val(1, yOf(flowV), bars[1].label, K.flow)}
        {f >= K.ad && cat(0, bars[0].cat, K.ad, 54)}
        {f >= K.flow && cat(1, bars[1].cat, K.flow, 54)}
        {f >= K.third && cat(2, hero.cat, K.third, 46)}

        {/* 冲破点：钉在天花板线上 */}
        {f >= K.pierce && (
          <div style={{ position: 'absolute', left: CX[2] - BW / 2 - 24 - 272, top: TOP + 22, width: 272, height: 64, background: INK, color: PAPER, borderRadius: 32,
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT, fontSize: 42, fontWeight: 800,
            opacity: seg(f, K.pierce, K.pierce + 3), transform: `scale(${lerp(chip, 0.6, 1)})`, transformOrigin: '100% 50%' }}>{pierce.text}</div>
        )}
        {/* 真值标签 */}
        {f >= K.tag && (
          <div style={{ position: 'absolute', left: CX[2] - 130, top: yOf(hero.value) - 100, width: 260, height: 80, background: RED, color: PAPER, borderRadius: 14,
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT, fontSize: 54, fontWeight: 900,
            transform: `scale(${tag})`, transformOrigin: '50% 100%' }}>{hero.tag.text}</div>
        )}
      </div>
    </Stage>
  );
};
