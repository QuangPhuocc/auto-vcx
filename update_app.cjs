const fs = require('fs');

let code = fs.readFileSync('src/App.tsx', 'utf8');

// 1. Update RateConfig
code = code.replace(
  /interface RateConfig \{[\s\S]*?\}/,
  `interface RateConfig {
  BM: (value: number, age: AgeBracket, isEV?: boolean, evModel?: string, seats?: number, tonnage?: number) => number;
  PJI: (value: number, age: AgeBracket, isEV?: boolean, evModel?: string, seats?: number, tonnage?: number) => number;
  PJI_STAR: (value: number, age: AgeBracket, isEV?: boolean, evModel?: string, seats?: number, tonnage?: number) => number;
  TAS: (value: number, age: AgeBracket, isEV?: boolean, evModel?: string, seats?: number, tonnage?: number) => number;
  DBV: (value: number, age: AgeBracket, isEV?: boolean, evModel?: string, seats?: number, tonnage?: number) => number;
  PVI: (value: number, age: AgeBracket, isEV?: boolean, evModel?: string, seats?: number, tonnage?: number) => number;
  PTI: (value: number, age: AgeBracket, isEV?: boolean, evModel?: string, seats?: number, tonnage?: number) => number;
  BL: (value: number, age: AgeBracket, isEV?: boolean, evModel?: string, seats?: number, tonnage?: number) => number;
  BV: (value: number, age: AgeBracket, isEV?: boolean, evModel?: string, seats?: number, tonnage?: number) => number;
}`
);

// 2. Update RATES to add van_minivan, internal, specialized
const newRatesStr = `
  van_minivan: {
    BM: (v, a) => [1.21, 1.32, 1.43, 1.54][a],
    PJI: (v, a) => [1.2408, 1.4784, 1.584, 1.7556][a],
    PJI_STAR: (v, a) => [1.20, 1.40, 1.50, 1.70][a],
    TAS: (v, a) => {
      if (v < 400_000_000) return [1.485, 1.62, 1.845, 2.115][a];
      if (v < 600_000_000) return [1.395, 1.503, 1.755, 2.025][a];
      if (v < 800_000_000) return [1.21, 1.35, 1.53, 1.98][a];
      return [1.035, 1.17, 1.305, 1.755][a];
    },
    DBV: (v, a) => {
      if (v <= 500_000_000) return [1.5, 1.6, 1.75, 2.05][a];
      return [1.21, 1.42, 1.65, 1.95][a];
    },
    PVI: (v, a, isEV) => {
      if (v > 900_000_000) return [1.2, 1.3, 1.4, 1.5][a];
      return [2.15, 2.45, 2.7, 3.05][a];
    },
    PTI: (v, a) => {
      if (v < 500_000_000) return [1.7, 1.9, 2.0, 2.15][a];
      return [1.21, 1.32, 1.5, 1.6][a];
    },
    BL: (v, a) => {
      if (v <= 500_000_000) return [1.21, 1.32, 1.45, 1.55][a];
      return [1.21, 1.32, 1.45, 1.55][a];
    },
    BV: (v, a) => 0
  },
  internal: {
    BM: (v, a) => 0,
    PJI: (v, a) => 0,
    PJI_STAR: (v, a) => 0,
    TAS: (v, a) => 0,
    DBV: (v, a) => 0,
    PVI: (v, a) => [1.6, 1.9, 2.15, 2.5][a],
    PTI: (v, a) => 0,
    BL: (v, a) => [1.15, 1.2, 1.5, 1.65][a],
    BV: (v, a) => 0
  },
  specialized: {
    BM: (v, a) => 0,
    PJI: (v, a) => 0,
    PJI_STAR: (v, a) => 0,
    TAS: (v, a) => 0,
    DBV: (v, a) => 0,
    PVI: (v, a) => [1.8, 2.15, 2.4, 2.9][a],
    PTI: (v, a) => 0,
    BL: (v, a) => [1.1, 1.21, 1.33, 1.6][a],
    BV: (v, a) => 0
  },
`;

code = code.replace(/electric_personal: \{/, newRatesStr + '  electric_personal: {');

// 3. Update VEHICLE_OPTIONS
code = code.replace(
  /const VEHICLE_OPTIONS = \[[\s\S]*?\];/,
  `const VEHICLE_OPTIONS = [
  { id: 'personal', name: 'Xe chở người không kinh doanh' },
  { id: 'grab', name: 'Xe Grab / Ứng dụng công nghệ' },
  { id: 'taxi', name: 'Xe Taxi truyền thống' },
  { id: 'commercial_passenger', name: 'Xe chở người kinh doanh khác / Liên tỉnh' },
  { id: 'pickup', name: 'Xe bán tải (Pickup)' },
  { id: 'van_minivan', name: 'Xe Tải Van / Minivan' },
  { id: 'truck_non_commercial', name: 'Xe tải không kinh doanh' },
  { id: 'truck_commercial', name: 'Xe tải kinh doanh' },
  { id: 'truck_refrigerated', name: 'Xe tải đông lạnh' },
  { id: 'tractor', name: 'Xe đầu kéo' },
  { id: 'trailer', name: 'Rơ moóc' },
  { id: 'training', name: 'Xe tập lái' },
  { id: 'internal', name: 'Xe hoạt động nội bộ (Cảng, KCN, Sân bay, Mỏ...)' },
  { id: 'specialized', name: 'Xe chuyên dùng (Cứu thương, chở tiền, xe bồn...)' }
];`
);

// 4. Add state for seats and tonnage
code = code.replace(
  /const \[carValueStr, setCarValueStr\] = useState<string>\('500000000'\);/,
  `const [carValueStr, setCarValueStr] = useState<string>('500000000');
  const [seatCount, setSeatCount] = useState<number>(5);
  const [tonnage, setTonnage] = useState<number>(1);`
);

// 5. Pass seats and tonnage to rate functions
code = code.replace(
  /rate = rateConfig\[company\.id as keyof RateConfig\]\(carValue, ageBracket, isEV, evModel\);/g,
  `rate = rateConfig[company.id as keyof RateConfig](carValue, ageBracket, isEV, evModel, seatCount, tonnage);`
);
code = code.replace(
  /const ratePJI = rateConfig\.PJI\(carValue, ageBracket, isEV\);/g,
  `const ratePJI = rateConfig.PJI(carValue, ageBracket, isEV, evModel, seatCount, tonnage);`
);
code = code.replace(
  /const ratePJIStar = rateConfig\.PJI_STAR\(carValue, ageBracket, isEV\);/g,
  `const ratePJIStar = rateConfig.PJI_STAR(carValue, ageBracket, isEV, evModel, seatCount, tonnage);`
);
code = code.replace(
  /const ratePJI = rateConfig\.PJI\(carValue, ageBracket\);/g,
  `const ratePJI = rateConfig.PJI(carValue, ageBracket, isEV, evModel, seatCount, tonnage);`
);
code = code.replace(
  /const ratePJIStar = rateConfig\.PJI_STAR\(carValue, ageBracket\);/g,
  `const ratePJIStar = rateConfig.PJI_STAR(carValue, ageBracket, isEV, evModel, seatCount, tonnage);`
);
code = code.replace(
  /rate = RATES\['electric_personal'\]\.BM\(carValue, ageBracket\);/g,
  `rate = RATES['electric_personal'].BM(carValue, ageBracket, isEV, evModel, seatCount, tonnage);`
);
code = code.replace(
  /rate = RATES\['electric_taxi'\]\.BM\(carValue, ageBracket\);/g,
  `rate = RATES['electric_taxi'].BM(carValue, ageBracket, isEV, evModel, seatCount, tonnage);`
);
code = code.replace(
  /rate = rateConfig\.BM\(carValue, ageBracket\);/g,
  `rate = rateConfig.BM(carValue, ageBracket, isEV, evModel, seatCount, tonnage);`
);

// 6. Update dependencies of useMemo
code = code.replace(
  /\[carType, manufactureYear, carValue, currentYear, isEV, evModel\]/,
  `[carType, manufactureYear, carValue, currentYear, isEV, evModel, seatCount, tonnage]`
);

// 7. Update "Không nhận bảo hiểm" to "Liên hệ tư vấn viên để có báo giá"
code = code.replace(
  /<p className="text-center font-medium">Không nhận bảo hiểm<br\/>cho độ tuổi\/loại xe này<\/p>/,
  `<p className="text-center font-medium">Liên hệ tư vấn viên<br/>để có báo giá</p>`
);

fs.writeFileSync('src/App.tsx', code);
