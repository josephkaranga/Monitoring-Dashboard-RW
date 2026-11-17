import { describe, expect, it } from 'vitest';
import { ENABLED_TOOL_IDS, isToolEnabled } from './reportingTools';

describe('reporting modules open for submission', () => {
  it('are T01–T04 only', () => {
    expect([...ENABLED_TOOL_IDS]).toEqual(['T01', 'T02', 'T03', 'T04']);
    expect(isToolEnabled('T04')).toBe(true);
    for (const hidden of ['T05', 'T06', 'T07', '', null, undefined]) {
      expect(isToolEnabled(hidden)).toBe(false);
    }
  });
});
