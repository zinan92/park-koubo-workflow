// 改编自 ShotCraft data/odometer-digit-roll（OdometerDigitRoll.tsx）：
// 保留——每位一条 0–9 纵向 strip、高速滚动后逐位减速（Easing.out cubic）过冲半格再 6f 回弹锁定、
// 滚动期 2 个错帧残影按速度门控、非数字字符（%、<）驻场不滚、锁定后整体加深脉冲 + 1.035 微缩放、标签淡入。
// 改动——字号/行高缩到竖屏卡片（FS 170 / ROW 190）；减速起点 20f→12f（口播只给 3–4 秒）；
// 目标数位和前后缀改成 props；颜色换成品牌墨黑，脉冲到朱红；标签改成中文口播原话。
import React from 'react';
import { useCurrentFrame, interpolate, interpolateColors, Easing } from 'remotion';
import { Card, INK, RED, MUTED } from '../kit/Card';

const ROW = 190, DW = 112, FS = 170, SPIN = 0.85, BASE = 12, STEP = 7;

const posAt = (f: number, i: number, d: number): number => {
  const s = BASE + i * STEP;
  const p0 = SPIN * s;
  const T = Math.ceil((p0 + 6 - d) / 10) * 10 + d;
  if (f < s) return SPIN * Math.max(f, 0);
  if (f < s + 16) return interpolate(f, [s, s + 16], [p0, T + 0.5], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) });
  if (f < s + 22) return interpolate(f, [s + 16, s + 22], [T + 0.5, T], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) });
  return T;
};

const Strip: React.FC<{ pos: number; color: string; opacity?: number; dy?: number }> = ({ pos, color, opacity = 1, dy = 0 }) => (
  <div style={{ position: 'absolute', left: 0, top: 0, width: DW, transform: `translateY(${-(pos % 10) * ROW + dy}px)`, opacity }}>
    {Array.from({ length: 20 }).map((_, k) => (
      <div key={k} style={{ width: DW, height: ROW, lineHeight: `${ROW}px`, textAlign: 'center', fontSize: FS, fontWeight: 800, fontVariantNumeric: 'tabular-nums', color }}>{k % 10}</div>
    ))}
  </div>
);

const DigitReel: React.FC<{ frame: number; i: number; d: number; color: string }> = ({ frame, i, d, color }) => {
  const pos = posAt(frame, i, d);
  const speed = Math.abs(pos - posAt(frame - 1, i, d));
  const gate = interpolate(speed, [0.06, 0.5], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <div style={{ position: 'relative', width: DW, height: ROW, overflow: 'hidden' }}>
      {gate > 0.001 && (<><Strip pos={pos} color={color} opacity={0.25 * gate} dy={ROW * 0.5} /><Strip pos={pos} color={color} opacity={0.12 * gate} dy={-ROW * 0.5} /></>)}
      <Strip pos={pos} color={color} />
    </div>
  );
};

const Glyph: React.FC<{ ch: string; color: string }> = ({ ch, color }) => (
  <div style={{ height: ROW, lineHeight: `${ROW}px`, fontSize: FS * 0.8, fontWeight: 800, color, padding: '0 6px' }}>{ch}</div>
);

export const Odometer: React.FC<{ digits: number[]; prefix?: string; suffix?: string; caption: string; label: string; labelAt: number }> = ({ digits, prefix, suffix, caption, label, labelAt }) => {
  const frame = useCurrentFrame();
  const lock = BASE + (digits.length - 1) * STEP + 22;
  const ink = interpolateColors(frame, [lock, lock + 4, lock + 8], [INK, RED, RED]);
  const pulse = interpolate(frame, [lock, lock + 4, lock + 8], [1, 1.035, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.inOut(Easing.quad) });
  const labelOp = interpolate(frame, [labelAt, labelAt + 14], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.quad) });
  return (
    <Card>
      <div style={{ fontSize: 42, fontWeight: 600, color: MUTED, letterSpacing: '0.04em' }}>{caption}</div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', transform: `scale(${pulse})`, margin: '6px 0 0' }}>
        {prefix ? <Glyph ch={prefix} color={ink} /> : null}
        {digits.map((d, i) => <DigitReel key={i} frame={frame} i={i} d={d} color={ink} />)}
        {suffix ? <Glyph ch={suffix} color={ink} /> : null}
      </div>
      <div style={{ opacity: labelOp, textAlign: 'center', fontSize: 50, fontWeight: 700, marginTop: 4 }}>{label}</div>
    </Card>
  );
};
