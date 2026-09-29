// 入场运动改编自 ShotCraft typography/blur-slide（BlurSlide.tsx）的逐项 y + blur + opacity、easeOutCubic；
// 形态借 typography/pill-slot-cycle 的胶囊标签。改动——做成「A → B → C」的链条，每个胶囊在口播说到它时入场，
// 箭头随后一项一起出现；最后一项用朱红底强调结论。
import React from 'react';
import { useCurrentFrame } from 'remotion';
import { E, lerp, seg } from '../kit/Motion';
import { Card, INK, RED, MUTED } from '../kit/Card';

export type Pill = { at: number; text: string; sub?: string };

export const PillChain: React.FC<{ title: string; pills: Pill[] }> = ({ title, pills }) => {
  const frame = useCurrentFrame();
  const item = (at: number) => {
    const p = seg(frame, at, at + 12, E.outCubic);
    return { opacity: p, transform: `translateY(${lerp(p, 32, 0)}px)`, filter: `blur(${(1 - p) * 10}px)` };
  };
  const last = pills.length - 1;
  // 一行放下：卡片内宽 752px；中文按 1 个字宽、其他字符按 0.6 算，超了就整体缩字号（最大 38）
  const units = pills.reduce((n, p) => n + [...p.text].reduce((m, ch) => m + (/[\u3400-\u9fff]/.test(ch) ? 1 : 0.6), 0), 0);
  const n = pills.length;
  const fs = Math.min(38, Math.floor((752 - 44 * n - 40 * (n - 1)) / (units + 0.9 * (n - 1))));
  return (
    <Card>
      <div style={{ fontSize: 42, fontWeight: 600, color: MUTED, marginBottom: 18 }}>{title}</div>
      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'nowrap', gap: 10 }}>
        {pills.map((p, i) => (
          <React.Fragment key={i}>
            {i > 0 ? <span style={{ ...item(p.at), fontSize: fs, fontWeight: 800, color: MUTED }}>→</span> : null}
            <span style={{ ...item(p.at), display: 'inline-flex', flexDirection: 'column', alignItems: 'center', padding: '14px 22px', borderRadius: 999, background: i === last ? RED : INK, color: '#fff', fontSize: fs, whiteSpace: 'nowrap', fontWeight: 800, lineHeight: 1.1 }}>
              {p.text}
              {p.sub ? <small style={{ fontSize: 24, fontWeight: 600, opacity: 0.8, marginTop: 4 }}>{p.sub}</small> : null}
            </span>
          </React.Fragment>
        ))}
      </div>
    </Card>
  );
};
