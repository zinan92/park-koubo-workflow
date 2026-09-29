// 品牌落版（胸前卡片）：一圈墨色画框先长出来 → logo 被一支笔一笔描出、红点盖章 → 品牌名/英文名淡入 →
// 说到定位时出 slogan → 说到承诺时画框同一帧翻成朱红、承诺句硬切出现（那一行提前 8f 平滑撑开，卡片不跳）。
// 用在：视频里第一次正式亮出「我是谁 / 我能帮你什么」的那一段，给 Park 自己或客户的品牌都行（品牌、logo、两句话都走 props）。
// Park 9/29 认可（2026-09-28 那条的 14:20.3，「帕克动手 · PARK & CO.」，例子数据见 examples/）。
// 两张卡焊在一起：
//  - effects/brand-frame-snap（BrandFrameSnap.tsx）：保留「画框先于内容长出」（厚度 0→14px ease-out 18f）、
//    「翻色 = 同一帧硬切」（画框墨 → 朱红，同帧出新内容），翻色后画框厚度按 exp(-0.22t)·cos(0.9t) 阻尼弹一下
//    当「换挡」回馈；全片只翻一次。改动：画框收进胸前卡片内（inset 描边，不溢出）；纸白底上白闪看不见，
//    不做白闪，靠厚度弹跳给打击感；同帧三件事 = 画框换色 + 承诺句硬切出现 + logo 红点同步一跳。
//  - ui-entrance/draw-svg-trace（DrawSvgTrace.tsx）：logo 各笔用 pathLength=1 + dashoffset 按长度比例一口气描完
//    （28f inOut cubic），叠一段更粗的短 dash 当笔头跑在最前；描完两笔冲深加粗 2f、6f 回落（闭合闪），
//    红点盖章，字标随后 8f 淡入（「画完了」内容才上色）。
// 对时：slogan.at / promise.at = 他说出那句话的口播秒，都提前 3f；logo 从第 5 帧开始描。
import React from 'react';
import { useCurrentFrame } from 'remotion';
import { Card } from '../kit/Card';
import { INK, RED, STONE, LINE, MUTED, FONT, SERIF, E, lerp, seg } from '../kit/Stage';
import { frameAt } from '../kit/time';

type LogoStroke = { d: string; width: number; color: string };
export type BrandLogo = {
  viewBox?: string; // 默认 0 0 120 120
  strokes: LogoStroke[]; // 按描的顺序；每笔 fill none、round cap/join
  dot?: { cx: number; cy: number; r: number; color: string }; // 描完盖章的圆点
};
export type BrandLockupProps = {
  t0: number;
  name?: string; // 品牌中文名（宋体大字），默认「帕克动手」
  en?: string; // 英文名（字距拉开的小字），默认「PARK & CO.」
  logo?: BrandLogo; // 默认帕克动手的 logo
  slogan: { at: number; text: string };
  promise: { at: number; text: string }; // 翻色那一刻出现的承诺句（朱红）
};

// 默认：帕克动手的 logo
export const PARK_LOGO: BrandLogo = {
  viewBox: '0 0 120 120',
  strokes: [
    { d: 'M14 66 Q30 28 48 86', width: 9, color: STONE },
    { d: 'M48 86 Q76 88 106 22', width: 11, color: INK },
  ],
  dot: { cx: 48, cy: 86, r: 9, color: RED },
};

// 笔长：「M x y Q cx cy x y」按 60 段采样算；其他写法交给浏览器量
const pathLen = (d: string) => {
  const m = d.trim().match(/^M\s*([-\d.]+)[\s,]+([-\d.]+)\s*Q\s*([-\d.]+)[\s,]+([-\d.]+)[\s,]+([-\d.]+)[\s,]+([-\d.]+)\s*$/);
  if (m) {
    const [ax, ay, cx, cy, bx, by] = m.slice(1).map(Number);
    let L = 0, px = ax, py = ay;
    for (let i = 1; i <= 60; i++) {
      const t = i / 60, u = 1 - t;
      const x = u * u * ax + 2 * u * t * cx + t * t * bx;
      const y = u * u * ay + 2 * u * t * cy + t * t * by;
      L += Math.hypot(x - px, y - py); px = x; py = y;
    }
    return L;
  }
  const el = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  el.setAttribute('d', d);
  return el.getTotalLength();
};
const PEN = 0.12;

const Stroke: React.FC<{ p: { d: string; w: number; color: string }; prog: number; flash: number; pen: boolean }> = ({ p, prog, flash, pen }) => (
  <>
    <path d={p.d} fill="none" stroke={flash > 0.5 ? (p.color === STONE ? '#8E877A' : '#000') : p.color} strokeWidth={p.w + flash * 4} strokeLinecap="round" strokeLinejoin="round"
      pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - prog} />
    {pen && prog > 0.01 && prog < 0.99 && (
      <path d={p.d} fill="none" stroke={INK} strokeWidth={p.w + 5} strokeLinecap="round" pathLength={1}
        strokeDasharray={`${PEN} ${2 - PEN}`} strokeDashoffset={PEN - prog} />
    )}
  </>
);

export const BrandLockup: React.FC<BrandLockupProps> = ({ t0, name = '帕克动手', en: enText = 'PARK & CO.', logo = PARK_LOGO, slogan, promise }) => {
  const f = useCurrentFrame();
  const A = frameAt(t0);
  const K = {
    frame0: 0,
    trace0: 5,
    trace1: 33, // 28f 描完
    slogan: A(slogan.at) - 3,
    flip: A(promise.at) - 3,
  };
  const lens = logo.strokes.map((s) => pathLen(s.d));
  const total = lens.reduce((a, b) => a + b, 0);

  // 画框：先长出；翻色后阻尼弹
  const grow = seg(f, K.frame0, K.frame0 + 18, E.outCubic);
  const since = f - K.flip;
  const bounce = since >= 0 ? Math.exp(-since * 0.22) * Math.cos(since * 0.9) * 9 : 0;
  const T = Math.max(4, 14 * grow + bounce);
  const flipped = f >= K.flip;

  // logo 描边
  const P = seg(f, K.trace0, K.trace1, E.inOutCubic);
  // 各笔按长度比例分段：第 i 笔的进度
  let acc = 0;
  const progs = lens.map((L, i) => {
    const c = acc / total, w = L / total;
    acc += L;
    return i === 0 ? Math.min(1, P / w) : Math.min(1, Math.max(0, (P - c) / w));
  });
  const fl = f < K.trace1 ? 0 : f < K.trace1 + 2 ? seg(f, K.trace1, K.trace1 + 2) : 1 - seg(f, K.trace1 + 2, K.trace1 + 8, E.outQuad);
  const dotP = seg(f, K.trace1, K.trace1 + 8, (t) => E.outBack(t, 2.6));
  const dotJump = flipped ? 1 + Math.exp(-since * 0.3) * Math.cos(since * 0.9) * 0.35 * (since < 16 ? 1 : 0) : 1;

  // 字标 / slogan / 承诺
  const word = seg(f, K.trace1 + 1, K.trace1 + 9, E.outQuad);
  const en = seg(f, K.trace1 + 5, K.trace1 + 13, E.outQuad);
  const slo = seg(f, K.slogan, K.slogan + 12, E.outCubic);
  const rowGrow = seg(f, K.flip - 8, K.flip, E.outCubic); // 承诺行高度：翻色前 8f 平滑长出，卡片不跳
  const promiseSettle = flipped ? lerp(seg(f, K.flip, K.flip + 3, E.outQuad), 1.04, 1) : 1;

  return (
    <Card>
      <div style={{ position: 'relative', width: 752, borderRadius: 28, background: '#FCFAF5', padding: '38px 40px 36px', boxSizing: 'border-box' }}>
        {/* 画框：inset 描边，不改布局、不出卡 */}
        <div style={{ position: 'absolute', inset: 0, borderRadius: 28, boxShadow: `inset 0 0 0 ${T}px ${flipped ? RED : INK}`, opacity: grow > 0 ? 1 : 0, pointerEvents: 'none', zIndex: 3 }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 26, height: 190 }}>
          <svg width={190} height={190} viewBox={logo.viewBox ?? '0 0 120 120'} style={{ flexShrink: 0, overflow: 'visible' }}>
            {logo.strokes.map((s, i) => (
              <Stroke key={i} p={{ d: s.d, w: s.width, color: s.color }} prog={progs[i]} flash={fl}
                pen={(i === 0 || progs[i] > 0) && (i === logo.strokes.length - 1 || progs[i + 1] === 0)} />
            ))}
            {logo.dot && <circle cx={logo.dot.cx} cy={logo.dot.cy} r={logo.dot.r * dotP * dotJump} fill={logo.dot.color} />}
          </svg>
          <div>
            <div style={{ fontFamily: SERIF, fontWeight: 900, fontSize: 92, lineHeight: 1.05, color: INK, letterSpacing: 4, opacity: word, transform: `translateX(${lerp(word, 18, 0)}px)` }}>{name}</div>
            <div style={{ fontFamily: FONT, fontWeight: 700, fontSize: 40, letterSpacing: 7, color: MUTED, marginTop: 10, opacity: en, transform: `translateX(${lerp(en, 18, 0)}px)` }}>{enText}</div>
          </div>
        </div>

        <div style={{ height: 3, background: LINE, borderRadius: 2, margin: '26px 0 24px', transformOrigin: '0 50%', transform: `scaleX(${seg(f, K.trace1 + 4, K.trace1 + 20, E.outCubic)})` }} />

        <div style={{ height: 72, display: 'flex', alignItems: 'center', fontSize: 54, fontWeight: 800, color: INK, whiteSpace: 'nowrap',
          opacity: slo, transform: `translateY(${lerp(slo, 26, 0)}px)`, filter: `blur(${(1 - slo) * 8}px)` }}>
          {slogan.text}
        </div>
        <div style={{ height: 88 * rowGrow, marginTop: 10 * rowGrow, display: 'flex', alignItems: 'center' }}>
          {flipped && (
            <div style={{ fontFamily: SERIF, fontWeight: 900, fontSize: 68, color: RED, whiteSpace: 'nowrap', letterSpacing: 2, transform: `scale(${promiseSettle})`, transformOrigin: '0 50%' }}>
              {promise.text}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};
