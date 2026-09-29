// 领头词组句收尾（全屏，纸底）：几行字依次出现，每行先让一个领头词占满画面中央、继续朝观众推近，
// 再一条曲线缩回并滑进自己在句子里的位置，其余词从槽位右侧被推进来；最后一行可单独成一个大号朱红词。
// 讲全片收尾的金句 / 一句话结论（2–4 行）时用。
// Park 9/29 认可（2026-09-28 那条的 18:30.4，「内观自己 / 把你自己的一切放大 / 这就是你 / 最好的产品」）。
// ShotCraft 来源：typography/lead-word-zoom-assemble
//  保留：两段缩放相加成一条 scale（hold 期推近 PUSH_EASE bezier(.25,1,.5,1) + 缩回 ZOOM_EASE bezier(.5,0,.05,1) 12f），
//        缩回与滑行共用 ZOOM_EASE（滑行 24f，比缩回长一倍，读作一次运动）；支点钉在「领头词中心 + 基线」；
//        后续词从槽位右侧 0.5em 推入（bezier(.22,.8,.36,1) 12f），透明度只用 2f；起手倍数 2.3 附近、推近 6–8%；
//        只有一个强调色词组。
//  改了：竖屏、纸墨中文、左对齐多行排；领头词不一定是句首（句首的词也从右侧推入它的槽位）；
//        只用全角汉字，字宽 = 字号，支点和偏心距直接算、不用挂载实测；
//        卡末的 crash-zoom 是转场前半式，这里是收尾，改成静止 hold 到结束（交给 Stage cut 出场）。
// 版式：每行左对齐 x 96，字数 × size 不超过 ~800（y 900 以下不越过 x 900）；领头词 × scale 别超过画宽 1080。
//       一行只有领头词时（如最后的朱红大词）scale 用 1.3 左右。
// 对时：line.at = 他说出领头词的绝对秒（提前 3f 出现）；recedeAt = 领头词开始缩回的绝对秒（不提前）；
//       其余词的 at = 他说出它的绝对秒（提前 4f 推入，且不早于缩回后 6f）。
import React from 'react';
import { useCurrentFrame, interpolate, Easing } from 'remotion';
import { Stage, INK, RED, PAPER, MUTED, FONT } from '../kit/Stage';
import { frameAt } from '../kit/time';

export type LeadLine = {
  words: { text: string; at?: number; accent?: boolean }[]; // 这一行按顺序的词（全角汉字）；领头词不需要 at
  lead: number; // 领头词在 words 里的下标
  at: number; // 领头词出现
  recedeAt: number; // 领头词缩回、整行组装
  scale: number; // 领头词起手倍数（2.3 附近；一行只有领头词时 1.3）
  push?: number; // hold 期继续推近的倍数（默认 1.06）
  size: number; // 字号 px
  top: number; // 行顶 y
  tone?: 'ink' | 'muted'; // 墨 / 灰（开头的铺垫行用灰）
};
export type LeadWordCloseProps = { t0: number; lines: LeadLine[] };

const PUSH_EASE = Easing.bezier(0.25, 1, 0.5, 1);
const ZOOM_EASE = Easing.bezier(0.5, 0, 0.05, 1);
const WORD_EASE = Easing.bezier(0.22, 0.8, 0.36, 1);
const CLAMP = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

type Word = { t: string; at: number; accent?: boolean };
type Line = { words: Word[]; lead: number; a: number; r: number; s0: number; push: number; fs: number; top: number; color: string };

const X = 96;

const LineView: React.FC<{ f: number; L: Line }> = ({ f, L }) => {
  if (f < L.a) return null;
  const chars = L.words.map((w) => w.t.length);
  const n = chars.reduce((a, b) => a + b, 0);
  const leadStart = chars.slice(0, L.lead).reduce((a, b) => a + b, 0);
  const leadCenter = (leadStart + chars[L.lead] / 2) * L.fs; // 行内 px
  const baseline = L.fs * 0.88;
  const slide = 540 - (X + leadCenter);
  const peak = L.s0 * L.push;
  const scale =
    interpolate(f, [L.a, L.r], [L.s0, peak], { ...CLAMP, easing: PUSH_EASE }) +
    interpolate(f, [L.r, L.r + 12], [0, 1 - peak], { ...CLAMP, easing: ZOOM_EASE });
  const tx = interpolate(f, [L.r, L.r + 24], [slide, 0], { ...CLAMP, easing: ZOOM_EASE });
  return (
    <div style={{ position: 'absolute', left: X, top: L.top, width: n * L.fs, height: L.fs, display: 'flex', fontFamily: FONT, fontWeight: 900, fontSize: L.fs, lineHeight: `${L.fs}px`,
      color: L.color, transformOrigin: `${leadCenter}px ${baseline}px`, transform: `translateX(${tx}px) scale(${scale})` }}>
      {L.words.map((w, i) => {
        const isLead = i === L.lead;
        const start = Math.max(w.at, L.r + 6);
        const op = isLead ? interpolate(f, [L.a, L.a + 6], [0, 1], CLAMP) : interpolate(f, [start, start + 2], [0, 1], CLAMP);
        const push = isLead ? 0 : interpolate(f, [start, start + 12], [0.5 * L.fs, 0], { ...CLAMP, easing: WORD_EASE });
        return (
          <div key={i} style={{ display: 'flex', opacity: op, transform: `translateX(${push}px)`, color: w.accent ? RED : undefined }}>
            {w.t.split('').map((c, k) => <span key={k} style={{ display: 'inline-block', width: L.fs, textAlign: 'center' }}>{c}</span>)}
          </div>
        );
      })}
    </div>
  );
};

export const LeadWordClose: React.FC<LeadWordCloseProps> = ({ t0, lines }) => {
  const f = useCurrentFrame();
  const fr = frameAt(t0);
  const LINES: Line[] = lines.map((l) => ({
    words: l.words.map((w, i) => ({ t: w.text, at: i === l.lead || w.at === undefined ? 0 : fr(w.at) - 4, accent: w.accent })),
    lead: l.lead,
    a: fr(l.at) - 3,
    r: fr(l.recedeAt),
    s0: l.scale,
    push: l.push ?? 1.06,
    fs: l.size,
    top: l.top,
    color: l.tone === 'muted' ? MUTED : INK,
  }));
  return (
    <Stage bg={PAPER} mode="cut">
      {LINES.map((L, i) => <LineView key={i} f={f} L={L} />)}
    </Stage>
  );
};
