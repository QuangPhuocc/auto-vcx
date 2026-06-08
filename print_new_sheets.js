import fs from 'fs';

const data = JSON.parse(fs.readFileSync('sheets_data.json', 'utf8'));

const sheetsToPrint = ['TASCO', 'PTI BƯU ĐIỆN', 'BẢO LONG', 'BẢO VIỆT'];

for (const sheetName of sheetsToPrint) {
  console.log(`\n--- ${sheetName} ---`);
  const rows = data[sheetName];
  if (!rows) {
    console.log('Sheet not found');
    continue;
  }
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (row && row.length > 1 && row.some(cell => cell !== null && cell !== '')) {
      console.log(`Row ${i}: ` + row.map(c => c === null ? '' : c).join(' | '));
    }
  }
}
