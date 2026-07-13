import { getSqliteDb } from '../server/db.js';

const db = getSqliteDb();

console.log("Starting Safe DB Migration...");

try {
  db.transaction(() => {
    // 1. Update null/empty evModel to 'Mọi dòng xe'
    const updateNullEvModels = db.prepare(`
      UPDATE rates 
      SET evModel = 'Mọi dòng xe' 
      WHERE evModel IS NULL OR evModel = ''
    `);
    updateNullEvModels.run();
    console.log("Updated legacy records to default 'Mọi dòng xe'.");

    // 2. Find all VF8_9 rates to split
    const vf8_9Records = db.prepare("SELECT * FROM rates WHERE evModel = 'VF8_9'").all() as any[];
    console.log(`Found ${vf8_9Records.length} records with 'VF8_9' to split.`);

    const insertRate = db.prepare(`
      INSERT OR REPLACE INTO rates (id, carType, companyId, isEV, evModel, rules)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const deleteRate = db.prepare("DELETE FROM rates WHERE id = ?");

    for (const record of vf8_9Records) {
      // Split into VF8
      let vf8Rules = record.rules;
      if (record.companyId === 'BV' && record.carType === 'personal_under_9') {
        // Specific personal VF8 rate: 1.45% / 1.57%
        vf8Rules = JSON.stringify([{ maxVal: null, rates: [1.45, 1.57, 0, 0, 0, 0] }]);
      }
      const vf8Id = `${record.carType}_${record.companyId}_ev_VF8`;
      insertRate.run(vf8Id, record.carType, record.companyId, 1, 'VF8', vf8Rules);

      // Split into VF9
      let vf9Rules = record.rules;
      if (record.companyId === 'BV' && record.carType === 'personal_under_9') {
        // Specific personal VF9 rate: 1.35% / 1.47%
        vf9Rules = JSON.stringify([{ maxVal: null, rates: [1.35, 1.47, 0, 0, 0, 0] }]);
      }
      const vf9Id = `${record.carType}_${record.companyId}_ev_VF9`;
      insertRate.run(vf9Id, record.carType, record.companyId, 1, 'VF9', vf9Rules);

      // Delete old VF8_9 record
      deleteRate.run(record.id);
    }
    console.log("Successfully split all VF8_9 records into separate VF8 and VF9 records.");

    // 3. Duplicate base models rates to new EV models for all companies
    const allEVRecords = db.prepare("SELECT * FROM rates WHERE isEV = 1").all() as any[];

    // We will clone rates:
    // - VF3 rates -> Minio Green
    // - VF5 rates -> Herio Green
    // - VF6 rates -> Nerio Green
    // - VF7 rates -> Limo Green
    // - VF6 rates -> MPV7 (using VF6 as base)
    const clonesToCreate = [
      { base: 'VF3', target: 'Minio Green' },
      { base: 'VF5', target: 'Herio Green' },
      { base: 'VF6', target: 'Nerio Green' },
      { base: 'VF7', target: 'Limo Green' },
      { base: 'VF6', target: 'MPV7' }
    ];

    let cloneCount = 0;
    for (const cloneInfo of clonesToCreate) {
      const baseRecords = allEVRecords.filter(r => r.evModel === cloneInfo.base);
      for (const record of baseRecords) {
        const targetId = `${record.carType}_${record.companyId}_ev_${cloneInfo.target}`;
        insertRate.run(targetId, record.carType, record.companyId, 1, cloneInfo.target, record.rules);
        cloneCount++;
      }
    }
    console.log(`Successfully created ${cloneCount} cloned rate records for new EV models.`);
  })();

  console.log("Safe DB Migration completed successfully!");
} catch (error) {
  console.error("Migration failed:", error);
}
