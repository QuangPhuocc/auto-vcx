import { readDb } from '../server/db.js';

const db = readDb();
const ratesData = db.rates;

const testAllVehiclesForBV = (evModel: string) => {
  const currentYear = 2026;
  const manufactureYear = 2026;
  const age = currentYear - manufactureYear;
  const isEV = evModel !== 'gas';
  const carValue = 350000000;

  let ageBracket = 0;
  if (age >= 3 && age < 6) ageBracket = 1;
  else if (age >= 6 && age < 10) ageBracket = 2;
  else if (age >= 10 && age < 15) ageBracket = 3;
  else if (age >= 15 && age < 20) ageBracket = 4;
  else if (age >= 20) ageBracket = 5;

  return db.vehicles.map(vehicle => {
    const carType = vehicle.id;
    const dbCarType = vehicle.dbCarType;

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

      return {
        matchId: match.id,
        rate: rateVal
      };
    };

    const rateInfo = getRateInfo('BV');
    return {
      vehicleId: vehicle.id,
      vehicleName: vehicle.name,
      dbCarType: vehicle.dbCarType,
      isAvailable: !!rateInfo && rateInfo.rate > 0,
      rate: rateInfo ? rateInfo.rate : 0,
      matchId: rateInfo ? rateInfo.matchId : null
    };
  });
};

const results = testAllVehiclesForBV('VF3');
results.slice(0, 12).forEach(r => console.log(r));
