import * as XLSX from 'xlsx';
import fs from 'fs';

const buf = fs.readFileSync('sheet.xlsx');
const workbook = XLSX.read(buf, { type: 'buffer' });
const sheetNames = workbook.SheetNames;
console.log("Sheets:", sheetNames);

const allData = {};
sheetNames.forEach(name => {
  const sheet = workbook.Sheets[name];
  allData[name] = XLSX.utils.sheet_to_json(sheet, { header: 1 });
});

fs.writeFileSync('sheets_data.json', JSON.stringify(allData, null, 2));
console.log("Data written to sheets_data.json");
