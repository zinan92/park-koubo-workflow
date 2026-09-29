// 两张引语卡（全屏，纸底）：第一张纸卡落桌，引语逐词压印上纸、朱红短线收束、署名浮出；
// 第二张卡从上方压下来盖住第一张下沿（第一张微微后退），第二句逐词压印。
// 讲「别人说过的两句话 / 两个人的观点」时用；每句恰好一个朱红重点词（可以是连着的几个词）。
// Park 9/29 认可（2026-09-28 那条的 5:29.6，「心流 > 一切」「做自媒体，先让自己说爽了再说」）。
// ShotCraft 来源：typography/paper-title-card
//  保留：逐词 letterpress —— scale 1.28→1 + blur→0 + opacity，9f，bezier(0.2,0.75,0.3,1)；
//        每句恰好一个强调色重点词/短语；强调色短下划线 scaleX 0→1（18f，bezier(0.3,0,0.2,1)）作收束信号；
//        纸底 + 中心暖光；副行（署名）在句子压完后浮出。
//  改了：竖屏、纸墨中文；逐词节拍不是等距 4f，而是对到他说出每个词的时刻（提前 3f）；
//        卡里重点词用斜体，中文没有真斜体（合成斜体很廉价），这里只换朱红；
//        卡里是一张 55f 的呼吸位字卡，这里是两张实体纸卡叠放（第二张「压上来」沿用 DocStackBrake 叠落的
//        10f 落位 + 1.6f 压缩写法），每张停留远超 1 秒；尾部不淡出，交给 Stage 的 cut 下推出场。
// 版式：第一张一行大字（140px，约 5 个字宽以内）；第二张多行（112px，每行 ≤5 字，用 br 换行，最多 3 行）。
// 对时：每个词的 at 写他说出它的绝对秒；第二张卡在它第一个词前 8f 起飞。
import React from 'react';
import { useCurrentFrame, interpolate, Easing } from 'remotion';
import { Stage, INK, RED, PAPER, STONE, LINE, MUTED, SERIF, FONT, E, lerp, seg } from '../kit/Stage';
import { frameAt } from '../kit/time';

export type QuoteWord = { text: string; at: number; accent?: boolean; br?: boolean }; // br = 这个词之后换行
export type QuoteCardsProps = {
  t0: number;
  first: { words: QuoteWord[]; sign: string }; // 第一张：一行
  second: { words: QuoteWord[]; sign: string }; // 第二张：多行，压上来
};

type W = { t: string; at: number; accent?: boolean; br?: boolean };

const PRESS = Easing.bezier(0.2, 0.75, 0.3, 1);
const CLAMP = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

const Press: React.FC<{ f: number; w: W; blur: number }> = ({ f, w, blur }) => {
  const t = interpolate(f, [w.at, w.at + 9], [0, 1], { ...CLAMP, easing: PRESS });
  return (
    <span style={{ display: 'inline-block', opacity: t, transform: `scale(${1.28 - 0.28 * t})`, filter: t < 1 ? `blur(${(1 - t) * blur}px)` : undefined,
      color: w.accent ? RED : INK }}>{w.t}</span>
  );
};

const lines = (ws: W[]) => {
  const out: W[][] = [[]];
  ws.forEach((w) => { out[out.length - 1].push(w); if (w.br) out.push([]); });
  return out;
};

const Underline: React.FC<{ f: number; a: number }> = ({ f, a }) => (
  <div style={{ height: 8, width: 200, borderRadius: 4, background: RED, transformOrigin: '0 50%',
    transform: `scaleX(${interpolate(f, [a, a + 18], [0, 1], { ...CLAMP, easing: Easing.bezier(0.3, 0, 0.2, 1) })})` }} />
);

const Sign: React.FC<{ f: number; a: number; text: string }> = ({ f, a, text }) => {
  const t = seg(f, a, a + 12, E.outCubic);
  return <div style={{ fontFamily: FONT, fontSize: 46, fontWeight: 700, color: MUTED, opacity: t, transform: `translateY(${lerp(t, 14, 0)}px)`, marginTop: 26 }}>—— {text}</div>;
};

const CARD_BG = '#FFFDF8';

export const QuoteCards: React.FC<QuoteCardsProps> = ({ t0, first, second }) => {
  const f = useCurrentFrame();
  const fa = frameAt(t0);
  const toW = (w: QuoteWord): W => ({ t: w.text, at: fa(w.at) - 3, accent: w.accent, br: w.br });
  const Q1 = first.words.map(toW);
  const Q2 = second.words.map(toW);
  const CARD2 = Q2[0].at - 8; // 第二张卡起飞，落在它第一个词之前
  // 第一张：落桌
  const c1 = seg(f, 0, 12, E.outCubic);
  // 第二张：10f 落位 + 1.6f 压缩；第一张同帧被压后退
  const c2 = seg(f, CARD2, CARD2 + 10, E.outCubic);
  const squash = f >= CARD2 + 10 && f < CARD2 + 12 ? 0.975 : 1;
  const back = seg(f, CARD2 + 8, CARD2 + 20, E.outCubic);
  const end1 = Q1[Q1.length - 1].at + 10;
  const end2 = Q2[Q2.length - 1].at + 10;

  return (
    <Stage bg={PAPER} mode="cut">
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(900px 1100px at 50% 45%, rgba(255,253,246,0.9), rgba(255,253,246,0) 70%)' }} />

      {/* 卡一 */}
      <div style={{ position: 'absolute', left: 90, top: 360, width: 900, height: 560, background: CARD_BG, borderRadius: 18,
        border: `2px solid ${LINE}`, boxSizing: 'border-box', padding: '56px 70px',
        opacity: seg(f, 0, 4), transformOrigin: '50% 100%',
        transform: `translateY(${lerp(c1, -40, 0) - back * 36}px) rotate(-2deg) scale(${lerp(c1, 1.04, 1) * lerp(back, 1, 0.965)})`,
        boxShadow: `0 ${lerp(c1, 50, 20)}px ${lerp(c1, 90, 50)}px rgba(21,23,28,${lerp(c1, 0.1, 0.16)})`,
        filter: back > 0 ? `brightness(${lerp(back, 1, 0.94)})` : undefined }}>
        <div style={{ fontFamily: SERIF, fontWeight: 900, fontSize: 180, lineHeight: 0.8, color: LINE, height: 90 }}>“</div>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'baseline', gap: 30, fontFamily: SERIF, fontWeight: 900, fontSize: 140, lineHeight: 1.1, marginTop: 24, whiteSpace: 'nowrap' }}>
          {Q1.map((w, i) => <Press key={i} f={f} w={w} blur={11} />)}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', marginTop: 34 }}>
          <Underline f={f} a={end1} />
          <Sign f={f} a={end1 + 6} text={first.sign} />
        </div>
      </div>

      {/* 卡二：压上来 */}
      {f >= CARD2 && (
        <div style={{ position: 'absolute', left: 70, top: 830, width: 940, height: 720, background: CARD_BG, borderRadius: 18,
          border: `2px solid ${LINE}`, boxSizing: 'border-box', padding: '50px 76px',
          opacity: seg(f, CARD2, CARD2 + 3), transformOrigin: '50% 100%',
          transform: `translateY(${lerp(c2, -300, 0)}px) rotate(${lerp(c2, 5, 1.5)}deg) scale(${lerp(c2, 1.08, 1)}) scaleY(${squash})`,
          boxShadow: `0 ${lerp(c2, 80, 26)}px ${lerp(c2, 120, 60)}px rgba(21,23,28,${lerp(c2, 0.12, 0.22)})` }}>
          <div style={{ fontFamily: SERIF, fontWeight: 900, fontSize: 180, lineHeight: 0.8, color: LINE, height: 80 }}>“</div>
          <div style={{ fontFamily: SERIF, fontWeight: 900, fontSize: 112, lineHeight: 1.26, marginTop: 6 }}>
            {lines(Q2).map((ln, j) => (
              <div key={j} style={{ display: 'flex' }}>{ln.map((w, i) => <Press key={i} f={f} w={w} blur={8} />)}</div>
            ))}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', marginTop: 34 }}>
            <Underline f={f} a={end2} />
            <Sign f={f} a={end2 + 6} text={second.sign} />
          </div>
        </div>
      )}
    </Stage>
  );
};
