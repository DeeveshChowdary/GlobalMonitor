import { describe, expect, it } from 'vitest';
import { signalsResponseSchema } from './index';

describe('signalsResponseSchema', () => {
  it('accepts a valid v1 envelope', () => {
    const parsed = signalsResponseSchema.parse({
      version: 'v1',
      generatedAt: new Date().toISOString(),
      data: [
        {
          id: 'financial-stress:yield-spread',
          module: 'financial-stress',
          title: 'Yield Curve Inversion Stress',
          description: 'Stress increased',
          timestamp: new Date().toISOString(),
          severity: 80,
          acceleration: 12,
          confidence: 75,
          score: 61,
          metricIds: ['yield-spread'],
          relatedEventIds: [],
          tags: ['macro'],
          sourceRefs: ['FRED']
        }
      ]
    });

    expect(parsed.version).toBe('v1');
    expect(parsed.data).toHaveLength(1);
  });

  it('rejects invalid severity values', () => {
    expect(() =>
      signalsResponseSchema.parse({
        version: 'v1',
        generatedAt: new Date().toISOString(),
        data: [
          {
            id: 'x',
            module: 'global-risk',
            title: 'Bad Signal',
            description: 'invalid',
            timestamp: new Date().toISOString(),
            severity: 101,
            acceleration: 0,
            confidence: 50,
            score: 50,
            metricIds: [],
            relatedEventIds: [],
            tags: [],
            sourceRefs: []
          }
        ]
      })
    ).toThrow();
  });
});
