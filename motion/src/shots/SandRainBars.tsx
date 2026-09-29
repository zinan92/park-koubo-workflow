// 粒子雨柱状图（胸前卡片）：3–5 根柱「下雨下出来」——每根柱说到它时开始下方点雨，说出数值那一刻堆满、
// 粒子淡出换实体柱、顶部数值 back-out 弹出；最后一句结论出字时，各柱从左到右朱红脉冲一次。
// 什么时候用：讲几组量级不同的数据（几条视频各多少播放、几个渠道各多少人），想让「量」看得见地攒出来。
// Park 9/29 认可（2026-09-28 那条的 1:10，「1 条 20 万 / 2 条 10 万 / 几条 7–8 万 / 几条 3–4 万 → 每一条都上万」）。
// ShotCraft 来源：data/particle-sand-fill（ParticleSandFill.tsx），落体语法在 ../kit/SandRainKit
//  保留——每柱上方方点雨（14px 粒）、重力加速坠落、触面即停 + 单次回弹、堆积面闭式预解析；
//        柱与柱错峰启动；堆满 → 粒子面 8f 淡出换实体柱 → 顶部数值 back-out(2.2) 弹出；
//        粒子交接完即条件卸载，末段只剩实体柱 + 标签真静止。
//  改动——横版图表卡改成竖屏胸前卡片（内容 752×548）；起雨/堆满帧跟口播走；琥珀换朱红（只点缀在粒子里）；
//        收尾加一道逐柱朱红脉冲。
// 时间：所有 at 都是口播原片绝对秒（查 words.json）。分类字提前 3 帧、数值提前 4 帧（柱在数值前 4 帧堆满）。
// 柱高按 height 的比例换算，最高那根 294px（数字用 100px 大字），其余数字 62px。
import React from 'react';
import { useCurrentFrame, interpolate } from 'remotion';
import { INK, RED, STONE, MUTED, FONT, E, lerp, seg } from '../kit/Stage';
import { Card } from '../kit/Card';
import { RainGrains, RainSpec } from '../kit/SandRainKit';
import { frameAt, Cue } from '../kit/time';

export type SandRainBar = {
  cat: string; // 柱下分类字，如「1 条」
  num: string; // 柱顶数值，如「20」「7–8」
  unit?: string; // 数值单位（小一号），如「万」
  height: number; // 柱高（只看比例），如 20 / 10 / 7.5 / 3.5
  catAt: number; // 说到分类的时刻
  valueAt: number; // 说出数值的时刻（柱在此前 4 帧堆满）
  rainAt?: number; // 开始下雨的时刻；省略 = valueAt 前 1.2 秒
};
export type SandRainBarsProps = { t0: number; bars: SandRainBar[]; footer?: Cue };

const W = 752, H = 548, BASE = 408, G = 14, COLS = 10, BW = G * COLS, MAX_H = 294;
const TEXT_LEAD = 3, NUM_LEAD = 4;

export const SandRainBars: React.FC<SandRainBarsProps> = ({ t0, bars, footer }) => {
  const f = useCurrentFrame();
  const at = frameAt(t0);
  const hMax = Math.max(...bars.map((b) => b.height));
  const B = bars.map((b, i) => {
    const done = at(b.valueAt) - NUM_LEAD;
    return {
      cx: (W * (i + 0.5)) / bars.length, h: Math.round((b.height / hMax) * MAX_H), cat: b.cat, num: b.num, unit: b.unit,
      big: b.height === hMax, catAt: at(b.catAt) - TEXT_LEAD, done, rain: b.rainAt !== undefined ? at(b.rainAt) : done - 32,
    };
  });
  const spec = (b: (typeof B)[number], i: number): RainSpec => ({
    left: b.cx - BW / 2, base: BASE, cols: COLS, n: Math.round((b.h / G) * COLS), grain: G,
    start: b.rain, done: b.done, seed: 11 + i * 7, drop: b.big ? [190, 40] : [160, 40],
  });
  const FOOT = footer ? at(footer.at) - NUM_LEAD : 1e6;
  const foot = seg(f, FOOT, FOOT + 12, E.outCubic);
  return (
    <Card>
      <div style={{ position: 'relative', width: W, height: H, fontFamily: FONT }}>
        {/* 粒子层：只在绘图区内（卡片上沿以下）可见 */}
        <div style={{ position: 'absolute', left: 0, top: 0, width: W, height: BASE, overflow: 'hidden' }}>
          {B.map((b, i) => {
            const solid = seg(f, b.done, b.done + 8, E.outQuad);
            return solid < 1 ? <RainGrains key={i} f={f} spec={spec(b, i)} opacity={1 - solid} /> : null;
          })}
        </div>
        {/* 基线 */}
        <div style={{ position: 'absolute', left: 0, top: BASE, width: W, height: 4, borderRadius: 2, background: STONE }} />
        {B.map((b, i) => {
          const solid = seg(f, b.done, b.done + 8, E.outQuad);
          const pop = seg(f, b.done + 2, b.done + 14, (t) => E.outBack(t, 2.2));
          const cat = seg(f, b.catAt, b.catAt + 12, E.outCubic);
          // 结论出字：从左到右逐柱朱红脉冲一次
          const pa = FOOT + 2 + i * 3;
          const pulse = interpolate(f, [pa, pa + 3, pa + 10], [0, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
          const numSize = b.big ? 100 : 62;
          return (
            <React.Fragment key={i}>
              {solid > 0 && (
                <div style={{ position: 'absolute', left: b.cx - BW / 2, top: BASE - b.h, width: BW, height: b.h, borderRadius: '8px 8px 0 0', background: INK, opacity: solid, overflow: 'hidden' }}>
                  <div style={{ position: 'absolute', inset: 0, background: RED, opacity: pulse }} />
                </div>
              )}
              {pop > 0 && (
                <div style={{
                  position: 'absolute', left: b.cx - 130, width: 260, top: BASE - b.h - 12 - numSize, height: numSize,
                  display: 'flex', justifyContent: 'center', alignItems: 'baseline', whiteSpace: 'nowrap',
                  transform: `scale(${pop})`, transformOrigin: '50% 100%', color: INK, fontWeight: 900, lineHeight: 1,
                }}>
                  <span style={{ fontSize: numSize, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em' }}>{b.num}</span>
                  {b.unit ? <span style={{ fontSize: numSize * 0.52, fontWeight: 800, marginLeft: 6 }}>{b.unit}</span> : null}
                </div>
              )}
              <div style={{
                position: 'absolute', left: b.cx - 94, width: 188, top: BASE + 16, textAlign: 'center',
                fontSize: 44, fontWeight: 700, color: MUTED, lineHeight: 1.1,
                opacity: cat, transform: `translateY(${lerp(cat, 24, 0)}px)`, filter: `blur(${(1 - cat) * 8}px)`,
              }}>{b.cat}</div>
            </React.Fragment>
          );
        })}
        {footer && (
          <div style={{
            position: 'absolute', left: 0, width: W, top: BASE + 84, textAlign: 'center', fontSize: 54, fontWeight: 800, color: RED,
            letterSpacing: '0.04em', lineHeight: 1.1, opacity: foot, transform: `translateY(${lerp(foot, 30, 0)}px)`, filter: `blur(${(1 - foot) * 10}px)`,
          }}>{footer.text}</div>
        )}
      </div>
    </Card>
  );
};
