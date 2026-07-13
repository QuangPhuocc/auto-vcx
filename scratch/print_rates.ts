import { readDb } from '../server/db.js';
const db = readDb();
const nullEvModelRates = db.rates.filter(r => r.companyId === 'BV' && r.isEV === true && !r.evModel);
console.log('Bảo Việt EV rates with null evModel:', nullEvModelRates.length);
if (nullEvModelRates.length > 0) {
  console.log(JSON.stringify(nullEvModelRates, null, 2));
}
