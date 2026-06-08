const xlsx = require('xlsx');

const workbook = xlsx.readFile('output.xlsx');
const sheet = workbook.Sheets['BẢO MINH'];
console.log(xlsx.utils.sheet_to_json(sheet, {header: 1}).slice(0, 50));
console.log("---");
console.log(xlsx.utils.sheet_to_json(sheet, {header: 1}).slice(50, 100));
