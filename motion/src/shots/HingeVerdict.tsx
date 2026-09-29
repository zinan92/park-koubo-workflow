// 结论三件套（全屏，纸底）：平台先横向建立 → 左块从右下铰点翻起 → 右块从左下铰点反向翻起 →
// 结论台（朱红）从下方升起。讲「A 只是前端、B 是中间、C 才是真正的结论」这类三段式结论时用。
// Park 9/29 认可（2026-09-28 那条的 0:21.9，「流量只是一个前端 … 是中台和后端」）。
// ShotCraft 来源：ui-entrance/platform-hinge-rise
//  保留：平台 scaleX .012→1（bezier .16,1,.3,1，15f）；语境圆晚 12f 起 scale .88→1 + 上浮；
//        两块主体 transform-origin 钉在相邻底部铰点（左块右下、右块左下），rise + ∓18° 反向翻起，
//        bezier(.4,0,.2,1) 16f；三半波阻尼回摆（左 1.5°、右 -1.2°，振幅 ×(1-p)²）；主体底部被平台上缘裁住；
//        结论台 rise + opacity 前 18% 行程到 .45 再收至 1；左右块尺寸/高度/振幅不对称。
//  改了：竖屏、纸墨中文、设计坐标 ×2.25；左右两块按口播分开翻（卡里同帧）；
//        结论台用朱红底（卡里要求结论台对比低于主体，Park 版以结论为重）。
// 对时：各 at 写他说出那个词的绝对秒。左块在 at 前 10f 起翻、右块在 at 前 16f 起翻（落定在 at），
//       左块胶囊在 at 前 2f 弹出，结论台在 at 前 10f 起升。结论台落定后要留 ≥1 秒再结束。
import React from 'react';
import { useCurrentFrame, interpolate, Easing } from 'remotion';
import { Stage, INK, RED, PAPER, STONE, LINE, MUTED, SERIF, FONT, E, lerp, seg } from '../kit/Stage';
import { frameAt, Cue } from '../kit/time';

export type HingeVerdictProps = {
  t0: number;
  left: { at: number; big: string; sub?: string; chip?: Cue }; // 左块（墨）：大字、小字、红胶囊
  right: { at: number; big: string; sub?: string }; // 右块（灰）
  verdict: { at: number; big: string; sub?: string }; // 结论台（朱红）
};

const CLAMP = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;
const easeStage = (f: number, a: number, b: number) => interpolate(f, [a, b], [0, 1], { ...CLAMP, easing: Easing.bezier(0.16, 1, 0.3, 1) });
const easeHinge = (f: number, a: number, b: number) => interpolate(f, [a, b], [0, 1], { ...CLAMP, easing: Easing.bezier(0.4, 0, 0.2, 1) });
const wobble = (f: number, start: number, dur: number, amp: number) => {
  if (f <= start || f >= start + dur) return 0;
  const p = (f - start) / dur;
  return amp * Math.sin(p * Math.PI * 3) * Math.pow(1 - p, 2);
};

const PLAT_Y = 1000; // 平台上缘 = 铰点所在水平线
const HINGE_L = 530, HINGE_R = 550;

export const HingeVerdict: React.FC<HingeVerdictProps> = ({ t0, left, right, verdict }) => {
  const f = useCurrentFrame();
  const at = frameAt(t0);
  const K = {
    plat: 0,
    ctx: 12,
    left: at(left.at) - 10,
    chip: left.chip ? at(left.chip.at) - 2 : 1e6,
    right: at(right.at) - 16,
    verdict: at(verdict.at) - 10,
  };
  const plat = interpolate(easeStage(f, K.plat, K.plat + 15), [0, 1], [0.012, 1]);
  const ctx = easeStage(f, K.ctx, K.ctx + 20);
  const pl = easeHinge(f, K.left, K.left + 16);
  const pr = easeHinge(f, K.right, K.right + 16);
  const wl = wobble(f, K.left + 16, 16, 1.5);
  const wr = wobble(f, K.right + 17, 16, -1.2);
  const v = easeStage(f, K.verdict, K.verdict + 22);
  const chip = seg(f, K.chip, K.chip + 10, (t) => E.outBack(t, 2.2));

  return (
    <Stage bg={PAPER} mode="cut">
      {/* 语境圆：低能量背景层，比主体早起、晚收 */}
      <div style={{ position: 'absolute', left: 130, top: 330, width: 820, height: 820, borderRadius: '50%', background: LINE,
        opacity: ctx, transform: `translateY(${lerp(ctx, 40, 0)}px) scale(${lerp(ctx, 0.88, 1)})` }} />

      {/* 两块主体：被平台上缘裁住底部，只能从平台后翻起 */}
      <div style={{ position: 'absolute', inset: 0, clipPath: `inset(0 0 ${1920 - PLAT_Y}px 0)` }}>
        {pl > 0 && (
          <div style={{ position: 'absolute', left: HINGE_L - 440, top: PLAT_Y - 520, width: 440, height: 520, background: INK,
            clipPath: 'polygon(8% 9%, 92% 0, 100% 100%, 0 100%)', transformOrigin: '100% 100%',
            transform: `translateY(${lerp(pl, 252, 0)}px) rotate(${lerp(pl, -18, 0) + wl}deg)`,
            display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 96, boxSizing: 'border-box', fontFamily: FONT }}>
            <div style={{ fontFamily: SERIF, fontWeight: 900, fontSize: 150, lineHeight: 1, color: PAPER }}>{left.big}</div>
            {left.sub && <div style={{ fontSize: 64, fontWeight: 800, color: STONE, marginTop: 30, letterSpacing: '0.08em' }}>{left.sub}</div>}
            {left.chip && (
              <div style={{ marginTop: 40, fontSize: 46, fontWeight: 800, color: PAPER, background: RED, padding: '8px 28px', borderRadius: 40,
                opacity: seg(f, K.chip, K.chip + 3), transform: `scale(${lerp(chip, 0.6, 1)})` }}>{left.chip.text}</div>
            )}
          </div>
        )}
        {pr > 0 && (
          <div style={{ position: 'absolute', left: HINGE_R, top: PLAT_Y - 440, width: 390, height: 440, background: MUTED,
            clipPath: 'polygon(8% 0, 92% 9%, 100% 100%, 0 100%)', transformOrigin: '0% 100%',
            transform: `translateY(${lerp(pr, 202, 0)}px) rotate(${lerp(pr, 18, 0) + wr}deg)`,
            display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 120, boxSizing: 'border-box', fontFamily: FONT }}>
            <div style={{ fontFamily: SERIF, fontWeight: 900, fontSize: 150, lineHeight: 1, color: PAPER }}>{right.big}</div>
            {right.sub && <div style={{ fontSize: 64, fontWeight: 800, color: LINE, marginTop: 30, letterSpacing: '0.08em' }}>{right.sub}</div>}
          </div>
        )}
      </div>

      {/* 平台：承托面先建立 */}
      <div style={{ position: 'absolute', left: 90, top: PLAT_Y, width: 900, height: 36, background: INK,
        clipPath: 'polygon(4% 0, 96% 0, 100% 100%, 0 100%)', transform: `scaleX(${plat})` }} />

      {/* 结论台：从下方升入 */}
      {v > 0 && (
        <div style={{ position: 'absolute', left: 60, top: 1080, width: 960, height: 380, background: RED,
          clipPath: 'polygon(17% 0, 83% 0, 100% 100%, 0 100%)',
          opacity: interpolate(v, [0, 0.18, 1], [0, 0.45, 1], CLAMP), transform: `translateY(${lerp(v, 216, 0)}px)`,
          display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 56, boxSizing: 'border-box', fontFamily: FONT }}>
          <div style={{ fontFamily: SERIF, fontWeight: 900, fontSize: 150, lineHeight: 1, color: PAPER }}>{verdict.big}</div>
          {verdict.sub && <div style={{ fontSize: 68, fontWeight: 800, color: PAPER, marginTop: 34, letterSpacing: '0.1em' }}>{verdict.sub}</div>}
        </div>
      )}
    </Stage>
  );
};
