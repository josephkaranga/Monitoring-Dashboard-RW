// ============================================================
// Read-only spreadsheet preview for evidence files (Verification Queue).
// Replaces the `xlsx` package (high-severity advisories, no fixed version
// on npm). An .xlsx file is a zip of XML parts, so a preview needs only
// fflate (unzip) and the browser's DOMParser.
//
// Scope: cell text for preview. Formulas show their cached value; dates
// show Excel's serial number; styling is ignored. Legacy binary .xls is
// not supported (the validator downloads it instead).
// ============================================================

import { unzipSync } from 'fflate';

export const PREVIEW_MAX_ROWS = 500;
export const PREVIEW_MAX_COLS = 60;
/** Refuse any single part that decompresses beyond this (zip-bomb guard). */
export const PREVIEW_MAX_PART_BYTES = 25 * 1024 * 1024;

export interface PreviewSheet {
  name: string;
  rows: string[][];
  truncated: boolean;
}

const REL_NS = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';

function parseXml(bytes: Uint8Array): Document {
  const doc = new DOMParser().parseFromString(
    new TextDecoder('utf-8').decode(bytes),
    'application/xml'
  );
  if (doc.getElementsByTagName('parsererror').length > 0)
    throw new Error('Malformed spreadsheet XML');
  return doc;
}

function byTag(node: Document | Element, tag: string): Element[] {
  return Array.from(node.getElementsByTagNameNS('*', tag));
}

/** Text of an <si> or <is>: all <t> runs, excluding phonetic hints (<rPh>). */
function richText(el: Element): string {
  return byTag(el, 't')
    .filter(t => t.parentElement?.localName !== 'rPh')
    .map(t => t.textContent ?? '')
    .join('');
}

/** "AB12" -> 27 (zero-based column index). */
export function columnIndex(ref: string): number {
  const letters = /^[A-Z]+/i.exec(ref)?.[0].toUpperCase() ?? '';
  let n = 0;
  for (const ch of letters) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}

/** Resolve a workbook relationship target to a zip path. */
function resolveTarget(target: string): string {
  if (target.startsWith('/')) return target.slice(1);
  return `xl/${target.replace(/^\.\//, '')}`;
}

export function parseXlsx(buffer: ArrayBuffer | Uint8Array): PreviewSheet[] {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let tooLarge = false;
  const files = unzipSync(bytes, {
    filter: f => {
      const wanted =
        f.name === 'xl/workbook.xml' ||
        f.name === 'xl/_rels/workbook.xml.rels' ||
        f.name === 'xl/sharedStrings.xml' ||
        f.name.startsWith('xl/worksheets/sheet');
      if (wanted && f.originalSize > PREVIEW_MAX_PART_BYTES) tooLarge = true;
      return wanted && f.originalSize <= PREVIEW_MAX_PART_BYTES;
    },
  });
  if (tooLarge) throw new Error('Spreadsheet is too large to preview; download it instead');
  if (!files['xl/workbook.xml']) throw new Error('Not an .xlsx workbook');

  const shared = files['xl/sharedStrings.xml']
    ? byTag(parseXml(files['xl/sharedStrings.xml']), 'si').map(richText)
    : [];

  const rels = new Map<string, string>();
  if (files['xl/_rels/workbook.xml.rels']) {
    for (const r of byTag(parseXml(files['xl/_rels/workbook.xml.rels']), 'Relationship')) {
      rels.set(r.getAttribute('Id') ?? '', resolveTarget(r.getAttribute('Target') ?? ''));
    }
  }

  const sheets: PreviewSheet[] = [];
  byTag(parseXml(files['xl/workbook.xml']), 'sheet').forEach((sheetEl, i) => {
    const name = sheetEl.getAttribute('name') ?? `Sheet${i + 1}`;
    const rid = sheetEl.getAttributeNS(REL_NS, 'id') ?? sheetEl.getAttribute('r:id') ?? '';
    const path = rels.get(rid) ?? `xl/worksheets/sheet${i + 1}.xml`;
    const part = files[path];
    if (!part) {
      sheets.push({ name, rows: [], truncated: false });
      return;
    }

    const rows: string[][] = [];
    let truncated = false;
    for (const rowEl of byTag(parseXml(part), 'row')) {
      if (rows.length >= PREVIEW_MAX_ROWS) {
        truncated = true;
        break;
      }
      const rowNum = Number(rowEl.getAttribute('r')) || rows.length + 1;
      // Keep blank rows so row numbers match the original.
      while (rows.length < rowNum - 1 && rows.length < PREVIEW_MAX_ROWS) rows.push([]);
      if (rows.length >= PREVIEW_MAX_ROWS) {
        truncated = true;
        break;
      }
      const cells: string[] = [];
      byTag(rowEl, 'c').forEach((c, j) => {
        const ref = c.getAttribute('r');
        const col = ref ? columnIndex(ref) : j;
        if (col >= PREVIEW_MAX_COLS) {
          truncated = true;
          return;
        }
        const type = c.getAttribute('t');
        const v = byTag(c, 'v')[0]?.textContent ?? '';
        let text: string;
        if (type === 's') text = shared[Number(v)] ?? '';
        else if (type === 'inlineStr') text = byTag(c, 'is')[0] ? richText(byTag(c, 'is')[0]) : '';
        else if (type === 'b') text = v === '1' ? 'TRUE' : 'FALSE';
        else text = v;
        while (cells.length < col) cells.push('');
        cells[col] = text;
      });
      rows.push(cells);
    }
    sheets.push({ name, rows, truncated });
  });
  return sheets;
}

/** RFC 4180 CSV: quoted fields, doubled quotes, CRLF or LF line ends. */
export function parseCsv(text: string): PreviewSheet {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  let truncated = false;
  const src = text.replace(/^\uFEFF/, '');
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i++;
        } else inQuotes = false;
      } else field += ch;
    } else if (ch === '"') inQuotes = true;
    else if (ch === ',') {
      row.push(field);
      field = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i++;
      row.push(field);
      rows.push(row.slice(0, PREVIEW_MAX_COLS));
      if (row.length > PREVIEW_MAX_COLS) truncated = true;
      row = [];
      field = '';
      if (rows.length >= PREVIEW_MAX_ROWS) {
        truncated = i < src.length - 1;
        break;
      }
    } else field += ch;
  }
  if (rows.length < PREVIEW_MAX_ROWS && (field !== '' || row.length > 0)) {
    row.push(field);
    rows.push(row.slice(0, PREVIEW_MAX_COLS));
  }
  return { name: 'CSV', rows, truncated };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Escaped HTML table for a sheet (still passed through DOMPurify by the caller). */
export function sheetToHtml(sheet: PreviewSheet): string {
  const width = Math.max(0, ...sheet.rows.map(r => r.length));
  const body = sheet.rows
    .map(r => {
      const cells = Array.from({ length: width }, (_, i) => `<td>${escapeHtml(r[i] ?? '')}</td>`);
      return `<tr>${cells.join('')}</tr>`;
    })
    .join('');
  const note = sheet.truncated
    ? `<caption>Preview limited to ${PREVIEW_MAX_ROWS} rows and ${PREVIEW_MAX_COLS} columns. Download the file to see everything.</caption>`
    : '';
  return `<table>${note}<tbody>${body}</tbody></table>`;
}
