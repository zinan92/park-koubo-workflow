import { Entry } from './types';
import { CORE } from './core';
import { GROUP_A } from './groupA';
import { GROUP_B } from './groupB';
import { GROUP_C } from './groupC';

export type { Entry };
export const CATALOG: Record<string, Entry> = { ...CORE, ...GROUP_A, ...GROUP_B, ...GROUP_C };
