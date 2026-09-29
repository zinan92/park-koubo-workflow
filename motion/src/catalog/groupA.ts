import { Entry } from './types';
import { HingeVerdict } from '../shots/HingeVerdict';
import { WillingQuadrant } from '../shots/WillingQuadrant';
import { QuoteCards } from '../shots/QuoteCards';
import { CeilingBreak } from '../shots/CeilingBreak';
import { AskTypewriter } from '../shots/AskTypewriter';
import { LeadWordClose } from '../shots/LeadWordClose';

// 组 A（Park 9/29 认可的第二版全屏镜头）。都吃 t0，props 里的时间都是口播原片绝对秒。
export const GROUP_A: Record<string, Entry> = {
  HingeVerdict: { component: HingeVerdict, size: 'full', shotcraft: ['ui-entrance/platform-hinge-rise'], use: '三段式结论：两块「证据」从平台后反向翻起，最后朱红结论台从下方升起（如前端 / 中台 / 后端）' },
  WillingQuadrant: { component: WillingQuadrant, size: 'full', shotcraft: ['transition/color-block-step-wipe', 'data/ring-diagram-annotation-reveal'], use: '两个条件的 2×2 象限：两轴说到时点亮、两者都满足的一格灌红，再圆窗聚焦点名「只满足一个」的那一格并举例' },
  QuoteCards: { component: QuoteCards, size: 'full', shotcraft: ['typography/paper-title-card'], use: '引用别人说过的两句话：两张纸卡先后落桌，逐词压印，各带署名，每句一个朱红重点词' },
  CeilingBreak: { component: CeilingBreak, size: 'full', shotcraft: ['data/chart-live-moves'], use: '三种做法的收入 / 数量对比：前两根柱有上限，第三根冲破图表、y 轴重标，讲「没有天花板」' },
  AskTypewriter: { component: AskTypewriter, size: 'full', shotcraft: ['typography/typewriter-moves', 'typography/document-typewriter-reveal'], use: '一连串追问 / 自问（2–4 问）：墨底宋体逐字跟嘴打出，旧问题退暗上移，可挂朱红旁注' },
  LeadWordClose: { component: LeadWordClose, size: 'full', shotcraft: ['typography/lead-word-zoom-assemble'], use: '收尾金句（2–4 行）：每行先把领头词放大推近再缩回组句，最后一个朱红大词落定静止' },
};
