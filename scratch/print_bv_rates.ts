import { readDb } from '../server/db.js';

const db = readDb();
const bvEvRates = db.rates.filter(r => r.companyId === 'BV' && r.isEV === true);

console.log("BV EV Rates in SQLite database:");
console.log(JSON.stringify(bvEvRates, null, 2));
