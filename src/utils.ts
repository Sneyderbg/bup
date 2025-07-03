export function colorFromIdx(idx: number) {
  return `hsl(${(42 * Math.pow(2, idx)) % 360} 60 32)`;
}
