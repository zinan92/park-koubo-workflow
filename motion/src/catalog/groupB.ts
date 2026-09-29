import { Entry } from './types';
import { SandRainBars } from '../shots/SandRainBars';
import { FanGapBars } from '../shots/FanGapBars';
import { AvatarRingGrid } from '../shots/AvatarRingGrid';
import { RainStackMerge } from '../shots/RainStackMerge';
import { GaugeFrontBack } from '../shots/GaugeFrontBack';

// 组 B：胸前卡片的数据镜头。全部吃 t0，props 里的 at 都是口播原片绝对秒（查 words.json）。
export const GROUP_B: Record<string, Entry> = {
  SandRainBars: { component: SandRainBars, size: 'chest', shotcraft: ['data/particle-sand-fill'], use: '3–5 个量级不同的数据并列（几条视频各多少播放、几个渠道各多少人）：每根柱下雨堆出来，说出数值时堆满弹数，可加一句结论' },
  FanGapBars: { component: FanGapBars, size: 'chest', shotcraft: ['data/chart-live-moves'], use: '一大一小两个数反差极大（爆款点赞/播放 vs 粉丝、曝光 vs 成交）：大的冲满撞线，小的细到几乎看不见被红圈圈出，可加一句反问' },
  AvatarRingGrid: { component: AvatarRingGrid, size: 'chest', shotcraft: ['data/avatar-grid-radial-build-colorize'], use: '讲一群人/一批账号有多少个，然后挨个看、最后全部拿来做某件事：头像圈长出围住大数字，陆续上色，扫描线扫完出结论' },
  RainStackMerge: { component: RainStackMerge, size: 'chest', shotcraft: ['data/particle-sand-fill'], use: '一个大的 = N 个小的相加（别人 1 条 10 万 = 我发 10 条每条 1 万）：左边一根高柱，右边小柱一根根下出来再摞成等高' },
  GaugeFrontBack: { component: GaugeFrontBack, size: 'chest', shotcraft: ['data/gauge-readout-moves'], use: '一个百分比把整体切成大头和被忽略的一截（90% 时间在前端、后端没人想）：仪表指针甩满再落到占比，剩下那截点亮朱红' },
};
