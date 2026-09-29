// 反差横条（胸前卡片）：上面一根长条冲到量程尽头「撞线」（卡内一震），下面一根细得几乎看不见的红条，
// 用红圈把眼睛拽过去——两个数量级差很远的数放在同一把尺子上，反差就是重点。可选底部一句反问。
// 什么时候用：「爆款数据很大，但转化/粉丝/成交很小」这类对比；两行一大一小，可带一句结论或反问。
// Park 9/29 认可（2026-09-28 那条的 6:22「点赞 10–20 万 vs 粉丝 300–400」、6:38「播放 500 万 vs 粉丝 500–1000 · 你会关注吗？」）。
// ShotCraft 来源：data/chart-live-moves（AxisRescaleShockV2.tsx）——用「bar 对比」，不用重标
//  （卡上写明重标一条片子只能用一次；需要重标请用 axis-rescale-shock 类镜头）。
//  保留——真图表语境（真标签/真单位/满量程轨道 + 网格线，无编造刻度）；主条最后一段 ease-in 冲顶
//        「撞」到量程尽头，撞线同帧卡内震 8px 8f 衰减；端点标记 back-out(2.2) 弹出 + 一圈外扩；
//        数值标签 back-out 弹出；落定后真静止到出场。
//  改动——折线换成横条（竖屏胸前卡片 752 宽）；琥珀换朱红，只给小数那一行；
//        端点标记挪到几乎看不见的细条上（3px 红条 + 红圈）。
// 时间：所有 at 都是口播原片绝对秒；标签、数值、细条、结论都提前 3 帧出。
//  big.stages 是主条分几段长：每段给「到位时刻」arriveAt 和到哪儿 frac（0–1），中间段 12f ease-out，
//  最后一段 14f ease-in 撞线（撞线那一帧卡片震一下）。
import React from 'react';
import { useCurrentFrame, interpolate } from 'remotion';
import { INK, RED, STONE, LINE, MUTED, FONT, E, lerp, seg } from '../kit/Stage';
import { Card } from '../kit/Card';
import { frameAt, Cue } from '../kit/time';

export type BigRow = {
  label: string; value: string; unit?: string; // 行名、数值（大字）、单位（小一号），如「点赞」「10–20」「万」
  labelAt: number; valueAt: number;
  stages: { arriveAt: number; frac: number }[]; // 主条分段到位，最后一段撞线
};
export type TinyRow = { label: string; value: string; unit?: string; labelAt: number; valueAt: number; barAt: number }; // barAt：细条和红圈出现
export type FanGapBarsProps = { t0: number; big: BigRow; tiny: TinyRow; footer?: Cue };

const W = 752, X0 = 40, BW = W - X0, TRACK_H = 76, ROW_H = 246, HAIR = 3;

const ease = { out: E.outCubic, slam: E.inCubic };
const LEAD = 3;
const stageDur = (i: number, n: number) => (i === n - 1 ? 14 : 12);

// 主条宽度：每段 stage 从上一段位置出发；最后一段 ease-in 冲顶（撞线），中间段 ease-out
const bigWidth = (f: number, stages: { at: number; frac: number }[]) => {
  let w = 0;
  stages.forEach((s, i) => {
    const last = i === stages.length - 1;
    const dur = stageDur(i, stages.length);
    const p = seg(f, s.at, s.at + dur, last ? ease.slam : ease.out);
    const from = i === 0 ? 0 : stages[i - 1].frac;
    if (f >= s.at) w = lerp(p, from, s.frac) * BW;
  });
  return w;
};

const Label: React.FC<{ f: number; text: string; at: number }> = ({ f, text, at }) => {
  const p = seg(f, at, at + 12, E.outCubic);
  return (
    <span style={{ fontSize: 46, fontWeight: 700, color: MUTED, opacity: p, display: 'inline-block', transform: `translateY(${lerp(p, 20, 0)}px)`, filter: `blur(${(1 - p) * 8}px)`, marginRight: 22 }}>{text}</span>
  );
};

const Value: React.FC<{ f: number; num: string; unit?: string; at: number; color: string }> = ({ f, num, unit, at, color }) => {
  const s = seg(f, at, at + 12, (t) => E.outBack(t, 2.2));
  const o = seg(f, at, at + 4);
  return (
    <span style={{ display: 'inline-flex', alignItems: 'baseline', color, opacity: o, transform: `scale(${lerp(s, 0.5, 1)})`, transformOrigin: '0% 80%', fontWeight: 900, lineHeight: 1 }}>
      <span style={{ fontSize: 100, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>{num}</span>
      {unit ? <span style={{ fontSize: 54, fontWeight: 800, marginLeft: 8 }}>{unit}</span> : null}
    </span>
  );
};

const Track: React.FC<{ top: number; op: number }> = ({ top, op }) => (
  <div style={{ position: 'absolute', left: X0, top, width: BW, height: TRACK_H, borderRadius: 12, background: LINE, opacity: op }} />
);

export const FanGapBars: React.FC<FanGapBarsProps> = ({ t0, big: bigS, tiny: tinyS, footer: footS }) => {
  const f = useCurrentFrame();
  const at = frameAt(t0);
  const big = {
    ...bigS, labelAt: at(bigS.labelAt) - LEAD, valueAt: at(bigS.valueAt) - LEAD,
    stages: bigS.stages.map((s, i) => ({ at: at(s.arriveAt) - stageDur(i, bigS.stages.length), frac: s.frac })),
  };
  const tiny = { ...tinyS, labelAt: at(tinyS.labelAt) - LEAD, valueAt: at(tinyS.valueAt) - LEAD, barAt: at(tinyS.barAt) - LEAD };
  const footer = footS ? { at: at(footS.at) - LEAD, text: footS.text } : undefined;
  const H = footer ? 560 : 476;
  const trackOp = seg(f, 4, 16, E.outQuad);
  const r1 = 0, r2 = ROW_H;
  const t1 = r1 + 130, t2 = r2 + 130;

  // 主条
  const bw = bigWidth(f, big.stages);
  const lastAt = big.stages[big.stages.length - 1].at;
  const hit = lastAt + 14;
  const kick = f >= hit && f < hit + 8 ? 8 * (1 - (f - hit) / 8) * Math.sin((f - hit) * 2.6) : 0;
  const flash = interpolate(f, [hit, hit + 2, hit + 10], [0, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  // 细条 + 端点标记
  const hw = seg(f, tiny.barAt, tiny.barAt + 8, E.outExpo) * HAIR;
  const mk = seg(f, tiny.barAt + 4, tiny.barAt + 16, (t) => E.outBack(t, 2.2));
  const wave = seg(f, tiny.barAt + 12, tiny.barAt + 26, E.outCubic);

  const foot = footer ? seg(f, footer.at, footer.at + 12, E.outCubic) : 0;
  const cy2 = t2 + TRACK_H / 2;

  return (
    <Card>
      <div style={{ position: 'relative', width: W, height: H, fontFamily: FONT, transform: `translateY(${kick.toFixed(2)}px)` }}>
        {/* 网格：满量程 0/25/50/75/100%，只画线不标数 */}
        {[0, 0.25, 0.5, 0.75, 1].map((g, i) => (
          <div key={i} style={{ position: 'absolute', left: X0 + Math.min(BW - 2, g * BW), top: t1 - 14, width: 2, height: t2 + TRACK_H + 14 - (t1 - 14), background: i === 0 ? STONE : LINE, opacity: trackOp }} />
        ))}

        {/* 行 1 */}
        <div style={{ position: 'absolute', left: X0, top: r1, height: 108, display: 'flex', alignItems: 'flex-end' }}>
          <Label f={f} text={big.label} at={big.labelAt} />
          {f >= big.valueAt && <Value f={f} num={big.value} unit={big.unit} at={big.valueAt} color={INK} />}
        </div>
        <Track top={t1} op={trackOp} />
        {bw > 0 && (
          <div style={{ position: 'absolute', left: X0, top: t1, width: bw, height: TRACK_H, borderRadius: 12, background: INK, overflow: 'hidden' }}>
            <div style={{ position: 'absolute', inset: 0, background: '#ffffff', opacity: flash * 0.35 }} />
          </div>
        )}

        {/* 行 2 */}
        <div style={{ position: 'absolute', left: X0, top: r2, height: 108, display: 'flex', alignItems: 'flex-end' }}>
          <Label f={f} text={tiny.label} at={tiny.labelAt} />
          {f >= tiny.valueAt && <Value f={f} num={tiny.value} unit={tiny.unit} at={tiny.valueAt} color={RED} />}
        </div>
        <Track top={t2} op={trackOp} />
        {hw > 0 && <div style={{ position: 'absolute', left: X0, top: t2, width: hw, height: TRACK_H, background: RED }} />}
        {mk > 0 && (
          <svg width={200} height={200} style={{ position: 'absolute', left: X0 + HAIR / 2 - 100, top: cy2 - 100, overflow: 'visible' }}>
            <circle cx={100} cy={100} r={50 * mk} fill="none" stroke={RED} strokeWidth={6} />
            {wave > 0 && wave < 1 && <circle cx={100} cy={100} r={50 + wave * 40} fill="none" stroke={RED} strokeWidth={4} opacity={0.6 * (1 - wave)} />}
          </svg>
        )}

        {footer && (
          <div style={{
            position: 'absolute', left: 0, width: W, top: t2 + TRACK_H + 30, textAlign: 'center', fontSize: 60, fontWeight: 800, color: INK, lineHeight: 1.1,
            opacity: foot, transform: `translateY(${lerp(foot, 30, 0)}px)`, filter: `blur(${(1 - foot) * 10}px)`,
          }}>{footer.text}</div>
        )}
      </div>
    </Card>
  );
};
