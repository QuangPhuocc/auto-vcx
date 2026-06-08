const fs = require('fs');

let code = fs.readFileSync('src/App.tsx', 'utf8');

const minPremiumLogic = `
      let minPremium = 0;
      let usedCompanyName = company.name;

      const isUnlimitedCompany = ['BL', 'PVI', 'PJI', 'PJI_STAR'].includes(company.id);
      const isOverAgeLimit = !isUnlimitedCompany && age > 15;

      if (!isOverAgeLimit) {
        if (company.id === 'BM') {
          minPremium = 4_400_000;
        } else if (company.id === 'TAS') {
          const isTruck = ['truck_non_commercial', 'truck_commercial', 'truck_refrigerated'].includes(carType);
          if (!isTruck) {
            minPremium = 6_000_000;
          }
        } else if (company.id === 'PJI' || company.id === 'PJI_STAR') {
          minPremium = 0;
        } else if (company.id === 'DBV') {
          if (age > 0) {
            minPremium = 6_000_000;
          }
        } else if (company.id === 'PVI') {
          const isEligibleForMinPVI = ['personal', 'grab', 'taxi', 'commercial_passenger', 'pickup', 'van_minivan'].includes(carType) || isEV;
          if (isEligibleForMinPVI && carValue < 500_000_000) {
            minPremium = 5_500_000;
          }
        } else if (company.id === 'PTI') {
          minPremium = 6_500_000;
        } else if (company.id === 'BL') {
          minPremium = 4_500_000;
        } else if (company.id === 'BV') {
          if (isEV && carType === 'personal' && age > 0) {
            minPremium = 5_500_000;
          }
        }
`;

code = code.replace(
  /let minPremium = 0;\s*let usedCompanyName = company\.name;\s*const isUnlimitedCompany = \['BL', 'PVI', 'PJI', 'PJI_STAR'\]\.includes\(company\.id\);\s*const isOverAgeLimit = !isUnlimitedCompany && age > 15;\s*if \(!isOverAgeLimit\) \{\s*if \(company\.id === 'PVI'\) \{\s*minPremium = 5_500_000;\s*\}\s*if \(company\.id === 'BV'\) \{\s*if \(carType === 'personal'\) \{\s*minPremium = 5_500_000;\s*\} else \{\s*minPremium = 1_000_000;\s*\}\s*\}\s*\}/,
  minPremiumLogic
);

fs.writeFileSync('src/App.tsx', code);
