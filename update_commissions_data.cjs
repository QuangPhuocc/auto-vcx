const fs = require('fs');

let code = fs.readFileSync('src/App.tsx', 'utf8');

const commissionsObj = `
const COMMISSIONS: Record<string, Record<string, (v: number, a: AgeBracket) => number>> = {
  personal: {
    BM: (v, a) => 0.18,
    PJI: (v, a) => 0.17,
    TAS: (v, a) => 0.21,
    DBV: (v, a) => 0.21,
    PVI: (v, a) => {
      if (v < 500_000_000) return 0.11;
      if (v <= 700_000_000) return 0.13;
      if (v <= 1_000_000_000) return 0.15;
      return 0.18;
    },
    PTI: (v, a) => v < 800_000_000 ? 0.15 : 0.18,
    BL: (v, a) => 0.18,
    BV: (v, a) => 0.13
  },
  grab: {
    BM: (v, a) => 0.18, PJI: (v, a) => 0.17, TAS: (v, a) => 0.21, DBV: (v, a) => 0.21,
    PVI: (v, a) => {
      if (v < 500_000_000) return 0.11;
      if (v <= 700_000_000) return 0.13;
      if (v <= 1_000_000_000) return 0.15;
      return 0.18;
    },
    PTI: (v, a) => v < 800_000_000 ? 0.15 : 0.18, BL: (v, a) => 0.18, BV: (v, a) => 0.13
  },
  taxi: {
    BM: (v, a) => 0.18, PJI: (v, a) => 0.17, TAS: (v, a) => 0.21, DBV: (v, a) => 0.21,
    PVI: (v, a) => {
      if (v < 500_000_000) return 0.11;
      if (v <= 700_000_000) return 0.13;
      if (v <= 1_000_000_000) return 0.15;
      return 0.18;
    },
    PTI: (v, a) => v < 800_000_000 ? 0.15 : 0.18, BL: (v, a) => 0.18, BV: (v, a) => 0.13
  },
  commercial_passenger: {
    BM: (v, a) => 0.18, PJI: (v, a) => 0.17, TAS: (v, a) => 0.21, DBV: (v, a) => 0.21,
    PVI: (v, a) => {
      if (v < 500_000_000) return 0.11;
      if (v <= 700_000_000) return 0.13;
      if (v <= 1_000_000_000) return 0.15;
      return 0.18;
    },
    PTI: (v, a) => v < 800_000_000 ? 0.15 : 0.18, BL: (v, a) => 0.18, BV: (v, a) => 0.13
  },
  tractor: {
    BM: (v, a) => 0.18, PJI: (v, a) => 0.17, TAS: (v, a) => 0.21, DBV: (v, a) => 0.21,
    PVI: (v, a) => {
      if (v < 500_000_000) return 0.11;
      if (v <= 700_000_000) return 0.13;
      if (v <= 1_000_000_000) return 0.15;
      return 0.18;
    },
    PTI: (v, a) => v < 800_000_000 ? 0.15 : 0.18, BL: (v, a) => 0.18, BV: (v, a) => 0.13
  },
  trailer: {
    BM: (v, a) => 0.18, PJI: (v, a) => 0.17, TAS: (v, a) => 0.21, DBV: (v, a) => 0.21,
    PVI: (v, a) => {
      if (v < 500_000_000) return 0.11;
      if (v <= 700_000_000) return 0.13;
      if (v <= 1_000_000_000) return 0.15;
      return 0.18;
    },
    PTI: (v, a) => v < 800_000_000 ? 0.15 : 0.18, BL: (v, a) => 0.18, BV: (v, a) => 0.13
  },
  pickup: {
    BM: (v, a) => 0.18, PJI: (v, a) => 0.17, TAS: (v, a) => 0.21, DBV: (v, a) => 0.21,
    PVI: (v, a) => {
      if (v < 500_000_000) return 0.11;
      if (v <= 700_000_000) return 0.13;
      if (v <= 1_000_000_000) return 0.15;
      return 0.18;
    },
    PTI: (v, a) => v < 800_000_000 ? 0.15 : 0.18, BL: (v, a) => 0.18, BV: (v, a) => 0.13
  },
  van_minivan: {
    BM: (v, a) => 0.18, PJI: (v, a) => 0.17, TAS: (v, a) => 0.21, DBV: (v, a) => 0.21,
    PVI: (v, a) => {
      if (v < 500_000_000) return 0.11;
      if (v <= 700_000_000) return 0.13;
      if (v <= 1_000_000_000) return 0.15;
      return 0.18;
    },
    PTI: (v, a) => v < 800_000_000 ? 0.15 : 0.18, BL: (v, a) => 0.18, BV: (v, a) => 0.13
  },
  truck_non_commercial: {
    BM: (v, a) => 0.18, PJI: (v, a) => 0.17, TAS: (v, a) => 0.21, DBV: (v, a) => 0.21,
    PVI: (v, a) => {
      if (v < 500_000_000) return 0.11;
      if (v <= 700_000_000) return 0.13;
      if (v <= 1_000_000_000) return 0.15;
      return 0.18;
    },
    PTI: (v, a) => v < 800_000_000 ? 0.15 : 0.18, BL: (v, a) => 0.18, BV: (v, a) => 0.13
  },
  truck_commercial: {
    BM: (v, a) => 0.18, PJI: (v, a) => 0.17, TAS: (v, a) => 0.21, DBV: (v, a) => 0.21,
    PVI: (v, a) => {
      if (v < 500_000_000) return 0.11;
      if (v <= 700_000_000) return 0.13;
      if (v <= 1_000_000_000) return 0.15;
      return 0.18;
    },
    PTI: (v, a) => v < 800_000_000 ? 0.15 : 0.18, BL: (v, a) => 0.18, BV: (v, a) => 0.13
  },
  truck_refrigerated: {
    BM: (v, a) => 0.18, PJI: (v, a) => 0.17, TAS: (v, a) => 0.21, DBV: (v, a) => 0.21,
    PVI: (v, a) => {
      if (v < 500_000_000) return 0.11;
      if (v <= 700_000_000) return 0.13;
      if (v <= 1_000_000_000) return 0.15;
      return 0.18;
    },
    PTI: (v, a) => v < 800_000_000 ? 0.15 : 0.18, BL: (v, a) => 0.18, BV: (v, a) => 0.13
  },
  training: {
    BM: (v, a) => 0.18, PJI: (v, a) => 0.17, TAS: (v, a) => 0.21, DBV: (v, a) => 0.21,
    PVI: (v, a) => {
      if (v < 500_000_000) return 0.11;
      if (v <= 700_000_000) return 0.13;
      if (v <= 1_000_000_000) return 0.15;
      return 0.18;
    },
    PTI: (v, a) => v < 800_000_000 ? 0.15 : 0.18, BL: (v, a) => 0.18, BV: (v, a) => 0.13
  },
  internal: {
    BM: (v, a) => 0.18, PJI: (v, a) => 0.17, TAS: (v, a) => 0.21, DBV: (v, a) => 0.21,
    PVI: (v, a) => {
      if (v < 500_000_000) return 0.11;
      if (v <= 700_000_000) return 0.13;
      if (v <= 1_000_000_000) return 0.15;
      return 0.18;
    },
    PTI: (v, a) => v < 800_000_000 ? 0.15 : 0.18, BL: (v, a) => 0.18, BV: (v, a) => 0.13
  },
  specialized: {
    BM: (v, a) => 0.18, PJI: (v, a) => 0.17, TAS: (v, a) => 0.21, DBV: (v, a) => 0.21,
    PVI: (v, a) => {
      if (v < 500_000_000) return 0.11;
      if (v <= 700_000_000) return 0.13;
      if (v <= 1_000_000_000) return 0.15;
      return 0.18;
    },
    PTI: (v, a) => v < 800_000_000 ? 0.15 : 0.18, BL: (v, a) => 0.18, BV: (v, a) => 0.13
  },
  electric_personal: {
    BM: (v, a) => 0.18, PJI: (v, a) => 0.17, TAS: (v, a) => 0.21, DBV: (v, a) => 0.21,
    PVI: (v, a) => {
      if (v < 500_000_000) return 0.11;
      if (v <= 700_000_000) return 0.13;
      if (v <= 1_000_000_000) return 0.15;
      return 0.18;
    },
    PTI: (v, a) => v < 800_000_000 ? 0.15 : 0.18, BL: (v, a) => 0.18, BV: (v, a) => 0.13
  },
  electric_taxi: {
    BM: (v, a) => 0.18, PJI: (v, a) => 0.17, TAS: (v, a) => 0.21, DBV: (v, a) => 0.21,
    PVI: (v, a) => {
      if (v < 500_000_000) return 0.11;
      if (v <= 700_000_000) return 0.13;
      if (v <= 1_000_000_000) return 0.15;
      return 0.18;
    },
    PTI: (v, a) => v < 800_000_000 ? 0.15 : 0.18, BL: (v, a) => 0.18, BV: (v, a) => 0.13
  }
};
`;

code = code.replace(/\/\/ TODO: Cập nhật dữ liệu hoa hồng thực tế từ tab hoa hồng\nconst COMMISSIONS: Record<string, Record<string, \(v: number, a: AgeBracket\) => number>> = \{[\s\S]*?\n\};\n/, commissionsObj);

fs.writeFileSync('src/App.tsx', code);
