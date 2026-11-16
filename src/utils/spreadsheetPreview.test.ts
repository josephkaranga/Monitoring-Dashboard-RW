import { describe, it, expect } from 'vitest';
import { strToU8, zipSync } from 'fflate';
import {
  PREVIEW_MAX_ROWS,
  columnIndex,
  parseCsv,
  parseXlsx,
  sheetToHtml,
} from './spreadsheetPreview';

/** Build a minimal, valid .xlsx in memory (as Excel writes it). */
function makeXlsx(sheets: Record<string, string>, sharedStrings?: string[]): Uint8Array {
  const names = Object.keys(sheets);
  const files: Record<string, Uint8Array> = {
    '[Content_Types].xml': strToU8(
      '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"/>'
    ),
    'xl/workbook.xml': strToU8(
      `<?xml version="1.0"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${names
        .map((n, i) => `<sheet name="${n}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`)
        .join('')}</sheets></workbook>`
    ),
    'xl/_rels/workbook.xml.rels': strToU8(
      `<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${names
        .map(
          (_, i) =>
            `<Relationship Id="rId${i + 1}" Type="worksheet" Target="worksheets/sheet${i + 1}.xml"/>`
        )
        .join('')}</Relationships>`
    ),
  };
  names.forEach((n, i) => {
    files[`xl/worksheets/sheet${i + 1}.xml`] = strToU8(
      `<?xml version="1.0"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${sheets[n]}</sheetData></worksheet>`
    );
  });
  if (sharedStrings) {
    files['xl/sharedStrings.xml'] = strToU8(
      `<?xml version="1.0"?><sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">${sharedStrings
        .map(s => `<si><t>${s}</t></si>`)
        .join('')}</sst>`
    );
  }
  return zipSync(files);
}

describe('columnIndex', () => {
  it('converts cell references to zero-based columns', () => {
    expect(columnIndex('A1')).toBe(0);
    expect(columnIndex('Z9')).toBe(25);
    expect(columnIndex('AA10')).toBe(26);
    expect(columnIndex('AB2')).toBe(27);
  });
});

describe('parseXlsx', () => {
  it('reads shared strings, numbers, booleans and inline strings across sheets', () => {
    const xlsx = makeXlsx(
      {
        Indicators: `
          <row r="1"><c r="A1" t="s"><v>0</v></c><c r="B1" t="s"><v>1</v></c></row>
          <row r="2"><c r="A2" t="s"><v>2</v></c><c r="B2"><v>42.5</v></c><c r="D2" t="b"><v>1</v></c></row>`,
        Notes: `<row r="1"><c r="A1" t="inlineStr"><is><t>Inline note</t></is></c></row>`,
      },
      ['District', 'Hectares', 'Musanze']
    );
    const sheets = parseXlsx(xlsx);
    expect(sheets.map(s => s.name)).toEqual(['Indicators', 'Notes']);
    expect(sheets[0].rows).toEqual([
      ['District', 'Hectares'],
      ['Musanze', '42.5', '', 'TRUE'],
    ]);
    expect(sheets[1].rows).toEqual([['Inline note']]);
  });

  it('keeps blank rows so row numbers line up', () => {
    const sheets = parseXlsx(makeXlsx({ S: `<row r="3"><c r="A3"><v>7</v></c></row>` }));
    expect(sheets[0].rows).toEqual([[], [], ['7']]);
  });

  it('limits the preview and says so', () => {
    const many = Array.from(
      { length: PREVIEW_MAX_ROWS + 20 },
      (_, i) => `<row r="${i + 1}"><c r="A${i + 1}"><v>${i}</v></c></row>`
    ).join('');
    const [sheet] = parseXlsx(makeXlsx({ Big: many }));
    expect(sheet.rows).toHaveLength(PREVIEW_MAX_ROWS);
    expect(sheet.truncated).toBe(true);
    expect(sheetToHtml(sheet)).toMatch(/Preview limited/);
  });

  it('rejects files that are not xlsx workbooks', () => {
    expect(() => parseXlsx(zipSync({ 'hello.txt': strToU8('hi') }))).toThrow(/Not an .xlsx/);
    expect(() => parseXlsx(new Uint8Array([1, 2, 3, 4]))).toThrow();
  });
});

describe('parseCsv', () => {
  it('handles quotes, embedded commas and newlines, and CRLF', () => {
    const sheet = parseCsv(
      '\uFEFFname,note\r\n"Huye, South","said ""yes""\nthen left"\r\nNyagatare,ok'
    );
    expect(sheet.rows).toEqual([
      ['name', 'note'],
      ['Huye, South', 'said "yes"\nthen left'],
      ['Nyagatare', 'ok'],
    ]);
  });
});

describe('sheetToHtml', () => {
  it('escapes cell content so a spreadsheet cannot inject markup', () => {
    const html = sheetToHtml({
      name: 'x',
      rows: [['<img src=x onerror=alert(1)>', 'a & b']],
      truncated: false,
    });
    expect(html).not.toContain('<img');
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;');
    expect(html).toContain('a &amp; b');
  });
});
