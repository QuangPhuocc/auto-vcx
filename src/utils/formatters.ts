export const getCompanyStyles = (company: { color: string; text?: string; border?: string }) => {
  let color = company.color || '#2563eb';
  
  if (!color.startsWith('#')) {
    const classToHex: Record<string, string> = {
      'bg-blue-600': '#2563eb',
      'bg-emerald-600': '#059669',
      'bg-orange-600': '#ea580c',
      'bg-indigo-600': '#4f46e5',
      'bg-red-600': '#dc2626',
      'bg-yellow-600': '#ca8a04',
      'bg-teal-600': '#0d9488',
      'bg-sky-600': '#0284c7',
      'bg-blue-800': '#1e40af',
    };
    color = classToHex[color] || '#2563eb';
  }

  return {
    color,
    bgClass: '',
    textClass: '',
    borderClass: '',
    bgStyle: { backgroundColor: color },
    textStyle: { color: color },
    borderStyle: { borderColor: `${color}33` },
    isHex: true
  };
};

export const mapToDbCarType = (type: string): string => {
  if (['personal_under_9', 'personal_over_9', 'demo_car'].includes(type)) return 'personal';
  if (['grab'].includes(type)) return 'grab';
  if (['taxi'].includes(type)) return 'taxi';
  if (['bus', 'self_drive', 'commercial_under_9', 'commercial_over_9', 'commercial_interprovincial'].includes(type)) return 'commercial_passenger';
  if (['training'].includes(type)) return 'training';
  if (['internal'].includes(type)) return 'internal';
  if (['money_car', 'truck_fuel', 'specialized_ambulance', 'specialized_fire', 'specialized_ladder', 'specialized_sanitation', 'specialized_sweeper', 'specialized_concrete', 'specialized_drill', 'specialized_tanker', 'specialized_other'].includes(type)) return 'specialized';
  if (['truck_non_commercial_under_10', 'truck_non_commercial_over_10'].includes(type)) return 'truck_non_commercial';
  if (['truck_commercial_under_10', 'truck_commercial_over_10', 'truck_oversized', 'truck_other'].includes(type)) return 'truck_commercial';
  if (['truck_refrigerated_under_3_5', 'truck_refrigerated_over_3_5', 'truck_mining'].includes(type)) return 'truck_refrigerated';
  if (['tractor'].includes(type)) return 'tractor';
  if (['trailer_flatbed', 'trailer_tipper', 'trailer_specialized'].includes(type)) return 'trailer';
  if (['pickup', 'pickup_other'].includes(type)) return 'pickup';
  if (['van_minivan'].includes(type)) return 'van_minivan';
  return type;
};

export const formatCommissionValue = (val: any): string => {
  if (val === undefined || val === null) return '15.0%';
  if (typeof val === 'number') {
    return `${(val * 100).toFixed(1)}%`;
  }
  if (Array.isArray(val)) {
    if (val.length === 0) return '0.0%';
    if (val.length === 1) return formatCommissionValue(val[0].rate);
    const rates = val.map(r => r.rate);
    const minRate = Math.min(...rates);
    const maxRate = Math.max(...rates);
    if (Math.abs(minRate - maxRate) < 0.0001) {
      return `${(minRate * 100).toFixed(1)}%`;
    }
    return `${(minRate * 100).toFixed(1)}% - ${(maxRate * 100).toFixed(1)}%`;
  }
  return '15.0%';
};

export const isSameCommission = (val1: any, val2: any): boolean => {
  if (typeof val1 === 'number' && typeof val2 === 'number') {
    return Math.abs(val1 - val2) < 0.0001;
  }
  if (Array.isArray(val1) && Array.isArray(val2)) {
    if (val1.length !== val2.length) return false;
    return val1.every((r1, i) => {
      const r2 = val2[i];
      return r2 && r1.maxVal === r2.maxVal && Math.abs(r1.rate - r2.rate) < 0.0001;
    });
  }
  return false;
};

export const getEditRateValue = (val: any): string => {
  if (typeof val === 'number') return (val * 100).toFixed(1);
  if (Array.isArray(val) && val.length > 0) {
    return (val[0].rate * 100).toFixed(1);
  }
  return '15.0';
};

export const formatCurrency = (value: number | string) => {
  if (typeof value === 'string') return value;
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
};
