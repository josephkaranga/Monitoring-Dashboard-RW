const { mdToPdf } = require('C:/Users/Administrator/AppData/Roaming/npm/node_modules/md-to-pdf');
const path = require('path');
const fs = require('fs');

const files = [
  '01_EXECUTIVE_SUMMARY.md',
  '02_REQUIREMENTS_SPECIFICATION.md',
  '03_BUSINESS_PROCESS_DOCUMENT.md',
  '04_TECHNICAL_SRS.md',
  '05_SYSTEM_ARCHITECTURE_DOCUMENT.md',
  '06_DATABASE_SCHEMA_DOCUMENT.md',
  '07_USER_ROLES_AND_PERMISSIONS.md',
  '08_DASHBOARD_INDICATORS_MAPPING.md',
  '10_UAT_CHECKLIST.md',
  'NBSAP_COMPREHENSIVE_SYSTEM_DOCUMENT.md',
];

const docsDir = __dirname;
const pdfDir = path.join(docsDir, 'pdf');
if (!fs.existsSync(pdfDir)) fs.mkdirSync(pdfDir);

(async () => {
  for (const file of files) {
    const src = path.join(docsDir, file);
    const dest = path.join(pdfDir, file.replace('.md', '.pdf'));
    console.log(`Converting ${file}...`);
    try {
      const pdf = await mdToPdf({ path: src }, {
        pdf_options: {
          format: 'A4',
          margin: { top: '20mm', bottom: '20mm', left: '20mm', right: '20mm' },
          printBackground: true,
        },
        launch_options: {
          executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
          args: ['--no-sandbox', '--disable-setuid-sandbox'],
        },
        stylesheet: [],
        css: `
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; font-size: 11pt; line-height: 1.5; color: #1a1a1a; }
          h1 { font-size: 20pt; color: #0f2744; border-bottom: 2px solid #0ea5e9; padding-bottom: 8px; }
          h2 { font-size: 16pt; color: #1e3a5f; margin-top: 24px; }
          h3 { font-size: 13pt; color: #2d4a6f; }
          table { border-collapse: collapse; width: 100%; margin: 12px 0; font-size: 9.5pt; }
          th, td { border: 1px solid #cbd5e1; padding: 6px 10px; text-align: left; }
          th { background: #f1f5f9; font-weight: 600; color: #0f2744; }
          tr:nth-child(even) { background: #f8fafc; }
          code { background: #f1f5f9; padding: 2px 5px; border-radius: 3px; font-size: 9pt; }
          pre { background: #f1f5f9; padding: 12px; border-radius: 6px; font-size: 8.5pt; overflow-x: auto; }
          blockquote { border-left: 3px solid #0ea5e9; padding-left: 12px; color: #475569; }
        `,
      });
      if (pdf.content) {
        fs.writeFileSync(dest, pdf.content);
        console.log(`  -> ${dest}`);
      }
    } catch (err) {
      console.error(`  FAILED: ${err.message}`);
    }
  }
  console.log('\nAll done!');
})();
