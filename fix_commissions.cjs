const fs = require('fs');

const code = `
const baseCommissions = {
    BM: (v: number, a: AgeBracket) => 0.18,
    PJI: (v: number, a: AgeBracket) => 0.17,
    TAS: (v: number, a: AgeBracket) => 0.21,
    DBV: (v: number, a: AgeBracket) => 0.21,
    PVI: (v: number, a: AgeBracket) => {
      if (v < 500_000_000) return 0.11;
      if (v <= 700_000_000) return 0.13;
      if (v <= 1_000_000_000) return 0.15;
      return 0.18;
    },
    PTI: (v: number, a: AgeBracket) => v < 800_000_000 ? 0.15 : 0.18,
    BL: (v: number, a: AgeBracket) => 0.18,
    BV: (v: number, a: AgeBracket) => 0.13
};

const COMMISSIONS: Record<string, Record<string, (v: number, a: AgeBracket) => number>> = {
  personal: baseCommissions,
  grab: baseCommissions,
  taxi: baseCommissions,
  commercial_passenger: baseCommissions,
  tractor: baseCommissions,
  trailer: baseCommissions,
  pickup: baseCommissions,
  van_minivan: baseCommissions,
  truck_non_commercial: baseCommissions,
  truck_commercial: baseCommissions,
  truck_refrigerated: baseCommissions,
  training: baseCommissions,
  internal: baseCommissions,
  specialized: baseCommissions,
  electric_personal: baseCommissions,
  electric_taxi: baseCommissions
};
`;

let appCode = fs.readFileSync('src/App.tsx', 'utf8');
const endIdx = appCode.indexOf('const EV_MODELS = [');

const newAppCode = appCode.substring(0, endIdx) + code + '\n' + appCode.substring(endIdx);
fs.writeFileSync('src/App.tsx', newAppCode);
console.log('App patched successfully');
