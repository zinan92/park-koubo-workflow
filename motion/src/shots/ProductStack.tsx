// 清单压栈（胸前卡片）：标题先单独一条，之后每说到一项，就有一张条目卡从卡片下沿升上来摞到清单底部，
// 落定压一下整摞、标题右侧的刻度格亮一格（最后一格朱红），卡片随之平滑长高。
// 用在：一段话里陆续列出 2–6 个功能/步骤/清单项，间隔可长可短（中间停很久也没关系）；每项 ≤12 字。
// Park 9/29 认可（2026-09-28 那条的 13:22，「我的产品 · 先给博主用」六项功能，例子数据见 examples/）。
// 改编自 ShotCraft ui-entrance/list-stack-press（ListStackPress.tsx）：
// 保留——条目卡从下方升入（bezier(0.45,0.05,0.25,1.12) 末端过冲、22f、交替 ±2° 倾斜收平、scale 1.06→1），
//   阴影随高度收敛；每张落定时已落定的整摞被压下 6px、8f 弹回（stackPress 脉冲）；
//   落定后滞后 3f 长出强调底色条（7f 长 + 5f 淡），拖拽层级「卡体停 → 整摞弹 → 高亮条」；
//   计数器先于首卡 6f 做一次预备拍（微缩 0.96→1 + 亮起），每落一张同步跳一格；正视机位。
// 改动——卡片从只有标题开始，随条目落定同曲线向上长高（下沿固定在 y1580），新条目从卡片下沿里升上来（条目区自己裁切）；
//   单列最多 6 条，内容高最多 532px。数字计数器换成「刻度格」——不出现他没说的数字。
//   收尾 glaze 扫光不做（白卡纸底上看不出，且 Q4 宁缺毋滥）；相机跟随不做（卡片自己长高代替）。
// 对时：items[].at = 他说出这一项的口播秒，条目提前 2f 落定。
import React from 'react';
import { useCurrentFrame, Easing } from 'remotion';
import { Card } from '../kit/Card';
import { INK, RED, STONE, LINE, E, seg } from '../kit/Stage';
import { frameAt } from '../kit/time';

export type ProductStackProps = {
  t0: number;
  title: string; // 如「我的产品」
  subtitle?: string; // 标题后面用「·」隔开的半句，如「先给博主用」
  items: { text: string; at: number }[]; // 2–6 项
};

const DUR = 22;
const FLY = Easing.bezier(0.45, 0.05, 0.25, 1.12);

const W = 752;
const TITLE_H = 66;
const TITLE_GAP = 24;
const ROW = 66;
const GAP = 10;
const PITCH = ROW + GAP;

export const ProductStack: React.FC<ProductStackProps> = ({ t0, title, subtitle, items }) => {
  const f = useCurrentFrame();
  const A = frameAt(t0);
  const ITEMS = items.map((it) => ({ text: it.text, land: A(it.at) - 2 }));

  // 列表高度：每张飞入的同时撑开一格（out cubic，不过冲，卡片外沿不抖）
  let listH = 0;
  ITEMS.forEach((it, i) => {
    const g = seg(f, it.land - DUR, it.land - 4, E.outCubic);
    listH += g * (i === 0 ? ROW : PITCH);
  });
  const titleGap = seg(f, ITEMS[0].land - DUR, ITEMS[0].land - 4, E.outCubic) * TITLE_GAP;

  // 预备拍：刻度格区域先于首卡 6f 微缩亮起
  const cue0 = ITEMS[0].land - DUR;
  const ant = seg(f, cue0 - 6, cue0, E.outQuad);

  const press = (i: number) => {
    let p = 0;
    for (let j = i + 1; j < ITEMS.length; j++) {
      const L = ITEMS[j].land;
      if (f >= L && f <= L + 8) p = Math.max(p, f < L + 4 ? seg(f, L, L + 4) * 6 : (1 - seg(f, L + 4, L + 8)) * 6);
    }
    return p;
  };

  return (
    <Card>
      {/* 标题 + 刻度格 */}
      <div style={{ height: TITLE_H, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: 50, fontWeight: 800, color: INK, whiteSpace: 'nowrap' }}>
          {title}{subtitle ? <><span style={{ color: STONE, margin: '0 14px' }}>·</span>{subtitle}</> : null}
        </div>
        <div style={{ display: 'flex', gap: 8, transform: `scale(${0.96 + 0.04 * ant})`, opacity: 0.35 + 0.65 * ant, transformOrigin: '100% 50%' }}>
          {ITEMS.map((it, i) => {
            const on = seg(f, it.land, it.land + 8, (t) => E.outBack(t, 2.2));
            return (
              <div key={i} style={{ width: 16, height: 34, borderRadius: 4, background: LINE, position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: `${Math.min(1.15, on) * 100}%`, background: i === ITEMS.length - 1 ? RED : INK, borderRadius: 4 }} />
              </div>
            );
          })}
        </div>
      </div>
      <div style={{ height: titleGap }} />

      {/* 条目区：自己裁切，新条从下沿升入 */}
      <div style={{ position: 'relative', width: W + 24, marginLeft: -12, height: listH, overflow: 'hidden' }}>
        {ITEMS.map((it, i) => {
          const cue = it.land - DUR;
          const t = seg(f, cue, it.land, FLY);
          if (f < cue) return null;
          const settled = f >= it.land;
          const dy = 360 * (1 - t) + (settled ? press(i) : 0);
          const rot = (i % 2 === 0 ? 2 : -2) * (1 - t);
          const sc = 1.06 - 0.06 * t;
          const air = Math.max(0, 1 - t);
          const hl0 = it.land + 3;
          const grow = seg(f, hl0, hl0 + 7, Easing.bezier(0.3, 0, 0.2, 1));
          const fade = 1 - seg(f, hl0 + 7, hl0 + 12);
          const last = i === ITEMS.length - 1;
          return (
            <div key={i} style={{ position: 'absolute', left: 12, top: i * PITCH, width: W, height: ROW, borderRadius: 16, background: '#FFFFFF',
              boxShadow: settled ? '0 2px 6px rgba(60,45,30,0.10), inset 0 0 0 2px #ECE7DD' : `0 ${10 + 22 * air}px ${18 + 40 * air}px rgba(60,45,30,${0.1 + 0.18 * air}), inset 0 0 0 2px #ECE7DD`,
              transform: `translateY(${dy}px) rotate(${rot}deg) scale(${sc})`, display: 'flex', alignItems: 'center', gap: 20, paddingLeft: 24, boxSizing: 'border-box', overflow: 'hidden' }}>
              {grow > 0 && fade > 0 && (
                <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${grow * 42}%`, background: 'rgba(226,70,31,0.12)', borderRight: `3px solid ${RED}`, opacity: fade }} />
              )}
              <span style={{ width: 12, height: 12, borderRadius: 3, background: last ? RED : INK, flexShrink: 0, position: 'relative' }} />
              <span style={{ fontSize: 42, fontWeight: 700, color: INK, whiteSpace: 'nowrap', lineHeight: 1, position: 'relative' }}>{it.text}</span>
            </div>
          );
        })}
      </div>
    </Card>
  );
};
