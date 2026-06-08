const fs = require('fs');

let code = fs.readFileSync('src/App.tsx', 'utf8');

// 1. Add COMMISSIONS object
const commissionsObj = `
// TODO: Cập nhật dữ liệu hoa hồng thực tế từ tab hoa hồng
const COMMISSIONS: Record<string, Record<string, (v: number, a: AgeBracket) => number>> = {
  personal: {
    BM: (v, a) => 0.2, PJI: (v, a) => 0.2, TAS: (v, a) => 0.2, DBV: (v, a) => 0.2, PVI: (v, a) => 0.2, PTI: (v, a) => 0.2, BL: (v, a) => 0.2, BV: (v, a) => 0.2
  },
  grab: {
    BM: (v, a) => 0.2, PJI: (v, a) => 0.2, TAS: (v, a) => 0.2, DBV: (v, a) => 0.2, PVI: (v, a) => 0.2, PTI: (v, a) => 0.2, BL: (v, a) => 0.2, BV: (v, a) => 0.2
  },
  taxi: {
    BM: (v, a) => 0.2, PJI: (v, a) => 0.2, TAS: (v, a) => 0.2, DBV: (v, a) => 0.2, PVI: (v, a) => 0.2, PTI: (v, a) => 0.2, BL: (v, a) => 0.2, BV: (v, a) => 0.2
  },
  commercial_passenger: {
    BM: (v, a) => 0.2, PJI: (v, a) => 0.2, TAS: (v, a) => 0.2, DBV: (v, a) => 0.2, PVI: (v, a) => 0.2, PTI: (v, a) => 0.2, BL: (v, a) => 0.2, BV: (v, a) => 0.2
  },
  tractor: {
    BM: (v, a) => 0.2, PJI: (v, a) => 0.2, TAS: (v, a) => 0.2, DBV: (v, a) => 0.2, PVI: (v, a) => 0.2, PTI: (v, a) => 0.2, BL: (v, a) => 0.2, BV: (v, a) => 0.2
  },
  trailer: {
    BM: (v, a) => 0.2, PJI: (v, a) => 0.2, TAS: (v, a) => 0.2, DBV: (v, a) => 0.2, PVI: (v, a) => 0.2, PTI: (v, a) => 0.2, BL: (v, a) => 0.2, BV: (v, a) => 0.2
  },
  pickup: {
    BM: (v, a) => 0.2, PJI: (v, a) => 0.2, TAS: (v, a) => 0.2, DBV: (v, a) => 0.2, PVI: (v, a) => 0.2, PTI: (v, a) => 0.2, BL: (v, a) => 0.2, BV: (v, a) => 0.2
  },
  van_minivan: {
    BM: (v, a) => 0.2, PJI: (v, a) => 0.2, TAS: (v, a) => 0.2, DBV: (v, a) => 0.2, PVI: (v, a) => 0.2, PTI: (v, a) => 0.2, BL: (v, a) => 0.2, BV: (v, a) => 0.2
  },
  truck_non_commercial: {
    BM: (v, a) => 0.2, PJI: (v, a) => 0.2, TAS: (v, a) => 0.2, DBV: (v, a) => 0.2, PVI: (v, a) => 0.2, PTI: (v, a) => 0.2, BL: (v, a) => 0.2, BV: (v, a) => 0.2
  },
  truck_commercial: {
    BM: (v, a) => 0.2, PJI: (v, a) => 0.2, TAS: (v, a) => 0.2, DBV: (v, a) => 0.2, PVI: (v, a) => 0.2, PTI: (v, a) => 0.2, BL: (v, a) => 0.2, BV: (v, a) => 0.2
  },
  truck_refrigerated: {
    BM: (v, a) => 0.2, PJI: (v, a) => 0.2, TAS: (v, a) => 0.2, DBV: (v, a) => 0.2, PVI: (v, a) => 0.2, PTI: (v, a) => 0.2, BL: (v, a) => 0.2, BV: (v, a) => 0.2
  },
  training: {
    BM: (v, a) => 0.2, PJI: (v, a) => 0.2, TAS: (v, a) => 0.2, DBV: (v, a) => 0.2, PVI: (v, a) => 0.2, PTI: (v, a) => 0.2, BL: (v, a) => 0.2, BV: (v, a) => 0.2
  },
  internal: {
    BM: (v, a) => 0.2, PJI: (v, a) => 0.2, TAS: (v, a) => 0.2, DBV: (v, a) => 0.2, PVI: (v, a) => 0.2, PTI: (v, a) => 0.2, BL: (v, a) => 0.2, BV: (v, a) => 0.2
  },
  specialized: {
    BM: (v, a) => 0.2, PJI: (v, a) => 0.2, TAS: (v, a) => 0.2, DBV: (v, a) => 0.2, PVI: (v, a) => 0.2, PTI: (v, a) => 0.2, BL: (v, a) => 0.2, BV: (v, a) => 0.2
  },
  electric_personal: {
    BM: (v, a) => 0.2, PJI: (v, a) => 0.2, TAS: (v, a) => 0.2, DBV: (v, a) => 0.2, PVI: (v, a) => 0.2, PTI: (v, a) => 0.2, BL: (v, a) => 0.2, BV: (v, a) => 0.2
  },
  electric_taxi: {
    BM: (v, a) => 0.2, PJI: (v, a) => 0.2, TAS: (v, a) => 0.2, DBV: (v, a) => 0.2, PVI: (v, a) => 0.2, PTI: (v, a) => 0.2, BL: (v, a) => 0.2, BV: (v, a) => 0.2
  }
};
`;
code = code.replace(/const EV_MODELS = \[/, commissionsObj + '\nconst EV_MODELS = [');

// 2. Add profit state
code = code.replace(
  /const \[seatCount, setSeatCount\] = useState\(''\);/,
  `const [seatCount, setSeatCount] = useState('');\n  const [profit, setProfit] = useState('500000');`
);

// 3. Add profit input to UI
const profitInput = `
          {/* Lợi nhuận */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <span className="bg-slate-100 p-2 rounded-lg"><Car size={20} className="text-slate-600" /></span>
              Lợi nhuận mong muốn
            </h2>
            <div className="relative">
              <input
                type="text"
                value={Number(profit).toLocaleString('vi-VN')}
                onChange={handleCurrencyInput(setProfit)}
                className="w-full pl-4 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all text-lg font-semibold"
                placeholder="Nhập lợi nhuận..."
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 font-medium">VNĐ</span>
            </div>
          </div>
`;
code = code.replace(
  /\{\/\* Thông tin xe \*\/\}/,
  profitInput + '\n\n          {/* Thông tin xe */}'
);

// 4. Update quotes logic to include commission and discounted premium
code = code.replace(
  /isAvailable: true\n\s*\};\n\s*\}\);\n\s*\}, \[carType, manufactureYear, carValue, currentYear, isEV, evModel, seatCount, tonnage\]\);/,
  `isAvailable: true\n      };\n    });\n  }, [carType, manufactureYear, carValue, currentYear, isEV, evModel, seatCount, tonnage, profit]);`
);

code = code.replace(
  /let basePremium = \(carValue \* rateValue\) \/ 100;\n\s*let isMinPremiumApplied = false;/,
  `let basePremium = (carValue * rateValue) / 100;
      let isMinPremiumApplied = false;
      
      let commissionRate = 0;
      if (COMMISSIONS[carType] && COMMISSIONS[carType][company.id]) {
        commissionRate = COMMISSIONS[carType][company.id](carValue, ageBracket);
      } else if (isEV && COMMISSIONS[evCategory] && COMMISSIONS[evCategory][company.id]) {
        commissionRate = COMMISSIONS[evCategory][company.id](carValue, ageBracket);
      }
      
      const profitValue = Number(profit) || 0;
      let discountedPremium = basePremium - (basePremium / 1.1 * commissionRate - profitValue);
      // Làm tròn lên hàng 50.000
      discountedPremium = Math.ceil(discountedPremium / 50000) * 50000;
`
);

code = code.replace(
  /isMinPremiumApplied,\n\s*minPremium,\n\s*isAvailable: true/,
  `isMinPremiumApplied,
        minPremium,
        commissionRate,
        discountedPremium,
        isAvailable: true`
);

// 5. Update UI to show commission and discounted premium
code = code.replace(
  /<div className="flex justify-between items-end pb-4 border-b border-slate-100">\n\s*<span className="text-slate-500 text-sm">Tỉ lệ phí<\/span>\n\s*<span className=\{\`text-2xl font-bold \$\{quote\.company\.text\}\`\}>\{quote\.displayRate\}%<\/span>\n\s*<\/div>/,
  `<div className="flex justify-between items-end pb-4 border-b border-slate-100">
                              <span className="text-slate-500 text-sm">Tỉ lệ phí</span>
                              <span className={\`text-2xl font-bold \${quote.company.text}\`}>{quote.displayRate}%</span>
                            </div>
                            <div className="flex justify-between items-end pb-4 border-b border-slate-100">
                              <span className="text-slate-500 text-sm">Hoa hồng</span>
                              <span className={\`text-lg font-semibold text-slate-700\`}>{(quote.commissionRate * 100).toFixed(1)}%</span>
                            </div>`
);

code = code.replace(
  /\{formatCurrency\(Math\.max\(0, quote\.basePremium - 200000\)\)\}/,
  `{formatCurrency(Math.max(0, quote.discountedPremium))}`
);

fs.writeFileSync('src/App.tsx', code);
