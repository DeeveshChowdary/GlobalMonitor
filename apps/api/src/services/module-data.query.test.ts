import { describe, expect, it } from 'vitest';
import { validateModuleQuery } from './module-data';

describe('validateModuleQuery', () => {
  it('accepts valid module and timeRange', () => {
    const parsed = validateModuleQuery('global-risk', '7d');
    expect(parsed.module).toBe('global-risk');
    expect(parsed.timeRange).toBe('7d');
  });

  it('rejects invalid module', () => {
    expect(() => validateModuleQuery('bad-module', '7d')).toThrow(/Unknown module/);
  });

  it('rejects invalid timeRange', () => {
    expect(() => validateModuleQuery('global-risk', 'bad-range')).toThrow(/Unknown timeRange/);
  });
});
