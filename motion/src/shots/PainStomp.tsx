// 图章砸字 + 底闪（胸前卡片）：标题 + 3–6 个短词，逐拍像图章一样歪着砸在各自的位置上并留下来，
// 每个词落定那一刻卡片底色闪几帧、字纹丝不动；最后一个词朱红、闪得更重。
// 用在：一口气列举几个并列的短词（2–3 字），口播节奏快、想要「一拍一拍砸下来」的重量感时（一条视频最多一次）。
// Park 9/29 认可（2026-09-28 那条的 12:43.8，「命运级痛点就几个：婚姻 上学 生病 找工作 钱不够」，例子数据见 examples/）。
// 改编自 ShotCraft typography/cel-flash-stomp（CelFlashStomp.tsx）：
// 保留——每词硬切入场、6f 砸落 scale 1.18→0.98→1（out poly5 + 2% 过冲）、±2.5° 交替歪角像图章、
//   末词归 0°；「底闪与文字分层」是命门：词落定那帧起背景层每 2f 在两色间交替共 6f，字纹丝不动；
//   末词闪加倍（8f）且对比拉大；词间零 crossfade；末词落定后真静止 ≥1s。
// 改动——口播里词间隔常只有十几帧，照原卡「一词占满屏、下一词替换」会读成滚动字幕，所以改成每个词有固定位
//   （≤3 个一排；更多分两排，上排多一个），逐拍砸在自己的位置上累积；所有位置从第 0 帧就排好，后落的词不挤动先落的。
//   底闪克制：纸白 ↔ 浅石色，只闪卡片内部（闪层带与卡片同样的圆角）；末词朱红、闪色深一档。
//   原卡的底部标签条不做；标题从卡片入场起就在。
// 对时：words[].at = 他说出这个词的口播秒，硬切提前 3f。
import React from 'react';
import { useCurrentFrame, Easing } from 'remotion';
import { Card } from '../kit/Card';
import { INK, RED, SERIF, lerp, seg } from '../kit/Stage';
import { frameAt } from '../kit/time';

export type PainStompProps = {
  t0: number;
  title: string; // 如「命运级痛点就几个」
  words: { text: string; at: number }[]; // 3–6 个短词，最后一个朱红
};

const LAND = 6;
const LEAD = 3; // 硬切比口播提前 3f
const ROW1 = 108;
const ROW2 = 282;
const W = 752;

const units = (t: string) => [...t].reduce((n, ch) => n + (/[㐀-鿿]/.test(ch) ? 1 : 0.6), 0);

const stomp = (t: number) =>
  t < 4
    ? lerp(Easing.out(Easing.poly(5))(Math.min(1, t / 4)), 1.18, 0.98)
    : lerp(seg(t, 4, LAND, Easing.out(Easing.quad)), 0.98, 1);

export const PainStomp: React.FC<PainStompProps> = ({ t0, title, words }) => {
  const f = useCurrentFrame();
  const A = frameAt(t0);
  const n = words.length;
  const top = n <= 3 ? n : Math.ceil(n / 2);
  const rowW = (k: number) => (W - (k >= 3 ? 16 : 32) * (k - 1)) / k;
  const slots = words.map((w, i) => {
    const row = i < top ? 0 : 1;
    const k = row === 0 ? top : n - top;
    const j = row === 0 ? i : i - top;
    const ww = rowW(k);
    const gap = k >= 3 ? 16 : 32;
    const last = i === n - 1;
    return {
      text: w.text, start: A(w.at) - LEAD, rot: last ? 0 : i % 2 === 0 ? 2.5 : -2.5, flashLen: last ? 8 : 6,
      dark: last ? '#D6CDBD' : '#E3DCCF', color: last ? RED : INK, x: j * (ww + gap), y: row === 0 ? ROW1 : ROW2, w: ww,
    };
  });
  const FS = Math.min(116, ...slots.map((s) => Math.floor((s.w - 6) / units(s.text))));
  const H = (n > 3 ? ROW2 : ROW1) + 150;

  // 底闪：取最近一个落定的词
  let flash: string | null = null;
  for (const w of slots) {
    const ft = f - w.start - LAND;
    if (ft >= 0 && ft < w.flashLen && Math.floor(ft / 2) % 2 === 0) flash = w.dark;
  }

  return (
    <Card>
      <div style={{ position: 'relative', width: W, height: H }}>
        {/* 闪层：盖满卡片（抵消 Card 的内边距）并带同样圆角；里面不放任何东西 */}
        {flash && <div style={{ position: 'absolute', left: -44, top: -34, right: -44, bottom: -34, borderRadius: 34, background: flash }} />}

        <div style={{ position: 'absolute', left: 0, top: 0, height: 70, display: 'flex', alignItems: 'center', gap: 16, fontSize: 52, fontWeight: 800, color: INK }}>
          <span style={{ width: 14, height: 46, borderRadius: 4, background: RED, display: 'inline-block' }} />
          {title}
        </div>
        {/* 细分隔线 */}
        <div style={{ position: 'absolute', left: 0, top: 86, width: W, height: 3, borderRadius: 2, background: 'rgba(183,176,163,0.45)' }} />

        {slots.map((w, i) => {
          const t = f - w.start;
          const shown = t >= 0;
          return (
            <div key={i} style={{ position: 'absolute', left: w.x, top: w.y, width: w.w, height: 150, display: 'flex', alignItems: 'center', justifyContent: 'center',
              visibility: shown ? 'visible' : 'hidden' }}>
              <div style={{ fontFamily: SERIF, fontWeight: 900, fontSize: FS, lineHeight: 1, color: w.color, letterSpacing: 2,
                transform: `scale(${shown ? stomp(t) : 1}) rotate(${w.rot}deg)`, whiteSpace: 'nowrap' }}>
                {w.text}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
};
