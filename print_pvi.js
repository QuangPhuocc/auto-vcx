import fs from 'fs';

const data = JSON.parse(fs.readFileSync('sheets_data.json', 'utf8'));

for (const sheetName of ['PVI DẦU KHÍ']) {
  console.log(`\n--- ${sheetName} ---`);
  const rows = data[sheetName];
  if (!rows) continue;
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (row && row.length > 1 && row.some(cell => cell !== null && cell !== '')) {
      console.log(`Row ${i}: ` + row.map(c => c === null ? '' : c).join(' | '));
    }
  }
}
