const fs = require('fs');

let code = fs.readFileSync('src/App.tsx', 'utf8');

// 1. Add RateResult type
code = code.replace(
  /type AgeBracket = 0 \| 1 \| 2 \| 3;/,
  `type AgeBracket = 0 | 1 | 2 | 3;\ntype RateResult = number | { display: string; value: number };`
);

// 2. Update RateConfig
code = code.replace(/=> number;/g, `=> RateResult;`);

// 3. Add applyPVIDiscount helper
const helper = `
const applyPVIDiscount = (base: number, v: number, isEV?: boolean): RateResult => {
  if (isEV) return base;
  if (v <= 300_000_000) return base;
  if (v <= 500_000_000) return { display: \`\${base} * 90\`, value: base * 0.9 };
  if (v <= 700_000_000) return { display: \`\${base} * 80\`, value: base * 0.8 };
  return { display: \`\${base} * 65\`, value: base * 0.65 };
};
`;
code = code.replace(/const RATES: Record<string, RateConfig> = \{/, helper + '\nconst RATES: Record<string, RateConfig> = {');

// 4. Update PVI functions in RATES
code = code.replace(
  /PVI: \(v, a, isEV\) => \{\s*if \(v > 900_000_000\) return \[1\.0, 1\.1, 1\.2, 1\.3\]\[a\];\s*const base = \[1\.7, 2\.0, 2\.25, 2\.6\]\[a\];\s*if \(isEV\) return base;\s*if \(v <= 300_000_000\) return base;\s*if \(v <= 500_000_000\) return base \* \(1 - 10 \/ 100\); \/\/ Giảm 10%\s*if \(v <= 700_000_000\) return base \* \(1 - 20 \/ 100\); \/\/ Giảm 20%\s*return base \* \(1 - 35 \/ 100\); \/\/ Giảm 35% cho xe <= 900tr\s*\},/,
  `PVI: (v, a, isEV) => {
      if (v > 900_000_000) return [1.0, 1.1, 1.2, 1.3][a];
      const base = [1.7, 2.0, 2.25, 2.6][a];
      return applyPVIDiscount(base, v, isEV);
    },`
);

code = code.replace(
  /PVI: \(v, a, isEV\) => \{\s*if \(v > 900_000_000\) return \[1\.2, 1\.3, 1\.4, 1\.5\]\[a\];\s*const base = \[1\.9, 2\.2, 2\.45, 2\.8\]\[a\];\s*if \(isEV\) return base;\s*if \(v <= 300_000_000\) return base;\s*if \(v <= 500_000_000\) return base \* \(1 - 10 \/ 100\); \/\/ Giảm 10%\s*if \(v <= 700_000_000\) return base \* \(1 - 20 \/ 100\); \/\/ Giảm 20%\s*return base \* \(1 - 35 \/ 100\); \/\/ Giảm 35% cho xe <= 900tr\s*\},/,
  `PVI: (v, a, isEV) => {
      if (v > 900_000_000) return [1.2, 1.3, 1.4, 1.5][a];
      const base = [1.9, 2.2, 2.45, 2.8][a];
      return applyPVIDiscount(base, v, isEV);
    },`
);

code = code.replace(
  /PVI: \(v, a\) => \{\s*if \(v > 900_000_000\) return \[1\.6, 1\.7, 1\.8, 2\.0\]\[a\];\s*return \[2\.8, 3\.2, 3\.5, 3\.9\]\[a\];\s*\}/g,
  `PVI: (v, a, isEV) => {
      if (v > 900_000_000) return [1.6, 1.7, 1.8, 2.0][a];
      const base = [2.8, 3.2, 3.5, 3.9][a];
      return applyPVIDiscount(base, v, isEV);
    }`
);

code = code.replace(
  /PVI: \(v, a\) => \{\s*if \(v > 900_000_000\) return \[0\.7, 0\.8, 0\.9, 1\.1\]\[a\];\s*return \[1\.3, 1\.7, 2\.0, 2\.4\]\[a\];\s*\}/g,
  `PVI: (v, a, isEV) => {
      if (v > 900_000_000) return [0.7, 0.8, 0.9, 1.1][a];
      const base = [1.3, 1.7, 2.0, 2.4][a];
      return applyPVIDiscount(base, v, isEV);
    }`
);

code = code.replace(
  /PVI: \(v, a, isEV\) => \{\s*if \(v > 900_000_000\) return \[1\.2, 1\.3, 1\.4, 1\.5\]\[a\];\s*return \[2\.15, 2\.45, 2\.7, 3\.05\]\[a\];\s*\}/g,
  `PVI: (v, a, isEV) => {
      if (v > 900_000_000) return [1.2, 1.3, 1.4, 1.5][a];
      const base = [2.15, 2.45, 2.7, 3.05][a];
      return applyPVIDiscount(base, v, isEV);
    }`
);

code = code.replace(
  /PVI: \(v, a\) => \[1\.6, 1\.9, 2\.15, 2\.5\]\[a\]/g,
  `PVI: (v, a, isEV) => {
      const base = [1.6, 1.9, 2.15, 2.5][a];
      return applyPVIDiscount(base, v, isEV);
    }`
);

code = code.replace(
  /PVI: \(v, a\) => \[1\.8, 2\.15, 2\.4, 2\.9\]\[a\]/g,
  `PVI: (v, a, isEV) => {
      const base = [1.8, 2.15, 2.4, 2.9][a];
      return applyPVIDiscount(base, v, isEV);
    }`
);

// 5. Update useMemo logic
code = code.replace(/let rate = 0;/, `let rateResult: RateResult = 0;`);
code = code.replace(/rate = RATES/g, `rateResult = RATES`);
code = code.replace(/rate = rateConfig/g, `rateResult = rateConfig`);
code = code.replace(/rate = ratePJIStar;/g, `rateResult = ratePJIStar;`);
code = code.replace(/rate = ratePJI;/g, `rateResult = ratePJI;`);

code = code.replace(
  /const ratePJI = rateConfig\.PJI\((.*?)\);/g,
  `const ratePJIResult = rateConfig.PJI($1);\n          const ratePJI = typeof ratePJIResult === 'number' ? ratePJIResult : ratePJIResult.value;`
);

code = code.replace(
  /const ratePJIStar = rateConfig\.PJI_STAR\((.*?)\);/g,
  `const ratePJIStarResult = rateConfig.PJI_STAR($1);\n          const ratePJIStar = typeof ratePJIStarResult === 'number' ? ratePJIStarResult : ratePJIStarResult.value;`
);

code = code.replace(
  /if \(\!rate \|\| rate === 0\) \{/,
  `const rateValue = typeof rateResult === 'number' ? rateResult : rateResult.value;
      const displayRate = typeof rateResult === 'number' ? \`\${rateValue}\` : rateResult.display;

      if (!rateValue || rateValue === 0) {`
);

code = code.replace(
  /rate: 0,\n\s*basePremium: 0,/,
  `rate: 0,
          displayRate: '0',
          basePremium: 0,`
);

code = code.replace(/let basePremium = \(carValue \* rate\) \/ 100;/, `let basePremium = (carValue * rateValue) / 100;`);

code = code.replace(
  /rate,\n\s*basePremium,/,
  `rate: rateValue,
        displayRate,
        basePremium,`
);

// 6. Update UI
code = code.replace(
  /<span className=\{\`text-2xl font-bold \$\{quote\.company\.text\}\`\}>\{quote\.rate\}%<\/span>/,
  `<span className={\`text-2xl font-bold \${quote.company.text}\`}>{quote.displayRate}%</span>`
);

fs.writeFileSync('src/App.tsx', code);
