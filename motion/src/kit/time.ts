// 时间约定：镜头里所有 at 都写口播原片的绝对秒（查 words.json 词级时间），组件用 t0（本镜头起点）换算成帧。
export const FPS = 30;
export const frameAt = (t0: number) => (sec: number) => Math.round((sec - t0) * FPS);
export type Cue = { at: number; text: string };
