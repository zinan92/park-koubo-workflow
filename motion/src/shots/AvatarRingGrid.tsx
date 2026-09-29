// 头像圈（胸前卡片）：一圈 42 个灰色头像占位从中心向外分环长出，围住中间的大数字；
// 点名段里头像随机陆续上色（墨黑 / 暖灰 / ~15% 朱红），最后一道朱红扫描线从上扫到下把剩下的全部点亮，同时出结论。
// 什么时候用：讲「一群人 / 一批账号 / 几十个对象」——先说有多少个，再说挨个看、最后全部拿来做某件事。
// Park 9/29 认可（2026-09-28 那条的 7:12，「40–50 个 AI 博主 · 全都拿来分析」）。
// ShotCraft 来源：data/avatar-grid-radial-build-colorize（AvatarGridRadialBuildColorize.tsx）
//  保留——分环 stagger（到中心的椭圆距离 hypot(dc, dr/0.85) 定延迟 + 每格 3f rand 抖动，波前有机不机械）；
//        入场只做 opacity + scale 0.8→1（outQuad），无位移——「长出来」不是「飞进来」；
//        中央区域 visibility:hidden 占位留给主字（不删格子，环心不偏）；
//        染色幕各格在随机时刻各自上色，底/剪影同一条 cT 曲线驱动；标题 scale 0.98→1 先入。
//  改动——8×7 横版小卡改成 11×7 圆形头像格（灰色占位剪影，不用真人头像），中央 7×5 挖空只剩一圈 42 个；
//        状态色换品牌色；上色分两段：点名段（pick 窗口内随机）+ 扫描段（朱红扫描线 20f 扫完，只走头像格不划过主字）。
// 时间：所有 at 都是口播原片绝对秒；主字、副字、结论提前 3 帧出，扫描线与结论同帧开始；pick 窗口不提前。
// 版式：中央挖空 468×332，主字 118px——「40–50」这种 5 个字符以内的数字放得下，再长会溢出。
import React from 'react';
import { useCurrentFrame } from 'remotion';
import { INK, RED, MUTED, PAPER, FONT, E, lerp, seg } from '../kit/Stage';
import { rand } from '../kit/Motion';
import { Card } from '../kit/Card';
import { frameAt, Cue } from '../kit/time';

export type AvatarRingGridProps = {
  t0: number;
  count: { at: number; num: string; unit?: string }; // 中间大数字，如「40–50」「个」
  sub?: Cue; // 大数字下的名词，如「AI 博主」
  pick: { from: number; to: number }; // 点名段：这段时间里约一半头像随机陆续上色
  sweep: Cue; // 扫描线扫过、剩下的全部上色，同时出这句结论（朱红）
};

const LEAD = 3, GROW = 6;

const COLS = 11, ROWS = 7, CELL = 60, GAP = 8, PITCH = CELL + GAP;
const W = 752, GW = COLS * PITCH - GAP, GH = ROWS * PITCH - GAP; // 740 × 468
const OX = (W - GW) / 2;
const H = GH;
const GRAY = '#D8D2C6';
const SIL = '#EEEAE2';

const hex2rgb = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const mix = (a: string, b: string, t: number) => {
  const A = hex2rgb(a), B = hex2rgb(b);
  return `rgb(${A.map((v, i) => Math.round(v + (B[i] - v) * t)).join(',')})`;
};

const SCAN_DUR = 20;
type K = { pickA: number; pickB: number; all: number };
const cellsFor = (K: K) => Array.from({ length: ROWS * COLS }, (_, i) => {
  const r = Math.floor(i / COLS), c = i % COLS;
  const hidden = r >= 1 && r <= 5 && c >= 2 && c <= 8;
  const dist = Math.hypot(c - 5, (r - 3) / 0.85);
  const k = rand(i * 9.1);
  const color = k < 0.15 ? RED : k < 0.4 ? MUTED : INK;
  const picked = rand(i + 900) < 0.55; // 点名段上色的一批，其余等扫描线
  const pickAt = K.pickA + rand(i + 1600) * (K.pickB - K.pickA);
  const y = r * PITCH + CELL / 2;
  const scanAt = K.all + (y / GH) * SCAN_DUR;
  return { r, c, hidden, dist, color, colorAt: picked ? pickAt : scanAt };
});
const MIN_D = Math.min(...cellsFor({ pickA: 0, pickB: 0, all: 0 }).filter((c) => !c.hidden).map((c) => c.dist));

const Avatar: React.FC<{ bg: string; sil: string }> = ({ bg, sil }) => (
  <svg width={CELL} height={CELL} viewBox="0 0 60 60" style={{ display: 'block' }}>
    <defs><clipPath id="avatarRingClip"><circle cx={30} cy={30} r={30} /></clipPath></defs>
    <circle cx={30} cy={30} r={30} fill={bg} />
    <g clipPath="url(#avatarRingClip)" fill={sil}>
      <circle cx={30} cy={24} r={10.5} />
      <path d="M8 62 C8 45 18 38 30 38 C42 38 52 45 52 62 Z" />
    </g>
  </svg>
);

export const AvatarRingGrid: React.FC<AvatarRingGridProps> = ({ t0, count, sub, pick, sweep }) => {
  const f = useCurrentFrame();
  const at = frameAt(t0);
  const K = { grow: GROW, num: at(count.at) - LEAD, ai: sub ? at(sub.at) - LEAD : 1e6, pickA: at(pick.from), pickB: at(pick.to), all: at(sweep.at) - LEAD };
  const CELLS = React.useMemo(() => cellsFor(K), [K.pickA, K.pickB, K.all]);
  const num = seg(f, K.num, K.num + 12, E.outQuad);
  const ai = seg(f, K.ai, K.ai + 12, E.outCubic);
  const all = seg(f, K.all, K.all + 12, E.outCubic);
  const scanP = seg(f, K.all, K.all + SCAN_DUR, E.linear);
  const scanOp = f >= K.all && f < K.all + SCAN_DUR + 6 ? 1 - seg(f, K.all + SCAN_DUR, K.all + SCAN_DUR + 6) : 0;
  return (
    <Card>
      <div style={{ position: 'relative', width: W, height: H, fontFamily: FONT }}>
        {CELLS.map((cl, i) => {
          const g0 = K.grow + (cl.dist - MIN_D) * 9 + rand(i + 40) * 3;
          const o = seg(f, g0, g0 + 3);
          const sc = seg(f, g0, g0 + 6, E.outQuad);
          const cT = seg(f, cl.colorAt, cl.colorAt + 5, E.outQuad);
          const bump = cT > 0 && cT < 1 ? Math.sin(cT * Math.PI) * 0.1 : 0;
          return (
            <div key={i} style={{
              position: 'absolute', left: OX + cl.c * PITCH, top: cl.r * PITCH, width: CELL, height: CELL,
              visibility: cl.hidden ? 'hidden' : 'visible', opacity: o, transform: `scale(${lerp(sc, 0.8, 1) + bump})`,
            }}>
              <Avatar bg={mix(GRAY, cl.color, cT)} sil={mix(SIL, PAPER, cT)} />
            </div>
          );
        })}
        {scanOp > 0 && (() => {
          // 扫描线只走头像格，不划过中央主字
          const y = scanP * GH;
          const inHole = y > PITCH - GAP && y < 6 * PITCH;
          const segs: [number, number][] = inHole
            ? [[OX - 6, OX + 2 * PITCH - GAP / 2], [OX + 9 * PITCH - GAP / 2, OX + GW + 6]]
            : [[OX - 6, OX + GW + 6]];
          return segs.map(([a, b], k) => (
            <div key={k} style={{ position: 'absolute', left: a, width: b - a, top: y - 2, height: 4, borderRadius: 2, background: RED, opacity: scanOp, boxShadow: `0 0 18px ${RED}` }} />
          ));
        })()}
        {/* 中央主字：挖空区 x 142–610, y 68–400 */}
        <div style={{ position: 'absolute', left: OX + 2 * PITCH, top: PITCH, width: 7 * PITCH - GAP, height: 5 * PITCH - GAP, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', color: INK, fontWeight: 900, lineHeight: 1, opacity: num, transform: `scale(${lerp(num, 0.98, 1)})` }}>
            <span style={{ fontSize: 118, letterSpacing: '-0.03em', fontVariantNumeric: 'tabular-nums' }}>{count.num}</span>
            {count.unit ? <span style={{ fontSize: 62, fontWeight: 800, marginLeft: 10 }}>{count.unit}</span> : null}
          </div>
          {sub && <div style={{ fontSize: 64, fontWeight: 800, color: INK, marginTop: 14, lineHeight: 1.1, opacity: ai, transform: `translateY(${lerp(ai, 18, 0)}px)`, filter: `blur(${(1 - ai) * 8}px)` }}>{sub.text}</div>}
          <div style={{ fontSize: 54, fontWeight: 800, color: RED, marginTop: 22, lineHeight: 1.1, letterSpacing: '0.04em', opacity: all, transform: `translateY(${lerp(all, 22, 0)}px)`, filter: `blur(${(1 - all) * 8}px)` }}>{sweep.text}</div>
        </div>
      </div>
    </Card>
  );
};
