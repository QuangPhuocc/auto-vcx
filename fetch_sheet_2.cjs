const fs = require('fs');
const xlsx = require('xlsx');

const workbook = xlsx.readFile('output.xlsx');
const sheet = workbook.Sheets['PVI DẦU KHÍ'];
console.log(xlsx.utils.sheet_to_json(sheet, {header: 1}).slice(50, 100));
