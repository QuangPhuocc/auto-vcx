import { getSqliteDb } from '../server/db.js';
import { seedData } from '../server/seed.js';

const db = getSqliteDb();

console.log("Starting DB Reseed...");

try {
  // Clear rates and commissions tables
  db.prepare("DELETE FROM rates").run();
  db.prepare("DELETE FROM commissions").run();
  console.log("Successfully cleared rates and commissions tables.");

  // Call seedData
  seedData();
  console.log("Successfully re-seeded rates and commissions.");
  
  // Verify one rate
  const sampleRate = db.prepare("SELECT * FROM rates LIMIT 1").get();
  console.log("Sample seeded rate record:", sampleRate);
} catch (error) {
  console.error("Reseed failed:", error);
}
