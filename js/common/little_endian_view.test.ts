import { LittleEndianView } from './little_endian_view';

function varInt(...bytes: number[]): LittleEndianView {
  return new LittleEndianView(new Uint8Array(bytes).buffer);
}

test('reads a one byte varint', () => {
  expect(varInt(0x05).getVarInt32()).toBe(5);
});

test('reads a multibyte varint', () => {
  // 300 => 0b10_0101100
  expect(varInt(0xAC, 0x02).getVarInt32()).toBe(300);
});

test('reads a negative int64 varint as its low 32 bits', () => {
  // -200 as a two's complement 64 bit integer, seven bits at a time
  const view = varInt(0xB8, 0xFE, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0x01, 0x2A);
  expect(view.getVarInt32()).toBe(-200);
  expect(view.getVarInt32()).toBe(42);
});
