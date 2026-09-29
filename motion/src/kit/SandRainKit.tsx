// 方点粒子雨（落斗成柱）的共用落体语法，给 SandRainBars、RainStackMerge 用；改编自 ShotCraft data/particle-sand-fill。
// 保留——方点粒子重力加速坠落、触堆积面即停 + 一次 ~15–30% 粒径回弹（6f）、堆积高度闭式预解析
// （第 k 层顶面 = 基线 - (k+1)×粒径，无碰撞模拟、无逐帧状态累积）、出发帧由 rand 散列确定。
// 用法：给一根柱的 RainSpec（左沿、地面、每层颗数、总颗数、开始下雨帧 start、堆满帧 done），
// 出发窗口由 done - start - 落地时长反解，保证堆满那一帧对上口播；粒子起落 3f 淡入，墨黑为主、默认 15% 朱红。
import React from 'react';
import { rand } from './Motion';
import { INK, RED } from './Stage';

export const GRAV = 2.4; // px/f²
export const fallTime = (d: number) => Math.sqrt((2 * d) / GRAV);

export type RainSpec = {
  left: number; // 柱左沿（容器坐标）
  base: number; // 堆积地面 y
  cols: number; // 每层颗数
  n: number; // 总颗数
  grain: number; // 粒径
  start: number; // 开始下雨帧
  done: number; // 堆满帧（最后一颗落地 + 回弹收完）
  seed: number;
  drop?: [number, number]; // 落差 [最小, 抖动]
  redRatio?: number;
};

const dropOf = (s: RainSpec) => s.drop ?? [170, 40];

// 出发窗口：最后一颗在 done-3 前落地
export const spreadOf = (s: RainSpec) => {
  const [d0, dj] = dropOf(s);
  return Math.max(2, s.done - s.start - 3 - fallTime(d0 + dj));
};

export const RainGrains: React.FC<{ f: number; spec: RainSpec; opacity?: number }> = ({ f, spec: s, opacity = 1 }) => {
  if (opacity <= 0.001 || f < s.start) return null;
  const [d0, dj] = dropOf(s);
  const spread = spreadOf(s);
  const out: React.ReactNode[] = [];
  for (let i = 0; i < s.n; i++) {
    const depart = s.start + (s.n > 1 ? (i / (s.n - 1)) * spread : 0) + rand(s.seed * 131 + i * 7.31) * 1.2;
    const age = f - depart;
    if (age <= 0) continue;
    const layer = Math.floor(i / s.cols);
    const col = i % s.cols;
    const target = s.base - (layer + 1) * s.grain;
    const d = d0 + rand(s.seed * 17 + i * 3.17) * dj;
    const tl = fallTime(d);
    let top: number;
    if (age < tl) {
      top = target - d + 0.5 * GRAV * age * age;
    } else {
      const ba = age - tl;
      const bounce = ba < 6 ? Math.sin((ba / 6) * Math.PI) * s.grain * 0.3 * (0.6 + 0.8 * rand(s.seed * 29 + i * 1.7)) : 0;
      top = target - bounce;
    }
    const red = rand(s.seed * 53 + i * 2.9) < (s.redRatio ?? 0.15);
    out.push(
      <div key={i} style={{
        position: 'absolute', left: s.left + col * s.grain + 1, top, width: s.grain - 2, height: s.grain - 2,
        borderRadius: 2, background: red ? RED : INK, opacity: opacity * Math.min(1, age / 3),
      }} />,
    );
  }
  return <>{out}</>;
};
