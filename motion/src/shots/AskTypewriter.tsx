// 连环追问（全屏，墨底）：宋体大字逐字打出他问的每一个问题；新一问开打时，前面的问题缩小、退暗、上移成一叠
// 「已经问过的」；某一问下面可以挂朱红小字旁注（他顺口举的例子）。讲一连串自问 / 拷问观众的问题时用（2–4 问）。
// Park 9/29 认可（2026-09-28 那条的 17:07.8，「你究竟在卖什么？…你还愿意相信自己是对的吗？」）。
// ShotCraft 来源：typography/typewriter-moves（打字）+ typography/document-typewriter-reveal（只有一个笔尖）
//  保留：字符按帧阈值硬出现、零插值（「任何缓动打字都读作加载动画」）；逐字符固定宽度 + 左缘锚定，
//        没打出的字用 visibility:hidden 占位，整行不重排；光标就是演员的脸——打字时常亮、停顿时方波闪、
//        最后一问打完闪两下后卸载（不留残影）；收尾真静止；永远只有当前这一问有光标。
//  改了：竖屏墨底纸字、宋体、朱红光标；打字节奏不是固定 2f/字，而是每个字对到他说出它的时刻（提前 3f），
//        停顿就是他的停顿；B 式的「改口」不用。
// 版式：每行 ≤7 个全角字（104px，x 100 起，y 900 以下不越过 x 900），标点也用全角；一问最多 4 行；
//       旁注一行（60px）；当前这一问顶在 y 820，旧问题缩到 0.58 往上叠（四问叠满约到 y 300）。
// 对时：每个字一个绝对秒（查 words.json 词级时间，一个词的几个字平分这个词的时长）；最后一问打完后留 ≥1 秒再结束。
import React from 'react';
import { useCurrentFrame } from 'remotion';
import { Stage, INK, RED, PAPER, SERIF, FONT, E, lerp, seg } from '../kit/Stage';
import { frameAt } from '../kit/time';

export type TypedRow = { text: string; at: number[] }; // at：每个字出现的绝对秒，长度 = 字数
export type AskTypewriterProps = {
  t0: number;
  questions: { rows: TypedRow[]; notes?: TypedRow[] }[]; // 按顺序的 2–4 问；notes = 这一问下面的朱红旁注（可多段，横排）
};

type Row = { text: string; t: number[] };

const FS = 104, ROW = 136, NOTE_FS = 60, NOTE_ROW = 96, X = 100, Y_ACT = 820, GAP = 50, OLD = 0.58;
const DEPTH_OP = [1, 0.42, 0.24, 0.14];
const DEMOTE = 16;

export const AskTypewriter: React.FC<AskTypewriterProps> = ({ t0, questions }) => {
  const f = useCurrentFrame();
  const fa = frameAt(t0);
  const fr = (sec: number) => fa(sec) - 3;
  const BLOCKS: { rows: Row[]; notes?: Row[] }[] = questions.map((q) => ({
    rows: q.rows.map((r) => ({ text: r.text, t: r.at })),
    notes: q.notes ? q.notes.map((r) => ({ text: r.text, t: r.at })) : undefined,
  }));
  const frames = BLOCKS.map((b) => ({ rows: b.rows.map((r) => r.t.map(fr)), notes: (b.notes ?? []).map((r) => r.t.map(fr)) }));
  const startOf = (i: number) => frames[i].rows[0][0];
  const lastOf = (i: number) => {
    const all = [...frames[i].rows.flat(), ...frames[i].notes.flat()];
    return Math.max(...all);
  };
  const heightOf = (i: number) => BLOCKS[i].rows.length * ROW + (BLOCKS[i].notes ? NOTE_ROW : 0);

  // 每块被后一块「顶上去」的进度，和它的深度（连续值）
  const demote = BLOCKS.map((_, i) => (i + 1 < BLOCKS.length ? seg(f, startOf(i + 1) - 6, startOf(i + 1) - 6 + DEMOTE, E.outCubic) : 0));
  const depth = BLOCKS.map((_, i) => demote.slice(i).reduce((a, b) => a + b, 0));
  const active = Math.max(0, frames.reduce((a, _, i) => (f >= startOf(i) - 6 ? i : a), 0));

  // 从当前块往上叠
  const tops: number[] = [];
  const scales: number[] = [];
  for (let i = BLOCKS.length - 1; i >= 0; i--) {
    const s = lerp(demote[i], 1, OLD);
    scales[i] = s;
    if (i >= active) { tops[i] = Y_ACT; continue; }
    const stacked = tops[i + 1] - GAP - heightOf(i) * s;
    tops[i] = lerp(demote[i], Y_ACT, stacked);
  }

  // 光标：跟当前块最后一个已出的字
  let cur: { x: number; y: number; h: number; lastAt: number } | null = null;
  {
    const b = frames[active];
    let x = X, y = tops[active], h = FS, lastAt = -99;
    b.rows.forEach((r, ri) => r.forEach((a, ci) => { if (f >= a) { x = X + (ci + 1) * FS; y = tops[active] + ri * ROW; h = FS; lastAt = Math.max(lastAt, a); } }));
    const noteY = tops[active] + b.rows.length * ROW + 14;
    let nx = X;
    b.notes.forEach((r) => {
      r.forEach((a, ci) => { if (f >= a) { x = nx + (ci + 1) * NOTE_FS; y = noteY; h = NOTE_FS; lastAt = Math.max(lastAt, a); } });
      nx += (r.length + 1) * NOTE_FS;
    });
    cur = { x, y, h, lastAt };
  }
  const typing = cur && f - cur.lastAt < 10;
  const isLast = active === BLOCKS.length - 1;
  const done = isLast && f >= lastOf(active);
  const blinkOn = Math.floor((f - (cur?.lastAt ?? 0)) / 8) % 2 === 0;
  const cursorVisible = cur && (typing || (done ? f < lastOf(active) + 32 && blinkOn : blinkOn));

  return (
    <Stage bg={INK} mode="cut">
      {BLOCKS.map((b, i) => {
        if (f < startOf(i) - 6) return null;
        const d = depth[i];
        const k = Math.min(3, Math.floor(d));
        const op = lerp(d - k, DEPTH_OP[k], DEPTH_OP[Math.min(3, k + 1)]);
        return (
          <div key={i} style={{ position: 'absolute', left: X, top: tops[i], transformOrigin: '0 0', transform: `scale(${scales[i]})`, opacity: op }}>
            {b.rows.map((r, ri) => (
              <div key={ri} style={{ display: 'flex', height: ROW, fontFamily: SERIF, fontWeight: 900, fontSize: FS, lineHeight: `${FS}px`, color: PAPER }}>
                {r.text.split('').map((c, ci) => (
                  <span key={ci} style={{ display: 'inline-block', width: FS, textAlign: 'center', visibility: f >= frames[i].rows[ri][ci] ? 'visible' : 'hidden' }}>{c}</span>
                ))}
              </div>
            ))}
            {b.notes && (
              <div style={{ display: 'flex', marginTop: 14, height: NOTE_ROW - 14, fontFamily: FONT, fontWeight: 800, fontSize: NOTE_FS, lineHeight: `${NOTE_FS}px`, color: RED }}>
                {b.notes.map((r, ni) => (
                  <div key={ni} style={{ display: 'flex', marginRight: NOTE_FS }}>
                    {r.text.split('').map((c, ci) => (
                      <span key={ci} style={{ display: 'inline-block', width: NOTE_FS, textAlign: 'center', visibility: f >= frames[i].notes[ni][ci] ? 'visible' : 'hidden' }}>{c}</span>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
      {cursorVisible && cur && (
        <div style={{ position: 'absolute', left: cur.x + 8, top: cur.y + cur.h * 0.04, width: cur.h > 80 ? 9 : 6, height: cur.h * 0.96, background: RED }} />
      )}
    </Stage>
  );
};
