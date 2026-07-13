import { readDb } from '../server/db.js';

const db = readDb();
console.log("Vehicles in DB:");
console.log(db.vehicles);
