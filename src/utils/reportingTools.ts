// Reporting modules open for submission. REMA uses T01–T04; the database
// (report_type) accepts only these. The T05–T07 form definitions stay in
// the code but are hidden everywhere a report can be started: add an id
// here (and to the database enum) to open one again.
export const ENABLED_TOOL_IDS = ['T01', 'T02', 'T03', 'T04'] as const;

export function isToolEnabled(toolId: string | null | undefined): boolean {
  return !!toolId && (ENABLED_TOOL_IDS as readonly string[]).includes(toolId);
}
