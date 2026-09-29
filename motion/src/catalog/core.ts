import { Entry } from './types';
import { Odometer } from '../shots/Odometer';
import { MarkerNumber } from '../shots/MarkerNumber';
import { BlurRows } from '../shots/BlurRows';
import { PillChain } from '../shots/PillChain';
import { FunnelIntro } from '../shots/FunnelIntro';
import { FunnelLight } from '../shots/FunnelLight';
import { DocScroll } from '../shots/DocScroll';
import { DocStackBrake } from '../shots/DocStackBrake';

// 这四张胸前卡片不吃 t0：卡内帧号从卡片出现算起（props 里的 at/labelAt 等是相对帧）。
export const CORE: Record<string, Entry> = {
  Odometer: { component: Odometer, size: 'chest', shotcraft: ['data/odometer-digit-roll'], use: '他说出的单个关键数字或百分比，数字滚动锁定后变红' },
  MarkerNumber: { component: MarkerNumber, size: 'chest', shotcraft: ['typography/marker-underline-title'], use: '一句结论里的一个数字或关键词，朱红马克笔划线强调' },
  BlurRows: { component: BlurRows, size: 'chest', shotcraft: ['typography/blur-slide'], use: '2–4 个并列数据或要点，每行说到时入场；多于 3 项用两栏' },
  PillChain: { component: PillChain, size: 'chest', shotcraft: ['typography/blur-slide', 'typography/pill-slot-cycle'], use: 'A → B → C 的因果或流程，最后一项朱红' },
  FunnelIntro: { component: FunnelIntro, size: 'full', shotcraft: ['transition/color-block-step-wipe', 'ui-entrance/draw-svg-trace', 'data/particle-sand-fill', 'data/odometer-digit-roll'], use: '第一次讲销售漏斗：几层一起描出来、只亮顶层，顶层数字随口播变大' },
  FunnelLight: { component: FunnelLight, size: 'full', shotcraft: ['transition/color-block-step-wipe', 'ui-entrance/draw-svg-trace', 'data/particle-sand-fill'], use: '漏斗再次出场：按他讲到的转化顺序一层层点亮，可加层间比例、结果、前端/后端括号' },
  DocScroll: { component: DocScroll, size: 'full', shotcraft: ['ui-entrance/platform-hinge-rise', 'typography/marker-underline-title', 'data/scroll-brake-moves'], use: '展示一份交付文件（纪要、方案）：整页慢滚、每个小标题停一下' },
  DocStackBrake: { component: DocStackBrake, size: 'full', shotcraft: ['ui-entrance/research-card-stack-scroll', 'data/scroll-brake-moves'], use: '同时交付两份文件：叠落 → 第二份展开 → 高速滚过、急刹停在关键表格并框住一列' },
};
