// 两份文件（全屏，墨底）：两份叠着落下 → 讲到哪份哪份抬起 → 第二份展开成整页 →
// 高速滚过各节、急刹停在目标表格 → 准星框住其中一列（带标签）→ 慢慢往下带过整张表。
// Park 9/29 认可（2026-09-28 那条的 13:58，「给他两个 PDF」，停在调研报告第三节对标表的「代表」列）。
// 长图和表格位置由 scripts/motion/shoot_doc.py 生成。
// ShotCraft 来源：
//  - 两份叠落：ui-entrance/research-card-stack-scroll（6f 落位 + 1.6f 压缩 + 堆叠轴线、下层变暗）
//  - 长卷急刹：data/scroll-brake-moves B 式 brake-reticle-lock（sin-in 加速 → cubic-out 冲过头 30px → 回弹；
//    blur = 速度 × 0.12 封顶 24；急刹同帧四角标 back(2.4) 飞入咬合）
//  - 其余退暗 0.38：同卡「停点抬升、其余退暗」
import React from 'react';
import { useCurrentFrame, staticFile, Img, interpolate, Easing } from 'remotion';
import { Stage, INK, RED, PAPER, STONE, FONT, E, lerp, seg } from '../kit/Stage';

export type DocStackBrakeProps = {
  t0: number;
  headers: { before: string; after: string }; // 顶部一行：叠落时 / 展开后
  docs: [{ src: string; tag: string }, { src: string; tag: string }]; // 第二份会展开、滚动
  cues: { deal: number; f1: number; f2: number; open: number; go: number; lock: number; drift: number }; // 绝对秒
  report: { h: number; h2: { top: number }[] }; // 第二份长图高度、各节标题位置
  sections: string[]; // 滚动时右上角显示的节名，按 h2 顺序
  stopAt: number; // 急刹停在第几个 h2（下标）
  table: { top: number; bottom: number; col: { left: number; right: number } }; // 目标表格和要框住的列
  lockLabel: string; // 准星上的标签
};

const WIN = { x: 90, y: 220, w: 900, h: 1440 };
const THUMB = 0.56;

// 一份文件：缩略态 = 900×1380 的窗按 THUMB 缩小；展开态 = 原大
const Doc: React.FC<{ src: string; scroll: number; blur: number; children?: React.ReactNode }> = ({ src, scroll, blur, children }) => (
  <div style={{ width: WIN.w, height: WIN.h, borderRadius: 26, overflow: 'hidden', background: PAPER, position: 'relative' }}>
    <div style={{ position: 'absolute', left: 0, top: 0, transform: `translateY(${-scroll}px)`, filter: blur > 0.4 ? `blur(${blur}px)` : undefined }}>
      <Img src={staticFile(src)} style={{ width: 900, display: 'block' }} />
      {children}
    </div>
  </div>
);

export const DocStackBrake: React.FC<DocStackBrakeProps> = ({ t0, headers, docs, cues, report: R, sections, stopAt, table: TB, lockLabel }) => {
  const f = useCurrentFrame();
  const at = (sec: number) => Math.round((sec - t0) * 30);
  const K = { deal: at(cues.deal), f1: at(cues.f1), f2: at(cues.f2), open: at(cues.open), go: at(cues.go), lock: at(cues.lock), drift: at(cues.drift) };
  const COL = TB.col;
  const STOP = R.h2[stopAt].top - 40;
  const END = Math.min(R.h - WIN.h, TB.bottom + 40 - WIN.h);
const scrollAt = (f: number): number => {
  if (f < K.go) return 0;
  const mid = K.go + 18;
  if (f < mid) return interpolate(f, [K.go, mid], [0, STOP * 0.35], { easing: Easing.in(Easing.sin), extrapolateRight: 'clamp' });
  if (f < K.lock) return interpolate(f, [mid, K.lock], [STOP * 0.35, STOP + 30], { easing: Easing.out(Easing.cubic), extrapolateRight: 'clamp' });
  if (f < K.lock + 8) return interpolate(f, [K.lock, K.lock + 8], [STOP + 30, STOP], { easing: Easing.out(Easing.quad), extrapolateRight: 'clamp' });
  return interpolate(f, [K.drift, K.drift + 200], [STOP, END], { easing: Easing.inOut(Easing.sin), extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
};

const SECTION = (y: number) => {
  let n = '';
  R.h2.forEach((h, i) => { if (i < sections.length && y + 500 >= h.top) n = sections[i]; });
  return n;
};


  const y = scrollAt(f);
  const v = Math.abs(y - scrollAt(f - 1));
  const blur = Math.min(24, v * 0.12);

  // 叠落：每份 6f 落位（提前 6f 起飞），落位压 1.6f
  const drop = (i: number) => {
    const a = K.deal + i * 12;
    const p = seg(f, a - 6, a, E.outCubic);
    const squash = f >= a && f < a + 2 ? 0.97 : 1;
    return { p, squash, op: seg(f, a - 6, a - 3) };
  };
  const focus = f >= K.f2 ? 1 : f >= K.f1 ? 0 : -1;
  const open = seg(f, K.open, K.open + 20, E.inOutCubic);

  const base = [
    { x: 150, y: 400, r: -3.5, src: docs[0].src, tag: docs[0].tag },
    { x: 330, y: 560, r: 2.5, src: docs[1].src, tag: docs[1].tag },
  ];

  const lockP = seg(f, K.lock, K.lock + 10, (t) => E.outBack(t, 2.4));
  const dim = seg(f, K.lock, K.lock + 6) * 0.38;
  const tag = seg(f, K.lock + 6, K.lock + 16, (t) => E.outBack(t, 2.6));

  return (
    <Stage bg={INK} mode="cut">
      <div style={{ position: 'absolute', left: WIN.x, top: 136, width: WIN.w, display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: PAPER, fontSize: 38, fontWeight: 700 }}>
        <div style={{ opacity: open > 0.5 ? 1 : seg(f, 4, 14) }}>{open > 0.5 ? headers.after : headers.before}</div>
        <div style={{ color: open > 0.5 && f >= K.go ? RED : STONE, fontSize: 34 }}>{open > 0.5 && f >= K.go ? SECTION(y) : ''}</div>
      </div>
      {base.map((b, i) => {
        const d = drop(i);
        if (d.op <= 0) return null;
        const isReport = i === 1;
        const focused = focus === i;
        const dimmed = focus >= 0 && !focused;
        // 展开：报告从缩略位置到窗口；纪要往左飞出
        const s0 = THUMB * (focused && open === 0 ? 1.05 : 1);
        let x = b.x + lerp(d.p, 380, 0), yy = b.y + lerp(d.p, 460, 0), s = s0 * lerp(d.p, 0.94, 1), r = b.r;
        let op = d.op;
        if (isReport) { x = lerp(open, x, WIN.x); yy = lerp(open, yy, WIN.y); s = lerp(open, s, 1); r = lerp(open, r, 0); }
        else { x -= open * 900; op *= 1 - open; }
        const lift = focused && open === 0 ? seg(f, focus === 0 ? K.f1 : K.f2, (focus === 0 ? K.f1 : K.f2) + 8, E.outCubic) : 0;
        return (
          <div key={i} style={{ position: 'absolute', left: 0, top: 0, transformOrigin: '0 0', zIndex: focused || isReport && open > 0 ? 3 : 1 + i,
            transform: `translate(${x}px, ${yy - lift * 24}px) rotate(${r}deg) scale(${s}) scaleY(${d.squash})`, opacity: op,
            filter: dimmed && open === 0 ? 'brightness(0.55) blur(2px)' : undefined,
            boxShadow: `0 ${30 + lift * 30}px ${80 + lift * 40}px rgba(0,0,0,0.55)`, borderRadius: 26 }}>
            <Doc src={b.src} scroll={isReport ? y : 0} blur={isReport ? blur : 0}>
              {isReport && f >= K.lock && (
                <>
                  {/* 其余退暗：代表列之外盖一层墨 */}
                  <div style={{ position: 'absolute', left: 0, top: 0, width: 900, height: TB.top, background: INK, opacity: dim }} />
                  <div style={{ position: 'absolute', left: 0, top: TB.top, width: COL.left, height: TB.bottom - TB.top, background: INK, opacity: dim }} />
                  <div style={{ position: 'absolute', left: COL.right, top: TB.top, width: 900 - COL.right, height: TB.bottom - TB.top, background: INK, opacity: dim }} />
                  <div style={{ position: 'absolute', left: 0, top: TB.bottom, width: 900, height: 2000, background: INK, opacity: dim }} />
                  {/* 四角标：从画外飞入，急刹同帧咬合 */}
                  {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sy], k) => {
                    const L = COL.left - 8, Rr = COL.right + 8, T = TB.top - 8, B = TB.bottom + 8;
                    const cx = sx < 0 ? L : Rr, cy = sy < 0 ? T : B;
                    const ox = sx * 620 * (1 - lockP), oy = sy * 320 * (1 - lockP);
                    return <div key={k} style={{ position: 'absolute', left: cx - (sx < 0 ? 0 : 44) + ox, top: cy - (sy < 0 ? 0 : 44) + oy, width: 44, height: 44,
                      borderLeft: sx < 0 ? `8px solid ${RED}` : undefined, borderRight: sx > 0 ? `8px solid ${RED}` : undefined,
                      borderTop: sy < 0 ? `8px solid ${RED}` : undefined, borderBottom: sy > 0 ? `8px solid ${RED}` : undefined }} />;
                  })}
                  <div style={{ position: 'absolute', left: COL.left, top: TB.top - 70, transform: `scale(${tag})`, transformOrigin: '0 100%',
                    background: RED, color: PAPER, fontFamily: FONT, fontSize: 34, fontWeight: 800, padding: '6px 20px', borderRadius: 30 }}>{lockLabel}</div>
                </>
              )}
            </Doc>
            {open < 0.3 && (
              <div style={{ position: 'absolute', left: 30, bottom: 30, background: INK, color: PAPER, fontFamily: FONT, fontSize: 64, fontWeight: 800, padding: '14px 36px', borderRadius: 50, opacity: 1 - open * 3 }}>{b.tag}</div>
            )}
          </div>
        );
      })}
    </Stage>
  );
};
