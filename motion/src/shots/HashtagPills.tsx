// 话题词变胶囊（胸前卡片）：标题 + 两个关键词。第一个词用大字打出来 →1 帧硬切成胶囊 → 缩小落进标签栏；
// 第二个词直接在标签栏里跟着打，说完原地硬切成胶囊，同帧整张卡换成「成品」配色（墨底胶囊、朱红徽标）。
// 用在：讲「关键词 / 标签 / 话题 / 人群标签」这类两个并列短词的时候（每个词 2–4 字）。
// Park 9/29 认可（2026-09-28 那条的 7:23，「最吃流量的关键词 · #普通人 #零基础」，例子数据见 examples/）。
// 改编自 ShotCraft interaction/hashtag-to-pill-materialize（HashtagToPillMaterialize.tsx）：
// 保留——人手节奏打字、朱红实心光标恒亮不闪；实体化 = 1 帧硬切（文字+光标整层消失，同帧出现宽大无描边胶囊，
//   # 换成圆徽标，仅 3f 1.03→1 微落定）；hold 12f 后一段 bezier(0.5,0,0.25,1) 同曲线缩小+位移落到标签位
//   （origin 0 0 + translate 先行）；最后再 1 帧硬切换成「成品」配色，之后真静止。骨架「硬切 → 一次滑动 → 硬切」。
// 改动——胸前卡片 6 秒放不下两轮完整的打字-硬切-hold-缩移，所以第二个词在标签栏里按缩放后字号打、原地硬切，
//   并与「成品揭示」同帧；大字输入区在第一次缩移时同曲线收起，卡片从「编辑态」收成紧凑的「标题 + 标签栏」。
//   只给一个词（不传 inline）时，缩移落定后 3f 硬切揭示。
// 对时：keys 是每一下键入的口播秒（第一下是 #，之后每字一下），一般取说出该字前 2f；
//   第一个词打完 5f 硬切成胶囊，hold 12f，14f 缩移；第二个词打完 4f 硬切 + 揭示。标题比 titleAt 提前 3f 入场。
import React from 'react';
import { useCurrentFrame, Easing } from 'remotion';
import { Card } from '../kit/Card';
import { INK, RED, STONE, LINE, FONT, E, lerp, seg } from '../kit/Stage';
import { frameAt } from '../kit/time';

type Tag = { text: string; keys: number[] };
export type HashtagPillsProps = {
  t0: number;
  title: string; // 如「最吃流量的关键词」
  titleAt: number;
  hero: Tag; // 第一个词：大字打出 → 胶囊 → 缩进标签栏，如 { text: '普通人', keys: [#, 普, 通, 人 的键入秒] }
  inline?: Tag; // 第二个词：直接在标签栏里打，如 { text: '零基础', keys: [...] }
};

// ---- 几何（卡片内容区宽 752） ----
const W = 752;
const FS = 96; // 大字 / 胶囊字号
const PILL_H = 150;
const BADGE = 100;
const PAD_L = 26;
const GAP = 26;
const PAD_R = 52;
const pillW = (n: number) => PAD_L + BADGE + GAP + n * FS + PAD_R;
const S = 0.6; // 标签栏缩放
const TITLE_H = 70;
const RAIL_H = 114;
const HERO_H = 250;
const H_FULL = TITLE_H + 22 + HERO_H + 22 + RAIL_H;
const H_END = TITLE_H + 22 + RAIL_H;
// 以内容区底边为基准的纵坐标（卡片下沿固定，收起时标签栏不动）
const RAIL_CY = RAIL_H / 2;
const HERO_CY = RAIL_H + 22 + HERO_H / 2;
const SLOT1_X = 12;

const moveEase = Easing.bezier(0.5, 0, 0.25, 1);

const Badge: React.FC<{ bg: string }> = ({ bg }) => (
  <div style={{ width: BADGE, height: BADGE, borderRadius: BADGE / 2, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FBF9F4', fontSize: 64, fontWeight: 800, fontFamily: FONT, flexShrink: 0 }}>#</div>
);

const Pill: React.FC<{ text: string; final: boolean }> = ({ text, final }) => (
  <div style={{ width: pillW([...text].length), height: PILL_H, borderRadius: PILL_H / 2, background: final ? INK : '#E6E1D7', display: 'flex', alignItems: 'center', paddingLeft: PAD_L, gap: GAP, boxSizing: 'border-box' }}>
    <Badge bg={final ? RED : STONE} />
    <span style={{ fontSize: FS, fontWeight: 700, color: final ? '#F4F1EA' : INK, letterSpacing: 0, lineHeight: 1, whiteSpace: 'nowrap' }}>{text}</span>
  </div>
);

// 打字态：# 落在徽标位上，字从胶囊文字位起排，光标恒亮
const Typed: React.FC<{ chars: string[]; count: number }> = ({ chars, count }) => (
  <div style={{ position: 'relative', width: pillW(chars.length - 1), height: PILL_H }}>
    {count > 0 && (
      <span style={{ position: 'absolute', left: PAD_L + BADGE - 58, top: 0, height: PILL_H, display: 'flex', alignItems: 'center', fontSize: FS, fontWeight: 600, color: INK, lineHeight: 1 }}>#</span>
    )}
    <div style={{ position: 'absolute', left: PAD_L + BADGE + GAP, top: 0, height: PILL_H, display: 'flex', alignItems: 'center' }}>
      <span style={{ fontSize: FS, fontWeight: 700, color: INK, lineHeight: 1, whiteSpace: 'pre' }}>{chars.slice(1, Math.max(1, count)).join('')}</span>
      <span style={{ display: 'inline-block', width: 8, height: 112, background: RED, marginLeft: 8, borderRadius: 2 }} />
    </div>
  </div>
);

export const HashtagPills: React.FC<HashtagPillsProps> = ({ t0, title, titleAt, hero, inline }) => {
  const f = useCurrentFrame();
  const A = frameAt(t0);
  const TITLE = A(titleAt) - 3;
  const TYPE1 = hero.keys.map(A);
  const MORPH1 = TYPE1[TYPE1.length - 1] + 5; // 1 帧硬切实体化
  const MOVE0 = MORPH1 + 12; // hold 12f
  const MOVE1 = MOVE0 + 14;
  const TYPE2 = inline ? inline.keys.map(A) : [];
  const MORPH2 = inline ? TYPE2[TYPE2.length - 1] + 4 : MOVE1 + 3; // 第二个胶囊原地硬切 + 成品揭示（同帧）
  const W1 = pillW([...hero.text].length);
  const HERO_X = (W - W1) / 2; // 大胶囊左边
  const SLOT2_X = SLOT1_X + W1 * S + 30;

  const mt = seg(f, MOVE0, MOVE1, moveEase);
  const H = lerp(mt, H_FULL, H_END);
  const titleP = seg(f, TITLE, TITLE + 12, E.outCubic);
  const final = f >= MORPH2;

  // 第一个：打字 → 硬切胶囊 → 缩移到槽位 1
  const c1 = TYPE1.filter((t) => f >= t).length;
  const settle1 = f >= MORPH1 ? lerp(seg(f, MORPH1, MORPH1 + 3, E.outQuad), 1.03, 1) : 1;
  const x1 = lerp(mt, HERO_X, SLOT1_X);
  const cy1 = lerp(mt, HERO_CY, RAIL_CY); // 距底
  const s1 = lerp(mt, 1, S) * settle1;

  // 第二个：标签栏内按缩放后字号打字 → 原地硬切
  const c2 = TYPE2.filter((t) => f >= t).length;
  const settle2 = f >= MORPH2 ? lerp(seg(f, MORPH2, MORPH2 + 3, E.outQuad), 1.03, 1) : 1;
  const railCursor = f >= MOVE0 && c2 === 0; // 缩移开始后光标跳进标签栏等着

  const top = (fromBottom: number, h: number) => H - fromBottom - h / 2;

  return (
    <Card>
      <div style={{ position: 'relative', width: W, height: H }}>
        {/* 标题 */}
        <div style={{ position: 'absolute', left: 0, top: 0, height: TITLE_H, display: 'flex', alignItems: 'center', fontSize: 54, fontWeight: 800, color: INK,
          opacity: titleP, transform: `translateY(${lerp(titleP, 28, 0)}px)`, filter: `blur(${(1 - titleP) * 8}px)` }}>
          {title}
        </div>

        {/* 标签栏（输入框底）：揭示帧同帧消失 */}
        {!final && (
          <div style={{ position: 'absolute', left: 0, top: top(RAIL_CY, RAIL_H), width: W, height: RAIL_H, borderRadius: RAIL_H / 2, background: 'rgba(255,255,255,0.75)', boxShadow: `inset 0 0 0 3px ${LINE}` }} />
        )}

        {/* 大字输入区：打字 + 光标（实体化帧整层消失） */}
        {f < MORPH1 && (
          <div style={{ position: 'absolute', left: HERO_X, top: top(HERO_CY, PILL_H) }}>
            <Typed chars={['#', ...hero.text]} count={c1} />
          </div>
        )}

        {/* 第一个胶囊 */}
        {f >= MORPH1 && (
          <div style={{ position: 'absolute', left: 0, top: 0, transformOrigin: '0 0', transform: `translate(${x1}px, ${top(cy1, PILL_H * s1)}px) scale(${s1})`, zIndex: 2 }}>
            <div style={{ borderRadius: PILL_H / 2, boxShadow: mt > 0 && mt < 1 ? '0 14px 30px rgba(21,23,28,0.18)' : 'none' }}>
              <Pill text={hero.text} final={final} />
            </div>
          </div>
        )}

        {/* 第二个：标签栏内打字 → 原地硬切 */}
        {inline && (railCursor || (c2 > 0 && !final)) && (
          <div style={{ position: 'absolute', left: 0, top: 0, transformOrigin: '0 0', transform: `translate(${SLOT2_X}px, ${top(RAIL_CY, PILL_H * S)}px) scale(${S})` }}>
            <Typed chars={['#', ...inline.text]} count={c2} />
          </div>
        )}
        {inline && final && (
          <div style={{ position: 'absolute', left: 0, top: 0, transformOrigin: '0 0', transform: `translate(${SLOT2_X}px, ${top(RAIL_CY, PILL_H * S * settle2)}px) scale(${S * settle2})` }}>
            <Pill text={inline.text} final />
          </div>
        )}
      </div>
    </Card>
  );
};
