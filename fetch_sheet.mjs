import * as fs from 'fs';
import * as xlsx from 'xlsx';

async function run() {
  const res = await fetch('https://docs.google.com/spreadsheets/d/10XEt3hznI6BjTnX7ktHiDg9U-Ihx4seg19xgJu1_40A/export?format=xlsx');
  const buffer = await res.arrayBuffer();
  fs.writeFileSync('output.xlsx', Buffer.from(buffer));
  
  const workbook = xlsx.readFile('output.xlsx');
  console.log("Sheet names:", workbook.SheetNames);
  
  // if Hoa hong exists, print first few rows
  if (workbook.SheetNames.includes('Hoa hồng')) {
     const sheet = workbook.Sheets['Hoa hồng'];
     console.log(xlsx.utils.sheet_to_json(sheet).slice(0, 5));
  }
}
run();
