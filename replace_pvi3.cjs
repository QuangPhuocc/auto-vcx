const fs = require('fs');

const pviRates = {
  personal: '[1.7, 2.0, 2.25, 2.6][a]',
  grab: '[2.2, 2.6, 2.9, 3.3][a]', // from c.2 grab
  taxi: '[2.2, 2.6, 2.9, 3.3][a]', // using hack: fallback for taxi without explicit mapping? Actually wait, Taxi usually is separate. But PVI says grab
  commercial_passenger: '[1.95, 2.35, 2.65, 3.05][a]',
  truck_non_commercial: '[1.9, 2.3, 2.6, 3.0][a]',
  truck_commercial: '[1.9, 2.3, 2.6, 3.0][a]',
  truck_refrigerated: '[2.8, 3.2, 3.5, 3.9][a]',
  tractor: '[2.8, 3.2, 3.5, 3.9][a]',
  trailer: '[1.3, 1.7, 2.0, 2.4][a]',
  pickup: '[1.9, 2.2, 2.45, 2.8][a]',
  van_minivan: '[2.15, 2.45, 2.7, 3.05][a]',
  training: '[1.75, 2.05, 2.3, 2.65][a]',
  internal: '[1.6, 1.9, 2.15, 2.5][a]',
  specialized: '[1.8, 2.15, 2.4, 2.9][a]'
};

let content = fs.readFileSync('src/App.tsx', 'utf-8');

// The best way is to split by `  },` at the root object and replace
const keys = Object.keys(pviRates);
for (const key of keys) {
   const val = pviRates[key];
   const r = new RegExp(`(  ${key}: {[^]*?)(PVI: \\(v, a\\) => [^\n]+)`, 'm');
   content = content.replace(r, `$1PVI: (v, a) => ${val},`);
}
fs.writeFileSync('src/App.tsx', content);
