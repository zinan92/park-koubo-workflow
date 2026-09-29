// 前后对比拉杆（胸前卡片）：同一个位置上两版说法叠着，分割杆先猛甩后慢扫，把「旧说法」（灰）揭成「新说法」（朱红 + 马克笔下划线）。
// 用在：「不要 A，要 B」「从 X 升级成 Y」这类一词之差的对比；两个大词字数相同、共用后缀时效果最好（如 效率级痛点 → 命运级痛点）。
// Park 9/29 认可（2026-09-28 那条的 12:21.4，「效率级痛点 · 工具测评 → 命运级痛点」，例子数据见 examples/）。
// 改编自 ShotCraft data/before-after-slider-scrub（BeforeAfterSliderScrub.tsx）：
// 保留——前后两版同布局叠放，after 层 clip-path inset 右边界严格跟随分割杆；竖分割杆 + 圆手柄（左右三角），
//   手柄按速度差分 scaleX 微拉伸（峰值 1.18，静止归 1）；节奏 = 静置 → 12f 猛甩过冲（out cubic）→ 12f 回弹
//   → 停一拍 → 48f 慢扫 → 真静止。「快甩宣告变了，慢扫证明变在哪」。
// 改动——两版是文字不是截图：前版大词 + 右侧灰标签（可选），后版朱红大词 + 一笔朱红马克笔下划线；
//   慢扫方向改为继续向右把后版揭完（原卡回扫到 40% 两版并存，但文字被杆切半读不清），灰标签被慢扫擦掉；
//   扫完杆淡出；底部可选一行小字，出现时卡片向上长出这一行。卡内不加 BEFORE/AFTER 角标。
// 对时：flingAt = 他说出新词的口播秒，猛甩提前 7f 起步（扫过前三字时正好说到）；note.at 小字提前 3f 入场。
import React from 'react';
import { useCurrentFrame } from 'remotion';
import { Card } from '../kit/Card';
import { INK, RED, STONE, MUTED, FONT, E, lerp, seg } from '../kit/Stage';
import { frameAt } from '../kit/time';

export type PainSliderProps = {
  t0: number;
  before: string; // 旧说法大词（灰），如「效率级痛点」
  beforeTag?: string; // 旧说法右下的灰标签，会被慢扫擦掉，如「工具测评」
  after: string; // 新说法大词（朱红），如「命运级痛点」
  flingAt: number; // 说出新词的口播秒
  note?: { at: number; text: string }; // 底部小字，如「所以我不做工具测评」
};

const W = 752;
const WH = 300;
// 时间轴：杆位置用窗口宽度百分比；猛甩起点之后的节拍都是相对帧
const posAt = (f: number, FLING0: number) => {
  const FLING1 = FLING0 + 12;
  const BOUNCE = FLING1 + 12;
  const SCRUB0 = BOUNCE + 16;
  const SCRUB1 = SCRUB0 + 48;
  if (f < FLING0) return 4;
  if (f < FLING1) return lerp(seg(f, FLING0, FLING1, E.outCubic), 4, 68);
  if (f < BOUNCE) return lerp(seg(f, FLING1, BOUNCE, E.inOutCubic), 68, 60);
  if (f < SCRUB0) return 60;
  return lerp(seg(f, SCRUB0, SCRUB1, E.inOutQuad), 60, 100);
};

// 马克笔笔形（同 cards/MarkerNumber 的 buildStroke 写法）
const mulberry32 = (a: number) => () => {
  let t = (a += 0x6d2b79f5);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const buildStroke = (len: number, seed: number) => {
  const rand = mulberry32(seed);
  const N = 40, top: string[] = [], bot: string[] = [];
  const wob = Array.from({ length: N + 1 }, () => rand() - 0.5);
  for (let i = 0; i <= N; i++) {
    const t = i / N, x = t * len;
    const mid = 19 - t * 9 + Math.sin(t * Math.PI * 1.6 + 0.4) * 2.6 + wob[i] * 1.6;
    const wBase = 14 + Math.sin(t * Math.PI) * 6 - Math.max(0, t - 0.86) * 46;
    const w = Math.max(2.2, wBase + wob[i] * 3) * 1.3;
    top.push(`${x.toFixed(1)},${(mid - w / 2).toFixed(1)}`);
    bot.push(`${x.toFixed(1)},${(mid + w / 2).toFixed(1)}`);
  }
  return `M${top.join('L')}L${bot.reverse().join('L')}Z`;
};
const units = (t: string) => [...t].reduce((n, ch) => n + (/[\u3400-\u9fff]/.test(ch) ? 1 : 0.6), 0);

const BIG: React.CSSProperties = { position: 'absolute', left: 40, top: 48, fontWeight: 800, lineHeight: 1, letterSpacing: 2, whiteSpace: 'nowrap' };

export const PainSlider: React.FC<PainSliderProps> = ({ t0, before, beforeTag, after, flingAt, note: noteCue }) => {
  const f = useCurrentFrame();
  const A = frameAt(t0);
  const FLING0 = A(flingAt) - 7;
  const SCRUB1 = FLING0 + 12 + 12 + 16 + 48;
  const NOTE = noteCue ? A(noteCue.at) - 3 : Infinity;
  // 大词字号：5 个汉字 118px，更长就缩；下划线长度跟着字宽（5 字 = 560）
  const fs = Math.min(118, Math.floor(672 / Math.max(units(before), units(after))));
  const len = Math.min(560, Math.floor(units(after) * fs * 0.95));
  const STROKE = buildStroke(len, 41);
  const p = posAt(f, FLING0);
  const x = (p / 100) * W;
  const v = Math.abs(posAt(f, FLING0) - posAt(f - 1, FLING0));
  const squish = 1 + Math.min(v / 6, 1) * 0.18;
  const barOp = 1 - seg(f, SCRUB1 + 4, SCRUB1 + 14, E.inQuad);
  const note = noteCue ? seg(f, NOTE, NOTE + 12, E.outCubic) : 0;

  return (
    <Card>
      <div style={{ position: 'relative', width: W, height: WH, borderRadius: 24, overflow: 'hidden' }}>
        {/* 前版：灰蒙低对比 */}
        <div style={{ position: 'absolute', inset: 0, background: '#E3DED3' }}>
          <div style={{ ...BIG, fontSize: fs, color: '#ABA497' }}>{before}</div>
          {beforeTag && <div style={{ position: 'absolute', right: 34, top: 196, padding: '10px 26px', borderRadius: 40, background: '#D3CCBF', color: '#857E71', fontSize: 50, fontWeight: 700, lineHeight: 1.1 }}>{beforeTag}</div>}
        </div>
        {/* 后版：杆左侧揭出 */}
        <div style={{ position: 'absolute', inset: 0, background: '#FCFAF5', clipPath: `inset(0 ${Math.max(0, W - x)}px 0 0)` }}>
          <div style={{ ...BIG, fontSize: fs, color: RED }}>{after}</div>
          <svg width={len} height={44} viewBox={`0 0 ${len} 44`} style={{ position: 'absolute', left: 36, top: 184 }}>
            <path d={STROKE} fill={RED} opacity={0.9} />
          </svg>
        </div>
        {/* 分割杆 + 手柄（裁在窗口内） */}
        <div style={{ position: 'absolute', left: x - 3, top: 0, width: 6, height: WH, background: INK, opacity: barOp }} />
        <div style={{ position: 'absolute', left: x - 40, top: WH / 2 - 40, width: 80, height: 80, borderRadius: 40, background: '#FCFAF5', border: `4px solid ${INK}`, boxSizing: 'border-box',
          transform: `scaleX(${squish})`, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, opacity: barOp, boxShadow: '0 6px 18px rgba(21,23,28,0.3)' }}>
          <div style={{ width: 0, height: 0, borderTop: '11px solid transparent', borderBottom: '11px solid transparent', borderRight: `15px solid ${INK}` }} />
          <div style={{ width: 0, height: 0, borderTop: '11px solid transparent', borderBottom: '11px solid transparent', borderLeft: `15px solid ${INK}` }} />
        </div>
      </div>
      {noteCue && <div style={{ marginTop: 24 * note, height: 60 * note, overflow: 'visible', display: 'flex', alignItems: 'center', gap: 14, fontFamily: FONT, fontSize: 46, fontWeight: 700, color: MUTED,
        opacity: note, transform: `translateY(${lerp(note, 24, 0)}px)`, filter: `blur(${(1 - note) * 8}px)` }}>
        <span style={{ width: 12, height: 12, borderRadius: 6, background: STONE, display: 'inline-block' }} />
        {noteCue.text}
      </div>}
    </Card>
  );
};
