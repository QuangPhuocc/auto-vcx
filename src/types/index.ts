export type AgeBracket = 0 | 1 | 2 | 3 | 4 | 5;

export interface User {
  id: string;
  username: string;
  role: 'master' | 'admin' | 'client' | 'user';
  name: string;
  phone?: string; // SĐT người dùng
  parentId: string | null;
  parentUsername?: string;
  createdAt?: string;
  password?: string; // Visible only to master
  status?: string;
}

export interface InsuranceCompany {
  id: string;
  name: string;
  color: string;
  text?: string;
  border?: string;
  hasRates: boolean;
}

export interface RateSubRule {
  maxVal: number | null;
  rates: number[];
  minPremium?: number | null;
  deductible?: number | null;
}

export interface RateRule {
  id: string;
  carType: string;
  companyId: string;
  isEV: boolean;
  evModel: string | null;
  rules: RateSubRule[];
}

export interface BankReferral {
  id: string;
  companyId: string;
  bankName: string;
  rate: number | string;
}

export type ActiveTab = 'calc' | 'users' | 'commissions' | 'rates' | 'companies' | 'logs';

export interface NotificationState {
  type: 'success' | 'error' | 'info';
  message: string;
  details?: string[];
}
