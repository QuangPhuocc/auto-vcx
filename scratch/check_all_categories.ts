import { readDb } from '../server/db.js';

const db = readDb();
const ratesData = db.rates;
const companies = db.companies;
const vehicles = db.vehicles;

const getRateInfo = (comp: string, carType: string, dbCarType: string, isEV: boolean, model: string, carValue = 200000000) => {
  let match = ratesData.find(r => 
    r.companyId === comp && 
    r.carType === carType && 
    r.isEV === isEV && 
    (!isEV || !r.evModel || r.evModel === model)
  );
  if (!match) {
    match = ratesData.find(r => 
      r.companyId === comp && 
      r.carType === dbCarType && 
      r.isEV === isEV && 
      (!isEV || !r.evModel || r.evModel === model)
    );
  }
  if (!match) return null;
  const subRule = match.rules.find(sr => sr.maxVal === null || carValue < sr.maxVal);
  if (!subRule) return null;
  const ratesArray = subRule.rates || [];
  const rateVal = ratesArray[0] !== undefined && ratesArray[0] !== null
    ? ratesArray[0]
    : 0;
  return rateVal;
};

vehicles.forEach(v => {
  console.log(`\nVehicle: ${v.name} (${v.id}, dbCarType: ${v.dbCarType})`);
  const activeComps: string[] = [];
  companies.forEach(company => {
    const rate = getRateInfo(company.id, v.id, v.dbCarType, true, 'VF3');
    if (rate !== null && rate > 0) {
      activeComps.push(`${company.name}: ${rate}%`);
    }
  });
  if (activeComps.length > 0) {
    console.log("  Active companies: " + activeComps.join(', '));
  } else {
    console.log("  No companies available");
  }
});
