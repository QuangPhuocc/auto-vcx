import { readDb } from '../server/db.js';

const db = readDb();
const ratesData = db.rates;
const commissionsData = db.commissions;

const testNetPremium = (role: string, bank: string) => {
  const currentUser = { id: 'usr_test', username: 'test', role };
  const carType = 'personal_under_9';
  const evModel: string = 'VF3';
  const manufactureYear = 2026;
  const carValue = 350000000;
  const currentYear = 2026;
  const age = currentYear - manufactureYear;
  const isEV = evModel !== 'gas';
  const dbCarType = 'personal';

  let ageBracket = 0;
  
  // Custom deductible default
  const deductible = 500000;
  const profit = 0;

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
      rate: rateVal,
      minPremium: subRule.minPremium ?? null,
      deductible: subRule.deductible ?? null
    };
  };

  const company = db.companies.find(c => c.id === 'BV')!;
  let rateValue = 0;
  let minPremium = 3000000;
  let usedCompanyName = company.name;

  const isUnlimitedCompany = ['BL', 'PVI', 'PJI', 'PJI_STAR'].includes(company.id);
  const isOverAgeLimit = !isUnlimitedCompany && age > 15;

  if (!isOverAgeLimit) {
    const rateInfo = getRateInfo(company.id);
    if (rateInfo) {
      rateValue = rateInfo.rate;
      if (rateInfo.minPremium !== null) {
        minPremium = rateInfo.minPremium;
      } else {
        if (isEV && dbCarType === 'personal' && age > 0) minPremium = 5500000;
      }
    }
  }

  if (!rateValue || rateValue === 0) {
    return { isAvailable: false, reason: 'rateValue is 0 or null' };
  }

  let basePremium = (carValue * rateValue) / 100;
  if (minPremium > 0 && basePremium < minPremium) {
    basePremium = minPremium;
  }

  // Fetch commission
  let commissionRate = 0;
  const targetCarType = isEV ? `${carType}_ev` : carType;

  // Let's find commission for BV
  const commMatch = commissionsData.find(c => c.companyId === 'BV' && c.carType === targetCarType);
  const commData = commMatch ? commMatch.rules : 0.15;

  if (typeof commData === 'number') {
    commissionRate = commData;
  } else if (Array.isArray(commData)) {
    const sortedRules = [...commData].sort((a, b) => {
      if (a.maxVal === null) return 1;
      if (b.maxVal === null) return -1;
      return a.maxVal - b.maxVal;
    });
    const matchRule = sortedRules.find(r => r.maxVal === null || carValue < r.maxVal);
    commissionRate = matchRule ? matchRule.rate : 0.15;
  }

  let bankReferralRate: number | string = 0;
  let netCommissionRate: number | string = 0;
  let discountedPremium: number | string = basePremium;

  let isNoCommission = false;
  let isAskCompany = false;
  let isNoAffiliation = false;

  if (bank !== 'Không vay ngân hàng') {
    const refMatch = db.bankReferrals.find(b => b.companyId === company.id && b.bankName === bank);
    if (refMatch) {
      if (refMatch.rate === 'Hết hoa hồng') {
        isNoCommission = true;
        bankReferralRate = 'Hết hoa hồng';
      } else if (refMatch.rate === '?') {
        isAskCompany = true;
        bankReferralRate = '?';
      } else if (refMatch.rate === 'x') {
        isNoAffiliation = true;
        bankReferralRate = 'x';
      } else {
        bankReferralRate = Number(refMatch.rate) || 0;
      }
    }
  }

  if (isNoCommission) {
    netCommissionRate = 0;
    discountedPremium = basePremium;
  } else if (isAskCompany) {
    netCommissionRate = commissionRate;
    discountedPremium = 'Hỏi lại Tổng CTY';
  } else if (isNoAffiliation) {
    netCommissionRate = 'x';
    discountedPremium = 'Không liên kết';
  } else {
    const numReferralRate = typeof bankReferralRate === 'number' ? bankReferralRate : 0;
    const netComm = commissionRate - numReferralRate;
    netCommissionRate = netComm;
    const profitValue = Number(profit) || 0;
    const calculatedPremium = basePremium - (basePremium / 1.1 * netComm - profitValue);
    discountedPremium = Math.ceil(calculatedPremium / 50000) * 50000;
  }

  return {
    isAvailable: true,
    rateValue,
    basePremium,
    commissionRate,
    bankReferralRate,
    netCommissionRate,
    discountedPremium
  };
};

console.log("Master, Không vay ngân hàng:");
console.log(testNetPremium('master', 'Không vay ngân hàng'));

console.log("\nMaster, TP BANK - VAY MỚI:");
console.log(testNetPremium('master', 'TP BANK - VAY MỚI'));
