// 积少成多（胸前卡片）：左边一场暴雨一次堆出高柱（别人 1 条）；右边先滴出一根矮柱（我 1 条），
// 再一阵细雨下出另外几根；最后矮柱依次飞起、摞成一根和左柱等高的柱子（块间留纸白接缝，数得出几块），
// 红色虚线拉平两根柱顶，弹「= 总数」。
// 什么时候用：「别人一次做到 X，我做 N 次也能做到 X」——一个大的 = N 个小的相加（N 取 2–10，默认 10）。
// Park 9/29 认可（2026-09-28 那条的 9:27，「别人 1 条 10 万 / 我 1 条 1 万 → 我发 10 条 = 10 万」）。
// ShotCraft 来源：data/particle-sand-fill（ParticleSandFill.tsx），落体语法在 ../kit/SandRainKit
//  保留——方点雨重力坠落、触面即停 + 单次回弹、闭式堆积面；多柱错峰启动（小柱逐根 1.2f 错峰，雨势从左往右推）；
//        堆满 → 粒子淡出换实体柱 → 数值 back-out 弹出；末段粒子全部卸载、真静止。
//  改动——从「几根柱各自下雨」改成「一根大的 vs 几根小的摞起来」：小柱 12f inOutCubic 带弧线飞到堆叠位，逐块 1.2f 错峰。
// 时间：所有 at 都是口播原片绝对秒。分类字提前 3 帧；数值提前 4 帧（柱在此前堆满）；
//  many.at 同时是「分类字换成 N 条」（提前 3 帧）和「细雨开始」（提前 4 帧）；merge.at 提前 4 帧开始摞；
//  merge.valueAt 提前 4 帧弹总数，虚线再早 4 帧开始拉。
import React from 'react';
import { useCurrentFrame } from 'remotion';
import { INK, RED, STONE, MUTED, FONT, E, lerp, seg } from '../kit/Stage';
import { Card } from '../kit/Card';
import { RainGrains, RainSpec } from '../kit/SandRainKit';
import { frameAt } from '../kit/time';

export type RainStackMergeProps = {
  t0: number;
  unit?: string; // 数值单位，如「万」
  copies?: number; // 右边几根小柱摞成一根（2–10，默认 10）
  other: { cat: string; value: string; catAt: number; rainAt: number; valueAt: number }; // 左：大的那一根，如「别人 1 条」「10」
  mine: { cat: string; value: string; at: number; valueAt: number }; // 右：第一根小柱，at = 分类字出现并开始下雨
  many: { cat: string; at: number }; // 分类字换成「我发 10 条」，其余小柱下雨
  merge: { at: number; value: string; prefix?: string; valueAt: number }; // 小柱开始摞；摞完弹总数，如「=」「10」
};

const W = 752, H = 462, BASE = 390, G = 14;
const TALL = 280; // 左柱 / 摞好的柱高
const TEXT_LEAD = 3, NUM_LEAD = 4;
const L = { cx: 140, w: 140 }; // 左：别人 1 条
const SLOT_W = 42, SLOT_GAP = 8, SLOT_X0 = 255; // 右：最多 10 根矮柱
const slotX = (k: number) => SLOT_X0 + k * (SLOT_W + SLOT_GAP);
const STACK = { cx: 500, w: 140 };

const MERGE_DUR = 12;

const Num: React.FC<{ p: number; num: string; unit?: string; color: string; size: number; prefix?: string }> = ({ p, num, unit, color, size, prefix }) => (
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'baseline', color, fontWeight: 900, lineHeight: 1, whiteSpace: 'nowrap', transform: `scale(${p})`, transformOrigin: '50% 100%' }}>
    {prefix ? <span style={{ fontSize: size * 0.7, marginRight: 8 }}>{prefix}</span> : null}
    <span style={{ fontSize: size, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>{num}</span>
    {unit ? <span style={{ fontSize: size * 0.52, fontWeight: 800, marginLeft: 6 }}>{unit}</span> : null}
  </div>
);

const blur = (p: number, dy = 22) => ({ opacity: p, transform: `translateY(${lerp(p, dy, 0)}px)`, filter: `blur(${(1 - p) * 8}px)` });

export const RainStackMerge: React.FC<RainStackMergeProps> = ({ t0, unit, copies = 10, other, mine, many, merge }) => {
  const f = useCurrentFrame();
  const at = frameAt(t0);
  const N = copies;
  const UNIT = TALL / N;
  const K = {
    lCat: at(other.catAt) - TEXT_LEAD, lRain: at(other.rainAt), lDone: at(other.valueAt) - NUM_LEAD,
    rCat: at(mine.at) - TEXT_LEAD, s0Rain: at(mine.at) - TEXT_LEAD, s0Done: at(mine.valueAt) - NUM_LEAD,
    ten: at(many.at) - TEXT_LEAD, sRain: at(many.at) - NUM_LEAD,
    merge: at(merge.at) - NUM_LEAD, sum: at(merge.valueAt) - NUM_LEAD,
  };
  const SLOT_RAIN = (k: number) => (k === 0 ? K.s0Rain : K.sRain + (k - 1) * 1.2);
  const SLOT_DONE = (k: number) => (k === 0 ? K.s0Done : SLOT_RAIN(k) + 15);
  const MERGE_AT = (k: number) => K.merge + k * 1.2;
  const leftSpec: RainSpec = { left: L.cx - L.w / 2, base: BASE, cols: 10, n: 10 * (TALL / G), grain: G, start: K.lRain, done: K.lDone, seed: 301, drop: [180, 40] };
  const slotSpec = (k: number): RainSpec => ({
    left: slotX(k), base: BASE, cols: 3, n: Math.round(3 * (UNIT / G)), grain: G, start: SLOT_RAIN(k), done: SLOT_DONE(k), seed: 401 + k * 5,
    drop: [120, 20], redRatio: 0.25,
  });
  const lSolid = seg(f, K.lDone, K.lDone + 8, E.outQuad);
  const lPop = seg(f, K.lDone + 2, K.lDone + 14, (t) => E.outBack(t, 2.2));
  const lCat = seg(f, K.lCat, K.lCat + 12, E.outCubic);
  const rCat1 = seg(f, K.rCat, K.rCat + 12, E.outCubic) * (1 - seg(f, K.ten, K.ten + 6));
  const rCat2 = seg(f, K.ten + 3, K.ten + 15, E.outCubic);
  const s0Pop = seg(f, K.s0Done + 2, K.s0Done + 14, (t) => E.outBack(t, 2.2)) * (1 - seg(f, K.merge - 2, K.merge + 4));
  const sumPop = seg(f, K.sum, K.sum + 12, (t) => E.outBack(t, 2.2));
  const line = seg(f, K.sum - 4, K.sum + 10, E.inOutCubic);
  const catX = (slotX(0) + slotX(9) + SLOT_W) / 2; // 右侧分类字的中心 ≈ STACK.cx

  return (
    <Card>
      <div style={{ position: 'relative', width: W, height: H, fontFamily: FONT }}>
        <div style={{ position: 'absolute', left: 0, top: 0, width: W, height: BASE, overflow: 'hidden' }}>
          {lSolid < 1 && <RainGrains f={f} spec={leftSpec} opacity={1 - lSolid} />}
          {Array.from({ length: N }).map((_, k) => {
            const sd = SLOT_DONE(k);
            const sol = seg(f, sd, sd + 6, E.outQuad);
            return sol < 1 ? <RainGrains key={k} f={f} spec={slotSpec(k)} opacity={1 - sol} /> : null;
          })}
        </div>
        <div style={{ position: 'absolute', left: 0, top: BASE, width: W, height: 4, borderRadius: 2, background: STONE }} />

        {/* 左柱 */}
        {lSolid > 0 && <div style={{ position: 'absolute', left: L.cx - L.w / 2, top: BASE - TALL, width: L.w, height: TALL, borderRadius: '8px 8px 0 0', background: INK, opacity: lSolid }} />}
        {lPop > 0 && <div style={{ position: 'absolute', left: L.cx - 130, width: 260, top: BASE - TALL - 12 - 94 }}><Num p={lPop} num={other.value} unit={unit} color={INK} size={94} /></div>}

        {/* 右：N 块小柱（先各自成柱，再依次飞起摞成一根） */}
        {Array.from({ length: N }).map((_, k) => {
          const sd = SLOT_DONE(k);
          const sol = seg(f, sd, sd + 6, E.outQuad);
          if (sol <= 0) return null;
          const m = seg(f, MERGE_AT(k), MERGE_AT(k) + MERGE_DUR, E.inOutCubic);
          const x0 = slotX(k), x1 = STACK.cx - STACK.w / 2;
          const y0 = BASE - UNIT, y1 = BASE - UNIT * (k + 1);
          const arc = Math.sin(m * Math.PI) * 26;
          const land = m >= 1 ? 1 : 0;
          return (
            <div key={k} style={{
              position: 'absolute', left: lerp(m, x0, x1), top: lerp(m, y0, y1) - arc, width: lerp(m, SLOT_W, STACK.w), height: UNIT,
              background: INK, opacity: sol, borderRadius: m < 1 ? '5px 5px 0 0' : k === N - 1 ? '8px 8px 0 0' : 0,
              boxShadow: land && k > 0 ? 'inset 0 -3px 0 rgba(244,241,234,0.9)' : m > 0 && m < 1 ? '0 0 0 2px rgba(244,241,234,0.95)' : 'none',
            }} />
          );
        })}
        {s0Pop > 0 && <div style={{ position: 'absolute', left: slotX(0) + SLOT_W / 2 - 80, width: 160, top: BASE - UNIT - 12 - 58 }}><Num p={s0Pop} num={mine.value} unit={unit} color={INK} size={58} /></div>}

        {/* 拉平两根柱顶的红色虚线 + 总数 */}
        {line > 0 && (
          <svg width={W} height={H} style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible' }}>
            <line x1={L.cx + L.w / 2 + 8} y1={BASE - TALL} x2={lerp(line, L.cx + L.w / 2 + 8, STACK.cx - STACK.w / 2 - 8)} y2={BASE - TALL}
              stroke={RED} strokeWidth={5} strokeDasharray="14 10" strokeLinecap="round" />
          </svg>
        )}
        {sumPop > 0 && <div style={{ position: 'absolute', left: STACK.cx - 160, width: 320, top: BASE - TALL - 12 - 94 }}><Num p={sumPop} num={merge.value} unit={unit} color={RED} size={94} prefix={merge.prefix} /></div>}

        {/* 分类字 */}
        <div style={{ position: 'absolute', left: L.cx - 110, width: 220, top: BASE + 18, textAlign: 'center', fontSize: 44, fontWeight: 700, color: MUTED, lineHeight: 1.1, ...blur(lCat) }}>{other.cat}</div>
        <div style={{ position: 'absolute', left: slotX(0) + 30, width: 240, top: BASE + 18, textAlign: 'left', fontSize: 44, fontWeight: 800, color: INK, lineHeight: 1.1, ...blur(rCat1) }}>{mine.cat}</div>
        <div style={{ position: 'absolute', left: catX - 160, width: 320, top: BASE + 18, textAlign: 'center', fontSize: 44, fontWeight: 800, color: INK, lineHeight: 1.1, ...blur(rCat2) }}>{many.cat}</div>
      </div>
    </Card>
  );
};
