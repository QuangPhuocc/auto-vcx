import { readDb, writeDb, RateRule, CommissionRule, DbSchema } from './db';

export const seedData = () => {
  const db = readDb();
  
  // Only seed if rates and commissions are empty
  if (db.rates.length > 0 && db.commissions.length > 0) {
    console.log('Database already has seeded rates and commissions.');
    return;
  }

  const rates: RateRule[] = [];
  const commissions: CommissionRule[] = [];

  // Seed commissions for all detailed vehicle types from db.vehicles (plus the two EV virtual categories)
  const allVehicleTypes = [
    ...db.vehicles.map(v => v.id),
    'personal_under_9_ev',
    'personal_over_9_ev'
  ];

  allVehicleTypes.forEach(vehicle => {
    // 1. BM (Bảo Minh): 18%
    commissions.push({
      id: `${vehicle}_BM`,
      carType: vehicle,
      companyId: 'BM',
      rules: [{ maxVal: null, rate: 0.18 }]
    });

    // 2. TASCO (TAS): 21%
    commissions.push({
      id: `${vehicle}_TAS`,
      carType: vehicle,
      companyId: 'TAS',
      rules: [{ maxVal: null, rate: 0.21 }]
    });

    // 3. DBV:
    // Taxi: 16%
    // grab, commercial_under_9, self_drive: 18%
    // Others: 21%
    let dbvRate = 0.21;
    if (vehicle === 'taxi') {
      dbvRate = 0.16;
    } else if (['grab', 'commercial_under_9', 'self_drive'].includes(vehicle)) {
      dbvRate = 0.18;
    }
    commissions.push({
      id: `${vehicle}_DBV`,
      carType: vehicle,
      companyId: 'DBV',
      rules: [{ maxVal: null, rate: dbvRate }]
    });

    // 4. Bảo Long (BL): 18%
    commissions.push({
      id: `${vehicle}_BL`,
      carType: vehicle,
      companyId: 'BL',
      rules: [{ maxVal: null, rate: 0.18 }]
    });

    // 5. Liberty (LB): 14%
    commissions.push({
      id: `${vehicle}_LB`,
      carType: vehicle,
      companyId: 'LB',
      rules: [{ maxVal: null, rate: 0.14 }]
    });

    // 6. PJICO (PJI):
    // GTX < 700TR: 15%
    // GTX >= 700TR: 16%
    commissions.push({
      id: `${vehicle}_PJI`,
      carType: vehicle,
      companyId: 'PJI',
      rules: [
        { maxVal: 700000000, rate: 0.15 },
        { maxVal: null, rate: 0.16 }
      ]
    });

    // 7. PJICO* (PJI_STAR):
    // GTX < 600TR: 12%
    // GTX 600TR - 800TR: 14%
    // GTX > 800TR: 15%
    commissions.push({
      id: `${vehicle}_PJI_STAR`,
      carType: vehicle,
      companyId: 'PJI_STAR',
      rules: [
        { maxVal: 600000000, rate: 0.12 },
        { maxVal: 800000000, rate: 0.14 },
        { maxVal: null, rate: 0.15 }
      ]
    });

    // 8. PVI:
    // GTX < 500TR: 11%
    // GTX 500-700TR: 13%
    // GTX 701-1 tỷ (i.e. > 700M and <= 1B): 15%
    // GTX > 1 tỷ: 17.5%
    commissions.push({
      id: `${vehicle}_PVI`,
      carType: vehicle,
      companyId: 'PVI',
      rules: [
        { maxVal: 500000000, rate: 0.11 },
        { maxVal: 700000000, rate: 0.13 },
        { maxVal: 1000000000, rate: 0.15 },
        { maxVal: null, rate: 0.175 }
      ]
    });

    // 9. MIC:
    // Electric personal non-commercial (personal_under_9_ev, personal_over_9_ev):
    // <700M: 6%, >=700M: 7%
    // Others: <700M: 14%, >=700M: 15%
    let micRules = [
      { maxVal: 700000000, rate: 0.14 },
      { maxVal: null, rate: 0.15 }
    ];
    if (vehicle === 'personal_under_9_ev' || vehicle === 'personal_over_9_ev') {
      micRules = [
        { maxVal: 700000000, rate: 0.06 },
        { maxVal: null, rate: 0.07 }
      ];
    }
    commissions.push({
      id: `${vehicle}_MIC`,
      carType: vehicle,
      companyId: 'MIC',
      rules: micRules
    });

    // 10. PTI:
    // GTX < 800TR: 15%
    // GTX >= 800TR: 18%
    commissions.push({
      id: `${vehicle}_PTI`,
      carType: vehicle,
      companyId: 'PTI',
      rules: [
        { maxVal: 800000000, rate: 0.15 },
        { maxVal: null, rate: 0.18 }
      ]
    });

    // 11. VASS (VS): 17%
    commissions.push({
      id: `${vehicle}_VS`,
      carType: vehicle,
      companyId: 'VS',
      rules: [{ maxVal: null, rate: 0.17 }]
    });

    // 12. BV (Bảo Việt) - 13%
    commissions.push({
      id: `${vehicle}_BV`,
      carType: vehicle,
      companyId: 'BV',
      rules: [{ maxVal: null, rate: 0.13 }]
    });
  });

  // Helper to generate a rate rule
  const createRate = (carType: string, companyId: string, ratesArray: [number, number, number, number] | Array<{ maxVal: number | null, rates: [number, number, number, number] }>, isEV = false, evModel: string | null = 'Mọi dòng xe'): RateRule => {
    const rulesList = Array.isArray(ratesArray[0]) || typeof ratesArray[0] === 'object' 
      ? (ratesArray as Array<{ maxVal: number | null, rates: [number, number, number, number] }>)
      : [{ maxVal: null, rates: ratesArray as [number, number, number, number] }];
      
    const suffix = isEV && evModel && evModel !== 'Mọi dòng xe' ? `_${evModel}` : '';
    return {
      id: `${carType}_${companyId}${isEV ? '_ev' : ''}${suffix}`,
      carType,
      companyId,
      isEV,
      evModel: evModel || 'Mọi dòng xe',
      rules: rulesList
    };
  };

  // --- Seed Rates ---
  
  // 1. Personal (Gas & EV defaults)
  rates.push(createRate('personal', 'BM', [0.99, 1.1, 1.21, 1.32]));
  rates.push(createRate('personal', 'PJI', [
    { maxVal: 400000000, rates: [1.5895, 1.9074, 1.9916, 2.1692] },
    { maxVal: 600000000, rates: [1.408, 1.6005, 1.6665, 1.815] },
    { maxVal: 800000000, rates: [1.155, 1.3085, 1.38, 1.5587] },
    { maxVal: null, rates: [1.001, 1.1726, 1.2656, 1.43] }
  ]));
  rates.push(createRate('personal', 'PJI_STAR', [
    { maxVal: 500000000, rates: [1.15, 1.40, 1.68, 2.0] },
    { maxVal: 700000000, rates: [1.10, 1.20, 1.30, 1.40] },
    { maxVal: null, rates: [0.99, 1.10, 1.20, 1.40] }
  ]));
  rates.push(createRate('personal', 'TAS', [
    { maxVal: 400000000, rates: [1.485, 1.62, 1.845, 2.115] },
    { maxVal: 500000000, rates: [1.395, 1.503, 1.755, 2.025] },
    { maxVal: 600000000, rates: [1.305, 1.395, 1.755, 2.025] },
    { maxVal: 700000000, rates: [1.17, 1.215, 1.53, 1.845] },
    { maxVal: 800000000, rates: [1.125, 1.215, 1.485, 1.71] },
    { maxVal: null, rates: [0.99, 1.098, 1.26, 1.575] }
  ]));
  rates.push(createRate('personal', 'DBV', [
    { maxVal: 400000000, rates: [1.55, 1.8, 2.1, 2.6] },
    { maxVal: 600000000, rates: [1.4, 1.5, 1.65, 1.95] },
    { maxVal: 800000000, rates: [1.25, 1.35, 1.5, 1.8] },
    { maxVal: null, rates: [1, 1.1, 1.25, 1.6] }
  ]));
  // PVI has discount logic applied to base: [1.7, 2.0, 2.25, 2.6]
  rates.push(createRate('personal', 'PVI', [
    { maxVal: 300000000, rates: [1.7, 2.0, 2.25, 2.6] },
    { maxVal: 500000000, rates: [1.53, 1.8, 2.025, 2.34] },
    { maxVal: 700000000, rates: [1.36, 1.6, 1.8, 2.08] },
    { maxVal: 900000000, rates: [1.105, 1.3, 1.4625, 1.69] },
    { maxVal: null, rates: [1.0, 1.1, 1.2, 1.3] }
  ]));
  rates.push(createRate('personal', 'PVI', [1.7, 2.0, 2.25, 2.6], true)); // EV PVI is flat base
  rates.push(createRate('personal', 'PTI', [
    { maxVal: 400000000, rates: [1.8, 1.9, 2.0, 2.1] },
    { maxVal: 600000000, rates: [1.3, 1.4, 1.7, 1.9] },
    { maxVal: 800000000, rates: [1.1, 1.3, 1.5, 1.7] },
    { maxVal: 1000000000, rates: [1.0, 1.1, 1.21, 1.32] },
    { maxVal: 1500000000, rates: [1.0, 1.1, 1.21, 1.0] },
    { maxVal: 3000000000, rates: [0, 0, 0, 1.1] },
    { maxVal: null, rates: [0, 0, 0, 1.0] }
  ]));
  rates.push(createRate('personal', 'BL', [
    { maxVal: 500000000, rates: [1.25, 1.32, 1.47, 1.62] },
    { maxVal: null, rates: [1.2, 1.27, 1.3, 1.4] }
  ]));
  rates.push(createRate('personal', 'BL', [
    { maxVal: 500000000, rates: [1.8, 0, 0, 0] },
    { maxVal: null, rates: [1.35, 0, 0, 0] }
  ], true)); // BL EV
  rates.push(createRate('personal', 'BV', [
    { maxVal: null, rates: [1.35, 1.47, 0, 0] }
  ], true, 'VF9'));
  rates.push(createRate('personal', 'BV', [
    { maxVal: null, rates: [1.45, 1.57, 0, 0] }
  ], true, 'VF8'));
  rates.push(createRate('personal', 'BV', [
    { maxVal: null, rates: [1.45, 1.57, 0, 0] }
  ], true, 'VFe34'));
  rates.push(createRate('personal', 'BV', [
    { maxVal: null, rates: [1.45, 1.57, 0, 0] }
  ], true, 'VF6'));
  rates.push(createRate('personal', 'BV', [
    { maxVal: null, rates: [1.45, 1.57, 0, 0] }
  ], true, 'VF7'));
  rates.push(createRate('personal', 'BV', [
    { maxVal: null, rates: [1.5, 1.62, 0, 0] }
  ], true, 'VF5'));
  rates.push(createRate('personal', 'BV', [
    { maxVal: null, rates: [1.95, 2.07, 0, 0] }
  ], true, 'VF3'));
  rates.push(createRate('personal', 'MIC', [
    { maxVal: 400000000, rates: [1.65, 1.815, 2.09, 2.53] },
    { maxVal: 600000000, rates: [1.5, 1.65, 1.9, 2.3] },
    { maxVal: 800000000, rates: [1.35, 1.5, 1.8, 2.1] },
    { maxVal: 1500000000, rates: [1.1, 1.3, 1.55, 1.85] },
    { maxVal: null, rates: [1.05, 1.25, 1.51, 1.82] }
  ]));

  // 2. Grab (Gas & EV)
  rates.push(createRate('grab', 'BM', [
    { maxVal: 500000000, rates: [1.2782, 1.3893, 1.7831, 1.903] },
    { maxVal: null, rates: [1.21, 1.32, 1.43, 1.54] }
  ]));
  rates.push(createRate('grab', 'PJI', [
    { maxVal: 400000000, rates: [1.9168, 2.3001, 2.5058, 0] },
    { maxVal: 600000000, rates: [1.8233, 2.1973, 2.3936, 0] },
    { maxVal: 800000000, rates: [1.7298, 2.0944, 2.2814, 0] },
    { maxVal: null, rates: [1.452, 1.7776, 1.9272, 0] }
  ]));
  rates.push(createRate('grab', 'PJI_STAR', [
    { maxVal: 500000000, rates: [1.75, 1.80, 2.25, 0] },
    { maxVal: 700000000, rates: [1.65, 1.82, 2.00, 0] },
    { maxVal: null, rates: [1.40, 1.70, 1.95, 0] }
  ]));
  rates.push(createRate('grab', 'TAS', [
    { maxVal: 400000000, rates: [1.845, 2.025, 2.43, 2.925] },
    { maxVal: 600000000, rates: [1.755, 1.935, 2.205, 2.7] },
    { maxVal: 800000000, rates: [1.62, 1.8, 2.07, 2.52] },
    { maxVal: null, rates: [1.395, 1.575, 1.845, 2.025] }
  ]));
  rates.push(createRate('grab', 'DBV', [
    { maxVal: 400000000, rates: [1.65, 1.9, 2.2, 0] },
    { maxVal: 600000000, rates: [1.5, 1.6, 1.75, 0] },
    { maxVal: 800000000, rates: [1.35, 1.45, 1.6, 0] },
    { maxVal: null, rates: [1.0, 2.0, 1.35, 0] } // BV grab code had a typo `[1, 2, 1.35, 0]` in source we preserve it
  ]));
  rates.push(createRate('grab', 'PVI', [2.2, 2.6, 2.9, 3.3]));
  rates.push(createRate('grab', 'PTI', [
    { maxVal: 500000000, rates: [2.1, 2.2, 2.4, 0] },
    { maxVal: null, rates: [1.9, 2.0, 2.1, 0] }
  ]));
  rates.push(createRate('grab', 'BL', [
    { maxVal: 500000000, rates: [1.87, 2.2, 2.34, 2.55] },
    { maxVal: null, rates: [1.8, 2.1, 2.3, 2.5] }
  ]));
  rates.push(createRate('grab', 'BL', [
    { maxVal: 500000000, rates: [2.95, 0, 0, 0] },
    { maxVal: null, rates: [2.5, 0, 0, 0] }
  ], true)); // BL EV Grab
  rates.push(createRate('grab', 'BV', [
    { maxVal: null, rates: [3.63, 3.83, 0, 0] }
  ], true, 'VF3'));
  ['VFe34', 'VF5', 'VF6', 'VF7', 'VF8', 'VF9'].forEach(model => {
    rates.push(createRate('grab', 'BV', [
      { maxVal: null, rates: [2.5, 2.7, 0, 0] }
    ], true, model));
  });
  rates.push(createRate('grab', 'MIC', [
    { maxVal: 400000000, rates: [2.6, 2.95, 0, 0] },
    { maxVal: null, rates: [2.5, 2.85, 3.25, 3.7] }
  ]));

  // 3. Taxi
  rates.push(createRate('taxi', 'BM', [
    { maxVal: 500000000, rates: [2.1296, 2.2627, 2.3958, 2.5289] },
    { maxVal: null, rates: [1.76, 1.87, 2.98, 2.09] }
  ]));
  rates.push(createRate('taxi', 'PJI', [
    { maxVal: 800000000, rates: [2.2275, 2.5245, 2.6318, 0] },
    { maxVal: null, rates: [2.1406, 2.4178, 2.288, 0] }
  ]));
  rates.push(createRate('taxi', 'PJI_STAR', [0, 0, 0, 0]));
  rates.push(createRate('taxi', 'TAS', [2.97, 3.285, 3.69, 4.32]));
  rates.push(createRate('taxi', 'DBV', [2.5, 2.78, 3, 0]));
  rates.push(createRate('taxi', 'PVI', [2.2, 2.6, 2.9, 3.3]));
  rates.push(createRate('taxi', 'PTI', [
    { maxVal: 500000000, rates: [2.5, 2.86, 2.95, 0] },
    { maxVal: null, rates: [1.9, 2.2, 2.3, 0] }
  ]));
  rates.push(createRate('taxi', 'BL', [
    { maxVal: 500000000, rates: [1.87, 2.2, 2.34, 2.55] },
    { maxVal: null, rates: [1.8, 2.1, 2.3, 2.5] }
  ]));
  rates.push(createRate('taxi', 'BL', [
    { maxVal: 500000000, rates: [2.95, 0, 0, 0] },
    { maxVal: null, rates: [2.5, 0, 0, 0] }
  ], true)); // BL EV Taxi
  rates.push(createRate('taxi', 'BV', [
    { maxVal: null, rates: [3.3, 3.5, 0, 0] }
  ], true, 'VF3'));
  ['VFe34', 'VF5', 'VF6', 'VF7', 'VF8', 'VF9'].forEach(model => {
    rates.push(createRate('taxi', 'BV', [
      { maxVal: null, rates: [1.85, 2.05, 0, 0] }
    ], true, model));
  });
  rates.push(createRate('taxi', 'MIC', [2.5, 2.85, 3.25, 3.7]));

  // 4. Commercial passenger
  rates.push(createRate('commercial_passenger', 'BM', [1.32, 1.43, 1.54, 1.65]));
  rates.push(createRate('commercial_passenger', 'PJI', [
    { maxVal: 400000000, rates: [1.716, 2.0064, 2.0944, 2.3056] },
    { maxVal: 600000000, rates: [1.628, 1.9096, 1.9976, 2.2176] },
    { maxVal: 800000000, rates: [1.5048, 1.8216, 1.9976, 2.2176] },
    { maxVal: null, rates: [1.452, 1.7688, 1.9008, 2.1208] }
  ]));
  rates.push(createRate('commercial_passenger', 'PJI_STAR', [
    { maxVal: 500000000, rates: [1.35, 1.55, 1.70, 2.25] },
    { maxVal: 700000000, rates: [1.25, 1.40, 1.50, 1.80] },
    { maxVal: null, rates: [1.20, 1.28, 1.40, 2.00] }
  ]));
  rates.push(createRate('commercial_passenger', 'TAS', [1.152, 1.26, 1.485, 1.8]));
  rates.push(createRate('commercial_passenger', 'DBV', [1.35, 1.5, 1.8, 0]));
  rates.push(createRate('commercial_passenger', 'PVI', [1.95, 2.35, 2.65, 3.05]));
  rates.push(createRate('commercial_passenger', 'PTI', [
    { maxVal: 500000000, rates: [2.5, 2.86, 2.95, 0] },
    { maxVal: null, rates: [1.9, 2.2, 2.3, 0] }
  ]));
  rates.push(createRate('commercial_passenger', 'BL', [
    { maxVal: 500000000, rates: [1.5, 1.6, 1.7, 1.87] },
    { maxVal: null, rates: [1.4, 1.5, 1.6, 1.7] }
  ]));
  rates.push(createRate('commercial_passenger', 'BL', [
    { maxVal: 500000000, rates: [2.5, 0, 0, 0] },
    { maxVal: null, rates: [1.7, 0, 0, 0] }
  ], true)); // BL EV Commercial Passenger
  rates.push(createRate('commercial_passenger', 'BV', [
    { maxVal: null, rates: [2.68, 2.88, 0, 0] }
  ], true, 'VF3'));
  ['VFe34', 'VF5', 'VF6', 'VF7', 'VF8', 'VF9'].forEach(model => {
    rates.push(createRate('commercial_passenger', 'BV', [
      { maxVal: null, rates: [1.75, 1.95, 0, 0] }
    ], true, model));
  });
  rates.push(createRate('commercial_passenger', 'MIC', [1.65, 1.95, 2.25, 2.7]));

  // 5. Truck non-commercial
  rates.push(createRate('truck_non_commercial', 'BM', [0.99, 1.1, 1.21, 1.32]));
  rates.push(createRate('truck_non_commercial', 'PJI', [1.0285, 1.2584, 1.3613, 1.48225]));
  rates.push(createRate('truck_non_commercial', 'PJI_STAR', [0, 0, 0, 0]));
  rates.push(createRate('truck_non_commercial', 'TAS', [1.0, 1.125, 1.305, 1.575]));
  rates.push(createRate('truck_non_commercial', 'DBV', [1.1, 1.23, 1.35, 1.5]));
  rates.push(createRate('truck_non_commercial', 'PVI', [1.9, 2.3, 2.6, 3.0]));
  rates.push(createRate('truck_non_commercial', 'PTI', [1.21, 1.32, 1.43, 1.54]));
  rates.push(createRate('truck_non_commercial', 'BL', [
    { maxVal: 500000000, rates: [1.1, 1.21, 1.33, 1.6] },
    { maxVal: null, rates: [1.1, 1.21, 1.3, 1.6] }
  ]));
  rates.push(createRate('truck_non_commercial', 'BV', [0, 0, 0, 0]));
  rates.push(createRate('truck_non_commercial', 'MIC', [1.25, 1.55, 1.85, 2.2]));

  // 6. Truck commercial
  rates.push(createRate('truck_commercial', 'BM', [1.21, 1.32, 1.43, 1.54]));
  rates.push(createRate('truck_commercial', 'PJI', [1.034, 1.232, 1.3255, 1.463]));
  rates.push(createRate('truck_commercial', 'PJI_STAR', [0, 0, 0, 0]));
  rates.push(createRate('truck_commercial', 'TAS', [1.21, 1.32, 1.44, 1.665]));
  rates.push(createRate('truck_commercial', 'DBV', [1.21, 1.32, 1.43, 1.54]));
  rates.push(createRate('truck_commercial', 'PVI', [1.9, 2.3, 2.6, 3.0]));
  rates.push(createRate('truck_commercial', 'PTI', [1.21, 1.32, 1.43, 1.54]));
  rates.push(createRate('truck_commercial', 'BL', [
    { maxVal: 500000000, rates: [1.1, 1.21, 1.33, 1.6] },
    { maxVal: null, rates: [1.1, 1.21, 1.3, 1.6] }
  ]));
  rates.push(createRate('truck_commercial', 'BV', [0, 0, 0, 0]));
  rates.push(createRate('truck_commercial', 'MIC', [1.35, 1.65, 1.95, 2.3]));

  // 7. Truck refrigerated
  rates.push(createRate('truck_refrigerated', 'BM', [1.65, 1.76, 1.87, 2.09]));
  rates.push(createRate('truck_refrigerated', 'PJI', [1.386, 1.5895, 1.7875, 1.9745]));
  rates.push(createRate('truck_refrigerated', 'PJI_STAR', [0, 0, 0, 0]));
  rates.push(createRate('truck_refrigerated', 'TAS', [1.65, 1.76, 1.935, 2.25]));
  rates.push(createRate('truck_refrigerated', 'DBV', [1.65, 1.76, 1.87, 2.3]));
  rates.push(createRate('truck_refrigerated', 'PVI', [2.8, 3.2, 3.5, 3.9]));
  rates.push(createRate('truck_refrigerated', 'PTI', [0, 0, 0, 0]));
  rates.push(createRate('truck_refrigerated', 'BL', [1.38, 1.55, 1.65, 1.87]));
  rates.push(createRate('truck_refrigerated', 'BV', [0, 0, 0, 0]));
  rates.push(createRate('truck_refrigerated', 'MIC', [1.75, 2.05, 2.4, 2.9]));

  // 8. Tractor
  rates.push(createRate('tractor', 'BM', [1.65, 1.76, 1.87, 2.09]));
  rates.push(createRate('tractor', 'PJI', [1.386, 1.5895, 1.702, 1.903]));
  rates.push(createRate('tractor', 'PJI_STAR', [0, 0, 0, 0]));
  rates.push(createRate('tractor', 'TAS', [1.65, 1.76, 1.935, 2.25]));
  rates.push(createRate('tractor', 'DBV', [1.65, 1.76, 1.87, 2.3]));
  rates.push(createRate('tractor', 'PVI', [2.8, 3.2, 3.5, 3.9]));
  rates.push(createRate('tractor', 'PTI', [1.65, 1.76, 1.87, 2.25]));
  rates.push(createRate('tractor', 'BL', [1.65, 1.76, 1.87, 2.1]));
  rates.push(createRate('tractor', 'BV', [0, 0, 0, 0]));
  rates.push(createRate('tractor', 'MIC', [1.75, 2.05, 2.4, 2.9]));

  // 9. Trailer
  rates.push(createRate('trailer', 'BM', [0.66, 0.77, 0.88, 1.1]));
  rates.push(createRate('trailer', 'PJI', [0.605, 0.803, 0.891, 1.1055]));
  rates.push(createRate('trailer', 'PJI_STAR', [0, 0, 0, 0]));
  rates.push(createRate('trailer', 'TAS', [0.66, 0.77, 0.9, 1.17]));
  rates.push(createRate('trailer', 'DBV', [0.66, 0.77, 0.88, 1.3]));
  rates.push(createRate('trailer', 'PVI', [1.3, 1.7, 2.0, 2.4]));
  rates.push(createRate('trailer', 'PTI', [0, 0, 0, 0]));
  rates.push(createRate('trailer', 'BL', [0.66, 0.77, 0.88, 1.1]));
  rates.push(createRate('trailer', 'BV', [0, 0, 0, 0]));
  rates.push(createRate('trailer', 'MIC', [0.8, 1.15, 1.55, 1.9]));

  // 10. Pickup
  rates.push(createRate('pickup', 'BM', [1.21, 1.32, 1.43, 1.54]));
  rates.push(createRate('pickup', 'PJI', [1.2408, 1.4784, 1.584, 1.7556]));
  rates.push(createRate('pickup', 'PJI_STAR', [1.20, 1.40, 1.50, 1.70]));
  rates.push(createRate('pickup', 'TAS', [
    { maxVal: 400000000, rates: [1.485, 1.62, 1.845, 2.115] },
    { maxVal: 600000000, rates: [1.395, 1.503, 1.755, 2.025] },
    { maxVal: 800000000, rates: [1.21, 1.35, 1.53, 1.98] },
    { maxVal: null, rates: [1.035, 1.17, 1.305, 1.755] }
  ]));
  rates.push(createRate('pickup', 'DBV', [
    { maxVal: 500000000, rates: [1.5, 1.6, 1.75, 2.05] },
    { maxVal: null, rates: [1.21, 1.42, 1.65, 1.95] }
  ]));
  rates.push(createRate('pickup', 'PVI', [
    { maxVal: 300000000, rates: [1.9, 2.2, 2.45, 2.8] },
    { maxVal: 500000000, rates: [1.71, 1.98, 2.205, 2.52] },
    { maxVal: 700000000, rates: [1.52, 1.76, 1.96, 2.24] },
    { maxVal: 900000000, rates: [1.235, 1.43, 1.5925, 1.82] },
    { maxVal: null, rates: [1.2, 1.3, 1.4, 1.5] }
  ]));
  rates.push(createRate('pickup', 'PVI', [1.9, 2.2, 2.45, 2.8], true)); // EV
  rates.push(createRate('pickup', 'PTI', [
    { maxVal: 500000000, rates: [1.7, 1.9, 2.0, 2.15] },
    { maxVal: null, rates: [1.21, 1.32, 1.5, 1.6] }
  ]));
  rates.push(createRate('pickup', 'BL', [1.21, 1.32, 1.45, 1.55]));
  rates.push(createRate('pickup', 'BV', [0, 0, 0, 0]));
  rates.push(createRate('pickup', 'MIC', [
    { maxVal: 400000000, rates: [1.55, 1.8, 2.05, 0] },
    { maxVal: 800000000, rates: [1.45, 1.7, 1.95, 2.35] },
    { maxVal: null, rates: [1.35, 1.55, 1.8, 2.1] }
  ]));

  // 11. Van/Minivan
  rates.push(createRate('van_minivan', 'BM', [1.21, 1.32, 1.43, 1.54]));
  rates.push(createRate('van_minivan', 'PJI', [1.2408, 1.4784, 1.584, 1.7556]));
  rates.push(createRate('van_minivan', 'PJI_STAR', [1.20, 1.40, 1.50, 1.70]));
  rates.push(createRate('van_minivan', 'TAS', [
    { maxVal: 400000000, rates: [1.485, 1.62, 1.845, 2.115] },
    { maxVal: 600000000, rates: [1.395, 1.503, 1.755, 2.025] },
    { maxVal: 800000000, rates: [1.21, 1.35, 1.53, 1.98] },
    { maxVal: null, rates: [1.035, 1.17, 1.305, 1.755] }
  ]));
  rates.push(createRate('van_minivan', 'DBV', [
    { maxVal: 500000000, rates: [1.5, 1.6, 1.75, 2.05] },
    { maxVal: null, rates: [1.21, 1.42, 1.65, 1.95] }
  ]));
  rates.push(createRate('van_minivan', 'PVI', [
    { maxVal: 900000000, rates: [2.15, 2.45, 2.7, 3.05] },
    { maxVal: null, rates: [1.2, 1.3, 1.4, 1.5] }
  ]));
  rates.push(createRate('van_minivan', 'PTI', [
    { maxVal: 500000000, rates: [1.7, 1.9, 2.0, 2.15] },
    { maxVal: null, rates: [1.21, 1.32, 1.5, 1.6] }
  ]));
  rates.push(createRate('van_minivan', 'BL', [1.21, 1.32, 1.45, 1.55]));
  rates.push(createRate('van_minivan', 'BV', [0, 0, 0, 0]));
  rates.push(createRate('van_minivan', 'MIC', [1.35, 1.55, 1.8, 2.2]));

  // 12. Training
  rates.push(createRate('training', 'BM', [0.99, 1.1, 1.21, 1.32]));
  rates.push(createRate('training', 'PJI', [1.32, 1.6005, 1.7325, 1.9305]));
  rates.push(createRate('training', 'PJI_STAR', [0, 0, 0, 0]));
  rates.push(createRate('training', 'TAS', [0, 0, 0, 0]));
  rates.push(createRate('training', 'DBV', [0, 0, 0, 0]));
  rates.push(createRate('training', 'PVI', [1.75, 2.05, 2.3, 2.65]));
  rates.push(createRate('training', 'PTI', [0, 0, 0, 0]));
  rates.push(createRate('training', 'BL', [1.2, 1.25, 1.32, 1.4]));
  rates.push(createRate('training', 'BV', [0, 0, 0, 0]));
  rates.push(createRate('training', 'MIC', [
    { maxVal: 400000000, rates: [1.65, 1.815, 2.09, 2.53] },
    { maxVal: 600000000, rates: [1.5, 1.65, 1.9, 2.3] },
    { maxVal: 800000000, rates: [1.35, 1.5, 1.8, 2.1] },
    { maxVal: 1500000000, rates: [1.1, 1.3, 1.55, 1.85] },
    { maxVal: null, rates: [1.05, 1.25, 1.51, 1.82] }
  ]));

  // 13. Internal
  rates.push(createRate('internal', 'BM', [0, 0, 0, 0]));
  rates.push(createRate('internal', 'PJI', [0, 0, 0, 0]));
  rates.push(createRate('internal', 'PJI_STAR', [0, 0, 0, 0]));
  rates.push(createRate('internal', 'TAS', [0, 0, 0, 0]));
  rates.push(createRate('internal', 'DBV', [0, 0, 0, 0]));
  rates.push(createRate('internal', 'PVI', [1.6, 1.9, 2.15, 2.5]));
  rates.push(createRate('internal', 'PTI', [0, 0, 0, 0]));
  rates.push(createRate('internal', 'BL', [1.15, 1.2, 1.5, 1.65]));
  rates.push(createRate('internal', 'BV', [0, 0, 0, 0]));
  rates.push(createRate('internal', 'MIC', [
    { maxVal: 400000000, rates: [1.65, 1.815, 2.09, 2.53] },
    { maxVal: 600000000, rates: [1.5, 1.65, 1.9, 2.3] },
    { maxVal: 800000000, rates: [1.35, 1.5, 1.8, 2.1] },
    { maxVal: 1500000000, rates: [1.1, 1.3, 1.55, 1.85] },
    { maxVal: null, rates: [1.05, 1.25, 1.51, 1.82] }
  ]));

  // 14. Specialized
  rates.push(createRate('specialized', 'BM', [0, 0, 0, 0]));
  rates.push(createRate('specialized', 'PJI', [0, 0, 0, 0]));
  rates.push(createRate('specialized', 'PJI_STAR', [0, 0, 0, 0]));
  rates.push(createRate('specialized', 'TAS', [0, 0, 0, 0]));
  rates.push(createRate('specialized', 'DBV', [0, 0, 0, 0]));
  rates.push(createRate('specialized', 'PVI', [1.8, 2.15, 2.4, 2.9]));
  rates.push(createRate('specialized', 'PTI', [0, 0, 0, 0]));
  rates.push(createRate('specialized', 'BL', [1.1, 1.21, 1.33, 1.6]));
  rates.push(createRate('specialized', 'BV', [0, 0, 0, 0]));
  rates.push(createRate('specialized', 'MIC', [1.25, 1.55, 1.85, 2.2]));

  // 15. Electric Personal
  rates.push(createRate('electric_personal', 'BM', [
    { maxVal: 500000000, rates: [1.87, 1.87, 1.87, 1.87] },
    { maxVal: null, rates: [1.375, 1.375, 1.375, 1.375] }
  ]));
  rates.push(createRate('electric_personal', 'PJI', [
    { maxVal: 400000000, rates: [1.5895, 1.9074, 1.9916, 2.1692] },
    { maxVal: 600000000, rates: [1.408, 1.6005, 1.6665, 1.815] },
    { maxVal: 800000000, rates: [1.155, 1.3085, 1.38, 1.5587] },
    { maxVal: null, rates: [1.001, 1.1726, 1.2656, 1.43] }
  ]));
  rates.push(createRate('electric_personal', 'PJI_STAR', [
    { maxVal: 500000000, rates: [1.15, 1.40, 1.68, 2.0] },
    { maxVal: 700000000, rates: [1.10, 1.20, 1.30, 1.40] },
    { maxVal: null, rates: [0.99, 1.10, 1.20, 1.40] }
  ]));

  // 16. Electric Taxi
  rates.push(createRate('electric_taxi', 'BM', [
    { maxVal: 500000000, rates: [3.52, 3.52, 3.52, 3.52] },
    { maxVal: null, rates: [2.42, 2.42, 2.42, 2.42] }
  ]));
  rates.push(createRate('electric_taxi', 'PJI', [
    { maxVal: 800000000, rates: [2.2275, 2.5245, 2.6318, 0] },
    { maxVal: null, rates: [2.1406, 2.4178, 2.288, 0] }
  ]));

  // 17. Electric Grab
  rates.push(createRate('electric_grab', 'BM', [
    { maxVal: 500000000, rates: [2.97, 2.97, 2.97, 2.97] },
    { maxVal: null, rates: [1.76, 1.76, 1.76, 1.76] }
  ]));

  // Write seeded collections to DB
  db.rates = rates;
  db.commissions = commissions;
  writeDb(db);
  console.log(`Successfully seeded ${rates.length} rates and ${commissions.length} commission rules.`);
};
