// @vitest-environment node
// Keeps the deployed security headers and the build in step (security annex).
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import config, { PRODUCTION_CSP } from '../../vite.config';

const root = resolve(__dirname, '../..');

describe('content security policy', () => {
  it('allows no eval and no inline scripts in production', () => {
    expect(PRODUCTION_CSP).not.toContain('unsafe-eval');
    const scriptSrc = /script-src ([^;]*)/.exec(PRODUCTION_CSP)?.[1] ?? '';
    expect(scriptSrc.trim()).toBe("'self'");
    expect(PRODUCTION_CSP).toContain("frame-ancestors 'none'");
    expect(PRODUCTION_CSP).toContain("object-src 'none'");
  });

  it('lists no hosts the app no longer uses', () => {
    for (const host of ['allorigins', 'geoboundaries', 'api.anthropic.com']) {
      expect(PRODUCTION_CSP).not.toContain(host);
    }
  });

  it('is identical in vercel.json', () => {
    const vercel = JSON.parse(readFileSync(resolve(root, 'vercel.json'), 'utf8'));
    const all = vercel.headers.find((h: { source: string }) => h.source === '/(.*)');
    const csp = all.headers.find((h: { key: string }) => h.key === 'Content-Security-Policy');
    expect(csp.value).toBe(PRODUCTION_CSP);
    expect(all.headers.map((h: { key: string }) => h.key)).toEqual(
      expect.arrayContaining([
        'Strict-Transport-Security',
        'X-Frame-Options',
        'X-Content-Type-Options',
      ])
    );
  });

  it('is not hard-coded into index.html (the build injects it)', () => {
    expect(readFileSync(resolve(root, 'index.html'), 'utf8')).not.toContain(
      'Content-Security-Policy'
    );
  });
});

describe('build', () => {
  it('does not ship source maps', () => {
    const resolved = typeof config === 'function' ? null : config;
    expect(resolved?.build?.sourcemap).toBe(false);
  });
});

describe('Supabase auth settings (supabase/config.toml)', () => {
  const toml = readFileSync(resolve(root, 'supabase/config.toml'), 'utf8').replace(/\r\n/g, '\n');
  const section = (name: string) => {
    const start = toml.indexOf(`[${name}]\n`);
    const next = toml.indexOf('\n[', start + 1);
    return toml.slice(start, next === -1 ? undefined : next);
  };

  it('requires 12-character passwords with mixed case and digits', () => {
    expect(section('auth')).toMatch(/^minimum_password_length = 12$/m);
    expect(section('auth')).toMatch(/^password_requirements = "lower_upper_letters_digits"$/m);
  });

  it('requires email confirmation and re-authentication to change password', () => {
    expect(section('auth.email')).toMatch(/^enable_confirmations = true$/m);
    expect(section('auth.email')).toMatch(/^secure_password_change = true$/m);
  });

  it('enables authenticator-app MFA', () => {
    expect(section('auth.mfa.totp')).toMatch(/^enroll_enabled = true$/m);
    expect(section('auth.mfa.totp')).toMatch(/^verify_enabled = true$/m);
  });
});
