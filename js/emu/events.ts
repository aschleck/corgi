import { declareEvent } from '../corgi/events';

export const ACTION = declareEvent<{}>('action');
export const CHANGED = declareEvent<{value: string}>('changed');
export const FOCUSED = declareEvent<{}>('focused');
export const UNFOCUSED = declareEvent<{}>('unfocused');

