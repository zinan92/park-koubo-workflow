// 改编自 ShotCraft typography/blur-slide（BlurSlide.tsx）：
// 保留——逐项入场 y 40→0 + blur 10→0 + opacity 0→1，三通道同一 easeOutCubic 同步收敛。
// 改动——原片按词、按归一化时间 stagger；这里一行一项、每行在口播说到它的那一帧入场（at），
// 适配中文数字清单；行内数字用朱红；标题行在卡片出现时就在。
import React from 'react';
import { useCurrentFrame } from 'remotion';
import { E, lerp, seg } from '../kit/Motion';
import { Card, RED, MUTED } from '../kit/Card';

export type Row = { at: number; lead: string; num: string; tail?: string };

export const BlurRows: React.FC<{ title: string; rows: Row[]; footer?: { at: number; text: string }; columns?: number }> = ({ title, rows, footer, columns = 1 }) => {
  const frame = useCurrentFrame();
  const item = (at: number) => {
    const p = seg(frame, at, at + 12, E.outCubic);
    return { opacity: p, transform: `translateY(${lerp(p, 40, 0)}px)`, filter: `blur(${(1 - p) * 10}px)` };
  };
  return (
    <Card>
      <div style={{ fontSize: 42, fontWeight: 600, color: MUTED, marginBottom: 10 }}>{title}</div>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`, columnGap: 28 }}>
      {rows.map((r, i) => (
        <div key={i} style={{ ...item(r.at), display: 'flex', alignItems: 'baseline', gap: 16, fontSize: 48, fontWeight: 700, lineHeight: 1.5 }}>
          <span>{r.lead}</span>
          <span style={{ color: RED, fontSize: 64, fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>{r.num}</span>
          {r.tail ? <span>{r.tail}</span> : null}
        </div>
      ))}
      </div>
      {footer ? <div style={{ ...item(footer.at), marginTop: 10, fontSize: 40, fontWeight: 700, color: RED }}>{footer.text}</div> : null}
    </Card>
  );
};
