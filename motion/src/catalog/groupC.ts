import { Entry } from './types';
import { SplitFlapPit } from '../shots/SplitFlapPit';
import { HashtagPills } from '../shots/HashtagPills';
import { PainSlider } from '../shots/PainSlider';
import { PainStomp } from '../shots/PainStomp';
import { ProductStack } from '../shots/ProductStack';
import { BrandLockup } from '../shots/BrandLockup';

// 组 C（2026-09-28 那条第二版，Park 9/29 认可）。都吃 t0：props 里的 at 一律写口播绝对秒。
export const GROUP_C: Record<string, Entry> = {
  SplitFlapWord: { component: SplitFlapPit, size: 'chest', shotcraft: ['typography/split-flap-title'], use: '点名一个 1–4 字的关键概念或章节词（如「第一个坑：流量」），要一拍机械翻牌的宣告感；一条视频最多一次' },
  HashtagPills: { component: HashtagPills, size: 'chest', shotcraft: ['interaction/hashtag-to-pill-materialize'], use: '讲两个并列的关键词、标签或人群标签（每个 2–4 字），打字变成胶囊落进标签栏' },
  BeforeAfterSlider: { component: PainSlider, size: 'chest', shotcraft: ['data/before-after-slider-scrub'], use: '「不要 A，要 B」式的一词之差对比：拉杆把旧说法（灰）揭成新说法（朱红），可带一句结论小字' },
  StampWords: { component: PainStomp, size: 'chest', shotcraft: ['typography/cel-flash-stomp'], use: '一口气列举 3–6 个并列短词（2–3 字），逐拍砸下、卡片底色闪，最后一个朱红；一条视频最多一次' },
  StackList: { component: ProductStack, size: 'chest', shotcraft: ['ui-entrance/list-stack-press'], use: '一段话里陆续列出 2–6 个功能、步骤或清单项（间隔长短都行），每说一项压上一条，卡片随之长高' },
  BrandLockup: { component: BrandLockup, size: 'chest', shotcraft: ['effects/brand-frame-snap', 'ui-entrance/draw-svg-trace'], use: '亮出品牌（我是谁 / 能帮你什么）：logo 描出 + 品牌名 → slogan → 说到承诺时画框翻红出承诺句；品牌可换成客户的' },
};
