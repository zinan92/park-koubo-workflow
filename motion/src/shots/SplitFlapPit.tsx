// 翻牌大字（胸前卡片）：一行小标题 + 一个 1–4 字的大词用机场翻牌屏「咔哒咔哒」翻出来。
// 用在：点名一个概念/一个坑/一个章节词，要一拍「机械宣告感」的时候（一条视频最多用一次，太抢）。
// Park 9/29 认可（2026-09-28 那条的 4:52.9，「我踩的第一个坑 · 流量」，例子数据见 examples/）。
// 改编自 ShotCraft typography/split-flap-title（SplitFlapFlip.tsx）：
// 保留——每字一个深底翻牌格（上下两半 overflow hidden + 中缝铰链线）；单次翻牌 5f 两段式
//   （Easing.in(quad) 重力感：旧字上半叶 0→-90 掉落并变暗到 0.55，新字下半叶 90→0 拍下回亮）；
//   每格翻 3 次（2 个乱码中间态 + 落定）；4f 左→右级联；落定「咔哒」整格下沉回弹；
//   开头整排乱码静止建立，落定后长静止；乱码用 sin 哈希，全程帧确定。
// 改动——竖屏胸前卡片：两字时格子 336×410（字 290px），字多了整体等比缩小塞进卡片宽；咔哒 10px；
//   乱码只用符号（不用字母数字，免得观众读成编造的数字）；格底墨色、字纸白，读作「纸面上摆了一块机械显示屏」。
// 对时：landAt = 他说出这个词的那一秒 → 第一格在这一帧落定，级联从它往前倒推 15f 开始。
import React from 'react';
import { useCurrentFrame } from 'remotion';
import { Card } from '../kit/Card';
import { INK, RED, FONT, E, seg } from '../kit/Stage';
import { frameAt } from '../kit/time';

export type SplitFlapPitProps = {
  t0: number;
  title: string; // 卡片上方小标题，如「我踩的第一个坑」
  word: string; // 翻出来的大词，1–4 个字，如「流量」
  landAt: number; // 第一格落定的口播秒（= 说出这个词的时刻）
};

const GARBLE = '#%&@※+=?§¤◆▲●■★';
const FLIP = 5;
const NFLIP = 3;
const STAGGER = 4;
const FLAP_BG = '#22242A';
const FLAP_INK = '#F4F1EA';
const HINGE = '#0B0C0F';

const rnd = (a: number) => {
  const x = Math.sin(a * 127.3) * 43758.5453;
  return x - Math.floor(x);
};
const garble = (i: number, k: number) => GARBLE[Math.floor(rnd(i * 13.7 + k * 5.31 + 2.2) * GARBLE.length)];

type Geo = { cw: number; ch: number; fs: number; fsG: number; r: number };

const Half: React.FC<{ ch: string; part: 'top' | 'bottom'; target: boolean; g: Geo }> = ({ ch, part, target, g }) => (
  <div
    style={{
      position: 'absolute', left: 0, top: part === 'top' ? 0 : g.ch / 2, width: g.cw, height: g.ch / 2, overflow: 'hidden',
      background: FLAP_BG, borderRadius: part === 'top' ? `${g.r}px ${g.r}px 0 0` : `0 0 ${g.r}px ${g.r}px`,
    }}
  >
    <div
      style={{
        position: 'absolute', left: 0, top: part === 'top' ? 0 : -g.ch / 2, width: g.cw, height: g.ch,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: FONT, fontWeight: 800, fontSize: target ? g.fs : g.fsG, lineHeight: 1, color: FLAP_INK,
      }}
    >
      {ch}
    </div>
  </div>
);

const FlapCell: React.FC<{ target: string; i: number; frame: number; start: number; g: Geo }> = ({ target, i, frame, start, g }) => {
  const seq = [garble(i, 0), garble(i, 1), garble(i, 2), target];
  const local = frame - (start + i * STAGGER);
  const done = local >= NFLIP * FLIP;

  // 咔哒：落定后整格 下沉 10 → 过冲 -2.5 → 归零
  let clickY = 0;
  if (done) {
    const c = local - NFLIP * FLIP;
    if (c < 2) clickY = seg(c, 0, 2, E.outQuad) * 10;
    else if (c < 4) clickY = 10 - seg(c, 2, 4, E.outQuad) * 12.5;
    else clickY = -2.5 + seg(c, 4, 7, E.outQuad) * 2.5;
  }

  let topCh = seq[0];
  let bottomCh = seq[0];
  let flap: React.ReactNode = null;
  if (done) {
    topCh = target;
    bottomCh = target;
  } else if (local > 0) {
    const k = Math.min(NFLIP - 1, Math.floor(local / FLIP));
    const from = seq[k];
    const to = seq[k + 1];
    const p = E.inQuad((local - k * FLIP) / FLIP);
    topCh = to;
    bottomCh = from;
    const common: React.CSSProperties = {
      position: 'absolute', inset: 0, transformOrigin: `center ${g.ch / 2}px`, backfaceVisibility: 'hidden', zIndex: 2,
    };
    flap = p < 0.5 ? (
      <div style={{ ...common, transform: `rotateX(${-p * 2 * 90}deg)`, filter: `brightness(${1 - p * 2 * 0.45})` }}>
        <Half ch={from} part="top" target={from === target} g={g} />
      </div>
    ) : (
      <div style={{ ...common, transform: `rotateX(${90 - (p - 0.5) * 2 * 90}deg)`, filter: `brightness(${0.55 + (p - 0.5) * 2 * 0.45})` }}>
        <Half ch={to} part="bottom" target={to === target} g={g} />
      </div>
    );
  }

  return (
    <div
      style={{
        position: 'relative', width: g.cw, height: g.ch, transform: `translateY(${clickY}px)`, perspective: 1100,
        borderRadius: g.r, boxShadow: '0 10px 26px rgba(21,23,28,0.28)',
      }}
    >
      <Half ch={topCh} part="top" target={topCh === target} g={g} />
      <Half ch={bottomCh} part="bottom" target={bottomCh === target} g={g} />
      {flap}
      <div style={{ position: 'absolute', left: 0, top: g.ch / 2 - 3, width: g.cw, height: 6, background: HINGE, zIndex: 3 }} />
      {/* 铰链两端的小铆钉 */}
      {[10, g.cw - 22].map((x) => (
        <div key={x} style={{ position: 'absolute', left: x, top: g.ch / 2 - 6, width: 12, height: 12, borderRadius: 6, background: '#3A3D45', zIndex: 4 }} />
      ))}
    </div>
  );
};

export const SplitFlapPit: React.FC<SplitFlapPitProps> = ({ t0, title, word, landAt }) => {
  const frame = useCurrentFrame();
  const chars = [...word];
  const start = frameAt(t0)(landAt) - NFLIP * FLIP; // 级联起点（前面整排乱码静止建立）
  // 两字 336×410；字多了等比缩进卡片内宽 752（格间 28）
  const s = Math.min(1, (752 - 28 * (chars.length - 1)) / chars.length / 336);
  const g: Geo = s === 1 ? { cw: 336, ch: 410, fs: 290, fsG: 210, r: 18 } : { cw: 336 * s, ch: 410 * s, fs: 290 * s, fsG: 210 * s, r: 18 * s };
  return (
    <Card>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 48, fontWeight: 700, color: INK, lineHeight: 1.2 }}>
        <span style={{ width: 14, height: 44, borderRadius: 4, background: RED, display: 'inline-block' }} />
        {title}
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 28, marginTop: 30, marginBottom: 8 }}>
        {chars.map((ch, i) => (
          <FlapCell key={i} target={ch} i={i} frame={frame} start={start} g={g} />
        ))}
      </div>
    </Card>
  );
};
