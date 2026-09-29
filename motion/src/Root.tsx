// 每条视频一份 src/shots.json：{ shots: [{ id, component, start, frames, props }] }。
// component 是 catalog 里的名字；start 是口播原片里的绝对秒，会作为 t0 传给组件（组件里的 at 也都写绝对秒）。
import React from 'react';
import { Composition } from 'remotion';
import { CATALOG } from './catalog';
import data from './shots.json';

type Shot = { id: string; component: string; start: number; frames: number; props?: Record<string, unknown> };

export const Root: React.FC = () => (
  <>
    {(data.shots as Shot[]).map((s) => {
      const entry = CATALOG[s.component];
      if (!entry) throw new Error(`shots.json 里的 ${s.id} 用了 catalog 里没有的组件 ${s.component}`);
      return (
        <Composition key={s.id} id={s.id} component={entry.component as React.FC<any>} durationInFrames={s.frames}
          fps={30} width={1080} height={1920} defaultProps={{ t0: s.start, ...(s.props ?? {}) }} />
      );
    })}
  </>
);
