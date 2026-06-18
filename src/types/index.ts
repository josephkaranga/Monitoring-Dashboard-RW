// ============================================================
// NBSAP Monitoring System — TypeScript Types
// ============================================================

// ── USER & AUTH ──────────────────────────────────────────────

export type UserRole =
  | 'policy_monitoring'
  | 'lead_government_ministry_reporting'
  | 'local_reporting'
  | 'dashboard_management'
  | 'programme_alignment'
  | 'public_viewer';

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  policy_monitoring: 'Policy Monitor',
  lead_government_ministry_reporting: 'Lead Government Ministry Reporter',
  local_reporting: 'Local Reporter',
  dashboard_management: 'REMA Administrator',
  programme_alignment: 'Development Partner',
  public_viewer: 'Public Viewer',
};

export const USER_ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  policy_monitoring: 'Read-only access to strategic dashboards and national progress summaries.',
  lead_government_ministry_reporting: 'Upload and review sector-level indicator data via T01–T07 reporting modules.',
  local_reporting: 'Enter and validate district-level biodiversity monitoring data.',
  dashboard_management: 'Full system access: verification queue, audit log, user management, all exports.',
  programme_alignment: 'Analytical viewing access for programme alignment and donor reporting.',
  public_viewer: 'External read-only access to view dashboards, reports, indicators, and maps without modification privileges.',
};

export const USER_ROLE_PERMISSIONS: Record<UserRole, RolePermissions> = {
  policy_monitoring: {
    canSubmitReports: false,
    canApproveReports: false,
    canViewVerifQueue: false,
    canViewAuditLog: false,
    canManageUsers: false,
    canExportRaw: false,
    canViewRiskRegister: true,
    canViewCompliance: true,
    canViewAnalytics: true,
  },
  lead_government_ministry_reporting: {
    canSubmitReports: true,
    canApproveReports: true,
    canViewVerifQueue: true,
    canViewAuditLog: false,
    canManageUsers: false,
    canExportRaw: true,
    canViewRiskRegister: true,
    canViewCompliance: true,
    canViewAnalytics: true,
  },
  local_reporting: {
    canSubmitReports: true,
    canApproveReports: false,
    canViewVerifQueue: false,
    canViewAuditLog: false,
    canManageUsers: false,
    canExportRaw: false,
    canViewRiskRegister: false,
    canViewCompliance: true,
    canViewAnalytics: false,
  },
  dashboard_management: {
    canSubmitReports: true,
    canApproveReports: true,
    canViewVerifQueue: true,
    canViewAuditLog: true,
    canManageUsers: true,
    canExportRaw: true,
    canViewRiskRegister: true,
    canViewCompliance: true,
    canViewAnalytics: true,
  },
  programme_alignment: {
    canSubmitReports: false,
    canApproveReports: false,
    canViewVerifQueue: false,
    canViewAuditLog: false,
    canManageUsers: false,
    canExportRaw: false,
    canViewRiskRegister: true,
    canViewCompliance: true,
    canViewAnalytics: true,
  },
  public_viewer: {
    canSubmitReports: false,
    canApproveReports: false,
    canViewVerifQueue: false,
    canViewAuditLog: false,
    canManageUsers: false,
    canExportRaw: false,
    canViewRiskRegister: false,
    canViewCompliance: false,
    canViewAnalytics: false,
  },
};

export interface RolePermissions {
  canSubmitReports: boolean;
  canApproveReports: boolean;
  canViewVerifQueue: boolean;
  canViewAuditLog: boolean;
  canManageUsers: boolean;
  canExportRaw: boolean;
  canViewRiskRegister: boolean;
  canViewCompliance: boolean;
  canViewAnalytics: boolean;
}

/**
 * Check if a user role has a specific permission
 * @param role - The user role to check
 * @param permission - The permission key to check
 * @returns true if the role has the permission, false otherwise
 */
export function hasPermission(
  role: UserRole,
  permission: keyof RolePermissions
): boolean {
  return USER_ROLE_PERMISSIONS[role][permission];
}

export interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  role: UserRole;
  organization: string | null;
  department: string | null;
  phone: string | null;
  is_active: boolean;
  suspended_at: string | null;
  suspended_by: string | null;
  suspension_reason: string | null;
  suspension_end_date: string | null;
  last_login: string | null;
  avatar_initials: string;
  created_at: string;
  updated_at: string;
}

export type AccountStatus = 'active' | 'deactivated' | 'suspended' | 'suspended_expired';

export interface AccountStatusInfo {
  status: AccountStatus;
  message: string;
  canLogin: boolean;
  suspendedBy?: string;
  suspensionReason?: string;
  suspensionEndDate?: string;
}

/**
 * Get account status information for a user profile
 * @param profile - The user profile to check
 * @returns AccountStatusInfo object with status details
 */
export function getAccountStatus(profile: UserProfile): AccountStatusInfo {
  // Check if account is deactivated
  if (!profile.is_active) {
    return {
      status: 'deactivated',
      message: 'This account has been deactivated by an administrator.',
      canLogin: false,
    };
  }

  // Check if account is suspended
  if (profile.suspended_at) {
    // Check if suspension has expired
    if (profile.suspension_end_date) {
      const endDate = new Date(profile.suspension_end_date);
      const now = new Date();
      
      if (endDate < now) {
        return {
          status: 'suspended_expired',
          message: 'Account suspension has expired and will be automatically reactivated.',
          canLogin: true,
        };
      }
      
      return {
        status: 'suspended',
        message: `This account is suspended until ${endDate.toLocaleDateString()}.`,
        canLogin: false,
        suspendedBy: profile.suspended_by || undefined,
        suspensionReason: profile.suspension_reason || undefined,
        suspensionEndDate: profile.suspension_end_date,
      };
    }
    
    // Indefinite suspension
    return {
      status: 'suspended',
      message: 'This account is suspended indefinitely. Contact an administrator for more information.',
      canLogin: false,
      suspendedBy: profile.suspended_by || undefined,
      suspensionReason: profile.suspension_reason || undefined,
    };
  }

  // Account is active
  return {
    status: 'active',
    message: 'Account is active and in good standing.',
    canLogin: true,
  };
}

// ── INDICATORS ───────────────────────────────────────────────

export type IndicatorStatus = 'on-track' | 'at-risk' | 'behind';
export type IndicatorTier = 'headline' | 'component' | 'complementary' | 'binary';
export type GBFGoal = 'A' | 'B' | 'C' | 'D';

export interface Indicator {
  id: number;
  name: string;
  definition: string;
  tier: IndicatorTier;
  nbsap_target_id: number;
  nbsap_target?: string; // e.g. "Target 1"
  target_2030: string;
  baseline: string;
  midterm: string;
  final_target: string;
  current_value: string;
  progress: number;
  status: IndicatorStatus;
  km_gbf: string;
  periodicity: string;
  data_source: string;
  responsible: string[];
  created_at: string;
  updated_at: string;
}

export interface NBSAPTarget {
  id: number;
  goal: GBFGoal;
  title: string;
  description: string;
  baseline: string;
  timeline_milestones?: string;
  progress: number;
  goal_color: { bg: string; text: string };
  headline_indicator?: string;
  component_indicators?: string[];
  complementary_indicators?: string[];
  strategic_actions?: string[];
  indicators?: Indicator[];
  responsible_stakeholders?: string[];
  total_reports?: number;
  approved_reports?: number;
  pending_reports?: number;
  report_completion_rate?: number;
  created_at: string;
  updated_at: string;
}

// ── TOOLKIT REPORTS ──────────────────────────────────────────

export type ReportType = 'T01' | 'T02' | 'T03' | 'T04' | 'T05' | 'T06' | 'T07';
export type SubmissionStatus = 'pending' | 'approved' | 'rejected';

export interface ToolkitReport {
  id: string;
  tool_id: ReportType;
  tool_name: string;
  submitted_by: string;
  submitted_by_profile?: UserProfile;
  status: SubmissionStatus;
  reviewed_by: string | null;
  reviewed_by_profile?: UserProfile;
  reviewed_at: string | null;
  review_note: string | null;
  period: string | null;
  form_data: Record<string, unknown>;
  attachments: ReportAttachment[];
  district: string | null;
  institution: string | null;
  nbsap_target_id: number | null;
  submitted_at: string;
  created_at: string;
  updated_at: string;
}

export interface ReportAttachment {
  id?: string;
  name: string;
  ext: string;
  size: number;
  storage_path?: string;
  data_url?: string; // temporary for upload
}

// ── DISTRICTS ────────────────────────────────────────────────

export type DistrictStatus = 'submitted' | 'pending' | 'missing';

export interface District {
  id: number;
  name: string;
  province_id: number;
  province?: Province;
  status: DistrictStatus;
  compliance: number;
  forest_cover: number;
  latitude?: number;
  longitude?: number;
  elevation?: number;
  wetland_area?: number;
  created_at: string;
  updated_at: string;
}

export interface Province {
  id: number;
  name: string;
}

// ── RISK REGISTER ────────────────────────────────────────────

export type RiskLevel = 'High' | 'Medium' | 'Low';

export interface Risk {
  id: string;
  description: string;
  category: string;
  likelihood: string;
  impact: string;
  level: RiskLevel;
  mitigation: string;
  owner: string;
  is_live: boolean;
  created_at: string;
  updated_at: string;
}

// ── COMPLIANCE ───────────────────────────────────────────────

export interface ComplianceRecord {
  id: string;
  title: string;
  description: string | null;
  severity: 'High' | 'Medium' | 'Low';
  district: string | null;
  flagged_at: string;
  resolved_at: string | null;
  resolved_by: string | null;
  is_resolved: boolean;
  created_at: string;
}

// ── NOTIFICATIONS ────────────────────────────────────────────

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
  is_read: boolean;
  action_tab: string | null;
  action_label: string | null;
  created_at: string;
}

export interface NotificationPreferences {
  user_id: string;
  email: string | null;
  phone: string | null;
  sub_overdue: boolean;
  sub_compliance: boolean;
  compliance_threshold: number;
  sub_deadlines: boolean;
  deadline_days: number;
  sub_pending: boolean;
  sub_finance: boolean;
  sub_risk: boolean;
  watchlist_indicators: number[];
}

// ── AUDIT LOG ────────────────────────────────────────────────

export interface AuditEntry {
  id: string;
  user_id: string;
  action_type: string;
  action: string;
  detail: string | null;
  role: string | null;
  ip_address: string | null;
  created_at: string;
  profile?: UserProfile;
}

// ── DASHBOARD STATS ──────────────────────────────────────────

export interface DashboardStats {
  totalTargets: number;
  totalSubmissions: number;
  activeDistricts: string;
  missingDistricts: number;
  complianceIssues: number;
  onTrackIndicators: number;
  atRiskIndicators: number;
  behindIndicators: number;
  avgProgress: number;
  forestHa: number;
  wetlandHa: number;
  hwcIncidents: number;
  financeAllocated: number;
  financeDisbursed: number;
  reportsByTool: Record<ReportType, number>;
  pendingVerifications: number;
  totalIndicators: number;
  headlineIndicators: number;
  componentIndicators: number;
  binaryIndicators: number;
}

// ── USER SETTINGS ────────────────────────────────────────────

export interface UserSettings {
  user_id: string;
  show_live_stats: boolean;
  animate_bars: boolean;
  compact_sidebar: boolean;
  auto_refresh: boolean;
  show_baseline: boolean;
  require_verification: boolean;
  species_fuzzing: boolean;
  mask_species_names: boolean;
  restrict_raw_export: boolean;
  log_exports: boolean;
  language: string;
}

// ── API RESPONSES ────────────────────────────────────────────

export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
  count?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  count: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ── AUTH ─────────────────────────────────────────────────────

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface SignupData extends LoginCredentials {
  full_name: string;
  role: UserRole;
  organization?: string;
  department?: string;
}

export interface AuthState {
  user: UserProfile | null;
  session: import('@supabase/supabase-js').Session | null;
  loading: boolean;
  permissions: RolePermissions | null;
}

// ── AUTOMATIC REPORTING ──────────────────────────────────────

export * from './automaticReporting';

