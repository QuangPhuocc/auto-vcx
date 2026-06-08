import fs from 'fs';
const db = JSON.parse(fs.readFileSync('server/data/db.json', 'utf8'));
const pviRates = db.rates.filter(r => r.companyId === 'PVI' && r.carType.startsWith('personal'));
console.log('Total PVI passenger rates:', pviRates.length);
pviRates.forEach((r, idx) => {
  console.log(`\nRate ${idx + 1}: carType=${r.carType}, isEV=${r.isEV}, evModel=${r.evModel}`);
  r.rules.forEach((rule, rIdx) => {
    console.log(`  Rule ${rIdx + 1}: maxVal=${rule.maxVal}, rates=${JSON.stringify(rule.rates)}, minPremium=${rule.minPremium}, deductible=${rule.deductible}`);
  });
});
