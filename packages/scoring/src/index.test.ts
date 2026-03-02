import { describe, expect, it } from 'vitest';
import {
  accelerationFromSeries,
  globalRiskBlend,
  rollingZScore,
  signalFromTimeseries,
  sigmoidSeverity
} from './index';

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

describe('signal scoring formula', () => {
  it('uses score = severity*0.7 + acceleration*0.3', () => {
    const signal = signalFromTimeseries(
      {
        id: 'financial-stress:yield-spread',
        module: 'financial-stress',
        metricId: 'yield-spread',
        label: 'Yield Spread',
        source: 'test',
        points: [
          { timestamp: '2025-01-01T00:00:00.000Z', value: 1.1 },
          { timestamp: '2025-01-02T00:00:00.000Z', value: 1.2 },
          { timestamp: '2025-01-03T00:00:00.000Z', value: 1.3 },
          { timestamp: '2025-01-04T00:00:00.000Z', value: 1.4 },
          { timestamp: '2025-01-05T00:00:00.000Z', value: 2.4 },
          { timestamp: '2025-01-06T00:00:00.000Z', value: 2.8 },
          { timestamp: '2025-01-07T00:00:00.000Z', value: 3.2 },
          { timestamp: '2025-01-08T00:00:00.000Z', value: 3.4 }
        ],
        tags: []
      },
      {
        title: 'test',
        description: 'test',
        tags: []
      }
    );

    expect(signal).toBeTruthy();
    const expected = signal!.severity * 0.7 + signal!.acceleration * 0.3;
    expect(signal!.score).toBeCloseTo(expected, 6);
  });
});

describe('globalRiskBlend', () => {
  it('keeps blended score in 0-100 range', () => {
    const blend = globalRiskBlend([
      {
        module: 'financial-stress',
        signals: [
          {
            id: 'a',
            module: 'financial-stress',
            title: 'A',
            description: 'A',
            timestamp: new Date().toISOString(),
            severity: 95,
            acceleration: 30,
            confidence: 70,
            score: 80,
            metricIds: [],
            relatedEventIds: [],
            tags: [],
            sourceRefs: []
          }
        ]
      },
      {
        module: 'capital-flows',
        signals: [
          {
            id: 'b',
            module: 'capital-flows',
            title: 'B',
            description: 'B',
            timestamp: new Date().toISOString(),
            severity: 40,
            acceleration: -10,
            confidence: 60,
            score: 25,
            metricIds: [],
            relatedEventIds: [],
            tags: [],
            sourceRefs: []
          }
        ]
      },
      {
        module: 'ai-tech',
        signals: [
          {
            id: 'c',
            module: 'ai-tech',
            title: 'C',
            description: 'C',
            timestamp: new Date().toISOString(),
            severity: 10,
            acceleration: -5,
            confidence: 50,
            score: 8,
            metricIds: [],
            relatedEventIds: [],
            tags: [],
            sourceRefs: []
          }
        ]
      }
    ]);

    expect(blend.score).toBeGreaterThanOrEqual(0);
    expect(blend.score).toBeLessThanOrEqual(100);
  });
});
