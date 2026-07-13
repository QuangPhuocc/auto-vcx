import { readDb } from '../server/db.js';

// Setup mock state similar to quotes calculation in App.tsx
const ratesData = readDb().rates;
const carType = 'personal_under_9';
const dbCarType = 'personal';
const isEV = true;
const evModel = 'VF3';
const ageBracket = 0; // Under 3 years
const carValue = 200000000;

const getRateInfo = (comp: string, isEVCar = isEV, model = evModel) => {
  let match = ratesData.find(r => 
    r.companyId === comp && 
    r.carType === carType && 
    r.isEV === isEVCar && 
    (!isEVCar || !r.evModel || r.evModel === model)
  );
  if (!match) {
    match = ratesData.find(r => 
      r.companyId === comp && 
      r.carType === dbCarType && 
      r.isEV === isEVCar && 
      (!isEVCar || !r.evModel || r.evModel === model)
    );
  }
  if (!match) return null;
  const subRule = match.rules.find(sr => sr.maxVal === null || carValue < sr.maxVal);
  if (!subRule) return null;
  const ratesArray = subRule.rates || [];
  const rateVal = ratesArray[ageBracket] !== undefined && ratesArray[ageBracket] !== null
    ? ratesArray[ageBracket]
    : (ratesArray[ratesArray.length - 1] ?? 0);
  return { rate: rateVal };
};

const companies = readDb().companies;
console.log("Calculated rates for VF3:");
companies.forEach(company => {
  const info = getRateInfo(company.id);
  console.log(`${company.name} (${company.id}): rate = ${info ? info.rate : 'null'}`);
});
