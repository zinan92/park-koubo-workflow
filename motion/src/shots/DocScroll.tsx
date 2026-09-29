// 一份文件整页慢滚（全屏，墨底）：每个小标题停一下，让人看清「怎么拆他的生意、给了什么建议」。
// Park 9/29 认可（2026-09-28 那条的 12:01，发给客户的咨询纪要）。长图和 meta 由 scripts/motion/shoot_doc.py 生成，
// 客户名字、营业额在长图里已遮黑（视频用副本，原件不动）。
// ShotCraft 来源：
//  - 纸页从底边铰点翻起：ui-entrance/platform-hinge-rise（rotateX 回正 + 一次阻尼回摆）
//  - 每停一节，小标题上扫一道朱红：typography/marker-underline-title
//  - 滚动模糊按帧间位移差分：data/scroll-brake-moves 的 velocityAt 做法
import React from 'react';
import { useCurrentFrame, staticFile, Img, interpolate } from 'remotion';
import { Stage, INK, RED, PAPER, STONE, FONT, E, lerp, seg } from '../kit/Stage';

export type DocMeta = { w: number; h: number; h2: { top: number; bottom: number }[] };
export type DocScrollProps = { t0: number; src: string; label: string; meta: DocMeta };

const WIN = { x: 90, y: 220, w: 900, h: 1440 };
const MOVE = 26, HOLD = 55, FIRST = 62;

export const DocScroll: React.FC<DocScrollProps> = ({ src, label, meta: M }) => {
  const f = useCurrentFrame();
  const MAX = M.h - WIN.h;
  const plan: { a: number; from: number; to: number }[] = [];
  {
    let a = FIRST, prev = 0;
    for (const h of M.h2) { const s = Math.min(MAX, h.top - 70); plan.push({ a, from: prev, to: s }); prev = s; a += MOVE + HOLD; }
  }
  const scrollAt = (fr: number) => {
    let y = 0;
    for (const p of plan) if (fr >= p.a) y = lerp(seg(fr, p.a, p.a + MOVE, E.inOutCubic), p.from, p.to);
    return y;
  };
  const rise = seg(f, 0, 18, E.outCubic);
  const wob = f < 18 ? 0 : 1.4 * Math.sin(((f - 18) / 16) * Math.PI * 3) * Math.pow(1 - seg(f, 18, 34), 2);
  const y = scrollAt(f);
  const v = Math.abs(y - scrollAt(f - 1));
  const idx = plan.filter((p) => f >= p.a + MOVE - 4).length; // 当前停在第几节
  return (
    <Stage bg={INK} mode="cut">
      <div style={{ position: 'absolute', left: WIN.x, top: 136, width: WIN.w, display: 'flex', justifyContent: 'space-between', alignItems: 'center', opacity: seg(f, 6, 16) }}>
        <div style={{ color: PAPER, fontSize: 38, fontWeight: 700, letterSpacing: '0.04em' }}>{label}</div>
        <div style={{ color: STONE, fontSize: 34, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
          {idx > 0 ? <><span style={{ color: RED }}>{idx}</span> / {plan.length} 节</> : `${plan.length} 节`}
        </div>
      </div>
      <div style={{ position: 'absolute', left: 0, top: 0, width: 1080, height: 1920, perspective: 1800 }}>
        <div style={{ position: 'absolute', left: WIN.x, top: WIN.y, width: WIN.w, height: WIN.h, borderRadius: 26, overflow: 'hidden',
          background: PAPER, boxShadow: '0 30px 80px rgba(0,0,0,0.5)', transformOrigin: '50% 100%',
          transform: `translateY(${lerp(rise, 360, 0)}px) rotateX(${lerp(rise, 28, 0) + wob}deg)`, opacity: seg(f, 0, 6) }}>
          <div style={{ position: 'absolute', left: 0, top: 0, transform: `translateY(${-y}px)`, filter: v > 3 ? `blur(${Math.min(6, v * 0.08)}px)` : undefined }}>
            <Img src={staticFile(src)} style={{ width: M.w, height: M.h, display: 'block' }} />
            {plan.map((p, i) => {
              const h = M.h2[i];
              const s = seg(f, p.a + MOVE - 2, p.a + MOVE + 12, E.outCubic);
              return <div key={i} style={{ position: 'absolute', left: 60, top: h.bottom + 2, height: 9, width: 560 * s, background: RED, opacity: 0.55, borderRadius: 7 }} />;
            })}
          </div>
        </div>
      </div>
    </Stage>
  );
};
