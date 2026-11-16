import { describe, it, expect } from 'vitest';
import {
  actionableStageId,
  canActOnReport,
  isFinalStage,
  scopeMatchesStage,
  stageProgress,
} from './workflow';
import type { UserScope, ValidationStage } from '../types/index';

const stage = (over: Partial<ValidationStage>): ValidationStage => ({
  id: 1,
  code: 'district',
  name: 'District validation',
  ordinal: 10,
  scope_role: 'district_validator',
  applies_to: 'district_reports',
  scope_match: 'report_district',
  institution_code: null,
  is_active: true,
  ...over,
});
const STAGES = [
  stage({}),
  stage({
    id: 2,
    code: 'ministry',
    name: 'Ministry validation',
    scope_role: 'ministry_validator',
    scope_match: 'report_institution',
  }),
  stage({
    id: 5,
    code: 'rema',
    name: 'REMA verification',
    scope_role: 'rema_verifier',
    scope_match: 'national',
    institution_code: 'REMA',
  }),
];
const INSTITUTIONS = [
  { id: 1, code: 'REMA' },
  { id: 9, code: 'District Authorities' },
];
const scope = (over: Partial<UserScope>): UserScope => ({
  id: 1,
  user_id: 'v',
  scope_role: 'district_validator',
  institution_id: 9,
  district_id: 12,
  sector_id: null,
  granted_by: null,
  granted_at: '',
  ...over,
});
const report = {
  workflow_status: 'submitted' as const,
  current_stage_id: 1,
  route: [1, 2, 5],
  institution_id: 1,
  district_id: 12,
  submitted_by: 'submitter',
};

describe('scopeMatchesStage (mirrors can_act_at_stage in migration 040)', () => {
  it('district stage: the validator of the report district only', () => {
    expect(scopeMatchesStage(STAGES[0], [scope({})], report, INSTITUTIONS)).toBe(true);
    expect(scopeMatchesStage(STAGES[0], [scope({ district_id: 7 })], report, INSTITUTIONS)).toBe(
      false
    );
  });

  it('institution stage: the validator of the report institution', () => {
    const s = [scope({ scope_role: 'ministry_validator', institution_id: 1, district_id: null })];
    expect(scopeMatchesStage(STAGES[1], s, report, INSTITUTIONS)).toBe(true);
    expect(scopeMatchesStage(STAGES[1], s, { ...report, institution_id: 3 }, INSTITUTIONS)).toBe(
      false
    );
  });

  it('national stage: staff of the named institution, any report', () => {
    const s = [scope({ scope_role: 'rema_verifier', institution_id: 1, district_id: null })];
    expect(scopeMatchesStage(STAGES[2], s, { ...report, institution_id: 77 }, INSTITUTIONS)).toBe(
      true
    );
    const wrong = [scope({ scope_role: 'rema_verifier', institution_id: 9, district_id: null })];
    expect(scopeMatchesStage(STAGES[2], wrong, report, INSTITUTIONS)).toBe(false);
  });
});

describe('canActOnReport', () => {
  const districtValidator = [scope({})];
  it('lets the current stage validator act', () => {
    expect(canActOnReport(report, 'v', STAGES, districtValidator, INSTITUTIONS)).toBe(true);
  });
  it('never on one’s own submission', () => {
    expect(canActOnReport(report, 'submitter', STAGES, districtValidator, INSTITUTIONS)).toBe(
      false
    );
  });
  it('not at another stage, and not on returned or rejected reports', () => {
    expect(
      canActOnReport(
        { ...report, current_stage_id: 2 },
        'v',
        STAGES,
        districtValidator,
        INSTITUTIONS
      )
    ).toBe(false);
    expect(
      canActOnReport(
        { ...report, workflow_status: 'returned' },
        'v',
        STAGES,
        districtValidator,
        INSTITUTIONS
      )
    ).toBe(false);
  });
  it('a published report can be withdrawn by the final stage only', () => {
    const published = { ...report, workflow_status: 'published' as const, current_stage_id: null };
    const verifier = [scope({ scope_role: 'rema_verifier', institution_id: 1, district_id: null })];
    expect(actionableStageId(published)).toBe(5);
    expect(canActOnReport(published, 'v', STAGES, verifier, INSTITUTIONS)).toBe(true);
    expect(canActOnReport(published, 'v', STAGES, districtValidator, INSTITUTIONS)).toBe(false);
  });
});

describe('stageProgress / isFinalStage', () => {
  it('describes where the report is', () => {
    expect(stageProgress({ ...report, current_stage_id: 2 }, STAGES)).toEqual({
      position: 2,
      total: 3,
      name: 'Ministry validation',
    });
    expect(stageProgress({ ...report, current_stage_id: null }, STAGES)).toBeNull();
    expect(isFinalStage({ ...report, current_stage_id: 5 })).toBe(true);
    expect(isFinalStage(report)).toBe(false);
  });
});
