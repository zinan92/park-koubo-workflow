import React from 'react';

// 导演选镜头时看的就是这张表：每个组件的尺寸、改编自哪张 ShotCraft 卡、什么时候用。
export type Entry = {
  component: React.FC<any>;
  size: 'chest' | 'full'; // chest = 胸前卡片（x 60–900、下沿 1580，不盖脸）；full = 全屏挡脸（连字幕一起盖）
  shotcraft: string[]; // 改编自的 ShotCraft 镜头卡
  use: string; // 讲什么内容的时候用
};
