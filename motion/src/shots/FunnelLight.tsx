// 销售漏斗 · 再次出场（全屏）：同一个漏斗回来，按他讲到的顺序一层层点亮（第一次出场见 FunnelIntro）。
// Park 9/29 认可（2026-09-28 那条的 11:29 和 14:40 两幕，例子数据见 examples/）。
//  N04（11:29–12:00）：顶层按 1 万算 → 千分之一私信「10 条/天」→ 10 个里转 3–5 个「咨询付费」→ × 1K → 一天 2–3K
//  N05（14:40–15:19）：1 万 → 10 人来找 → 转 5 人 → 20–30% 长期「深度付费 · 5 万客单价」→ 按月服务 →
//                     「流量是漏斗最上端」「产品是后端」两道括号
// ShotCraft 来源同第一幕：底板 color-block-step-wipe、描边 draw-svg-trace（回场只描 12f，观众已认识它）、
// 层与层之间的「转化」用 particle-sand-fill 的落体语法（少量方块从上一层漏到下一层）；
// 新点亮的层走 marker 式由左到右填色，值落定后静止 ≥1s（aesthetic R1）。
import React from 'react';
import { useCurrentFrame, interpolate } from 'remotion';
import { Stage, INK, RED, PAPER, STONE, LINE, MUTED, SERIF, E, lerp, seg } from '../kit/Stage';
import { rand } from '../kit/Motion';

type Lit = { layer: number; at: number; value: string; sub?: { at: number; text: string } };
type Ratio = { between: number; at: number; text: string; until?: number };
export type FunnelLightProps = {
  t0: number;
  layers: string[]; // 从上到下四层的名字
  caption: string; // 顶部小字，如「每天触达」
  topValue: string; // 顶部大数字，如「1」
  unit: string; // 如「万」
  topLayerValue: string; // 顶层点亮后层内的值，如「1 万/天」
  topAt: number;
  topTag?: string;
  lits: Lit[];
  ratios: Ratio[];
  result?: { at: number; lead: string; big: string };
  brackets?: { front: { at: number; big: string; small: string }; back: { at: number; big: string; small: string } }; // 左侧两道括号：顶层=前端，下面几层=后端
};

const at = (t0: number, sec: number) => Math.round((sec - t0) * 30);

const WS = [820, 640, 470, 320];
const CX = 600, TOP = 560, LH = 200, GAP = 20;
const geo = (i: number) => {
  const y0 = TOP + i * (LH + GAP), y1 = y0 + LH;
  const w0 = WS[i], w1 = (WS[i + 1] ?? 230) + 26;
  return { y0, y1, w0, w1, d: `M ${CX - w0 / 2} ${y0} L ${CX + w0 / 2} ${y0} L ${CX + w1 / 2} ${y1} L ${CX - w1 / 2} ${y1} Z` };
};

// 从第 i-1 层底部漏进第 i 层的少量方块
const Drip: React.FC<{ f: number; i: number; a: number }> = ({ f, i, a }) => {
  const from = geo(i - 1), to = geo(i);
  const out: React.ReactNode[] = [];
  for (let k = 0; k < 14; k++) {
    const born = a - 16 + k * 1.6;
    const age = (f - born) / 16;
    if (age < 0 || age > 1) continue;
    const x = CX - to.w0 / 3 + rand(i * 50 + k) * (to.w0 * 2) / 3;
    const y = from.y1 - 40 + (to.y0 + 50 - from.y1 + 40) * age * age;
    out.push(<rect key={k} x={x} y={y} width={14} height={14} fill={k % 5 === 0 ? RED : INK} opacity={0.9 * (1 - age * 0.4)} />);
  }
  return <>{out}</>;
};

export const FunnelLight: React.FC<FunnelLightProps> = (act) => {
  const NAMES = act.layers;
  const f = useCurrentFrame();
  const A = (s: number) => at(act.t0, s);
  const topF = A(act.topAt);
  const litAt = (i: number) => (i === 0 ? topF : (() => { const l = act.lits.find((x) => x.layer === i); return l ? A(l.at) : 1e6; })());
  const lastLit = [0, 1, 2, 3].filter((i) => f >= litAt(i)).pop() ?? -1;
  const br = act.brackets ? { front: A(act.brackets.front.at), back: A(act.brackets.back.at) } : null;
  const ratioFade = br ? 1 - seg(f, br.front - 6, br.front + 6) : 1;

  return (
    <Stage bg={PAPER} mode="step">
      {/* 顶部：每天触达 1 万（这一幕起点就按 1 万算） */}
      <div style={{ position: 'absolute', top: 190, left: CX - 540, width: 1080, textAlign: 'center', fontSize: 44, fontWeight: 700, color: MUTED, letterSpacing: '0.06em', opacity: seg(f, 22, 32) }}>{act.caption}</div>
      <div style={{ position: 'absolute', top: 250, left: CX - 540, width: 1080, display: 'flex', justifyContent: 'center', alignItems: 'baseline', gap: 10,
        opacity: seg(f, topF, topF + 8), transform: `translateY(${lerp(seg(f, topF, topF + 12, E.outCubic), 30, 0)}px)` }}>
        <span style={{ fontSize: 170, fontWeight: 900, color: INK, lineHeight: 1 }}>{act.topValue}</span>
        <span style={{ fontSize: 88, fontWeight: 800, color: INK }}>{act.unit}</span>
        {act.topTag && <span style={{ marginLeft: 18, fontSize: 36, fontWeight: 700, color: PAPER, background: STONE, padding: '6px 18px', borderRadius: 30, alignSelf: 'center' }}>{act.topTag}</span>}
      </div>

      <svg width={1080} height={1920} style={{ position: 'absolute', left: 0, top: 0 }}>
        {[0, 1, 2, 3].map((i) => {
          const g = geo(i);
          const draw = seg(f, 18 + i * 3, 30 + i * 3, E.inOutCubic);
          const la = litAt(i);
          const fill = seg(f, la, la + 12, E.outCubic); // 由左到右填色
          const current = i === lastLit;
          const litColor = current ? RED : INK;
          const clipId = `c${i}`;
          return (
            <g key={i}>
              <defs><clipPath id={clipId}><rect x={CX - g.w0 / 2} y={g.y0} width={g.w0 * fill} height={LH} /></clipPath></defs>
              <path d={g.d} fill={LINE} opacity={seg(f, 28, 36) * 0.9} />
              <path d={g.d} fill={litColor} clipPath={`url(#${clipId})`} />
              <path d={g.d} pathLength={1} fill="none" stroke={STONE} strokeWidth={4} strokeDasharray="1" strokeDashoffset={1 - draw} strokeLinejoin="round" opacity={1 - seg(f, 30, 40) * 0.7} />
            </g>
          );
        })}
        {act.lits.map((l) => f >= A(l.at) - 16 && f < A(l.at) + 4 ? <Drip key={l.layer} f={f} i={l.layer} a={A(l.at)} /> : null)}
        {f >= topF && f < topF + 40 && [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((k) => {
          const age = ((f - topF) - k * 3) / 14;
          if (age < 0 || age > 1) return null;
          return <rect key={k} x={CX - 300 + rand(k + 3) * 600} y={440 + (TOP + 60 - 440) * age * age} width={14} height={14} fill={INK} opacity={0.85} />;
        })}
      </svg>

      {/* 层内文字：名字 + 值（点亮后） */}
      {[0, 1, 2, 3].map((i) => {
        const g = geo(i);
        const la = litAt(i);
        const on = f >= la + 6;
        const l = act.lits.find((x) => x.layer === i);
        const vIn = seg(f, la + 8, la + 20, (t) => E.outBack(t, 1.8));
        const value = i === 0 ? act.topLayerValue : l?.value;
        const sub = l?.sub && f >= A(l.sub.at) ? l.sub.text : null;
        const subIn = l?.sub ? seg(f, A(l.sub.at), A(l.sub.at) + 12, E.outCubic) : 0;
        return (
          <div key={i} style={{ position: 'absolute', left: CX - g.w0 / 2, width: g.w0, top: g.y0, height: LH, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity: seg(f, 30, 38) }}>
            <div style={{ fontSize: on ? (i === 3 ? 30 : 38) : (i === 3 ? 44 : 52), fontWeight: 800, color: on ? 'rgba(244,241,234,0.72)' : STONE, lineHeight: 1.15 }}>{NAMES[i]}</div>
            {on && value && (
              <div style={{ fontSize: i === 3 ? 46 : 62, fontWeight: 900, color: PAPER, lineHeight: 1.2, transform: `scale(${lerp(vIn, 0.7, 1)})`, opacity: seg(f, la + 8, la + 12) }}>
                {value}{sub && i !== 3 && <span style={{ fontSize: 44, fontWeight: 800, opacity: subIn, marginLeft: 10 }}>{sub}</span>}
              </div>
            )}
            {on && sub && i === 3 && (
              <div style={{ fontSize: 34, fontWeight: 800, color: PAPER, opacity: subIn, lineHeight: 1.2 }}>{sub}</div>
            )}
          </div>
        );
      })}

      {/* 层间比例：左侧胶囊 + 向下箭头 */}
      {act.ratios.map((r, k) => {
        const g = geo(r.between);
        const a = A(r.at);
        const p = seg(f, a, a + 10, (t) => E.outBack(t, 2.2));
        const until = r.until ? A(r.until) : 1e6;
        const op = seg(f, a, a + 4) * ratioFade * (1 - seg(f, until, until + 8));
        return (
          <div key={k} style={{ position: 'absolute', left: 36, top: g.y0 - 36, opacity: op, transform: `scale(${lerp(p, 0.6, 1)})`, transformOrigin: '0 50%',
            display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ background: INK, color: PAPER, fontSize: 36, fontWeight: 800, padding: '8px 20px', borderRadius: 30, whiteSpace: 'nowrap' }}>{r.text}</div>
            <div style={{ color: RED, fontSize: 48, fontWeight: 900 }}>↓</div>
          </div>
        );
      })}

      {/* 前端 / 后端 括号 */}
      {br && (() => {
        const pf = seg(f, br.front, br.front + 12, E.outCubic);
        const pb = seg(f, br.back, br.back + 12, E.outCubic);
        const g0 = geo(0), g1 = geo(1), g3 = geo(3);
        const Br = ({ y0, y1, p, color, big, small }: { y0: number; y1: number; p: number; color: string; big: string; small: string }) => (
          <div style={{ position: 'absolute', left: 24, top: y0, height: y1 - y0, display: 'flex', alignItems: 'center', gap: 12, opacity: p }}>
            <div style={{ width: 12, height: (y1 - y0) * p, borderLeft: `8px solid ${color}`, borderTop: `8px solid ${color}`, borderBottom: `8px solid ${color}`, borderRadius: '10px 0 0 10px' }} />
            <div style={{ transform: `translateX(${lerp(p, -20, 0)}px)` }}>
              <div style={{ fontFamily: SERIF, fontSize: 60, fontWeight: 900, color, lineHeight: 1.1 }}>{big}</div>
              <div style={{ fontSize: 32, fontWeight: 700, color: MUTED }}>{small}</div>
            </div>
          </div>
        );
        return (
          <>
            <Br y0={g0.y0 + 10} y1={g0.y1 - 10} p={pf} color={INK} big={act.brackets!.front.big} small={act.brackets!.front.small} />
            <Br y0={g1.y0 + 10} y1={g3.y1 - 10} p={pb} color={RED} big={act.brackets!.back.big} small={act.brackets!.back.small} />
          </>
        );
      })()}

      {act.result && (() => {
        const a = A(act.result.at);
        const p = seg(f, a, a + 12, (t) => E.outBack(t, 2));
        return (
          <div style={{ position: 'absolute', top: 1470, left: CX - 540, width: 1080, display: 'flex', justifyContent: 'center', alignItems: 'baseline', gap: 20, opacity: seg(f, a, a + 5), transform: `scale(${lerp(p, 0.7, 1)})` }}>
            <span style={{ fontSize: 48, fontWeight: 800, color: MUTED }}>{act.result.lead}</span>
            <span style={{ fontFamily: SERIF, fontSize: 110, fontWeight: 900, color: RED }}>{act.result.big}</span>
          </div>
        );
      })()}
    </Stage>
  );
};
