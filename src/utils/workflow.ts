// ============================================================
// M02 — Validation workflow rules for the UI.
// Mirrors can_act_at_stage() in migration 040 so the screens only offer
// actions the database will accept. The database remains the authority.
// ============================================================

import type {
  Institution,
  ToolkitReport,
  UserScope,
  ValidationStage,
  WorkflowStatus,
} from '../types/index';

export const WORKFLOW_LABELS: Record<WorkflowStatus, string> = {
  draft: 'Draft',
  submitted: 'Submitted',
  in_validation: 'In validation',
  returned: 'Returned for correction',
  published: 'Published',
  rejected: 'Rejected',
};

type ReportLike = Pick<
  ToolkitReport,
  | 'workflow_status'
  | 'current_stage_id'
  | 'route'
  | 'institution_id'
  | 'district_id'
  | 'submitted_by'
>;

/** The stage a validator would act at: the current one, or the final one for a published report. */
export function actionableStageId(report: ReportLike): number | null {
  if (report.workflow_status === 'published') {
    const route = report.route ?? [];
    return route.length ? route[route.length - 1] : null;
  }
  if (report.workflow_status === 'submitted' || report.workflow_status === 'in_validation') {
    return report.current_stage_id ?? null;
  }
  return null;
}

/** Same rule as can_act_at_stage() in the database. */
export function scopeMatchesStage(
  stage: ValidationStage,
  scopes: UserScope[],
  report: Pick<ReportLike, 'institution_id' | 'district_id'>,
  institutions: Pick<Institution, 'id' | 'code'>[]
): boolean {
  return scopes.some(s => {
    if (s.scope_role !== stage.scope_role) return false;
    switch (stage.scope_match) {
      case 'report_district':
        return s.district_id != null && s.district_id === report.district_id;
      case 'report_institution':
        return (
          s.institution_id === report.institution_id &&
          (s.district_id == null || s.district_id === report.district_id)
        );
      case 'national': {
        const inst = institutions.find(i => i.code === stage.institution_code);
        return !!inst && s.institution_id === inst.id;
      }
      default:
        return false;
    }
  });
}

/** Can this user approve / return / reject the report now? */
export function canActOnReport(
  report: ReportLike,
  userId: string | undefined,
  stages: ValidationStage[],
  scopes: UserScope[],
  institutions: Pick<Institution, 'id' | 'code'>[]
): boolean {
  if (!userId || report.submitted_by === userId) return false;
  const stageId = actionableStageId(report);
  const stage = stages.find(s => s.id === stageId);
  return !!stage && scopeMatchesStage(stage, scopes, report, institutions);
}

/** "Stage 2 of 4 · Ministry validation" for a report in validation. */
export function stageProgress(
  report: Pick<ReportLike, 'route' | 'current_stage_id'>,
  stages: ValidationStage[]
): { position: number; total: number; name: string } | null {
  const route = report.route ?? [];
  const i = report.current_stage_id != null ? route.indexOf(report.current_stage_id) : -1;
  if (i < 0) return null;
  const stage = stages.find(s => s.id === report.current_stage_id);
  return { position: i + 1, total: route.length, name: stage?.name ?? 'Validation' };
}

/** Is the current stage the last one, so approving publishes? */
export function isFinalStage(report: Pick<ReportLike, 'route' | 'current_stage_id'>): boolean {
  const route = report.route ?? [];
  return route.length > 0 && route[route.length - 1] === report.current_stage_id;
}
