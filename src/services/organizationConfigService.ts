// ============================================================
// Organization Config Management Service
// ============================================================

import { supabase } from '../utils/supabase';
import type { OrganizationConfig } from '../types/automaticReporting';

interface OrganizationConfigRow {
  id: string;
  organization_name: string;
  automatic_updates_enabled: boolean;
  require_verification: boolean;
  audit_level: 'minimal' | 'standard' | 'comprehensive';
  processing_timeout: number;
  enable_notifications: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Default settings applied to newly created organization configurations.
 */
export const DEFAULT_ORGANIZATION_CONFIG = {
  automatic_updates_enabled: true,
  require_verification: false,
  audit_level: 'standard' as const,
  processing_timeout: 30,
  enable_notifications: true,
};

function mapRowToConfig(row: OrganizationConfigRow): OrganizationConfig {
  return {
    organizationId: row.id,
    organizationName: row.organization_name,
    automaticUpdatesEnabled: row.automatic_updates_enabled,
    requireVerification: row.require_verification,
    auditLevel: row.audit_level,
    processingTimeout: row.processing_timeout,
    enableNotifications: row.enable_notifications,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

export type OrganizationConfigUpdate = Partial<
  Pick<
    OrganizationConfig,
    | 'automaticUpdatesEnabled'
    | 'requireVerification'
    | 'auditLevel'
    | 'processingTimeout'
    | 'enableNotifications'
  >
>;

/**
 * CRUD operations for per-organization automatic update settings, backed by
 * the `organization_configs` table (migration 016).
 */
export class OrganizationConfigService {
  /**
   * Fetch the configuration for an organization, or null if none exists.
   */
  async getConfig(organizationName: string): Promise<OrganizationConfig | null> {
    const { data, error } = await supabase
      .from('organization_configs')
      .select('*')
      .eq('organization_name', organizationName)
      .maybeSingle();

    if (error || !data) return null;
    return mapRowToConfig(data as OrganizationConfigRow);
  }

  /**
   * Fetch an organization's configuration, creating a default one if it
   * doesn't exist yet.
   */
  async getOrCreateConfig(organizationName: string): Promise<OrganizationConfig> {
    const existing = await this.getConfig(organizationName);
    if (existing) return existing;
    return this.createConfig(organizationName);
  }

  /**
   * Create a new organization configuration, defaulting any unspecified
   * settings to the platform defaults.
   */
  async createConfig(
    organizationName: string,
    overrides: OrganizationConfigUpdate = {}
  ): Promise<OrganizationConfig> {
    const { data, error } = await supabase
      .from('organization_configs')
      .insert({
        organization_name: organizationName,
        ...DEFAULT_ORGANIZATION_CONFIG,
        ...(overrides.automaticUpdatesEnabled !== undefined && {
          automatic_updates_enabled: overrides.automaticUpdatesEnabled,
        }),
        ...(overrides.requireVerification !== undefined && {
          require_verification: overrides.requireVerification,
        }),
        ...(overrides.auditLevel !== undefined && { audit_level: overrides.auditLevel }),
        ...(overrides.processingTimeout !== undefined && {
          processing_timeout: overrides.processingTimeout,
        }),
        ...(overrides.enableNotifications !== undefined && {
          enable_notifications: overrides.enableNotifications,
        }),
      })
      .select()
      .single();

    if (error || !data) {
      throw new Error(error?.message || 'Failed to create organization config');
    }
    return mapRowToConfig(data as OrganizationConfigRow);
  }

  /**
   * Update an existing organization configuration.
   */
  async updateConfig(
    organizationId: string,
    updates: OrganizationConfigUpdate
  ): Promise<OrganizationConfig> {
    const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (updates.automaticUpdatesEnabled !== undefined)
      payload.automatic_updates_enabled = updates.automaticUpdatesEnabled;
    if (updates.requireVerification !== undefined)
      payload.require_verification = updates.requireVerification;
    if (updates.auditLevel !== undefined) payload.audit_level = updates.auditLevel;
    if (updates.processingTimeout !== undefined)
      payload.processing_timeout = updates.processingTimeout;
    if (updates.enableNotifications !== undefined)
      payload.enable_notifications = updates.enableNotifications;

    const { data, error } = await supabase
      .from('organization_configs')
      .update(payload)
      .eq('id', organizationId)
      .select()
      .single();

    if (error || !data) {
      throw new Error(error?.message || 'Failed to update organization config');
    }
    return mapRowToConfig(data as OrganizationConfigRow);
  }

  /**
   * Convenience method to enable or disable automatic processing for an
   * organization.
   */
  async toggleAutomaticUpdates(
    organizationId: string,
    enabled: boolean
  ): Promise<OrganizationConfig> {
    return this.updateConfig(organizationId, { automaticUpdatesEnabled: enabled });
  }
}

export const organizationConfigService = new OrganizationConfigService();
