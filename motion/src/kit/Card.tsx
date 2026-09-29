// 版式 C（竖屏全屏口播）：卡片只放在胸前区。实测 1080×1920 画面里头部占 18–59% 高，
// 剪映字幕胶囊在 85–91%，右侧 x>900 留给抖音点赞/评论栏 → 卡片区 x 60–900，下沿 y≤1580。
// 品牌色：纸白 #F4F1EA 底、墨黑 #15171C 字、朱红 #E2461F 强调。
import React from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import { E, lerp, seg } from './Motion';

export const INK = '#15171C';
export const RED = '#E2461F';
export const MUTED = '#6B655B';
export const PAPER = 'rgba(244,241,234,0.96)';
export const FONT = '"PingFang SC", "Noto Sans SC", "Hiragino Sans GB", sans-serif';

export const Card: React.FC<{ children: React.ReactNode; bottom?: number }> = ({ children, bottom = 1580 }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const pIn = seg(frame, 0, 10, E.outCubic);
  const pOut = seg(frame, durationInFrames - 9, durationInFrames - 1, E.inQuad);
  return (
    <div style={{ position: 'absolute', left: 0, top: 0, width: 1080, height: 1920 }}>
      <div
        style={{
          position: 'absolute', left: 60, width: 840, bottom: 1920 - bottom,
          background: PAPER, borderRadius: 34, padding: '34px 44px',
          boxShadow: '0 18px 50px rgba(0,0,0,0.28)', fontFamily: FONT, color: INK,
          opacity: pIn * (1 - pOut),
          transform: `translateY(${lerp(pIn, 28, 0) - pOut * 14}px) scale(${lerp(pIn, 0.965, 1)})`,
          transformOrigin: '50% 100%',
        }}
      >
        {children}
      </div>
    </div>
  );
};
