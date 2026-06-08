import fs from 'fs';

const newRates = `
const RATES: Record<string, RateConfig> = {
  personal: {
    BM: (v, a) => [0.99, 1.1, 1.21, 1.32][a],
    PJI: (v, a) => {
      if (v < 400_000_000) return [1.5895, 1.9074, 1.9916, 2.1692][a];
      if (v < 600_000_000) return [1.408, 1.6005, 1.6665, 1.815][a];
      if (v < 800_000_000) return [1.155, 1.3085, 1.38, 1.5587][a];
      return [1.001, 1.1726, 1.2656, 1.43][a];
    },
    PJI_STAR: (v, a) => {
      if (v < 500_000_000) return [1.15, 1.40, 1.68, 2.0][a];
      if (v < 700_000_000) return [1.10, 1.20, 1.30, 1.40][a];
      return [0.99, 1.10, 1.20, 1.40][a];
    },
    TAS: (v, a) => {
      if (v < 400_000_000) return [1.485, 1.62, 1.845, 2.115][a];
      if (v < 500_000_000) return [1.395, 1.503, 1.755, 2.025][a];
      if (v < 600_000_000) return [1.305, 1.395, 1.755, 2.025][a];
      if (v < 700_000_000) return [1.17, 1.215, 1.53, 1.845][a];
      if (v < 800_000_000) return [1.125, 1.215, 1.485, 1.71][a];
      return [0.99, 1.098, 1.26, 1.575][a];
    },
    DBV: (v, a) => {
      if (v < 400_000_000) return [1.55, 1.8, 2.1, 2.6][a];
      if (v < 600_000_000) return [1.4, 1.5, 1.65, 1.95][a];
      if (v < 800_000_000) return [1.25, 1.35, 1.5, 1.8][a];
      return [1, 1.1, 1.25, 1.6][a];
    },
    PVI: (v, a, isEV) => {
      if (v > 900_000_000) return [1.0, 1.1, 1.2, 1.3][a];
      const base = [1.7, 2.0, 2.25, 2.6][a];
      if (isEV) return base;
      if (v <= 300_000_000) return base;
      if (v <= 500_000_000) return base * 0.9;
      if (v <= 700_000_000) return base * 0.8;
      return base * 0.65;
    },
    PTI: (v, a) => {
      if (v < 400_000_000) return [1.8, 1.9, 2.0, 2.1][a];
      if (v < 600_000_000) return [1.3, 1.4, 1.7, 1.9][a];
      if (v < 800_000_000) return [1.1, 1.3, 1.5, 1.7][a];
      if (v < 1_000_000_000) return [1.0, 1.1, 1.21, 1.32][a];
      if (v < 1_500_000_000) return [1.0, 1.1, 1.21, 1.0][a];
      if (v < 3_000_000_000) return [0, 0, 0, 1.1][a];
      return [0, 0, 0, 1.0][a];
    },
    BL: (v, a, isEV) => {
      if (isEV) {
        if (a === 0) return v <= 500_000_000 ? 1.8 : 1.35;
        return 0;
      }
      if (v <= 500_000_000) return [1.25, 1.32, 1.47, 1.62][a];
      return [1.2, 1.27, 1.3, 1.4][a];
    },
    BV: (v, a, isEV, evModel) => {
      if (!isEV) return 0;
      if (a > 1) return 0;
      if (evModel === 'VF9' || evModel === 'VF8_9') return [1.35, 1.47, 0, 0][a];
      if (evModel === 'VFe34' || evModel === 'VF6' || evModel === 'VF7') return [1.45, 1.57, 0, 0][a];
      if (evModel === 'VF5') return [1.5, 1.62, 0, 0][a];
      if (evModel === 'VF3') return [1.95, 2.07, 0, 0][a];
      return 0;
    }
  },
  grab: {
    BM: (v, a) => {
      if (v <= 500_000_000) return [1.2782, 1.3893, 1.7831, 1.903][a];
      return [1.21, 1.32, 1.43, 1.54][a];
    },
    PJI: (v, a) => {
      if (v < 400_000_000) return [1.9168, 2.3001, 2.5058, 0][a];
      if (v < 600_000_000) return [1.8233, 2.1973, 2.3936, 0][a];
      if (v < 800_000_000) return [1.7298, 2.0944, 2.2814, 0][a];
      return [1.452, 1.7776, 1.9272, 0][a];
    },
    PJI_STAR: (v, a) => {
      if (v < 500_000_000) return [1.75, 1.80, 2.25, 0][a];
      if (v < 700_000_000) return [1.65, 1.82, 2.00, 0][a];
      return [1.40, 1.70, 1.95, 0][a];
    },
    TAS: (v, a) => {
      if (v < 400_000_000) return [1.845, 2.025, 2.43, 2.925][a];
      if (v < 600_000_000) return [1.755, 1.935, 2.205, 2.7][a];
      if (v < 800_000_000) return [1.62, 1.8, 2.07, 2.52][a];
      return [1.395, 1.575, 1.845, 2.025][a];
    },
    DBV: (v, a) => {
      if (v < 400_000_000) return [1.65, 1.9, 2.2, 0][a];
      if (v < 600_000_000) return [1.5, 1.6, 1.75, 0][a];
      if (v < 800_000_000) return [1.35, 1.45, 1.6, 0][a];
      return [1, 2, 1.35, 0][a];
    },
    PVI: (v, a) => {
      if (v > 900_000_000) return [1.7, 1.8, 1.9, 2.0][a];
      return [2.2, 2.6, 2.9, 3.3][a];
    },
    PTI: (v, a) => {
      if (v < 500_000_000) return [2.1, 2.2, 2.4, 0][a];
      return [1.9, 2.0, 2.1, 0][a];
    },
    BL: (v, a, isEV) => {
      if (isEV) {
        if (a === 0) return v <= 500_000_000 ? 2.95 : 2.5;
        return 0;
      }
      if (v <= 500_000_000) return [1.87, 2.2, 2.34, 2.55][a];
      return [1.8, 2.1, 2.3, 2.5][a];
    },
    BV: (v, a, isEV, evModel) => {
      if (!isEV) return 0;
      if (a > 1) return 0;
      if (evModel === 'VF3') return [3.63, 3.83, 0, 0][a];
      if (['VFe34', 'VF5', 'VF6', 'VF7', 'VF8_9'].includes(evModel || '')) return [2.5, 2.7, 0, 0][a];
      return 0;
    }
  },
  taxi: {
    BM: (v, a) => {
      if (v <= 500_000_000) return [2.1296, 2.2627, 2.3958, 2.5289][a];
      return [1.76, 1.87, 2.98, 2.09][a];
    },
    PJI: (v, a) => {
      if (v < 800_000_000) return [2.2275, 2.5245, 2.6318, 0][a];
      return [2.1406, 2.4178, 2.288, 0][a];
    },
    PJI_STAR: (v, a) => 0,
    TAS: (v, a) => [2.97, 3.285, 3.69, 4.32][a],
    DBV: (v, a) => [2.5, 2.78, 3, 0][a],
    PVI: (v, a) => {
      if (v > 900_000_000) return [1.7, 1.8, 1.9, 2.0][a];
      return [3.7, 4.1, 4.4, 4.8][a];
    },
    PTI: (v, a) => {
      if (v < 500_000_000) return [2.5, 2.86, 2.95, 0][a];
      return [1.9, 2.2, 2.3, 0][a];
    },
    BL: (v, a, isEV) => {
      if (isEV) {
        if (a === 0) return v <= 500_000_000 ? 2.95 : 2.5;
        return 0;
      }
      if (v <= 500_000_000) return [1.87, 2.2, 2.34, 2.55][a];
      return [1.8, 2.1, 2.3, 2.5][a];
    },
    BV: (v, a, isEV, evModel) => {
      if (!isEV) return 0;
      if (a > 1) return 0;
      if (evModel === 'VF3') return [3.3, 3.5, 0, 0][a];
      if (['VFe34', 'VF5', 'VF6', 'VF7', 'VF8_9'].includes(evModel || '')) return [1.85, 2.05, 0, 0][a];
      return 0;
    }
  },
  commercial_passenger: {
    BM: (v, a) => [1.32, 1.43, 1.54, 1.65][a],
    PJI: (v, a) => {
      if (v < 400_000_000) return [1.716, 2.0064, 2.0944, 2.3056][a];
      if (v < 600_000_000) return [1.628, 1.9096, 1.9976, 2.2176][a];
      if (v < 800_000_000) return [1.5048, 1.8216, 1.9976, 2.2176][a];
      return [1.452, 1.7688, 1.9008, 2.1208][a];
    },
    PJI_STAR: (v, a) => {
      if (v < 500_000_000) return [1.35, 1.55, 1.70, 2.25][a];
      if (v < 700_000_000) return [1.25, 1.40, 1.50, 1.80][a];
      return [1.20, 1.28, 1.40, 2.00][a];
    },
    TAS: (v, a) => [1.152, 1.26, 1.485, 1.8][a],
    DBV: (v, a) => [1.35, 1.5, 1.8, 0][a],
    PVI: (v, a) => {
      if (v > 900_000_000) return [1.1, 1.2, 1.3, 1.4][a];
      return [1.95, 2.35, 2.65, 3.05][a];
    },
    PTI: (v, a) => {
      if (v < 500_000_000) return [2.5, 2.86, 2.95, 0][a];
      return [1.9, 2.2, 2.3, 0][a];
    },
    BL: (v, a, isEV) => {
      if (isEV) {
        if (a === 0) return v <= 500_000_000 ? 2.5 : 1.7;
        return 0;
      }
      if (v <= 500_000_000) return [1.5, 1.6, 1.7, 1.87][a];
      return [1.4, 1.5, 1.6, 1.7][a];
    },
    BV: (v, a, isEV, evModel) => {
      if (!isEV) return 0;
      if (a > 1) return 0;
      if (evModel === 'VF3') return [2.68, 2.88, 0, 0][a];
      if (['VFe34', 'VF5', 'VF6', 'VF7', 'VF8_9'].includes(evModel || '')) return [1.75, 1.95, 0, 0][a];
      return 0;
    }
  },
  truck_non_commercial: {
    BM: (v, a) => [0.99, 1.1, 1.21, 1.32][a],
    PJI: (v, a) => [1.0285, 1.2584, 1.3613, 1.48225][a],
    PJI_STAR: (v, a) => 0,
    TAS: (v, a) => [1.0, 1.125, 1.305, 1.575][a],
    DBV: (v, a) => [1.1, 1.23, 1.35, 1.5][a],
    PVI: (v, a) => {
      if (v > 900_000_000) return [1.0, 1.1, 1.2, 1.3][a];
      return [1.9, 2.3, 2.6, 3.0][a];
    },
    PTI: (v, a) => [1.21, 1.32, 1.43, 1.54][a],
    BL: (v, a) => {
      if (v <= 500_000_000) return [1.1, 1.21, 1.33, 1.6][a];
      return [1.1, 1.21, 1.3, 1.6][a];
    },
    BV: (v, a) => 0
  },
  truck_commercial: {
    BM: (v, a) => [1.21, 1.32, 1.43, 1.54][a],
    PJI: (v, a) => [1.034, 1.232, 1.3255, 1.463][a],
    PJI_STAR: (v, a) => 0,
    TAS: (v, a) => [1.21, 1.32, 1.44, 1.665][a],
    DBV: (v, a) => [1.21, 1.32, 1.43, 1.54][a],
    PVI: (v, a) => {
      if (v > 900_000_000) return [1.2, 1.3, 1.4, 1.5][a];
      return [1.9, 2.3, 2.6, 3.0][a];
    },
    PTI: (v, a) => [1.21, 1.32, 1.43, 1.54][a],
    BL: (v, a) => {
      if (v <= 500_000_000) return [1.1, 1.21, 1.33, 1.6][a];
      return [1.1, 1.21, 1.3, 1.6][a];
    },
    BV: (v, a) => 0
  },
  truck_refrigerated: {
    BM: (v, a) => [1.65, 1.76, 1.87, 2.09][a],
    PJI: (v, a) => [1.386, 1.5895, 1.7875, 1.9745][a],
    PJI_STAR: (v, a) => 0,
    TAS: (v, a) => [1.65, 1.76, 1.935, 2.25][a],
    DBV: (v, a) => [1.65, 1.76, 1.87, 2.3][a],
    PVI: (v, a) => {
      if (v > 900_000_000) return [1.6, 1.7, 1.8, 2.0][a];
      return [2.8, 3.2, 3.5, 3.9][a];
    },
    PTI: (v, a) => 0,
    BL: (v, a) => [1.38, 1.55, 1.65, 1.87][a],
    BV: (v, a) => 0
  },
  tractor: {
    BM: (v, a) => [1.65, 1.76, 1.87, 2.09][a],
    PJI: (v, a) => [1.386, 1.5895, 1.702, 1.903][a],
    PJI_STAR: (v, a) => 0,
    TAS: (v, a) => [1.65, 1.76, 1.935, 2.25][a],
    DBV: (v, a) => [1.65, 1.76, 1.87, 2.3][a],
    PVI: (v, a) => {
      if (v > 900_000_000) return [1.6, 1.7, 1.8, 2.0][a];
      return [2.8, 3.2, 3.5, 3.9][a];
    },
    PTI: (v, a) => [1.65, 1.76, 1.87, 2.25][a],
    BL: (v, a) => [1.65, 1.76, 1.87, 2.1][a],
    BV: (v, a) => 0
  },
  trailer: {
    BM: (v, a) => [0.66, 0.77, 0.88, 1.1][a],
    PJI: (v, a) => [0.605, 0.803, 0.891, 1.1055][a],
    PJI_STAR: (v, a) => 0,
    TAS: (v, a) => [0.66, 0.77, 0.9, 1.17][a],
    DBV: (v, a) => [0.66, 0.77, 0.88, 1.3][a],
    PVI: (v, a) => {
      if (v > 900_000_000) return [0.7, 0.8, 0.9, 1.1][a];
      return [1.3, 1.7, 2.0, 2.4][a];
    },
    PTI: (v, a) => 0,
    BL: (v, a) => [0.66, 0.77, 0.88, 1.1][a],
    BV: (v, a) => 0
  },
  pickup: {
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
      const base = [1.9, 2.2, 2.45, 2.8][a];
      if (isEV) return base;
      if (v <= 300_000_000) return base;
      if (v <= 500_000_000) return base * 0.9;
      if (v <= 700_000_000) return base * 0.8;
      return base * 0.65;
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
  training: {
    BM: (v, a) => [0.99, 1.1, 1.21, 1.32][a],
    PJI: (v, a) => [1.32, 1.6005, 1.7325, 1.9305][a],
    PJI_STAR: (v, a) => 0,
    TAS: (v, a) => 0,
    DBV: (v, a) => 0,
    PVI: (v, a) => 0,
    PTI: (v, a) => 0,
    BL: (v, a) => [1.2, 1.25, 1.32, 1.4][a],
    BV: (v, a) => 0
  },
  electric_personal: {
    BM: (v, a) => {
      if (v <= 500_000_000) return [1.87, 1.87, 1.87, 1.87][a];
      return [1.375, 1.375, 1.375, 1.375][a];
    },
    PJI: (v, a) => {
      if (v < 400_000_000) return [1.5895, 1.9074, 1.9916, 2.1692][a];
      if (v < 600_000_000) return [1.408, 1.6005, 1.6665, 1.815][a];
      if (v < 800_000_000) return [1.155, 1.3085, 1.38, 1.5587][a];
      return [1.001, 1.1726, 1.2656, 1.43][a];
    },
    PJI_STAR: (v, a) => {
      if (v < 500_000_000) return [1.15, 1.40, 1.68, 2.0][a];
      if (v < 700_000_000) return [1.10, 1.20, 1.30, 1.40][a];
      return [0.99, 1.10, 1.20, 1.40][a];
    },
    TAS: (v, a) => 0,
    DBV: (v, a) => 0,
    PVI: (v, a) => 0,
    PTI: (v, a) => 0,
    BL: (v, a) => 0,
    BV: (v, a) => 0
  },
  electric_taxi: {
    BM: (v, a) => {
      if (v <= 500_000_000) return [3.52, 3.52, 3.52, 3.52][a];
      return [2.42, 2.42, 2.42, 2.42][a];
    },
    PJI: (v, a) => {
      if (v < 800_000_000) return [2.2275, 2.5245, 2.6318, 0][a];
      return [2.1406, 2.4178, 2.288, 0][a];
    },
    PJI_STAR: (v, a) => 0,
    TAS: (v, a) => 0,
    DBV: (v, a) => 0,
    PVI: (v, a) => 0,
    PTI: (v, a) => 0,
    BL: (v, a) => 0,
    BV: (v, a) => 0
  }
};
`;

const appCode = fs.readFileSync('src/App.tsx', 'utf8');
const startIdx = appCode.indexOf('const RATES: Record<string, RateConfig> = {');
const endIdx = appCode.indexOf('const EV_MODELS = [');

const newAppCode = appCode.substring(0, startIdx) + newRates + '\n' + appCode.substring(endIdx);
fs.writeFileSync('src/App.tsx', newAppCode);
