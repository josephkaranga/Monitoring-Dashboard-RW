// ============================================================
// Organization Config Service — Unit Tests
// ============================================================

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { OrganizationConfigService } from './organizationConfigService';

interface Row {
  id: string;
  organization_name: string;
  automatic_updates_enabled: boolean;
  require_verification: boolean;
  audit_level: 'minimal' | 'standard' | 'comprehensive';
  processing_timeout: number;
  enable_notifications: boolean;
  created_at: string;
  updated_at: string;
  [key: string]: unknown;
}

const { mockFrom, state } = vi.hoisted(() => {
  const state = {
    rows: [] as Row[],
    nextId: 1,
    insertError: null as { message: string } | null,
    updateError: null as { message: string } | null,
  };

  const mockFrom = vi.fn((table: string) => {
    if (table !== 'organization_configs') {
      throw new Error(`Unexpected table in test: ${table}`);
    }

    return {
      select: () => ({
        eq: (column: string, value: unknown) => ({
          maybeSingle: () =>
            Promise.resolve({ data: state.rows.find((r) => r[column] === value) ?? null, error: null }),
        }),
      }),
      insert: (row: Record<string, unknown>) => ({
        select: () => ({
          single: () => {
            if (state.insertError) {
              return Promise.resolve({ data: null, error: state.insertError });
            }
            const now = new Date().toISOString();
            const newRow: Row = {
              id: String(state.nextId++),
              created_at: now,
              updated_at: now,
              ...(row as Partial<Row>),
            } as Row;
            state.rows.push(newRow);
            return Promise.resolve({ data: newRow, error: null });
          },
        }),
      }),
      update: (updates: Record<string, unknown>) => ({
        eq: (column: string, value: unknown) => ({
          select: () => ({
            single: () => {
              if (state.updateError) {
                return Promise.resolve({ data: null, error: state.updateError });
              }
              const row = state.rows.find((r) => r[column] === value);
              if (!row) {
                return Promise.resolve({ data: null, error: { message: 'not found' } });
              }
              Object.assign(row, updates);
              return Promise.resolve({ data: row, error: null });
            },
          }),
        }),
      }),
    };
  });

  return { mockFrom, state };
});

vi.mock('../utils/supabase', () => ({
  supabase: { from: mockFrom },
}));

describe('OrganizationConfigService', () => {
  let service: OrganizationConfigService;

  beforeEach(() => {
    service = new OrganizationConfigService();
    state.rows.length = 0;
    state.nextId = 1;
    state.insertError = null;
    state.updateError = null;
  });

  it('returns null when no configuration exists for the organization', async () => {
    const config = await service.getConfig('Unknown Org');
    expect(config).toBeNull();
  });

  it('creates a configuration with default settings', async () => {
    const config = await service.createConfig('Acme Org');

    expect(config.organizationName).toBe('Acme Org');
    expect(config.automaticUpdatesEnabled).toBe(true);
    expect(config.requireVerification).toBe(false);
    expect(config.auditLevel).toBe('standard');
    expect(config.processingTimeout).toBe(30);
    expect(config.enableNotifications).toBe(true);
    expect(config.organizationId).toBe('1');
  });

  it('creates a configuration with overridden settings', async () => {
    const config = await service.createConfig('Acme Org', {
      automaticUpdatesEnabled: false,
      auditLevel: 'comprehensive',
    });

    expect(config.automaticUpdatesEnabled).toBe(false);
    expect(config.auditLevel).toBe('comprehensive');
    expect(config.requireVerification).toBe(false);
  });

  it('returns the existing configuration via getOrCreateConfig without creating a duplicate', async () => {
    const created = await service.createConfig('Acme Org');
    const fetched = await service.getOrCreateConfig('Acme Org');

    expect(fetched.organizationId).toBe(created.organizationId);
    expect(state.rows).toHaveLength(1);
  });

  it('creates a default configuration via getOrCreateConfig when none exists', async () => {
    const config = await service.getOrCreateConfig('New Org');

    expect(config.organizationName).toBe('New Org');
    expect(config.automaticUpdatesEnabled).toBe(true);
    expect(state.rows).toHaveLength(1);
  });

  it('updates only the provided fields', async () => {
    const created = await service.createConfig('Acme Org');
    const updated = await service.updateConfig(created.organizationId, {
      automaticUpdatesEnabled: false,
      processingTimeout: 60,
    });

    expect(updated.automaticUpdatesEnabled).toBe(false);
    expect(updated.processingTimeout).toBe(60);
    expect(updated.auditLevel).toBe('standard');
  });

  it('toggles automatic updates on and off', async () => {
    const created = await service.createConfig('Acme Org');

    const disabled = await service.toggleAutomaticUpdates(created.organizationId, false);
    expect(disabled.automaticUpdatesEnabled).toBe(false);

    const enabled = await service.toggleAutomaticUpdates(created.organizationId, true);
    expect(enabled.automaticUpdatesEnabled).toBe(true);
  });

  it('throws when creating a configuration fails', async () => {
    state.insertError = { message: 'insert failed' };
    await expect(service.createConfig('Acme Org')).rejects.toThrow('insert failed');
  });

  it('throws when updating a configuration fails', async () => {
    const created = await service.createConfig('Acme Org');
    state.updateError = { message: 'update failed' };
    await expect(service.updateConfig(created.organizationId, { automaticUpdatesEnabled: false })).rejects.toThrow(
      'update failed'
    );
  });
});
