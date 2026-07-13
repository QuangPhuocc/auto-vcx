import { getSqliteDb } from '../server/db.js';

const db = getSqliteDb();
const tableInfo = db.prepare("PRAGMA table_info(rates)").all();
console.log("rates table schema:");
console.log(tableInfo);
