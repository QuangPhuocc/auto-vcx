import { readDb } from '../server/db.js';

const db = readDb();
const pviEvRates = db.rates.filter(r => r.companyId === 'PVI' && r.isEV === true);

console.log("PVI EV Rates in SQLite database:");
console.log(JSON.stringify(pviEvRates, null, 2));
