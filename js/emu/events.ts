import { declareEvent } from '../corgi/events';

export const ACTION = declareEvent<{}>('action');
export const CHANGED = declareEvent<{value: string}>('changed');
export const CLOSE = declareEvent<{kind: 'resolve' | 'reject'}>('close');
export const FOCUSED = declareEvent<{}>('focused');
export const PRESSED = declareEvent<{key: string}>('pressed');
export const UNFOCUSED = declareEvent<{}>('unfocused');

