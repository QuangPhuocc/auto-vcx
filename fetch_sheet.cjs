const fs = require('fs');
const xlsx = require('xlsx');

async function run() {
  const res = await fetch('https://docs.google.com/spreadsheets/d/10XEt3hznI6BjTnX7ktHiDg9U-Ihx4seg19xgJu1_40A/export?format=xlsx');
  const buffer = await res.arrayBuffer();
  fs.writeFileSync('output.xlsx', Buffer.from(buffer));
  
  const workbook = xlsx.readFile('output.xlsx');
  console.log("Sheet names:", workbook.SheetNames);
  
  for (const name of workbook.SheetNames) {
     if (name === 'Hoa hồng' || name.includes('PVI')) {
        console.log("Sheet:", name);
        const sheet = workbook.Sheets[name];
        console.log(xlsx.utils.sheet_to_json(sheet, {header: 1}).slice(0, 50));
     }
  }
}
run();
