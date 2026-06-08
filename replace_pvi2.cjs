const fs = require('fs');

let content = fs.readFileSync('src/App.tsx', 'utf-8');

const pviRates = {
  personal: '[1.7, 2.0, 2.25, 2.6][a]',
  grab: '[2.2, 2.6, 2.9, 3.3][a]',
  taxi: '[2.2, 2.6, 2.9, 3.3][a]',
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

for (const [key, value] of Object.entries(pviRates)) {
  const categoryRegex = new RegExp(`(${key}:\\s*{[\\s\\S]*?)PVI:\\s*\\(v,\\s*a\\)\\s*=>\\s*(?:{[\\s\\S]*?}\\s*,|\\[[\\s\\S]*?\\]\\[a\\],)`, 'g');
  
  content = content.replace(categoryRegex, `$1PVI: (v, a) => ${value},`);
}
fs.writeFileSync('src/App.tsx', content);
