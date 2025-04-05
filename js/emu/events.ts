import { declareEvent } from '../corgi/events';

export const ACTION = declareEvent<{}>('emu.action');
export const CHANGED = declareEvent<{value: string}>('emu.changed');
export const CLOSE = declareEvent<{kind: 'resolve' | 'reject'}>('emu.close');
export const FOCUSED = declareEvent<{}>('emu.focused');
export const PRESSED = declareEvent<{key: string}>('emu.pressed');
export const UNFOCUSED = declareEvent<{}>('emu.unfocused');

