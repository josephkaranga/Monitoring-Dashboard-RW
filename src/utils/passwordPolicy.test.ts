import { describe, it, expect } from 'vitest';
import { MIN_PASSWORD_LENGTH, passwordProblem } from './passwordPolicy';

describe('passwordProblem', () => {
  it('requires at least 12 characters', () => {
    expect(MIN_PASSWORD_LENGTH).toBe(12);
    expect(passwordProblem('Abcdefgh123')).toMatch(/at least 12/); // 11 chars
    expect(passwordProblem('')).toMatch(/at least 12/);
  });

  it('requires upper case, lower case and a digit', () => {
    expect(passwordProblem('abcdefghijk1')).toMatch(/upper-case/);
    expect(passwordProblem('ABCDEFGHIJK1')).toMatch(/lower-case/);
    expect(passwordProblem('Abcdefghijkl')).toMatch(/number/);
  });

  it('accepts a compliant password', () => {
    expect(passwordProblem('Rwanda2030Biodiv')).toBeNull();
  });
});
