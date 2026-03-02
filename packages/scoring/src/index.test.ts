import { describe, expect, it } from 'vitest';
import { accelerationFromSeries, rollingZScore, sigmoidSeverity } from './index';

describe('rollingZScore', () => {
  it('returns same-length array', () => {
    const output = rollingZScore([1, 2, 3, 4, 5], 3);
    expect(output.length).toBe(5);
  });

  it('returns zero for constant input', () => {
    const output = rollingZScore([5, 5, 5, 5], 3);
    expect(output.every((value) => value === 0)).toBe(true);
  });
});

describe('sigmoidSeverity', () => {
  it('maps z-score into 0-100 range', () => {
    expect(sigmoidSeverity(-10)).toBeGreaterThanOrEqual(0);
    expect(sigmoidSeverity(10)).toBeLessThanOrEqual(100);
  });
});

describe('accelerationFromSeries', () => {
  it('computes positive acceleration on rising severity', () => {
    const acceleration = accelerationFromSeries([10, 20, 30, 40, 50, 60, 70, 80], 7);
    expect(acceleration).toBeGreaterThan(0);
  });
});
