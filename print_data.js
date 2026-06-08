import fs from 'fs';

const data = JSON.parse(fs.readFileSync('sheets_data.json', 'utf8'));

for (const sheetName in data) {
  console.log(`\n--- ${sheetName} ---`);
  const rows = data[sheetName];
  for (const row of rows) {
    if (row && row.length > 1 && row.some(cell => cell !== null && cell !== '')) {
      console.log(row.map(c => c === null ? '' : c).join(' | '));
    }
  }
}
