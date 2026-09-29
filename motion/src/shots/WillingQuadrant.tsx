// 两个维度的 2×2 象限（全屏，纸底）：标题逐词压出 → 两根轴描出 → 纵轴、横轴各自在说到时点亮 →
// 右上格（两个都高）从原点灌红 → 圆窗收束到右下格（横轴高、纵轴低）、四角红框咬合 → 这一格里揭出一个人群/例子
// 和一条注释 → 只剩外环慢转，静止到结束。讲「A × B 两个条件，谁在哪一格」、并要点名其中一格时用。
// 约定：横轴向右 = 高、纵轴向上 = 高；灌红的是右上格，被点名的是右下格。
// Park 9/29 认可（2026-09-28 那条的 2:49.3，「able and willing to pay」，点名「有意愿 · 没能力」的高中生）。
// ShotCraft 来源：
//  - 底板进出：transition/color-block-step-wipe（Stage mode="step"）
//  - 聚焦 + 注释：data/ring-diagram-annotation-reveal
//    保留：圆窗从远大于画幅的半径收束到刚好包住对象（bezier .16,1,.3,1，39f）；细环晚 7f 起 scale 3.8→1；
//          分段外环淡入后匀速慢转、12 支向心箭头线端与箭头同步推进且不跟转（命门）；
//          标题块 3f 错峰、每块 8f 自下揭出（带一层灰色回声）；宽注释条从左 scaleX 展开；收尾只留外环慢转。
//    改了：圆窗外不是黑场而是纸色退淡（纸底上墨色压暗会发脏）；「主体」换成 2×2 象限里的一格；
//          卡里的整组左移让位竖屏不需要——注释直接写进被框住的那一格；四角红框咬合沿用 DocStackBrake 的 back(2.4) 飞入。
//  - 右上格灌红：从两轴交点 clip-path circle 扩开（呼应后面的圆窗）；格内文字顶对齐，给外环和箭头让出下半格。
// 对时：各 at 写他说出那个词的绝对秒。标题每个词提前 3f（step 底板第 20 帧前看不见，早于它的词顺延到 20 帧）；
//       轴、灌红、圆窗提前 5f；大字和注释提前 4f。大字 3 个字以内最好（逐字揭出、112px）；注释条约 7 个字以内。
import React from 'react';
import { useCurrentFrame, interpolate, Easing } from 'remotion';
import { Stage, INK, RED, PAPER, STONE, LINE, MUTED, SERIF, FONT, E, lerp, seg } from '../kit/Stage';
import { frameAt, Cue } from '../kit/time';

export type WillingQuadrantProps = {
  t0: number;
  title: Cue[]; // 顶部标题，逐词压出（每个词一个 cue）
  yAxis: Cue; // 纵轴名（向上 = 高），说到时点亮
  xAxis: Cue; // 横轴名（向右 = 高），说到时点亮；组件自动加「 →」
  both: { at: number; lines: string[] }; // 右上格（两个都高）灌红，格内 1–2 行字
  focus: { at: number; label: string }; // 圆窗收束到右下格，格名（红小字）
  hero: Cue; // 右下格里逐字揭出的大字（人群/例子）
  note: Cue; // 大字下面的注释条
};

// 象限几何
const X0 = 100, X1 = 860, Y0 = 500, Y1 = 1260;
const MX = (X0 + X1) / 2, MY = (Y0 + Y1) / 2; // 480, 880
const BR = { cx: (MX + X1) / 2, cy: (MY + Y1) / 2 }; // 670, 1070
const AP = 285; // 圆窗终点半径：刚好包住一格（半对角线 269）

const CLAMP = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;
const ease = (f: number, a: number, b: number) => interpolate(f, [a, b], [0, 1], { ...CLAMP, easing: Easing.bezier(0.16, 1, 0.3, 1) });

const Reveal: React.FC<{ f: number; a: number; children: React.ReactNode }> = ({ f, a, children }) => {
  const k = ease(f, a, a + 8);
  const echo = interpolate(f, [a - 1, a, a + 2, a + 8], [0, 0.35, 0.35, 0], CLAMP);
  return (
    <span style={{ position: 'relative', display: 'inline-block' }}>
      <span style={{ position: 'absolute', inset: 0, background: LINE, opacity: echo, transform: `translateY(${lerp(k, 18, -8)}px)` }} />
      <span style={{ display: 'inline-block', opacity: k, clipPath: `inset(${lerp(k, 100, 0)}% 0 0 0)`, transform: `translateY(${lerp(k, 20, 0)}px)` }}>{children}</span>
    </span>
  );
};

export const WillingQuadrant: React.FC<WillingQuadrantProps> = ({ t0, title, yAxis, xAxis, both, focus, hero, note: noteCue }) => {
  const f = useCurrentFrame();
  const at = frameAt(t0);
  const K = {
    words: title.map((w) => Math.max(20, at(w.at) - 3)),
    axes: 34,
    able: at(yAxis.at) - 5,
    will: at(xAxis.at) - 5,
    fill: at(both.at) - 5,
    focus: at(focus.at) - 5,
    kid: at(hero.at) - 4,
    note: at(noteCue.at) - 4,
  };
  const axV = seg(f, K.axes, K.axes + 26, E.inOutCubic);
  const axH = seg(f, K.axes + 8, K.axes + 34, E.inOutCubic);
  const div = seg(f, K.axes + 20, K.axes + 44, E.inOutCubic);
  const able = seg(f, K.able, K.able + 8, E.outQuad);
  const will = seg(f, K.will, K.will + 8, E.outQuad);
  const pop = (a: number) => (f >= a ? interpolate(f, [a, a + 4, a + 12], [1, 1.14, 1], CLAMP) : 1);
  const fill = seg(f, K.fill, K.fill + 16, E.outCubic);
  const fillTxt = seg(f, K.fill + 8, K.fill + 18, E.outCubic);

  // 圆窗收束（卡 f11–50）、细环（f18–60）、外环（f30–50 淡入，之后匀速转）、箭头（f35–50）
  const ap = ease(f, K.focus, K.focus + 39);
  const R = lerp(ap, 1600, AP);
  const ring = ease(f, K.focus + 7, K.focus + 49);
  const coil = ease(f, K.focus + 19, K.focus + 39);
  const arrows = ease(f, K.focus + 24, K.focus + 39);
  const rot = Math.max(0, f - (K.focus + 18)) * 0.28;
  const wash = seg(f, K.focus, K.focus + 12) * 0.86;
  const inner = seg(f, K.focus + 26, K.focus + 40, E.outQuad) * 0.86;
  const lock = seg(f, K.focus + 6, K.focus + 16, (t) => E.outBack(t, 2.4));
  const tag = seg(f, K.focus + 12, K.focus + 22, E.outCubic);
  const note = ease(f, K.note, K.note + 16);

  const axisCol = (p: number) => (p > 0.5 ? INK : STONE);

  return (
    <Stage bg={PAPER} mode="step">
      {/* 标题：逐词压印 */}
      <div style={{ position: 'absolute', top: 196, width: 1080, display: 'flex', justifyContent: 'center', gap: 22, fontFamily: FONT, fontSize: 74, fontWeight: 800, color: INK, letterSpacing: '-0.01em' }}>
        {title.map((w, i) => {
          const t = seg(f, K.words[i], K.words[i] + 9, (x) => interpolate(x, [0, 1], [0, 1], { easing: Easing.bezier(0.2, 0.75, 0.3, 1) }));
          return <span key={i} style={{ display: 'inline-block', opacity: t, transform: `scale(${lerp(t, 1.28, 1)})`, filter: t < 1 ? `blur(${(1 - t) * 12}px)` : undefined }}>{w.text}</span>;
        })}
      </div>

      <svg width={1080} height={1920} style={{ position: 'absolute', left: 0, top: 0 }}>
        <defs>
          <marker id="wq-head" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto" markerUnits="strokeWidth">
            <path d="M0,0 L6,3 L0,6 Z" fill={INK} />
          </marker>
          <marker id="wq-headS" markerWidth="4" markerHeight="4" refX="3.4" refY="2" orient="auto" markerUnits="strokeWidth">
            <path d="M0,0 L4,2 L0,4 Z" fill={STONE} />
          </marker>
          <marker id="wq-headI" markerWidth="4" markerHeight="4" refX="3.4" refY="2" orient="auto" markerUnits="strokeWidth">
            <path d="M0,0 L4,2 L0,4 Z" fill={INK} />
          </marker>
        </defs>
        {/* 右上象限：从两轴交点灌红 */}
        {fill > 0 && <rect x={MX} y={Y0} width={X1 - MX} height={MY - Y0} fill={RED} style={{ clipPath: `circle(${fill * 560}px at 0px ${MY - Y0}px)` }} />}
        {/* 分隔线（虚） */}
        <line x1={MX} y1={Y1} x2={MX} y2={lerp(div, Y1, Y0)} stroke={STONE} strokeWidth={3} strokeDasharray="14 12" />
        <line x1={X0} y1={MY} x2={lerp(div, X0, X1)} y2={MY} stroke={STONE} strokeWidth={3} strokeDasharray="14 12" />
        {/* 纵轴 */}
        {axV > 0 && <line x1={X0} y1={Y1} x2={X0} y2={lerp(axV, Y1, Y0 - 44)} stroke={axisCol(able)} strokeWidth={lerp(able, 5, 9)} strokeLinecap="round"
          markerEnd={axV > 0.98 ? `url(#${able > 0.5 ? 'wq-headI' : 'wq-headS'})` : undefined} />}
        {/* 横轴 */}
        {axH > 0 && <line x1={X0} y1={Y1} x2={lerp(axH, X0, X1 + 60)} y2={Y1} stroke={axisCol(will)} strokeWidth={lerp(will, 5, 9)} strokeLinecap="round"
          markerEnd={axH > 0.98 ? `url(#${will > 0.5 ? 'wq-headI' : 'wq-headS'})` : undefined} />}
      </svg>

      {/* 轴名 */}
      <div style={{ position: 'absolute', left: X0 + 34, top: Y0 - 80, fontSize: 64, fontWeight: 900, fontFamily: FONT, color: able > 0.5 ? INK : STONE,
        opacity: seg(f, K.axes + 10, K.axes + 20) * lerp(able, 0.6, 1), transform: `scale(${pop(K.able)})`, transformOrigin: '0 50%' }}>{yAxis.text}</div>
      <div style={{ position: 'absolute', left: X0, top: Y1 + 22, fontSize: 64, fontWeight: 900, fontFamily: FONT, color: will > 0.5 ? INK : STONE,
        opacity: seg(f, K.axes + 18, K.axes + 28) * lerp(will, 0.6, 1), transform: `scale(${pop(K.will)})`, transformOrigin: '0 50%' }}>{xAxis.text} →</div>

      {/* 右上象限文字 */}
      <div style={{ position: 'absolute', left: MX, top: Y0, width: X1 - MX, height: MY - Y0, display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', alignItems: 'center', paddingTop: 34, boxSizing: 'border-box',
        fontFamily: SERIF, fontWeight: 900, fontSize: 80, lineHeight: 1.18, color: PAPER, opacity: fillTxt, transform: `translateY(${lerp(fillTxt, 16, 0)}px)` }}>
        {both.lines.map((l, i) => <div key={i}>{l}</div>)}
      </div>

      {/* 圆窗外纸色退淡：整屏减圆（evenodd） */}
      {wash > 0 && (
        <svg width={1080} height={1920} style={{ position: 'absolute', left: 0, top: 0 }}>
          <path fillRule="evenodd" fill={PAPER} opacity={wash}
            d={`M0 0 H1080 V1920 H0 Z M ${BR.cx - R} ${BR.cy} a ${R} ${R} 0 1 0 ${2 * R} 0 a ${R} ${R} 0 1 0 ${-2 * R} 0 Z`} />
        </svg>
      )}

      {/* 圆窗落定后，圆内格子以外也退淡：焦点最终只剩被点名的那一格 */}
      {inner > 0 && (
        <svg width={1080} height={1920} style={{ position: 'absolute', left: 0, top: 0 }}>
          <path fillRule="evenodd" fill={PAPER} opacity={inner}
            d={`M ${BR.cx - AP} ${BR.cy} a ${AP} ${AP} 0 1 0 ${2 * AP} 0 a ${AP} ${AP} 0 1 0 ${-2 * AP} 0 Z M ${MX} ${MY} H ${X1} V ${Y1} H ${MX} Z`} />
        </svg>
      )}

      {/* 机制层：细环 + 分段外环 + 12 支向心箭头（箭头不跟转） */}
      {f >= K.focus && (
        <svg width={1080} height={1920} style={{ position: 'absolute', left: 0, top: 0 }}>
          <circle cx={BR.cx} cy={BR.cy} r={AP} fill="none" stroke={INK} strokeWidth={3} opacity={ring * 0.7}
            style={{ transformOrigin: `${BR.cx}px ${BR.cy}px`, transform: `scale(${lerp(ring, 3.8, 1)})` }} />
          <circle cx={BR.cx} cy={BR.cy} r={334} fill="none" stroke={MUTED} strokeWidth={12} strokeDasharray="34 30" opacity={coil * 0.55}
            style={{ transformOrigin: `${BR.cx}px ${BR.cy}px`, transform: `rotate(${rot}deg) scale(${lerp(coil, 1.08, 1)})` }} />
          <g stroke={INK} strokeWidth={4} opacity={arrows} markerEnd="url(#wq-head)">
            {Array.from({ length: 12 }, (_, i) => {
              const a = ((-90 + i * 30) * Math.PI) / 180;
              const o = 326, inn = 296;
              const x1 = BR.cx + Math.cos(a) * o, y1 = BR.cy + Math.sin(a) * o;
              const x2 = BR.cx + Math.cos(a) * inn, y2 = BR.cy + Math.sin(a) * inn;
              return <line key={i} x1={x1} y1={y1} x2={lerp(arrows, x1, x2)} y2={lerp(arrows, y1, y2)} />;
            })}
          </g>
        </svg>
      )}

      {/* 被点名的一格：四角红框咬合 + 格名 + 大字 + 注释条 */}
      {f >= K.focus + 6 && [[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sy], k) => {
        const L = MX + 10, Rr = X1 - 10, T = MY + 10, B = Y1 - 10;
        const cx = sx < 0 ? L : Rr, cy = sy < 0 ? T : B;
        const ox = sx * 520 * (1 - lock), oy = sy * 380 * (1 - lock);
        return <div key={k} style={{ position: 'absolute', left: cx - (sx < 0 ? 0 : 56) + ox, top: cy - (sy < 0 ? 0 : 56) + oy, width: 56, height: 56,
          borderLeft: sx < 0 ? `10px solid ${RED}` : undefined, borderRight: sx > 0 ? `10px solid ${RED}` : undefined,
          borderTop: sy < 0 ? `10px solid ${RED}` : undefined, borderBottom: sy > 0 ? `10px solid ${RED}` : undefined }} />;
      })}
      <div style={{ position: 'absolute', left: MX, top: MY + 62, width: X1 - MX, textAlign: 'center', fontFamily: FONT, fontSize: 46, fontWeight: 900, color: RED,
        opacity: tag, transform: `translateY(${lerp(tag, 12, 0)}px)` }}>{focus.label}</div>
      {f >= K.kid - 1 && (
        <div style={{ position: 'absolute', left: MX, top: MY + 116, width: X1 - MX, display: 'flex', justifyContent: 'center', fontFamily: SERIF, fontWeight: 900, fontSize: 112, lineHeight: 1.08, color: INK }}>
          {hero.text.split('').map((c, i) => <Reveal key={i} f={f} a={K.kid + i * 3}>{c}</Reveal>)}
        </div>
      )}
      {note > 0 && (
        <div style={{ position: 'absolute', left: MX + 24, top: MY + 250, width: X1 - MX - 48, height: 60, background: INK, transformOrigin: '0 50%', transform: `scaleX(${note})`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT, fontSize: 46, fontWeight: 800, color: PAPER, overflow: 'hidden' }}>
          <span style={{ opacity: seg(f, K.note + 6, K.note + 12) }}>{noteCue.text}</span>
        </div>
      )}
    </Stage>
  );
};
