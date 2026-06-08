import fs from 'fs';

const data = JSON.parse(fs.readFileSync('sheets_data.json', 'utf8'));

const sheetName = 'BẢO VIỆT';
console.log(`\n--- ${sheetName} ---`);
const rows = data[sheetName];
for (let i = 0; i < rows.length; i++) {
  const row = rows[i];
  if (row && row.length > 0) {
    console.log(`Row ${i}: ` + row.map(c => c === null ? '' : c).join(' | '));
  }
}
