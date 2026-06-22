import React, { useState, useEffect, useMemo, useRef } from 'react';
import { flushSync } from 'react-dom';
import { 
  Calculator, Car, Calendar, DollarSign, Percent, ShieldCheck, Info, CheckCircle2, 
  AlertCircle, Copy, Check, Download, Loader2, Edit3, Save, RefreshCw, Users, Key,
  ChevronDown, ChevronRight, Settings, Plus, Trash2, LogOut, FileText, UserPlus, HelpCircle, LogIn, Upload
} from 'lucide-react';
import { toPng, toBlob } from 'html-to-image';
import * as XLSX from 'xlsx';

type AgeBracket = 0 | 1 | 2 | 3 | 4 | 5;

interface User {
  id: string;
  username: string;
  role: 'master' | 'admin' | 'client' | 'user';
  name: string;
  phone?: string; // SĐT người dùng
  parentId: string | null;
  createdAt?: string;
  password?: string; // Visible only to master
}

interface InsuranceCompany {
  id: string;
  name: string;
  color: string;
  text?: string;
  border?: string;
  hasRates: boolean;
}

interface RateSubRule {
  maxVal: number | null;
  rates: number[];
  minPremium?: number | null;
  deductible?: number | null;
}

interface RateRule {
  id: string;
  carType: string;
  companyId: string;
  isEV: boolean;
  evModel: string | null;
  rules: RateSubRule[];
}

interface BankReferral {
  id: string;
  companyId: string;
  bankName: string;
  rate: number;
}

const EV_MODELS = [
  { id: 'gas', name: 'Xe xăng' },
  { id: 'VF3', name: 'Vinfast VF3 / Minio Green' },
  { id: 'VF5', name: 'Vinfast VF5 / Herio Green' },
  { id: 'VFe34', name: 'Vinfast VF e34' },
  { id: 'VF6', name: 'Vinfast VF6 / Norio Green' },
  { id: 'VF7', name: 'Vinfast VF7 / Limo Green' },
  { id: 'VF8_9', name: 'Vinfast VF8 / VF9' },
  { id: 'other', name: 'Xe điện khác' }
];

const BANK_OPTIONS = [
  'Không vay ngân hàng',
  'TP BANK - VAY MỚI',
  'TP BANK - TÁI TỤC',
  'VP BANK - CÁ NHÂN',
  'VP BANK - DOANH NGHIỆP',
  'PVCOMBANK - CÁ NHÂN',
  'PVCOMBANK - DOANH NGHIỆP',
  'OCB KHỐI CÁ NHÂN',
  'OCB KHỐI DN VỪA & NHỎ',
  'OCB KHỐI DN LỚN',
  'TECHCOMBANK - NĂM ĐẦU',
  'TECHCOMBANK - NĂM THỨ 2',
  'SEABANK CÁ NHÂN',
  'SEABANK DOANH NGHIỆP',
  'ABBANK',
  'NCB - NH QUỐC DÂN',
  'VIETBANK',
  'LPBANK',
  'ACB - Á CHÂU',
  'SHB',
  'EIB - EXIMBANK',
  'BẮC Á BANK',
  'NAM Á BANK',
  'KIENLONG BANK',
  'VIETCOMBANK',
  'HD BANK',
  'SHINHAN',
  'BẢN VIỆT',
  'SACOMBANK',
  'PG BANK',
  'WOORI',
  'PUBLIC BANK',
  'MARITIMEBANK',
  'VIB',
  'BẢO VIỆT',
  'MSB - NGÂN HÀNG HÀNG HẢI'
];

const getCompanyStyles = (company: { color: string; text?: string; border?: string }) => {
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

const COLOR_PRESETS = [
  { name: 'Xanh dương đậm (Royal Blue)', hex: '#1e40af' },
  { name: 'Xanh dương (Blue)', hex: '#2563eb' },
  { name: 'Xanh da trời (Sky Blue)', hex: '#0ea5e9' },
  { name: 'Lục lam (Teal)', hex: '#0f766e' },
  { name: 'Lục bảo (Emerald)', hex: '#047857' },
  { name: 'Xanh lá (Green)', hex: '#16a34a' },
  { name: 'Xanh neon (Lime)', hex: '#65a30d' },
  { name: 'Xanh lục nhạt (Mint)', hex: '#10b981' },
  { name: 'Đỏ đậm (Crimson)', hex: '#991b1b' },
  { name: 'Đỏ tươi (Red)', hex: '#dc2626' },
  { name: 'Đỏ cam (Tomato)', hex: '#f97316' },
  { name: 'Hồng đậm (Deep Pink)', hex: '#be185d' },
  { name: 'Hồng sen (Rose)', hex: '#e11d48' },
  { name: 'Tím đậm (Grape)', hex: '#6b21a8' },
  { name: 'Tím (Purple)', hex: '#9333ea' },
  { name: 'Chàm (blue)', hex: '#4f46e5' },
  { name: 'Vàng cam (Amber)', hex: '#d97706' },
  { name: 'Vàng tươi (Yellow)', hex: '#eab308' },
  { name: 'Nâu đất (Brown)', hex: '#78350f' },
  { name: 'Đồng (Bronze)', hex: '#b45309' },
  { name: 'Xám đậm (Slate)', hex: '#334155' },
  { name: 'Xám xanh (Cool Gray)', hex: '#4b5563' },
  { name: 'Đen xám (Charcoal)', hex: '#1f2937' },
  { name: 'Hồng san hô (Coral)', hex: '#f43f5e' }
];

const VEHICLE_OPTIONS = [
  // A. XE CHỞ NGƯỜI
  { id: 'personal_under_9', name: 'Xe chở người không kinh doanh dưới 9 chỗ', group: 'A. XE CHỞ NGƯỜI' },
  { id: 'personal_over_9', name: 'Xe chở người không kinh doanh từ 9 chỗ trở lên', group: 'A. XE CHỞ NGƯỜI' },
  { id: 'training', name: 'Xe tập lái', group: 'A. XE CHỞ NGƯỜI' },
  { id: 'bus', name: 'Xe bus', group: 'A. XE CHỞ NGƯỜI' },
  { id: 'internal', name: 'Xe hoạt động nội bộ cảng / KCN / sân bay', group: 'A. XE CHỞ NGƯỜI' },
  { id: 'grab', name: 'Xe kinh doanh công nghệ (Grab, Be, FastGo, Xanh SM...)', group: 'A. XE CHỞ NGƯỜI' },
  { id: 'taxi', name: 'Taxi truyền thống', group: 'A. XE CHỞ NGƯỜI' },
  { id: 'self_drive', name: 'Xe cho thuê tự lái', group: 'A. XE CHỞ NGƯỜI' },
  { id: 'commercial_under_9', name: 'Xe kinh doanh chở người dưới 9 chỗ, xe hợp đồng (không phải Grab, Taxi)', group: 'A. XE CHỞ NGƯỜI' },
  { id: 'commercial_over_9', name: 'Xe kinh doanh chở người từ 9 chỗ trở lên', group: 'A. XE CHỞ NGƯỜI' },
  { id: 'commercial_interprovincial', name: 'Xe kinh doanh vận tải hành khách liên tỉnh', group: 'A. XE CHỞ NGƯỜI' },
  { id: 'demo_car', name: 'Xe Demo / Test Drive', group: 'A. XE CHỞ NGƯỜI' },
  { id: 'money_car', name: 'Xe chở tiền', group: 'A. XE CHỞ NGƯỜI' },

  // B. XE CHỞ HÀNG
  { id: 'truck_non_commercial_under_10', name: 'Xe tải không kinh doanh ≤ 10 tấn', group: 'B. XE CHỞ HÀNG' },
  { id: 'truck_non_commercial_over_10', name: 'Xe tải không kinh doanh > 10 tấn', group: 'B. XE CHỞ HÀNG' },
  { id: 'truck_commercial_under_10', name: 'Xe tải kinh doanh ≤ 10 tấn', group: 'B. XE CHỞ HÀNG' },
  { id: 'truck_commercial_over_10', name: 'Xe tải kinh doanh > 10 tấn', group: 'B. XE CHỞ HÀNG' },
  { id: 'truck_refrigerated_under_3_5', name: 'Xe đông lạnh / bảo ôn ≤ 3.5 tấn', group: 'B. XE CHỞ HÀNG' },
  { id: 'truck_refrigerated_over_3_5', name: 'Xe đông lạnh / bảo ôn > 3.5 tấn', group: 'B. XE CHỞ HÀNG' },
  { id: 'truck_mining', name: 'Xe hoạt động vùng khai thác khoáng sản', group: 'B. XE CHỞ HÀNG' },
  { id: 'truck_fuel', name: 'Xe chở xăng dầu, khí hóa lỏng, nhiên liệu', group: 'B. XE CHỞ HÀNG' },
  { id: 'truck_oversized', name: 'Xe chở hàng siêu trường siêu trọng', group: 'B. XE CHỞ HÀNG' },
  { id: 'truck_other', name: 'Xe chở hàng còn lại', group: 'B. XE CHỞ HÀNG' },

  // C. XE CHUYÊN DÙNG
  { id: 'specialized_ambulance', name: 'Xe cứu thương', group: 'C. XE CHUYÊN DÙNG' },
  { id: 'specialized_fire', name: 'Xe cứu hỏa', group: 'C. XE CHUYÊN DÙNG' },
  { id: 'specialized_ladder', name: 'Xe thang', group: 'C. XE CHUYÊN DÙNG' },
  { id: 'specialized_sanitation', name: 'Xe vệ sinh môi trường', group: 'C. XE CHUYÊN DÙNG' },
  { id: 'specialized_sweeper', name: 'Xe quét đường', group: 'C. XE CHUYÊN DÙNG' },
  { id: 'specialized_concrete', name: 'Xe bơm bê tông', group: 'C. XE CHUYÊN DÙNG' },
  { id: 'specialized_drill', name: 'Xe khoan', group: 'C. XE CHUYÊN DÙNG' },
  { id: 'specialized_tanker', name: 'Xe téc chở chất lỏng', group: 'C. XE CHUYÊN DÙNG' },
  { id: 'specialized_other', name: 'Xe chuyên dùng khác', group: 'C. XE CHUYÊN DÙNG' },

  // D. ĐẦU KÉO - RƠ MOÓC
  { id: 'tractor', name: 'Xe đầu kéo', group: 'D. ĐẦU KÉO - RƠ MOÓC' },
  { id: 'trailer_flatbed', name: 'Rơ moóc thường / rơ moóc sàn', group: 'D. ĐẦU KÉO - RƠ MOÓC' },
  { id: 'trailer_tipper', name: 'Rơ moóc ben / tự đổ', group: 'D. ĐẦU KÉO - RƠ MOÓC' },
  { id: 'trailer_specialized', name: 'Rơ moóc gắn thiết bị chuyên dùng', group: 'D. ĐẦU KÉO - RƠ MOÓC' },

  // E. PICKUP - VAN
  { id: 'pickup', name: 'Xe bán tải Pickup', group: 'E. PICKUP - VAN' },
  { id: 'van_minivan', name: 'Xe Van', group: 'E. PICKUP - VAN' },
  { id: 'pickup_other', name: 'Xe vừa chở người vừa chở hàng khác', group: 'E. PICKUP - VAN' }
];

const mapToDbCarType = (type: string): string => {
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


const formatCommissionValue = (val: any): string => {
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

const isSameCommission = (val1: any, val2: any): boolean => {
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

const getEditRateValue = (val: any): string => {
  if (typeof val === 'number') return (val * 100).toFixed(1);
  if (Array.isArray(val) && val.length > 0) {
    return (val[0].rate * 100).toFixed(1);
  }
  return '15.0';
};

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
};

export default function App() {
  const currentYear = new Date().getFullYear();

  // Authentication State
  const [token, setToken] = useState<string | null>(localStorage.getItem('vcx_token'));
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // App General State
  const [activeTab, setActiveTab] = useState<'calc' | 'users' | 'commissions' | 'rates' | 'companies' | 'logs'>(
    () => {
      const saved = localStorage.getItem('vcx_active_tab');
      return saved === 'bank-referrals' ? 'commissions' : (saved as any || 'calc');
    }
  );
  const [commissionsSubTab, setCommissionsSubTab] = useState<'commission' | 'bank-referrals'>('commission');

  const [bankReferralsData, setBankReferralsData] = useState<BankReferral[]>([]);
  const [selectedBank, setSelectedBank] = useState('Không vay ngân hàng');
  const [bankSearchQuery, setBankSearchQuery] = useState('');
  const [bankFilterCompany, setBankFilterCompany] = useState('');
  const [bankFilterName, setBankFilterName] = useState('');

  // Bank Referral CRUD Modal
  const [showBankRefModal, setShowBankRefModal] = useState(false);
  const [editingBankRef, setEditingBankRef] = useState<BankReferral | null>(null);
  const [bankRefCompanyInput, setBankRefCompanyInput] = useState('');
  const [bankRefNameInput, setBankRefNameInput] = useState('TP BANK - VAY MỚI');
  const [bankRefRateInput, setBankRefRateInput] = useState('5');
  const bankReferralsFileInputRef = useRef<HTMLInputElement>(null);
  const [bankReferralsPreviewData, setBankReferralsPreviewData] = useState<any[] | null>(null);

  useEffect(() => {
    localStorage.setItem('vcx_active_tab', activeTab);
  }, [activeTab]);

  const [companies, setCompanies] = useState<InsuranceCompany[]>([]);
  const COMPANY_ORDER = useMemo(() => ['BM', 'PJI', 'PJI_STAR', 'TAS', 'DBV', 'BL', 'PVI', 'MIC', 'PTI', 'BV', 'LB', 'VS'], []);
  const orderedCompanies = useMemo(() => {
    return [...companies].sort((a, b) => {
      const idxA = COMPANY_ORDER.indexOf(a.id);
      const idxB = COMPANY_ORDER.indexOf(b.id);
      return (idxA === -1 ? 999 : idxA) - (idxB === -1 ? 999 : idxB);
    });
  }, [companies, COMPANY_ORDER]);

  const [ratesData, setRatesData] = useState<RateRule[]>([]);
  const [commissionsData, setCommissionsData] = useState<Record<string, Record<string, any>>>({});
  const [vehiclesList, setVehiclesList] = useState<any[]>(VEHICLE_OPTIONS);

  // Vehicle CRUD UI States
  const [editingVehicleId, setEditingVehicleId] = useState<string | null>(null);
  const [vehicleIdInput, setVehicleIdInput] = useState('');
  const [vehicleNameInput, setVehicleNameInput] = useState('');
  const [vehicleGroupInput, setVehicleGroupInput] = useState('A. XE CHỞ NGƯỜI');
  const [vehicleDbCarTypeInput, setVehicleDbCarTypeInput] = useState('personal');

  // Excel Rates Ref
  const ratesFileInputRef = useRef<HTMLInputElement>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [customBasePremiums, setCustomBasePremiums] = useState<Record<string, number>>({});
  const [customDiscountedPremiums, setCustomDiscountedPremiums] = useState<Record<string, number>>({});
  const [customDeductibles, setCustomDeductibles] = useState<Record<string, number>>({});
  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'warning', message: string, details?: string[] } | null>(null);

  // Calculator Form State
  const [carType, setCarType] = useState('personal_under_9');
  const [evModel, setEvModel] = useState('gas');
  const [carModel, setCarModel] = useState('');
  const [manufactureYear, setManufactureYear] = useState<number>(currentYear);
  const [carValueStr, setCarValueStr] = useState<string>('500000000');
  const [seatCount, setSeatCount] = useState<number>(5);
  const [tonnage, setTonnage] = useState<number>(1);
  const [profit, setProfit] = useState<string>('500000');
  const [isCopied, setIsCopied] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [fallbackImageSrc, setFallbackImageSrc] = useState<string | null>(null);
  const [showRate, setShowRate] = useState(false);
  const [showCommission, setShowCommission] = useState(false);
  const [showTerms, setShowTerms] = useState(true);
  const [showBasePremium, setShowBasePremium] = useState(true);
  const [showDiscountedPremium, setShowDiscountedPremium] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'table' | 'agent'>('grid');
  const [sortBy, setSortBy] = useState<'default' | 'price_asc' | 'price_desc'>('default');
  const [selectedCompanies, setSelectedCompanies] = useState<string[]>([]);

  // User Management State
  const [usersList, setUsersList] = useState<User[]>([]);
  const [userTree, setUserTree] = useState<any[]>([]);
  const [showTreeDiagram, setShowTreeDiagram] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newRole, setNewRole] = useState<'admin' | 'client' | 'user'>('admin');
  const [selectedParentId, setSelectedParentId] = useState<string>('');
  const [userCrudError, setUserCrudError] = useState('');
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editPhone, setEditPhone] = useState('');

  // Batch creation states
  const [parsedExcelRows, setParsedExcelRows] = useState<any[]>([]);
  const [batchUploadErrors, setBatchUploadErrors] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Commissions Management State
  const [selectedCommUser, setSelectedCommUser] = useState<string>('');
  const [customCommsGrid, setCustomCommsGrid] = useState<Record<string, Record<string, any>>>({});
  const [commissionSheetsUrl, setCommissionSheetsUrl] = useState('https://docs.google.com/spreadsheets/d/14UzfVMLLd1zFIhL2Qp2pBoDu7qYkwBUC6tG3bTpTpnY/edit?gid=1782136995#gid=1782136995');
  const [ratesSheetsUrl, setRatesSheetsUrl] = useState('https://docs.google.com/spreadsheets/d/10XEt3hznI6BjTnX7ktHiDg9U-Ihx4seg19xgJu1_40A/edit?gid=764412745#gid=764412745');
  const [isSyncing, setIsSyncing] = useState(false);
  const [ratesPreviewData, setRatesPreviewData] = useState<RateRule[] | null>(null);
  const [selectedInsurerForEdit, setSelectedInsurerForEdit] = useState<string>('PJI');
  const [searchTermForCategories, setSearchTermForCategories] = useState<string>('');
  const [isPreviewingRates, setIsPreviewingRates] = useState<boolean>(false);
  const [isApplyingRates, setIsApplyingRates] = useState<boolean>(false);
  const [editIsEV, setEditIsEV] = useState<boolean>(false);
  const [editEvModel, setEditEvModel] = useState<string>('VF5');
  const [aiConditionText, setAiConditionText] = useState('');
  const [isAIAnalyzing, setIsAIAnalyzing] = useState(false);
  const [aiClarificationQuestions, setAiClarificationQuestions] = useState<string[]>([]);

  // Edit Profile States
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileName, setProfileName] = useState('');
  const [profileUsername, setProfileUsername] = useState('');
  const [profilePhone, setProfilePhone] = useState('');
  const [profilePassword, setProfilePassword] = useState('');
  const [profileError, setProfileError] = useState('');
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

  // File Upload State for Commissions
  const [commPreviewData, setCommPreviewData] = useState<Record<string, Record<string, any>> | null>(null);
  const [isCommUploading, setIsCommUploading] = useState(false);
  const commFileInputRef = useRef<HTMLInputElement>(null);

  // Companies Management State
  const [newCompanyId, setNewCompanyId] = useState('');
  const [newCompanyName, setNewCompanyName] = useState('');
  const [newCompanyColor, setNewCompanyColor] = useState('#2563eb');
  const [newCompanyText, setNewCompanyText] = useState('');
  const [newCompanyBorder, setNewCompanyBorder] = useState('');
  const [newCompanyHasRates, setNewCompanyHasRates] = useState(true);
  const [editingCompanyId, setEditingCompanyId] = useState<string | null>(null);
  const [isDragActive, setIsDragActive] = useState(false);

  const [rgbColor, setRgbColor] = useState({ r: 37, g: 99, b: 235 });

  useEffect(() => {
    if (newCompanyColor && newCompanyColor.startsWith('#')) {
      const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
      const fullHex = newCompanyColor.replace(shorthandRegex, (m, r, g, b) => r + r + g + g + b + b);
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(fullHex);
      if (result) {
        setRgbColor({
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16)
        });
      }
    }
  }, [newCompanyColor]);

  const handleRgbChange = (channel: 'r' | 'g' | 'b', value: number) => {
    const newRgb = { ...rgbColor, [channel]: value };
    setRgbColor(newRgb);
    const rgbToHexStr = (r: number, g: number, b: number) => {
      return '#' + [r, g, b].map(x => {
        const hex = x.toString(16);
        return hex.length === 1 ? '0' + hex : hex;
      }).join('');
    };
    const hex = rgbToHexStr(newRgb.r, newRgb.g, newRgb.b);
    setNewCompanyColor(hex);
    setNewCompanyText('');
    setNewCompanyBorder('');
  };

  // References
  const carModelRef = useRef<HTMLInputElement>(null);
  const yearRef = useRef<HTMLInputElement>(null);
  const valueRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  const carValue = Number(carValueStr.replace(/\D/g, '')) || 0;
  const age = currentYear - manufactureYear;

  const dbCarType = vehiclesList.find(opt => opt.id === carType)?.dbCarType || carType;
  const showSeatCount = ['personal', 'grab', 'taxi', 'commercial_passenger'].includes(dbCarType);
  const showTonnage = ['truck_non_commercial', 'truck_commercial', 'truck_refrigerated', 'trailer', 'tractor'].includes(dbCarType);

  // Dynamic set of newRole default when currentUser role changes (Fix master cannot create admin)
  useEffect(() => {
    if (currentUser) {
      if (currentUser.role === 'master') setNewRole('admin');
      else if (currentUser.role === 'admin') setNewRole('client');
      else if (currentUser.role === 'client') setNewRole('user');
    }
  }, [currentUser]);

  // Automatically select the default parent based on the selected newRole
  useEffect(() => {
    if (currentUser) {
      if (currentUser.role !== 'master') {
        setSelectedParentId(currentUser.id);
      } else {
        if (newRole === 'admin') {
          setSelectedParentId('master-id');
        } else if (newRole === 'client') {
          const firstAdmin = usersList.find(u => u.role === 'admin');
          setSelectedParentId(firstAdmin ? firstAdmin.id : '');
        } else if (newRole === 'user') {
          const firstClient = usersList.find(u => u.role === 'client');
          setSelectedParentId(firstClient ? firstClient.id : '');
        }
      }
    }
  }, [newRole, currentUser, usersList]);

  // Fetch current user details on token change
  useEffect(() => {
    if (token) {
      localStorage.setItem('vcx_token', token);
      fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` }
      })
      .then(res => {
        if (!res.ok) throw new Error('Session expired');
        return res.json();
      })
      .then(data => {
        setCurrentUser(data);
        setSelectedCommUser(data.id);
      })
      .catch(() => {
        handleLogout();
      });
    } else {
      localStorage.removeItem('vcx_token');
      setCurrentUser(null);
    }
  }, [token]);

  // Load initial guest & user configurations
  useEffect(() => {
    // Load Companies (Available to guest)
    fetch('/api/companies')
      .then(res => res.json())
      .then(data => {
        setCompanies(data);
        setSelectedCompanies(data.map((c: any) => c.id));
      });

    // Load Rates Data (Available to guest)
    fetch('/api/rates')
      .then(res => res.json())
      .then(data => setRatesData(data));

    // Load Vehicles
    fetch('/api/vehicles')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setVehiclesList(data);
        }
      })
      .catch(err => console.error('Failed to load vehicles from API', err));
  }, []);

  // Load authenticated data
  useEffect(() => {
    if (!currentUser) {
      setCommissionsData({});
      setUsersList([]);
      setUserTree([]);
      setBankReferralsData([]);
      return;
    }

    // Load User Commissions
    fetch('/api/commissions', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => setCommissionsData(data));

    // Load Bank Referrals
    fetchBankReferrals();

    // Load Users list if authorized
    if (currentUser.role !== 'user') {
      fetchUsers();
    }
  }, [currentUser, token]);

  const fetchBankReferrals = () => {
    fetch('/api/bank-referrals', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setBankReferralsData(data);
        }
      })
      .catch(err => console.error('Failed to load bank referrals', err));
  };

  const fetchUsers = () => {
    fetch('/api/users', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => setUsersList(data));

    fetch('/api/users/tree', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => setUserTree(data));
  };

  // Helper: Toast alerts
  const triggerNotification = (type: 'success' | 'error' | 'warning', message: string, details?: string[]) => {
    setNotification({ type, message, details });
    setTimeout(() => {
      setNotification(null);
    }, 7000);
  };

  // Login handler
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setIsLoggingIn(true);

    fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: usernameInput, password: passwordInput })
    })
    .then(async res => {
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Login failed');
      setToken(data.token);
      setShowLoginModal(false);
      triggerNotification('success', `Đăng nhập thành công! Chào mừng ${data.user.name}`);
    })
    .catch(err => {
      setLoginError(err.message);
    })
    .finally(() => {
      setIsLoggingIn(false);
    });
  };

  // Logout handler
  const handleLogout = () => {
    setToken(null);
    setCurrentUser(null);
    setUsersList([]);
    setUserTree([]);
    setUsernameInput('');
    setPasswordInput('');
    setActiveTab('calc');
    localStorage.removeItem('vcx_active_tab');
    triggerNotification('success', 'Đã đăng xuất tài khoản');
  };

  // User CRUD handlers
  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    setUserCrudError('');

    fetch('/api/users', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        username: newUsername,
        password: newPassword,
        name: newName,
        role: newRole,
        phone: newPhone,
        parentId: selectedParentId || undefined
      })
    })
    .then(async res => {
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Cannot create user');
      
      triggerNotification('success', `Tạo tài khoản ${newRole} thành công: ${newUsername}`);
      setNewUsername('');
      setNewPassword('');
      setNewName('');
      setNewPhone('');
      fetchUsers();
    })
    .catch(err => {
      setUserCrudError(err.message);
    });
  };

  const handleUpdateUser = (id: string) => {
    fetch(`/api/users/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        name: editName || undefined,
        password: editPassword || undefined,
        phone: editPhone
      })
    })
    .then(async res => {
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Update failed');
      }
      triggerNotification('success', `Cập nhật thông tin tài khoản thành công`);
      setEditingUserId(null);
      setEditName('');
      setEditPassword('');
      setEditPhone('');
      fetchUsers();
    })
    .catch(err => {
      triggerNotification('error', err.message);
    });
  };

  const handleDeleteUser = (id: string, username: string) => {
    if (!confirm(`Bạn có chắc chắn muốn xoá tài khoản ${username} và toàn bộ tài khoản cấp dưới trực tiếp?`)) return;

    fetch(`/api/users/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    })
    .then(async res => {
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Delete failed');
      }
      triggerNotification('success', `Đã xoá tài khoản ${username}`);
      fetchUsers();
    })
    .catch(err => {
      triggerNotification('error', err.message);
    });
  };

  // Profile Modal Handlers
  const handleOpenProfileModal = () => {
    if (!currentUser) return;
    setProfileName(currentUser.name || '');
    setProfileUsername(currentUser.username || '');
    setProfilePhone(currentUser.phone || '');
    setProfilePassword(currentUser.password || '');
    setProfileError('');
    setShowProfileModal(true);
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setProfileError('');
    setIsUpdatingProfile(true);

    fetch(`/api/users/${currentUser.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        name: profileName,
        username: profileUsername,
        phone: profilePhone,
        password: profilePassword || undefined
      })
    })
    .then(async res => {
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Cập nhật hồ sơ thất bại');
      
      setCurrentUser(prev => prev ? {
        ...prev,
        name: profileName,
        username: profileUsername,
        phone: profilePhone,
        password: profilePassword || prev.password
      } : null);

      triggerNotification('success', 'Đã cập nhật thông tin cá nhân thành công!');
      setShowProfileModal(false);
    })
    .catch(err => {
      setProfileError(err.message);
    })
    .finally(() => {
      setIsUpdatingProfile(false);
    });
  };

  // Commission File Upload Handlers
  const downloadCommExcelTemplate = () => {
    const getSingleRate = (val: any): string => {
      if (val === undefined || val === null) return '15.0';
      if (typeof val === 'number') return (val * 100).toFixed(1);
      if (Array.isArray(val) && val.length > 0) {
        const standard = val.find(r => r.maxVal === null) || val[0];
        return (standard.rate * 100).toFixed(1);
      }
      return '15.0';
    };

    const getRuleRate = (val: any, targetMaxVal: number | null): string => {
      if (val === undefined || val === null) return '15.0';
      if (typeof val === 'number') return (val * 100).toFixed(1);
      if (Array.isArray(val)) {
        const match = val.find(r => r.maxVal === targetMaxVal);
        if (match) return (match.rate * 100).toFixed(1);
        if (targetMaxVal !== null) {
          const closest = val.find(r => r.maxVal !== null) || val[0];
          return (closest.rate * 100).toFixed(1);
        } else {
          const fallback = val.find(r => r.maxVal === null) || val[val.length - 1] || val[0];
          return (fallback.rate * 100).toFixed(1);
        }
      }
      return '15.0';
    };

    const headers = [
      ["STT", "HÃNG BẢO HIỂM", "CHI TIẾT", "HOA HỒNG (%)"]
    ];

    const templateRows = [
      { stt: 1, companyName: 'BẢO MINH', companyId: 'BM', detail: 'Tất cả loại xe và GTX', resolver: () => {
        const val = customCommsGrid['personal_under_9']?.['BM'];
        return getSingleRate(val);
      }},
      { stt: 2, companyName: 'TASCO', companyId: 'TAS', detail: 'Tất cả loại xe và GTX', resolver: () => {
        const val = customCommsGrid['personal_under_9']?.['TAS'];
        return getSingleRate(val);
      }},
      { stt: 3, companyName: 'DBV NAM BÌNH DƯƠNG', companyId: 'DBV', detail: 'Loại xe Kinh doanh đến 9 chỗ', resolver: () => {
        const val = customCommsGrid['commercial_under_9']?.['DBV'];
        return getSingleRate(val);
      }},
      { stt: '', companyName: '', companyId: 'DBV', detail: 'Loại xe Taxi truyền thống', resolver: () => {
        const val = customCommsGrid['taxi']?.['DBV'];
        return getSingleRate(val);
      }},
      { stt: '', companyName: '', companyId: 'DBV', detail: 'Tất cả các loại xe còn lại', resolver: () => {
        const val = customCommsGrid['personal_under_9']?.['DBV'];
        return getSingleRate(val);
      }},
      { stt: 4, companyName: 'BẢO LONG', companyId: 'BL', detail: 'Tất cả loại xe và GTX', resolver: () => {
        const val = customCommsGrid['personal_under_9']?.['BL'];
        return getSingleRate(val);
      }},
      { stt: 5, companyName: 'LIBERTY', companyId: 'LB', detail: 'Tất cả loại xe và GTX', resolver: () => {
        const val = customCommsGrid['personal_under_9']?.['LB'];
        return getSingleRate(val);
      }},
      { stt: 6, companyName: 'PJICO', companyId: 'PJI', detail: 'GTX DƯỚI 700TR', resolver: () => {
        const val = customCommsGrid['personal_under_9']?.['PJI'];
        return getRuleRate(val, 700000000);
      }},
      { stt: '', companyName: '', companyId: 'PJI', detail: 'GTX TRÊN 700TR', resolver: () => {
        const val = customCommsGrid['personal_under_9']?.['PJI'];
        return getRuleRate(val, null);
      }},
      { stt: 7, companyName: 'PJICO*', companyId: 'PJI_STAR', detail: 'GTX DƯỚI 600TR', resolver: () => {
        const val = customCommsGrid['personal_under_9']?.['PJI_STAR'];
        return getRuleRate(val, 600000000);
      }},
      { stt: '', companyName: '', companyId: 'PJI_STAR', detail: 'GTX TỪ 600TR - 800TR', resolver: () => {
        const val = customCommsGrid['personal_under_9']?.['PJI_STAR'];
        return getRuleRate(val, 800000000);
      }},
      { stt: '', companyName: '', companyId: 'PJI_STAR', detail: 'GTX TRÊN 800TR', resolver: () => {
        const val = customCommsGrid['personal_under_9']?.['PJI_STAR'];
        return getRuleRate(val, null);
      }},
      { stt: 8, companyName: 'PVI DẦU KHÍ', companyId: 'PVI', detail: 'GTX DƯỚI 500TR', resolver: () => {
        const val = customCommsGrid['personal_under_9']?.['PVI'];
        return getRuleRate(val, 500000000);
      }},
      { stt: '', companyName: '', companyId: 'PVI', detail: 'GTX TỪ 500-700TR', resolver: () => {
        const val = customCommsGrid['personal_under_9']?.['PVI'];
        return getRuleRate(val, 700000000);
      }},
      { stt: '', companyName: '', companyId: 'PVI', detail: 'GTX TỪ 701- 1 tỷ', resolver: () => {
        const val = customCommsGrid['personal_under_9']?.['PVI'];
        return getRuleRate(val, 1000000000);
      }},
      { stt: '', companyName: '', companyId: 'PVI', detail: 'GTX TRÊN 1 TỶ', resolver: () => {
        const val = customCommsGrid['personal_under_9']?.['PVI'];
        return getRuleRate(val, null);
      }},
      { stt: 9, companyName: 'MIC BSG', companyId: 'MIC', detail: 'GTX DƯỚI 700TR', resolver: () => {
        const val = customCommsGrid['personal_under_9']?.['MIC'];
        return getRuleRate(val, 700000000);
      }},
      { stt: '', companyName: '', companyId: 'MIC', detail: 'GTX TRÊN 700TR', resolver: () => {
        const val = customCommsGrid['personal_under_9']?.['MIC'];
        return getRuleRate(val, null);
      }},
      { stt: '', companyName: '', companyId: 'MIC', detail: 'LOẠI XE ĐIỆN KHÔNG KINH DOANH - GTX DƯỚI 700TR', resolver: () => {
        const val = customCommsGrid['personal_under_9_ev']?.['MIC'];
        return getRuleRate(val, 700000000);
      }},
      { stt: '', companyName: '', companyId: 'MIC', detail: 'LOẠI XE ĐIỆN KHÔNG KINH DOANH - GTX TRÊN 700TR', resolver: () => {
        const val = customCommsGrid['personal_under_9_ev']?.['MIC'];
        return getRuleRate(val, null);
      }},
      { stt: 10, companyName: 'PTI THỐNG NHẤT', companyId: 'PTI', detail: 'GTX DƯỚI 800TR', resolver: () => {
        const val = customCommsGrid['personal_under_9']?.['PTI'];
        return getRuleRate(val, 800000000);
      }},
      { stt: '', companyName: '', companyId: 'PTI', detail: 'GTX TỪ 800TR', resolver: () => {
        const val = customCommsGrid['personal_under_9']?.['PTI'];
        return getRuleRate(val, null);
      }},
      { stt: 11, companyName: 'VASS', companyId: 'VS', detail: 'Tất cả loại xe và GTX', resolver: () => {
        const val = customCommsGrid['personal_under_9']?.['VS'];
        return getSingleRate(val);
      }},
      // Bảo Việt (BV) if in database
      ...(orderedCompanies.some(c => c.id === 'BV') ? [{
        stt: 12, companyName: 'BẢO VIỆT', companyId: 'BV', detail: 'Tất cả loại xe và GTX', resolver: () => {
          const val = customCommsGrid['personal_under_9']?.['BV'];
          return getSingleRate(val);
        }
      }] : [])
    ];

    const data = [...headers, ...templateRows.map(row => [row.stt, row.companyName, row.detail, row.resolver()])];
    const ws = XLSX.utils.aoa_to_sheet(data);
    
    // Auto column widths
    ws['!cols'] = [
      { wch: 8 },  // STT
      { wch: 28 }, // HÃNG BẢO HIỂM
      { wch: 48 }, // CHI TIẾT
      { wch: 18 }  // HOA HỒNG (%)
    ];

    // Merging company cells matching the image layout
    ws['!merges'] = [
      // DBV NAM BÌÝNH DƯƠNG: rows index 3 to 5
      { s: { r: 3, c: 0 }, e: { r: 5, c: 0 } },
      { s: { r: 3, c: 1 }, e: { r: 5, c: 1 } },
      
      // PJICO: rows index 8 to 9
      { s: { r: 8, c: 0 }, e: { r: 9, c: 0 } },
      { s: { r: 8, c: 1 }, e: { r: 9, c: 1 } },
      
      // PJICO*: rows index 10 to 12
      { s: { r: 10, c: 0 }, e: { r: 12, c: 0 } },
      { s: { r: 10, c: 1 }, e: { r: 12, c: 1 } },
      
      // PVI DẦU KHÍ: rows index 13 to 16
      { s: { r: 13, c: 0 }, e: { r: 16, c: 0 } },
      { s: { r: 13, c: 1 }, e: { r: 16, c: 1 } },
      
      // MIC BSG: rows index 17 to 20
      { s: { r: 17, c: 0 }, e: { r: 20, c: 0 } },
      { s: { r: 17, c: 1 }, e: { r: 20, c: 1 } },
      
      // PTI THỐNG NHẤT: rows index 21 to 22
      { s: { r: 21, c: 0 }, e: { r: 22, c: 0 } },
      { s: { r: 21, c: 1 }, e: { r: 22, c: 1 } }
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "BieuPhiHoaHong");
    XLSX.writeFile(wb, "VCX_Mau_Bieu_Phi_Hoa_Hong.xlsx");
    triggerNotification('success', 'Đã tải xuống file Excel mẫu hoa hồng thành công!');
  };

  const downloadBankReferralsTemplate = () => {
    const headers = [
      'TỶ LỆ % CHUYÊN THU VCX QUA NGÂN HÀNG 2026',
      'DBV', 'PJICO', 'MIC', 'PVI', 'BSH', 'PTI', 'BẢO VIỆT', 'BẢO LONG', 'TASCO', 'LIBERTY', 'BẢO MINH',
      'GHI CHÚ'
    ];
    
    const dataRows = BANK_OPTIONS.slice(1).map(bankName => {
      const row: any[] = [bankName];
      headers.slice(1, -1).forEach(compName => {
        let compId = compName;
        if (compName === 'PJICO') compId = 'PJI';
        if (compName === 'BẢO VIỆT') compId = 'BV';
        if (compName === 'BẢO LONG') compId = 'BL';
        
        const match = bankReferralsData.find(b => b.companyId === compId && b.bankName === bankName);
        row.push(match ? `${(match.rate * 100).toFixed(1)}%` : '');
      });
      row.push('');
      return row;
    });

    const worksheetData = [headers, ...dataRows];
    const ws = XLSX.utils.aoa_to_sheet(worksheetData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'ChuyenThu');
    
    ws['!cols'] = [{ wch: 35 }];
    for (let c = 1; c < headers.length; c++) {
      ws['!cols'].push({ wch: 12 });
    }

    XLSX.writeFile(wb, 'Bieu_phi_chuyen_thu_ngan_hang_2026.xlsx');
    triggerNotification('success', 'Đã tải xuống tệp tin biểu phí chuyên thu mẫu!');
  };

  const handleCommExcelUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsName = wb.SheetNames[0];
        const ws = wb.Sheets[wsName];
        
        const rows = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1 });
        if (rows.length <= 1) {
          triggerNotification('error', 'File Excel trống hoặc không đúng cấu trúc mẫu!');
          return;
        }

        const COMPANY_NAME_TO_ID: Record<string, string> = {
          'BẢO MINH': 'BM', 'BAO MINH': 'BM',
          'TASCO': 'TAS',
          'DBV NAM BÌNH DƯƠNG': 'DBV', 'DBV': 'DBV', 'DBV HÀNG KHÔNG': 'DBV', 'DBV HANG KHONG': 'DBV',
          'BẢO LONG': 'BL', 'BAO LONG': 'BL',
          'LIBERTY': 'LB',
          'PJICO': 'PJI',
          'PJICO*': 'PJI_STAR', 'PJICO STAR': 'PJI_STAR',
          'PVI DẦU KHÍ': 'PVI', 'PVI DAU KHI': 'PVI', 'PVI': 'PVI',
          'MIC BSG': 'MIC', 'MIC': 'MIC', 'MIC QUÂN ĐỘI': 'MIC', 'MIC QUAN DOI': 'MIC',
          'PTI THỐNG NHẤT': 'PTI', 'PTI THONG NHAT': 'PTI', 'PTI': 'PTI', 'PTI BƯU ĐIỆN': 'PTI', 'PTI BUU DIEN': 'PTI',
          'VASS': 'VS',
          'BẢO VIỆT': 'BV', 'BAO VIET': 'BV'
        };

        const newGrid: Record<string, Record<string, any>> = JSON.parse(JSON.stringify(customCommsGrid));
        
        // Group parsed rows by company ID
        const rawRatesByCompany: Record<string, Array<{ detail: string, rate: number }>> = {};
        
        let activeCompanyName = '';
        const dataRows = rows.slice(1);
        
        dataRows.forEach(row => {
          if (!row || row.length < 3) return;
          
          let companyName = row[1]?.toString().trim();
          if (companyName) {
            activeCompanyName = companyName;
          } else {
            companyName = activeCompanyName;
          }
          
          const companyId = COMPANY_NAME_TO_ID[companyName.toUpperCase()];
          if (!companyId) return;

          const detail = row[2]?.toString().trim() || '';
          const rawVal = row[3];
          if (rawVal === undefined || rawVal === '') return;

          // Parse rate value e.g. 15% -> 0.15, or 15 -> 0.15
          let numVal = parseFloat(rawVal.toString().replace('%', '').replace(',', '.').trim());
          if (isNaN(numVal)) return;

          // Scale down percentage values
          const rate = numVal > 1 ? numVal / 100 : numVal;

          if (!rawRatesByCompany[companyId]) {
            rawRatesByCompany[companyId] = [];
          }
          rawRatesByCompany[companyId].push({ detail, rate });
        });

        // Apply rules mapping
        Object.entries(rawRatesByCompany).forEach(([companyId, details]) => {
          if (['BM', 'TAS', 'BL', 'LB', 'VS', 'BV'].includes(companyId)) {
            // Flat rate for all categories
            const match = details[0];
            if (match) {
              vehiclesList.forEach(v => {
                if (!newGrid[v.id]) newGrid[v.id] = {};
                newGrid[v.id][companyId] = match.rate;
              });
              // EVs
              ['personal_under_9_ev', 'personal_over_9_ev'].forEach(evId => {
                if (!newGrid[evId]) newGrid[evId] = {};
                newGrid[evId][companyId] = match.rate;
              });
            }
          } 
          else if (companyId === 'DBV') {
            const grabOrCommUnder9 = details.find(d => d.detail.includes('đến 9 chỗ'))?.rate ?? 0.15;
            const taxi = details.find(d => d.detail.includes('Taxi'))?.rate ?? 0.15;
            const others = details.find(d => d.detail.includes('còn lại'))?.rate ?? 0.15;

            vehiclesList.forEach(v => {
              if (!newGrid[v.id]) newGrid[v.id] = {};
              if (['grab', 'commercial_under_9', 'self_drive'].includes(v.id)) {
                newGrid[v.id][companyId] = grabOrCommUnder9;
              } else if (v.id === 'taxi') {
                newGrid[v.id][companyId] = taxi;
              } else {
                newGrid[v.id][companyId] = others;
              }
            });
            // EVs
            ['personal_under_9_ev', 'personal_over_9_ev'].forEach(evId => {
              if (!newGrid[evId]) newGrid[evId] = {};
              newGrid[evId][companyId] = others;
            });
          }
          else if (companyId === 'PJI') {
            const under700 = details.find(d => d.detail.includes('DƯỚI'))?.rate ?? 0.15;
            const over700 = details.find(d => d.detail.includes('TRÊN'))?.rate ?? 0.15;

            const rules = [
              { maxVal: 700000000, rate: under700 },
              { maxVal: null, rate: over700 }
            ];

            vehiclesList.forEach(v => {
              if (!newGrid[v.id]) newGrid[v.id] = {};
              newGrid[v.id][companyId] = rules;
            });
            ['personal_under_9_ev', 'personal_over_9_ev'].forEach(evId => {
              if (!newGrid[evId]) newGrid[evId] = {};
              newGrid[evId][companyId] = rules;
            });
          }
          else if (companyId === 'PJI_STAR') {
            const under600 = details.find(d => d.detail.includes('DƯỚI'))?.rate ?? 0.15;
            const range600to800 = details.find(d => d.detail.includes('600TR - 800TR'))?.rate ?? 0.15;
            const over800 = details.find(d => d.detail.includes('TRÊN'))?.rate ?? 0.15;

            const rules = [
              { maxVal: 600000000, rate: under600 },
              { maxVal: 800000000, rate: range600to800 },
              { maxVal: null, rate: over800 }
            ];

            vehiclesList.forEach(v => {
              if (!newGrid[v.id]) newGrid[v.id] = {};
              newGrid[v.id][companyId] = rules;
            });
            ['personal_under_9_ev', 'personal_over_9_ev'].forEach(evId => {
              if (!newGrid[evId]) newGrid[evId] = {};
              newGrid[evId][companyId] = rules;
            });
          }
          else if (companyId === 'PVI') {
            const under500 = details.find(d => d.detail.includes('DƯỚI'))?.rate ?? 0.15;
            const range500to700 = details.find(d => d.detail.includes('500-700TR'))?.rate ?? 0.15;
            const range701to1B = details.find(d => d.detail.includes('701- 1 tỷ') || d.detail.includes('701'))?.rate ?? 0.15;
            const over1B = details.find(d => d.detail.includes('TRÊN'))?.rate ?? 0.15;

            const rules = [
              { maxVal: 500000000, rate: under500 },
              { maxVal: 700000000, rate: range500to700 },
              { maxVal: 1000000000, rate: range701to1B },
              { maxVal: null, rate: over1B }
            ];

            vehiclesList.forEach(v => {
              if (!newGrid[v.id]) newGrid[v.id] = {};
              newGrid[v.id][companyId] = rules;
            });
            ['personal_under_9_ev', 'personal_over_9_ev'].forEach(evId => {
              if (!newGrid[evId]) newGrid[evId] = {};
              newGrid[evId][companyId] = rules;
            });
          }
          else if (companyId === 'MIC') {
            const stdUnder700 = details.find(d => !d.detail.includes('ĐIỆN') && d.detail.includes('DƯỚI'))?.rate ?? 0.15;
            const stdOver700 = details.find(d => !d.detail.includes('ĐIỆN') && d.detail.includes('TRÊN'))?.rate ?? 0.15;
            const evUnder700 = details.find(d => d.detail.includes('ĐIỆN') && d.detail.includes('DƯỚI'))?.rate ?? 0.15;
            const evOver700 = details.find(d => d.detail.includes('ĐIỆN') && d.detail.includes('TRÊN'))?.rate ?? 0.15;

            const stdRules = [
              { maxVal: 700000000, rate: stdUnder700 },
              { maxVal: null, rate: stdOver700 }
            ];
            const evRules = [
              { maxVal: 700000000, rate: evUnder700 },
              { maxVal: null, rate: evOver700 }
            ];

            vehiclesList.forEach(v => {
              if (!newGrid[v.id]) newGrid[v.id] = {};
              newGrid[v.id][companyId] = stdRules;
            });
            ['personal_under_9_ev', 'personal_over_9_ev'].forEach(evId => {
              if (!newGrid[evId]) newGrid[evId] = {};
              newGrid[evId][companyId] = evRules;
            });
          }
          else if (companyId === 'PTI') {
            const under800 = details.find(d => d.detail.includes('DƯỚI'))?.rate ?? 0.15;
            const over800 = details.find(d => d.detail.includes('TRÊN') || d.detail.includes('TỪ'))?.rate ?? 0.15;

            const rules = [
              { maxVal: 800000000, rate: under800 },
              { maxVal: null, rate: over800 }
            ];

            vehiclesList.forEach(v => {
              if (!newGrid[v.id]) newGrid[v.id] = {};
              newGrid[v.id][companyId] = rules;
            });
            ['personal_under_9_ev', 'personal_over_9_ev'].forEach(evId => {
              if (!newGrid[evId]) newGrid[evId] = {};
              newGrid[evId][companyId] = rules;
            });
          }
        });

        setCommPreviewData(newGrid);
        triggerNotification('success', 'Đã nạp file Excel hoa hồng. Vui lòng xem trước và nhấn áp dụng!');
      } catch (err) {
        console.error(err);
        triggerNotification('error', 'Lỗi khi đọc file Excel hoa hồng!');
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleCommDocUpload = (file: File) => {
    setIsCommUploading(true);
    setCommPreviewData(null);

    const fileType = file.type.startsWith('image/') ? 'image' : 'txt';
    const reader = new FileReader();
    
    reader.onload = async (evt) => {
      try {
        const body: any = {
          fileType,
          mimeType: file.type
        };

        if (fileType === 'txt') {
          body.text = evt.target?.result as string;
        } else {
          const base64Url = evt.target?.result as string;
          body.base64 = base64Url.split(',')[1];
        }

        const res = await fetch('/api/auto/parse-document', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify(body)
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Lỗi xử lý file');

        if (data.status === 'success' && Array.isArray(data.updates)) {
          const newGrid: Record<string, Record<string, any>> = JSON.parse(JSON.stringify(customCommsGrid));
          
          data.updates.forEach((up: any) => {
            const { carType, companyId, rate, rules } = up;
            const valueToUse = rules || rate;
            if (carType === 'all') {
              vehiclesList.forEach(v => {
                if (!newGrid[v.id]) newGrid[v.id] = {};
                newGrid[v.id][companyId] = valueToUse;
              });
            } else if (newGrid[carType] !== undefined || vehiclesList.some(v => v.id === carType)) {
              if (!newGrid[carType]) newGrid[carType] = {};
              newGrid[carType][companyId] = valueToUse;
            }
          });

          setCommPreviewData(newGrid);
          triggerNotification('success', 'Nhận diện tài liệu hoa hồng thành công! Vui lòng xem trước và nhấn áp dụng.');
        } else {
          throw new Error(data.message || 'Không thể trích xuất hoa hồng từ tài liệu');
        }
      } catch (err: any) {
        triggerNotification('error', err.message);
      } finally {
        setIsCommUploading(false);
      }
    };

    if (fileType === 'txt') {
      reader.readAsText(file);
    } else {
      reader.readAsDataURL(file);
    }
  };

  // Excel template download, uploading and confirming batch creation handlers
  const downloadExcelTemplate = () => {
    const headers = [
      ["Tên đăng nhập (username)", "Mật khẩu (password)", "Họ tên (name)", "Vai trò (role)", "Tài khoản trực thuộc (parent_username)"]
    ];
    
    const sampleRows = [
      ["admin_sample", "123456", "Nguyễn Văn Admin", "admin", "master"],
      ["client_sample", "123456", "Trần Thị Client", "client", "admin_sample"],
      ["user_sample", "123456", "Lê Văn User", "user", "client_sample"]
    ];

    const data = [...headers, ...sampleRows];
    const ws = XLSX.utils.aoa_to_sheet(data);
    ws['!cols'] = [
      { wch: 25 }, // username
      { wch: 20 }, // password
      { wch: 25 }, // name
      { wch: 15 }, // role
      { wch: 30 }  // parent
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "DanhSachTaiKhoanMoi");
    XLSX.writeFile(wb, "VCX_Mau_Tao_Tai_Khoan.xlsx");
    triggerNotification('success', 'Đã tải xuống file Excel mẫu thành công!');
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      const mockEvent = {
        target: {
          files: [file]
        }
      } as any;
      handleExcelUpload(mockEvent);
    }
  };

  const handleStartEditCompany = (c: InsuranceCompany) => {
    setEditingCompanyId(c.id);
    setNewCompanyId(c.id);
    setNewCompanyName(c.name);
    setNewCompanyColor(c.color);
    setNewCompanyText(c.text || '');
    setNewCompanyBorder(c.border || '');
    setNewCompanyHasRates(c.hasRates);
  };

  const handleCancelEditCompany = () => {
    setEditingCompanyId(null);
    setNewCompanyId('');
    setNewCompanyName('');
    setNewCompanyColor('#2563eb');
    setNewCompanyText('');
    setNewCompanyBorder('');
    setNewCompanyHasRates(true);
  };

  const handleExcelUpload = (e: React.ChangeEvent<HTMLInputElement> | { target: { files: File[] } }) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setBatchUploadErrors([]);
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsName = wb.SheetNames[0];
        const ws = wb.Sheets[wsName];
        
        const rows = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1 });
        if (rows.length <= 1) {
          triggerNotification('error', 'File Excel trống hoặc không đúng cấu trúc mẫu!');
          return;
        }

        const dataRows = rows.slice(1);
        const parsed = dataRows.map((row) => {
          return {
            username: row[0]?.toString().trim() || '',
            password: row[1]?.toString().trim() || '',
            name: row[2]?.toString().trim() || '',
            phone: row[3]?.toString().trim() || '',
            role: row[4]?.toString().trim() || '',
            parentUsername: row[5]?.toString().trim() || ''
          };
        }).filter(r => r.username && r.role);

        if (parsed.length === 0) {
          triggerNotification('error', 'Không tìm thấy dòng tài khoản hợp lệ nào trong file!');
          return;
        }

        setParsedExcelRows(parsed);
        triggerNotification('success', `Đã phân tích thành công ${parsed.length} tài khoản từ Excel. Hãy xác nhận bên dưới!`);
      } catch (err) {
        console.error('Parse Excel failed', err);
        triggerNotification('error', 'Lỗi khi đọc file Excel. Vui lòng kiểm tra định dạng file!');
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleConfirmBatchCreate = () => {
    if (parsedExcelRows.length === 0) return;
    setIsUploading(true);
    setBatchUploadErrors([]);

    fetch('/api/users/batch', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ users: parsedExcelRows })
    })
    .then(async res => {
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Gửi yêu cầu thất bại');
      
      if (data.errors && data.errors.length > 0) {
        setBatchUploadErrors(data.errors);
        triggerNotification('warning', `Đã tạo được ${data.success} tài khoản, có ${data.failed} dòng bị lỗi.`);
      } else {
        triggerNotification('success', `Đã tạo thành công toàn bộ ${data.success} tài khoản từ Excel!`);
        setParsedExcelRows([]);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
      fetchUsers();
    })
    .catch(err => {
      triggerNotification('error', err.message);
    })
    .finally(() => {
      setIsUploading(false);
    });
  };

  // Google Sheets Sync handler
  const handleSyncSheets = (type: 'commissions' | 'rates') => {
    setIsSyncing(true);
    const syncUrl = type === 'commissions' ? commissionSheetsUrl : ratesSheetsUrl;

    fetch(`/api/sync/${type}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ url: syncUrl })
    })
    .then(async res => {
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Sync failed');
      
      const changesList = data.changes && data.changes.length > 0 
        ? data.changes.map((c: any) => `${c.companyName}: ${c.changesText}`)
        : ['Không có thay đổi nào so với cơ sở dữ liệu hiện tại'];

      triggerNotification('success', `Đồng bộ ${type === 'commissions' ? 'hoa hồng' : 'tỉ lệ phí'} hoàn tất!`, changesList);
      
      // Reload rates or commissions
      if (type === 'commissions') {
        fetch('/api/commissions', { headers: { Authorization: `Bearer ${token}` } })
          .then(res => res.json())
          .then(data => setCommissionsData(data));
      } else {
        fetch('/api/rates')
          .then(res => res.json())
          .then(data => setRatesData(data));
      }
    })
    .catch(err => {
      triggerNotification('error', err.message);
    })
    .finally(() => {
      setIsSyncing(false);
    });
  };

  const handleFetchRatesPreview = () => {
    if (!ratesSheetsUrl.trim()) {
      triggerNotification('error', 'Vui lòng nhập đường dẫn Google Sheets');
      return;
    }
    setIsPreviewingRates(true);
    setRatesPreviewData(null);
    fetch('/api/sync/rates/preview', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ url: ratesSheetsUrl })
    })
    .then(async res => {
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Lấy dữ liệu xem trước thất bại');
      setRatesPreviewData(data.previewRates);
      triggerNotification('success', data.message || 'Đã tải dữ liệu xem trước thành công!');
    })
    .catch(err => {
      triggerNotification('error', err.message);
    })
    .finally(() => {
      setIsPreviewingRates(false);
    });
  };

  const handleApplyRatesPreview = () => {
    if (!ratesPreviewData || ratesPreviewData.length === 0) {
      triggerNotification('error', 'Không có dữ liệu biểu phí xem trước để áp dụng');
      return;
    }
    setIsApplyingRates(true);
    fetch('/api/sync/rates/apply', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ rates: ratesPreviewData, vehicles: vehiclesList })
    })
    .then(async res => {
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Áp dụng biểu phí thất bại');
      triggerNotification('success', data.message || 'Đã áp dụng biểu phí thành công!');
      // Refresh active rates and vehicles
      fetch('/api/rates')
        .then(res => res.json())
        .then(d => setRatesData(d));
      fetch('/api/vehicles')
        .then(res => res.json())
        .then(d => setVehiclesList(d));
    })
    .catch(err => {
      triggerNotification('error', err.message);
    })
    .finally(() => {
      setIsApplyingRates(false);
    });
  };

  const handleUpdatePreviewRate = (carTypeId: string, ruleIndex: number, ageBracket: number, newValue: number) => {
    if (!ratesPreviewData) return;
    setRatesPreviewData(prev => {
      if (!prev) return null;
      return prev.map(item => {
        if (item.carType === carTypeId && 
            item.companyId === selectedInsurerForEdit && 
            item.isEV === editIsEV && 
            (!editIsEV || (selectedInsurerForEdit !== 'BV' ? !item.evModel : item.evModel === editEvModel))) {
          const updatedRules = [...item.rules];
          const updatedRates = [...updatedRules[ruleIndex].rates] as number[];
          updatedRates[ageBracket] = newValue;
          updatedRules[ruleIndex] = {
            ...updatedRules[ruleIndex],
            rates: updatedRates
          };
          return {
            ...item,
            rules: updatedRules
          };
        }
        return item;
      });
    });
  };

  // AI Conditions parsing handler
  const handleAIParseConditions = (type: 'rates' | 'commissions') => {
    if (!aiConditionText.trim()) return;
    setIsAIAnalyzing(true);
    setAiClarificationQuestions([]);

    fetch('/api/ai/parse-conditions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ text: aiConditionText, type })
    })
    .then(async res => {
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Phân tích thất bại');
      
      if (data.status === 'clarification_needed') {
        setAiClarificationQuestions(data.questions);
        triggerNotification('warning', 'Hệ thống cần làm rõ một số điểm trong điều kiện bạn đã cung cấp');
      } else {
        triggerNotification('success', data.message, data.changes);
        setAiConditionText('');
        
        // Reload
        if (type === 'commissions') {
          fetch('/api/commissions', { headers: { Authorization: `Bearer ${token}` } })
            .then(res => res.json())
            .then(data => setCommissionsData(data));
        } else {
          fetch('/api/rates')
            .then(res => res.json())
            .then(data => setRatesData(data));
        }
      }
    })
    .catch(err => {
      triggerNotification('error', err.message);
    })
    .finally(() => {
      setIsAIAnalyzing(false);
    });
  };

  // Company CRUD handlers
  const handleCreateCompany = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCompanyId || !newCompanyName) return;

    const url = editingCompanyId ? `/api/companies/${editingCompanyId}` : '/api/companies';
    const method = editingCompanyId ? 'PUT' : 'POST';

    fetch(url, {
      method: method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        id: newCompanyId.toUpperCase(),
        name: newCompanyName,
        color: newCompanyColor,
        text: '',
        border: '',
        hasRates: newCompanyHasRates
      })
    })
    .then(async res => {
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Thao tác thất bại');
      triggerNotification('success', editingCompanyId ? 'Cập nhật hãng bảo hiểm thành công!' : `Tạo hãng bảo hiểm thành công: ${newCompanyName}`);
      handleCancelEditCompany();
      
      // Reload
      fetch('/api/companies')
        .then(res => res.json())
        .then(data => {
          setCompanies(data);
          setSelectedCompanies(data.map((c: any) => c.id));
        });
    })
    .catch(err => {
      triggerNotification('error', err.message);
    });
  };

  const handleDeleteCompany = (id: string, name: string) => {
    if (!confirm(`Bạn có chắc chắn muốn xoá hãng ${name}? Điều này cũng xoá toàn bộ tỉ lệ phí và hoa hồng của hãng!`)) return;

    fetch(`/api/companies/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    })
    .then(async res => {
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Delete company failed');
      }
      triggerNotification('success', `Đã xoá hãng bảo hiểm ${name}`);
      
      fetch('/api/companies')
        .then(res => res.json())
        .then(data => {
          setCompanies(data);
          setSelectedCompanies(data.map((c: any) => c.id));
        });
    })
    .catch(err => {
      triggerNotification('error', err.message);
    });
  };

  // Bank Referral CRUD handlers
  const handleSaveBankReferral = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bankRefCompanyInput || !bankRefNameInput || bankRefRateInput === '') return;

    const rateVal = parseFloat(bankRefRateInput) / 100; // e.g. 5% -> 0.05
    if (isNaN(rateVal) || rateVal < 0 || rateVal > 1) {
      triggerNotification('error', 'Tỷ lệ chuyên thu không hợp lệ (phải từ 0% đến 100%)');
      return;
    }

    const url = editingBankRef ? `/api/bank-referrals/${editingBankRef.id}` : '/api/bank-referrals';
    const method = editingBankRef ? 'PUT' : 'POST';

    fetch(url, {
      method: method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        companyId: bankRefCompanyInput,
        bankName: bankRefNameInput,
        rate: rateVal
      })
    })
    .then(async res => {
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Thao tác thất bại');
      triggerNotification('success', editingBankRef ? 'Cập nhật cấu hình chuyên thu thành công!' : 'Tạo cấu hình chuyên thu thành công!');
      setShowBankRefModal(false);
      setEditingBankRef(null);
      fetchBankReferrals();
    })
    .catch(err => {
      triggerNotification('error', err.message);
    });
  };

  const handleStartAddBankRef = () => {
    setEditingBankRef(null);
    setBankRefCompanyInput(companies[0]?.id || '');
    setBankRefNameInput(BANK_OPTIONS[1]); // TP BANK - VAY MỚI
    setBankRefRateInput('5');
    setShowBankRefModal(true);
  };

  const handleStartEditBankRef = (ref: BankReferral) => {
    setEditingBankRef(ref);
    setBankRefCompanyInput(ref.companyId);
    setBankRefNameInput(ref.bankName);
    setBankRefRateInput((ref.rate * 100).toString());
    setShowBankRefModal(true);
  };

  const handleDeleteBankReferral = (id: string, companyId: string, bankName: string) => {
    if (!confirm(`Bạn có chắc chắn muốn xoá chuyên thu của hãng ${companyId} tại ngân hàng ${bankName}?`)) return;

    fetch(`/api/bank-referrals/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    })
    .then(async res => {
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Delete failed');
      }
      triggerNotification('success', `Đã xoá cấu hình chuyên thu hãng ${companyId} - ngân hàng ${bankName}`);
      fetchBankReferrals();
    })
    .catch(err => {
      triggerNotification('error', err.message);
    });
  };

  const handleUploadBankReferralsExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        
        const wsName = wb.SheetNames[0];
        const ws = wb.Sheets[wsName];
        const rows = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1 });
        if (rows.length <= 1) {
          triggerNotification('error', 'File Excel không có dữ liệu hoặc định dạng không hợp lệ');
          return;
        }

        const headers = rows[0];
        const dataRows = rows.slice(1);
        const parsedRows: any[] = [];
        const errors: string[] = [];

        const matchBankName = (input: string): string | null => {
          const removeAccents = (str: string) => {
            return str
              .normalize('NFD')
              .replace(/[\u0300-\u036f]/g, '')
              .replace(/đ/g, 'd')
              .replace(/Đ/g, 'd');
          };
          const cleanInput = removeAccents(input.trim().toLowerCase()).replace(/\s+/g, '');
          if (cleanInput === 'msb-nhhanghai' || cleanInput === 'msb-nganhanghanghai') {
            return 'MSB - NGÂN HÀNG HÀNG HẢI';
          }
          if (cleanInput === 'tecmcombank-namdau' || cleanInput === 'techcombank-namdau') {
            return 'TECHCOMBANK - NĂM ĐẦU';
          }
          if (cleanInput === 'tecmcombank-namthu2' || cleanInput === 'techcombank-namthu2') {
            return 'TECHCOMBANK - NĂM THỨ 2';
          }
          const match = BANK_OPTIONS.find(opt => {
            const cleanOpt = removeAccents(opt.toLowerCase()).replace(/\s+/g, '');
            return cleanOpt === cleanInput;
          });
          return match || null;
        };

        const colMappings: Array<{ colIdx: number; companyId: string } | null> = [];
        headers.forEach((hVal, idx) => {
          if (idx === 0) {
            colMappings.push(null);
            return;
          }
          const hStr = hVal?.toString().trim();
          if (!hStr || hStr.toLowerCase() === 'ghi chú' || hStr.toLowerCase() === 'note') {
            colMappings.push(null);
            return;
          }

          let mappedCompany = companies.find(c => 
            c.id.toLowerCase() === hStr.toLowerCase() ||
            c.name.toLowerCase().replace(/\s+/g, '') === hStr.toLowerCase().replace(/\s+/g, '')
          );
          if (!mappedCompany) {
            if (hStr.toLowerCase() === 'pjico') {
              mappedCompany = companies.find(c => c.id === 'PJI');
            } else if (hStr.toLowerCase() === 'bảo việt') {
              mappedCompany = companies.find(c => c.id === 'BV');
            } else if (hStr.toLowerCase() === 'bảo long') {
              mappedCompany = companies.find(c => c.id === 'BL');
            }
          }

          if (mappedCompany) {
            colMappings.push({ colIdx: idx, companyId: mappedCompany.id });
          } else {
            colMappings.push(null);
          }
        });

        dataRows.forEach((row, idx) => {
          const bankVal = row[0]?.toString().trim();
          if (!bankVal) return;

          const matchedBank = matchBankName(bankVal);
          if (!matchedBank) {
            errors.push(`Dòng ${idx + 2}: Ngân hàng '${bankVal}' không hợp lệ`);
            return;
          }

          colMappings.forEach((mapping, colIdx) => {
            if (!mapping) return;

            const cellVal = row[colIdx]?.toString().trim();
            if (cellVal === undefined || cellVal === '') return;

            let rateNum = NaN;
            if (cellVal.endsWith('%')) {
              rateNum = parseFloat(cellVal.slice(0, -1)) / 100;
            } else {
              const parsed = parseFloat(cellVal);
              if (!isNaN(parsed)) {
                if (parsed > 1) {
                  rateNum = parsed / 100;
                } else {
                  rateNum = parsed;
                }
              }
            }

            if (isNaN(rateNum) || rateNum < 0 || rateNum > 1) {
              errors.push(`Dòng ${idx + 2}, Cột '${headers[colIdx]}': Tỷ lệ chuyên thu '${cellVal}' không hợp lệ (phải từ 0% đến 100%)`);
              return;
            }

            parsedRows.push({
              companyVal: mapping.companyId,
              bankVal: matchedBank,
              rateVal: rateNum
            });
          });
        });

        if (errors.length > 0) {
          setNotification({
            type: 'error',
            message: 'Phát hiện lỗi trong file Excel chuyên thu!',
            details: errors
          });
          if (bankReferralsFileInputRef.current) bankReferralsFileInputRef.current.value = '';
          return;
        }

        setBankReferralsPreviewData(parsedRows);
        triggerNotification('success', `Tải lên thành công! Đang xem trước ${parsedRows.length} cấu hình chuyên thu ngân hàng.`);
      } catch (err: any) {
        console.error(err);
        triggerNotification('error', 'Lỗi khi đọc file Excel chuyên thu: ' + err.message);
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleApplyBankReferralsPreview = () => {
    if (!bankReferralsPreviewData) return;

    fetch('/api/bank-referrals/import', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ referrals: bankReferralsPreviewData })
    })
    .then(async res => {
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Lưu cấu hình thất bại');
      triggerNotification('success', data.message || 'Đã cập nhật chuyên thu ngân hàng thành công!');
      setBankReferralsPreviewData(null);
      if (bankReferralsFileInputRef.current) bankReferralsFileInputRef.current.value = '';
      fetchBankReferrals();
    })
    .catch(err => {
      triggerNotification('error', err.message);
    });
  };

  const handleCancelBankReferralsPreview = () => {
    setBankReferralsPreviewData(null);
    if (bankReferralsFileInputRef.current) bankReferralsFileInputRef.current.value = '';
    triggerNotification('warning', 'Đã hủy xem trước file Excel.');
  };

  const handleUpdateMinPremium = (carTypeId: string, ruleIndex: number, newValue: number | null) => {
    const targetSet = ratesPreviewData ? setRatesPreviewData : setRatesData;
    targetSet((prev: any[] | null) => {
      if (!prev) return null;
      return prev.map(item => {
        if (item.carType === carTypeId && 
            item.companyId === selectedInsurerForEdit && 
            item.isEV === editIsEV && 
            (!editIsEV || (selectedInsurerForEdit !== 'BV' ? !item.evModel : item.evModel === editEvModel))) {
          const updatedRules = [...item.rules];
          updatedRules[ruleIndex] = {
            ...updatedRules[ruleIndex],
            minPremium: newValue
          };
          return {
            ...item,
            rules: updatedRules
          };
        }
        return item;
      });
    });
  };

  const handleUpdateDeductible = (carTypeId: string, ruleIndex: number, newValue: number | null) => {
    const targetSet = ratesPreviewData ? setRatesPreviewData : setRatesData;
    targetSet((prev: any[] | null) => {
      if (!prev) return null;
      return prev.map(item => {
        if (item.carType === carTypeId && 
            item.companyId === selectedInsurerForEdit && 
            item.isEV === editIsEV && 
            (!editIsEV || (selectedInsurerForEdit !== 'BV' ? !item.evModel : item.evModel === editEvModel))) {
          const updatedRules = [...item.rules];
          updatedRules[ruleIndex] = {
            ...updatedRules[ruleIndex],
            deductible: newValue
          };
          return {
            ...item,
            rules: updatedRules
          };
        }
        return item;
      });
    });
  };

  const handleUpdateRate = (carTypeId: string, ruleIndex: number, ageBracket: number, newValue: number) => {
    const targetSet = ratesPreviewData ? setRatesPreviewData : setRatesData;
    targetSet((prev: any[] | null) => {
      if (!prev) return null;
      return prev.map(item => {
        if (item.carType === carTypeId && 
            item.companyId === selectedInsurerForEdit && 
            item.isEV === editIsEV && 
            (!editIsEV || (selectedInsurerForEdit !== 'BV' ? !item.evModel : item.evModel === editEvModel))) {
          const updatedRules = [...item.rules];
          const updatedRates = [...updatedRules[ruleIndex].rates] as number[];
          updatedRates[ageBracket] = newValue;
          updatedRules[ruleIndex] = {
            ...updatedRules[ruleIndex],
            rates: updatedRates
          };
          return {
            ...item,
            rules: updatedRules
          };
        }
        return item;
      });
    });
  };

  // ==========================================
  // EXCEL RATE MANAGEMENT HANDLERS
  // ==========================================
  const handleDownloadActiveRates = () => {
    if (ratesData.length === 0) {
      triggerNotification('error', 'Chưa có dữ liệu biểu phí để tải xuống');
      return;
    }

    const headers = [
      "HÃNG", "Động cơ", "Mã Loại xe", "Loại xe / Nghiệp vụ", "Giá trị xe (triệu)", 
      "< 3 năm", "3 - 6 năm", "6 - 10 năm", "10 - 15 năm", "15 - 20 năm", "> 20 năm", "Phí tối thiểu", "Mức khấu trừ"
    ];

    const getVehicleCode = (vehicleId: string): string => {
      const idx = vehiclesList.findIndex(v => v.id === vehicleId);
      if (idx === -1) return '';
      const vehicle = vehiclesList[idx];
      const firstLetter = vehicle.group.charAt(0);
      return `${firstLetter}${idx + 1}`;
    };

    const generateSheetRowsForCompany = (comp: InsuranceCompany, isEV: boolean) => {
      const engineType = isEV ? 'Điện' : 'Xăng';
      const rows: any[][] = [];
      const companyName = comp.name.toUpperCase();
      
      const groups: Record<string, any[]> = {};
      vehiclesList.forEach(v => {
        if (!groups[v.group]) groups[v.group] = [];
        groups[v.group].push(v);
      });
      
      Object.entries(groups).forEach(([groupName, groupVehicles]) => {
        const groupLetter = groupName.charAt(0);
        
        // Add Group Header Row
        rows.push([
          companyName,
          engineType,
          groupLetter,
          groupName,
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          ''
        ]);
        
        groupVehicles.forEach(vehicle => {
          const code = getVehicleCode(vehicle.id);
          const matches = ratesData.filter(r => 
            r.companyId === comp.id && 
            r.carType === vehicle.id && 
            r.isEV === isEV
          );
          
          if (matches.length > 0) {
            matches.forEach(match => {
              const usedEngineType = isEV 
                ? (match.evModel ? `Điện (${match.evModel})` : 'Điện')
                : 'Xăng';
                
              match.rules.forEach(subRule => {
                const limitText = subRule.maxVal === null 
                  ? 'Mọi giá trị' 
                  : `Dưới ${Math.round(subRule.maxVal / 1e6)}`;
                  
                rows.push([
                  comp.id, // Write exact company ID to make import 100% robust
                  usedEngineType,
                  code,
                  vehicle.name,
                  limitText,
                  subRule.rates[0] ?? 0,
                  subRule.rates[1] ?? 0,
                  subRule.rates[2] ?? 0,
                  subRule.rates[3] ?? 0,
                  subRule.rates[4] ?? 0,
                  subRule.rates[5] ?? 0,
                  subRule.minPremium !== undefined && subRule.minPremium !== null ? subRule.minPremium : 0,
                  subRule.deductible !== undefined && subRule.deductible !== null ? subRule.deductible : 0
                ]);
              });
            });
          } else {
            rows.push([
              comp.id,
              engineType,
              code,
              vehicle.name,
              'Mọi giá trị',
              0,
              0,
              0,
              0,
              0,
              0,
              0,
              0
            ]);
          }
        });
      });
      
      return rows;
    };

    const wb = XLSX.utils.book_new();

    // Loop through all companies that have rates and generate a sheet for each
    const activeCompanies = orderedCompanies.filter(c => c.hasRates);
    activeCompanies.forEach(comp => {
      const rowsXang = generateSheetRowsForCompany(comp, false);
      const rowsDien = generateSheetRowsForCompany(comp, true);
      const rows = [...rowsXang, ...rowsDien];

      const data = [headers, ...rows];
      const ws = XLSX.utils.aoa_to_sheet(data);
      ws['!cols'] = [
        { wch: 15 }, // HÃNG (ID)
        { wch: 15 }, // Động cơ
        { wch: 12 }, // Mã Loại xe
        { wch: 45 }, // Loại xe / Nghiệp vụ
        { wch: 20 }, // Giá trị xe (triệu)
        { wch: 12 }, // < 3 năm
        { wch: 12 }, // 3 - 6 năm
        { wch: 12 }, // 6 - 10 năm
        { wch: 12 }, // > 10 năm
        { wch: 15 }, // Phí tối thiểu
        { wch: 15 }  // Mức khấu trừ
      ];

      // Excel sheet names cannot contain forbidden characters and must be unique and <= 31 chars.
      // E.g. "PJICO* (PJI_STAR)" -> forbidden "*". Sanitized -> "PJICO (PJI_STAR)"
      const rawSheetName = `${comp.name} (${comp.id})`;
      const sanitizedSheetName = rawSheetName.replace(/[*\\/??[\]]/g, '').trim().substring(0, 31);
      
      XLSX.utils.book_append_sheet(wb, ws, sanitizedSheetName);
    });

    XLSX.writeFile(wb, "VCX_Bieu_Phi_Toan_Bo.xlsx");
    triggerNotification('success', 'Tải xuống biểu phí toàn bộ các hãng thành công!');
  };

  const handleUploadRatesExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        
        const parsedRows: any[] = [];
        let totalSheetsParsed = 0;
        const tempVehicles = [...vehiclesList];
        
        const parseRateValue = (val: any): number => {
          if (val === null || val === undefined || val === '' || val === '-') return 0;
          let str = val.toString().replace('%', '').trim();
          str = str.replace(',', '.');
          const num = parseFloat(str);
          return isNaN(num) ? 0 : num;
        };

        const parseMaxVal = (val: any): number | null => {
          if (val === null || val === undefined || val === '') return null;
          const str = val.toString().trim().toLowerCase();
          if (str === 'mọi giá trị' || str === '-' || str === 'unlimited' || str === 'null') return null;
          const cleanStr = str.replace(/[^0-9.]/g, '');
          const num = parseFloat(cleanStr);
          if (isNaN(num)) return null;
          if (num < 10000) {
            return num * 1e6;
          }
          return num;
        };

        const parseNumeric = (val: any): number => {
          if (val === null || val === undefined || val === '') return 0;
          const str = val.toString().replace(/[^0-9.-]/g, '').trim();
          const num = parseFloat(str);
          return isNaN(num) ? 0 : num;
        };

        wb.SheetNames.forEach((wsName) => {
          const ws = wb.Sheets[wsName];
          const rows = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1 });
          if (rows.length <= 1) return;

          totalSheetsParsed++;
          const dataRows = rows.slice(1);
          let currentGroup = 'A. XE CHỞ NGƯỜI'; // Sequential tracking of group header

          dataRows.forEach((row) => {
            const rawCompanyVal = row[0]?.toString().trim();
            const engineText = row[1]?.toString().trim() || 'Xăng';
            const codeVal = row[2]?.toString().trim() || '';
            const vehicleNameText = row[3]?.toString().trim();
            
            // Sequential group header row tracking
            if (codeVal && codeVal.length === 1 && vehicleNameText) {
              currentGroup = vehicleNameText;
              return;
            }

            if (!rawCompanyVal) return;

            // Skip group header rows (where Mã Loại xe is just A, B, C, D, E)
            if (codeVal.length === 1) {
              return;
            }

            // Match company by full name or ID
            const matchedComp = companies.find(c => 
              c.id.toLowerCase() === rawCompanyVal.toLowerCase() ||
              c.name.toLowerCase().replace(/\s+/g, '') === rawCompanyVal.toLowerCase().replace(/\s+/g, '')
            );
            const companyIdVal = matchedComp ? matchedComp.id : rawCompanyVal;

            // Match vehicle ID from tempVehicles by its code index or name
            let vehicle = null;
            if (codeVal) {
              const matchNum = codeVal.replace(/\D/g, '');
              const idx = parseInt(matchNum, 10) - 1;
              if (!isNaN(idx) && idx >= 0 && idx < tempVehicles.length) {
                vehicle = tempVehicles[idx];
              }
            }

            if (!vehicle && vehicleNameText) {
              vehicle = tempVehicles.find(v => 
                v.name.toLowerCase().replace(/\s+/g, '') === vehicleNameText.toLowerCase().replace(/\s+/g, '') ||
                v.id.toLowerCase() === vehicleNameText.toLowerCase()
              );
            }

            // Auto-create vehicle if not found in vehiclesList
            if (!vehicle && vehicleNameText) {
              const sanitizedId = 'veh_' + vehicleNameText.toLowerCase()
                .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // Remove Vietnamese tones
                .replace(/đ/g, 'd').replace(/Đ/g, 'd')
                .replace(/[^a-z0-9_]+/g, '_')
                .replace(/^_+|_+$/g, '');
              
              let dbCarType = 'personal';
              const cleanGroup = currentGroup.toUpperCase();
              if (cleanGroup.includes('CHỞ HÀNG') || cleanGroup.includes('TẢI')) {
                dbCarType = 'truck_commercial';
              } else if (cleanGroup.includes('CHUYÊN DÙNG')) {
                dbCarType = 'specialized';
              } else if (cleanGroup.includes('ĐẦU KÉO')) {
                dbCarType = 'tractor';
              } else if (cleanGroup.includes('PICKUP') || cleanGroup.includes('VAN')) {
                dbCarType = 'pickup';
              }

              const newVeh = {
                id: sanitizedId,
                name: vehicleNameText,
                group: currentGroup,
                dbCarType: dbCarType
              };
              tempVehicles.push(newVeh);
              vehicle = newVeh;
            }

            if (!vehicle) {
              console.warn('Could not match or create vehicle:', vehicleNameText, codeVal);
              return;
            }

            const carTypeVal = vehicle.id;

            const isEVVal = engineText.toLowerCase().includes('điện') || engineText.toLowerCase().includes('ev') || engineText.toLowerCase().includes('có');
            let evModelVal: string | null = null;
            if (isEVVal) {
              const matchedModel = EV_MODELS.find(m => engineText.toUpperCase().includes(m.id.toUpperCase()));
              if (matchedModel) {
                evModelVal = matchedModel.id;
              } else {
                if (engineText.includes('VF8') || engineText.includes('VF9')) {
                  evModelVal = 'VF8_9';
                } else if (engineText.includes('VF5')) {
                  evModelVal = 'VF5';
                } else if (engineText.includes('VF3')) {
                  evModelVal = 'VF3';
                } else if (engineText.includes('e34')) {
                  evModelVal = 'VFe34';
                } else if (engineText.includes('VF6')) {
                  evModelVal = 'VF6';
                } else if (engineText.includes('VF7')) {
                  evModelVal = 'VF7';
                }
              }
            }

            const maxValVal = parseMaxVal(row[4]);
            const rate0 = parseRateValue(row[5]);
            const rate1 = parseRateValue(row[6]);
            const rate2 = parseRateValue(row[7]);
            const rate3 = parseRateValue(row[8]);
            const rate4 = parseRateValue(row[9]);
            const rate5 = parseRateValue(row[10]);
            const minPremiumVal = parseNumeric(row[11]);
            const deductibleVal = parseNumeric(row[12]);

            parsedRows.push({
              carType: carTypeVal,
              companyId: companyIdVal,
              isEV: isEVVal,
              evModel: evModelVal,
              maxVal: maxValVal,
              rates: [rate0, rate1, rate2, rate3, rate4, rate5],
              minPremium: minPremiumVal,
              deductible: deductibleVal
            });
          });
        });

        if (totalSheetsParsed === 0 || parsedRows.length === 0) {
          triggerNotification('error', 'Không phân tích được dữ liệu tỉ lệ phí hợp lệ nào từ các sheet!');
          return;
        }

        // Update vehiclesList with newly created vehicles if any
        if (tempVehicles.length > vehiclesList.length) {
          setVehiclesList(tempVehicles);
        }

        const grouped: Record<string, any> = {};
        parsedRows.forEach(item => {
          const key = `${item.carType}_${item.companyId}_${item.isEV}_${item.evModel || ''}`;
          if (!grouped[key]) {
            grouped[key] = {
              id: `${item.carType}_${item.companyId}${item.isEV ? '_ev' : ''}${item.evModel ? '_' + item.evModel : ''}`,
              carType: item.carType,
              companyId: item.companyId,
              isEV: item.isEV,
              evModel: item.evModel,
              rules: []
            };
          }
          grouped[key].rules.push({
            maxVal: item.maxVal,
            rates: item.rates,
            minPremium: item.minPremium,
            deductible: item.deductible
          });
        });

        const newRates: RateRule[] = Object.values(grouped).map(group => {
          group.rules.sort((a: any, b: any) => {
            if (a.maxVal === null) return 1;
            if (b.maxVal === null) return -1;
            return a.maxVal - b.maxVal;
          });
          return group;
        });

        setRatesPreviewData(newRates);
        triggerNotification('success', `Tải lên và phân tích thành công ${newRates.length} quy tắc biểu phí từ ${totalSheetsParsed} sheets. Hãy xác nhận hoặc chỉnh sửa trên bảng!`);
        if (ratesFileInputRef.current) ratesFileInputRef.current.value = '';
      } catch (err: any) {
        console.error('Parse rates Excel failed', err);
        triggerNotification('error', 'Lỗi khi đọc file Excel biểu phí: ' + err.message);
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleSaveActiveRates = () => {
    setIsApplyingRates(true);
    fetch('/api/sync/rates/apply', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ rates: ratesData, vehicles: vehiclesList })
    })
    .then(async res => {
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Lưu biểu phí thất bại');
      triggerNotification('success', data.message || 'Đã lưu biểu phí thành công!');
      // Refresh active rates and vehicles
      fetch('/api/rates')
        .then(res => res.json())
        .then(d => setRatesData(d));
      fetch('/api/vehicles')
        .then(res => res.json())
        .then(d => setVehiclesList(d));
    })
    .catch(err => {
      triggerNotification('error', err.message);
    })
    .finally(() => {
      setIsApplyingRates(false);
    });
  };

  // Vehicle CRUD Handlers removed - managed automatically via rates upload

  // Fetch overrides grid for commissions editing tab (respect visibility)
  useEffect(() => {
    if (!currentUser || activeTab !== 'commissions') return;

    if (selectedCommUser) {
      fetch(`/api/commissions/user/${selectedCommUser}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      .then(res => res.json())
      .then(data => {
        setCustomCommsGrid(data);
      });
    }
  }, [selectedCommUser, activeTab, currentUser, token]);

  const handleSaveCustomComms = () => {
    const overrides: Array<{ carType: string, companyId: string, rate: number }> = [];
    Object.entries(customCommsGrid).forEach(([carType, compMap]) => {
      Object.entries(compMap).forEach(([companyId, rate]) => {
        overrides.push({ carType, companyId, rate });
      });
    });

    fetch(`/api/commissions/user/${selectedCommUser}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ overrides })
    })
    .then(async res => {
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Failed to save');
      }
      triggerNotification('success', 'Đã lưu thay đổi hoa hồng thành công');
      // If we saved for ourselves, reload the active commissions data
      if (selectedCommUser === currentUser?.id) {
        fetch('/api/commissions', { headers: { Authorization: `Bearer ${token}` } })
          .then(res => res.json())
          .then(data => setCommissionsData(data));
      }
    })
    .catch(err => {
      triggerNotification('error', err.message);
    });
  };

  const isEditable = useMemo(() => {
    if (!currentUser || !selectedCommUser) return false;
    
    // 1. Sửa hoa hồng của BẢN THÂN: MASTER, ADMIN, CLIENT được sửa, USER không được sửa
    if (selectedCommUser === currentUser.id) {
      return currentUser.role !== 'user';
    }
    
    // 2. MASTER xem được tất cả nhưng KHÔNG chỉnh sửa được tài khoản khác
    if (currentUser.role === 'master') {
      return false;
    }
    
    // 3. ADMIN chỉnh sửa được CLIENT trong nhánh của mình
    if (currentUser.role === 'admin') {
      const target = usersList.find(u => u.id === selectedCommUser);
      return target ? (target.role === 'client' && target.parentId === currentUser.id) : false;
    }
    
    // 4. CLIENT chỉnh sửa được USER trong nhánh của mình
    if (currentUser.role === 'client') {
      const target = usersList.find(u => u.id === selectedCommUser);
      return target ? (target.role === 'user' && target.parentId === currentUser.id) : false;
    }
    
    return false;
  }, [currentUser, selectedCommUser, usersList]);

  // Core Quote Engine matching logic
  const quotes = useMemo(() => {
    if (ratesData.length === 0) return [];
    const isEV = evModel !== 'gas';
    
    let ageBracket: AgeBracket = 0;
    if (age >= 3 && age < 6) ageBracket = 1;
    else if (age >= 6 && age < 10) ageBracket = 2;
    else if (age >= 10 && age < 15) ageBracket = 3;
    else if (age >= 15 && age < 20) ageBracket = 4;
    else if (age >= 20) ageBracket = 5;

    // Evaluator helper returning full rate info
    const getRateInfo = (comp: string, isEVCar = isEV, model = evModel) => {
      let match = ratesData.find(r => 
        r.companyId === comp && 
        r.carType === carType && 
        r.isEV === isEVCar && 
        (!isEVCar || !r.evModel || r.evModel === model)
      );
      if (!match) {
        match = ratesData.find(r => 
          r.companyId === comp && 
          r.carType === dbCarType && 
          r.isEV === isEVCar && 
          (!isEVCar || !r.evModel || r.evModel === model)
        );
      }
      if (!match) return null;
      const subRule = match.rules.find(sr => sr.maxVal === null || carValue < sr.maxVal);
      if (!subRule) return null;
      
      const ratesArray = subRule.rates || [];
      const rateVal = ratesArray[ageBracket] !== undefined && ratesArray[ageBracket] !== null
        ? ratesArray[ageBracket]
        : (ratesArray[ratesArray.length - 1] ?? 0);

      return {
        rate: rateVal,
        minPremium: subRule.minPremium ?? null,
        deductible: subRule.deductible ?? null
      };
    };

    return orderedCompanies.map(company => {
      let rateValue = 0;
      let minPremium = 3_000_000;
      let deductible = 500_000;
      let usedCompanyName = company.name;

      const isUnlimitedCompany = ['BL', 'PVI', 'PJI', 'PJI_STAR'].includes(company.id);
      const isOverAgeLimit = !isUnlimitedCompany && age > 15;

      if (!isOverAgeLimit) {
        const rateInfo = getRateInfo(company.id);
        if (rateInfo) {
          rateValue = rateInfo.rate;
          
          if (rateInfo.minPremium !== undefined && rateInfo.minPremium !== null) {
            minPremium = rateInfo.minPremium;
          } else {
            // Apply standard fallback rules
            if (company.id === 'BM') minPremium = 4_400_000;
            else if (company.id === 'TAS') {
              const isTruck = ['truck_non_commercial', 'truck_commercial', 'truck_refrigerated'].includes(dbCarType);
              if (!isTruck) minPremium = 6_000_000;
            } else if (company.id === 'PJI' || company.id === 'PJI_STAR') minPremium = 4_500_000;
            else if (company.id === 'DBV') {
              if (age > 0) minPremium = 6_000_000;
            } else if (company.id === 'PVI') {
              if (carValue < 500_000_000) minPremium = 5_500_000;
              else minPremium = 0;
            } else if (company.id === 'PTI') minPremium = 6_500_000;
            else if (company.id === 'BL') minPremium = 4_500_000;
            else if (company.id === 'BV') {
              if (isEV && dbCarType === 'personal' && age > 0) minPremium = 5_500_000;
            } else if (company.id === 'MIC') {
              if (age > 0) minPremium = 5_500_000;
            }
          }

          if (rateInfo.deductible !== undefined && rateInfo.deductible !== null) {
            deductible = rateInfo.deductible;
          } else {
            // Standard Vietnamese insurance deductible defaults
            deductible = ['personal', 'truck_non_commercial'].includes(dbCarType) ? 500_000 : 1_000_000;
          }
        }
      }

      const activeDeductible = customDeductibles[company.id] !== undefined ? customDeductibles[company.id] : deductible;

      if (!rateValue || rateValue === 0) {
        return {
          company: { ...company, name: usedCompanyName },
          rate: 0,
          displayRate: '0',
          basePremium: 0,
          deductible: activeDeductible,
          isAvailable: false
        };
      }

      // Base premium calculation
      let basePremium = (carValue * rateValue) / 100;
      let isMinPremiumApplied = false;

      if (minPremium > 0 && basePremium < minPremium) {
        basePremium = minPremium;
        isMinPremiumApplied = true;
      }

      // Fetch commission rate from user database commissions
      let commissionRate = 0;
      if (currentUser) {
        const targetCarType = isEV ? `${carType}_ev` : carType;
        const commData = (commissionsData[targetCarType] && commissionsData[targetCarType][company.id] !== undefined)
          ? commissionsData[targetCarType][company.id]
          : (commissionsData[carType] && commissionsData[carType][company.id] !== undefined)
            ? commissionsData[carType][company.id]
            : 0.15; // default initial fallback

        if (typeof commData === 'number') {
          commissionRate = commData;
        } else if (Array.isArray(commData)) {
          const sortedRules = [...commData].sort((a, b) => {
            if (a.maxVal === null) return 1;
            if (b.maxVal === null) return -1;
            return a.maxVal - b.maxVal;
          });
          const matchRule = sortedRules.find(r => r.maxVal === null || carValue < r.maxVal);
          commissionRate = matchRule ? matchRule.rate : 0.15;
        }
      }

      let bankReferralRate = 0;
      if (currentUser && selectedBank !== 'Không vay ngân hàng') {
        const refMatch = bankReferralsData.find(b => b.companyId === company.id && b.bankName === selectedBank);
        if (refMatch) {
          bankReferralRate = refMatch.rate;
        }
      }

      const netCommissionRate = currentUser ? (commissionRate - bankReferralRate) : 0;

      const profitValue = Number(profit) || 0;
      let discountedPremium = basePremium;
      if (currentUser) {
        discountedPremium = basePremium - (basePremium / 1.1 * netCommissionRate - profitValue);
        discountedPremium = Math.ceil(discountedPremium / 50000) * 50000;
      }

      return {
        company: { ...company, name: usedCompanyName },
        rate: rateValue,
        displayRate: `${rateValue}`,
        basePremium,
        isMinPremiumApplied,
        minPremium,
        deductible: activeDeductible,
        commissionRate,
        bankReferralRate,
        netCommissionRate,
        discountedPremium,
        isAvailable: true
      };
    });
  }, [carType, manufactureYear, carValue, age, evModel, profit, ratesData, commissionsData, orderedCompanies, currentUser, dbCarType, customDeductibles, selectedBank, bankReferralsData]);

  // Display filter / sorting quotes
  const displayQuotes = useMemo(() => {
    let result = quotes.filter(q => selectedCompanies.includes(q.company.id) && q.isAvailable);

    // Filter out the more expensive between PJICO (PJI) and PJICO* (PJI_STAR)
    const pjiQuote = result.find(q => q.company.id === 'PJI');
    const pjiStarQuote = result.find(q => q.company.id === 'PJI_STAR');
    if (pjiQuote && pjiStarQuote) {
      const premPji = customDiscountedPremiums['PJI'] ?? pjiQuote.discountedPremium;
      const premPjiStar = customDiscountedPremiums['PJI_STAR'] ?? pjiStarQuote.discountedPremium;
      if (premPji < premPjiStar) {
        result = result.filter(q => q.company.id !== 'PJI_STAR');
      } else if (premPjiStar < premPji) {
        result = result.filter(q => q.company.id !== 'PJI');
      }
    }

    if (sortBy === 'price_asc') {
      result = [...result].sort((a, b) => {
        const valA = currentUser ? (customDiscountedPremiums[a.company.id] ?? Math.max(0, a.discountedPremium)) : (customBasePremiums[a.company.id] ?? a.basePremium);
        const valB = currentUser ? (customDiscountedPremiums[b.company.id] ?? Math.max(0, b.discountedPremium)) : (customBasePremiums[b.company.id] ?? b.basePremium);
        return valA - valB;
      });
    } else if (sortBy === 'price_desc') {
      result = [...result].sort((a, b) => {
        const valA = currentUser ? (customDiscountedPremiums[a.company.id] ?? Math.max(0, a.discountedPremium)) : (customBasePremiums[a.company.id] ?? a.basePremium);
        const valB = currentUser ? (customDiscountedPremiums[b.company.id] ?? Math.max(0, b.discountedPremium)) : (customBasePremiums[b.company.id] ?? b.basePremium);
        return valB - valA;
      });
    }
    return result;
  }, [quotes, selectedCompanies, sortBy, customDiscountedPremiums, customBasePremiums, currentUser]);

  // Title text for the quote results block
  const titleText = useMemo(() => {
    const carTypeName = vehiclesList.find(opt => opt.id === carType)?.name || '';
    const isEV = evModel !== 'gas';
    const evText = isEV ? ` (${EV_MODELS.find(opt => opt.id === evModel)?.name || evModel})` : '';
    const carModelText = carModel ? `${carModel} - ` : '';
    return `${carModelText}${carTypeName}${evText} - Đời ${manufactureYear} - Giá trị: ${formatCurrency(carValue)}`;
  }, [carModel, carType, evModel, manufactureYear, carValue]);

  // Download Quote Image handlers
  const handleCopyImage = async () => {
    if (!resultsRef.current || isGenerating) return;
    flushSync(() => {
      setIsGenerating(true);
    });
    try {
      if (!navigator.clipboard || typeof ClipboardItem === 'undefined') {
        throw new Error('Clipboard API không được hỗ trợ hoặc trình duyệt không chạy ở chế độ bảo mật (HTTPS/localhost).');
      }

      // Khởi tạo Promise tạo Blob bằng toBlob trực tiếp để tối ưu hóa hiệu năng
      const blobPromise = toBlob(resultsRef.current!, {
        pixelRatio: 2,
        backgroundColor: '#ffffff',
      }).then(b => {
        if (!b) throw new Error('Không thể tạo dữ liệu ảnh (Blob)');
        return b;
      });

      try {
        // Thử ghi vào clipboard bằng cách truyền trực tiếp Promise (Safari & modern Chrome/Firefox/Edge)
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blobPromise })
        ]);
      } catch (writeErr) {
        console.warn('Ghi clipboard dạng Promise thất bại, chuyển sang ghi Blob trực tiếp (Chrome/Firefox/Edge cũ):', writeErr);
        // Fallback: Chờ blob hoàn thành và ghi trực tiếp
        const blob = await blobPromise;
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob })
        ]);
      }

      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err: any) {
      console.error('Copy image failed, opening manual copy fallback...', err);
      try {
        const dataUrl = await toPng(resultsRef.current!, {
          pixelRatio: 2,
          backgroundColor: '#ffffff',
        });
        setFallbackImageSrc(dataUrl);
      } catch (fallbackErr) {
        console.error('Failed to generate fallback image', fallbackErr);
        alert('Không thể tự động copy ảnh vào Clipboard. Chi tiết lỗi: ' + (err.message || err) + '\n\nHãy đảm bảo bạn đang sử dụng kết nối bảo mật HTTPS (hoặc localhost) và cấp quyền truy cập Clipboard.');
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadImage = async () => {
    if (!resultsRef.current || isGenerating) return;
    flushSync(() => {
      setIsGenerating(true);
    });
    try {
      const dataUrl = await toPng(resultsRef.current, {
        pixelRatio: 2,
        backgroundColor: '#ffffff',
      });
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `VCX-BaoGia-${carModel || 'Xe'}-${manufactureYear}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      console.error('Download image failed', err);
    } finally {
      setIsGenerating(false);
    }
  };

  // Recursive tree diagram renderer (vertical tree with clean connectors)
  const renderTreeNodes = (nodes: any[], level = 0): React.ReactNode => {
    return (
      <div className="flex flex-col gap-4 mt-2">
        {nodes.map((node, index) => {
          const hasChildren = node.children && node.children.length > 0;
          return (
            <div key={node.id} className="relative pl-8">
              {/* Đường nối dọc */}
              {level > 0 && (
                <div 
                  className="absolute left-3 w-0.5 bg-blue-300"
                  style={{ 
                    top: index === 0 ? '0px' : '-16px', 
                    bottom: index === nodes.length - 1 ? '50%' : '0px' 
                  }}
                />
              )}
              {/* Đường nối ngang */}
              {level > 0 && (
                <div className="absolute left-3 top-1/2 w-5 h-0.5 bg-blue-300 -translate-y-1/2" />
              )}
              
              <div className="flex items-center gap-3 bg-white p-3.5 rounded-2xl shadow-sm border border-slate-200 hover:border-blue-500 hover:shadow-md transition-all relative z-10 inline-flex min-w-[300px]">
                <div className={`w-3.5 h-3.5 rounded-full shrink-0 shadow-inner ${
                  node.role === 'admin' ? 'bg-blue-500' :
                  node.role === 'client' ? 'bg-teal-500' : 'bg-amber-500'
                }`} />
                <div>
                  <div className="font-bold text-slate-800 text-sm">
                    {node.name} (@{node.username}){node.phone ? ` - ${node.phone}` : ''}
                  </div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{node.role}</div>
                </div>
              </div>
              
              {hasChildren && (
                <div className="mt-3">
                  {renderTreeNodes(node.children, level + 1)}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };



  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 antialiased pb-12">
      
      {/* Toast Notification */}
      {notification && (
        <div className="fixed top-6 right-6 z-50 max-w-md animate-in slide-in-from-top-4 duration-300">
          <div className={`p-4 rounded-2xl shadow-xl border flex gap-3 ${
            notification.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' :
            notification.type === 'error' ? 'bg-red-50 border-red-200 text-red-800' :
            'bg-amber-50 border-amber-200 text-amber-800'
          }`}>
            {notification.type === 'success' ? <CheckCircle2 className="shrink-0" size={24} /> : <AlertCircle className="shrink-0" size={24} />}
            <div className="space-y-1">
              <h4 className="font-bold text-sm">{notification.message}</h4>
              {notification.details && notification.details.length > 0 && (
                <ul className="list-disc pl-4 text-xs space-y-0.5 opacity-90">
                  {notification.details.map((d, i) => <li key={i}>{d}</li>)}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Login Modal */}
      {showLoginModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl border border-slate-200 p-8 space-y-6 animate-in zoom-in-95 duration-200 relative">
            <button 
              onClick={() => {
                setShowLoginModal(false);
                setLoginError('');
              }}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 font-bold text-sm bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-xl transition-all"
            >
              Đóng
            </button>

            <div className="text-center space-y-2">
              <div className="inline-flex p-4 bg-blue-50 rounded-2xl text-blue-600 shadow-inner">
                <ShieldCheck size={36} />
              </div>
              <h2 className="text-xl font-black text-slate-800 tracking-tight">Đăng Nhập Quản Trị</h2>
              <p className="text-xs text-slate-500 font-bold">Vui lòng nhập tài khoản để quản trị đại lý</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Tên đăng nhập</label>
                <input 
                  type="text" 
                  placeholder="Nhập tài khoản..."
                  value={usernameInput}
                  onChange={e => setUsernameInput(e.target.value)}
                  required
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Mật khẩu</label>
                <input 
                  type="password" 
                  placeholder="Nhập mật khẩu..."
                  value={passwordInput}
                  onChange={e => setPasswordInput(e.target.value)}
                  required
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium"
                />
              </div>

              {loginError && (
                <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-xl text-xs font-bold">
                  <AlertCircle size={16} />
                  <span>{loginError}</span>
                </div>
              )}

              <button 
                type="submit" 
                disabled={isLoggingIn}
                className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-md shadow-blue-200 transition-all flex items-center justify-center gap-2"
              >
                {isLoggingIn ? <Loader2 className="animate-spin" size={20} /> : 'ĐĂNG NHẬP'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Profile Edit Modal */}
      {showProfileModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl border border-slate-200 p-8 space-y-6 animate-in zoom-in-95 duration-200 relative">
            <button 
              onClick={() => setShowProfileModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 font-bold text-sm bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-xl transition-all"
            >
              Đóng
            </button>

            <div className="text-center space-y-2">
              <div className="inline-flex p-4 bg-blue-50 rounded-2xl text-blue-600 shadow-inner">
                <Settings size={36} />
              </div>
              <h2 className="text-xl font-black text-slate-800 tracking-tight">Hồ Sơ Cá Nhân</h2>
              <p className="text-xs text-slate-500 font-bold">Cập nhật thông tin tài khoản của bạn</p>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Họ và tên</label>
                <input 
                  type="text" 
                  value={profileName}
                  onChange={e => setProfileName(e.target.value)}
                  required
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-semibold text-slate-700"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Tên đăng nhập (Username)</label>
                <input 
                  type="text" 
                  value={profileUsername}
                  onChange={e => setProfileUsername(e.target.value)}
                  required
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-semibold text-slate-700"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Số điện thoại</label>
                <input 
                  type="text" 
                  value={profilePhone}
                  onChange={e => setProfilePhone(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-semibold text-slate-700"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Mật khẩu mới</label>
                <input 
                  type="password" 
                  placeholder="Để trống nếu không muốn đổi..."
                  value={profilePassword}
                  onChange={e => setProfilePassword(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-semibold text-slate-700"
                />
              </div>

              {profileError && (
                <div className="flex items-center gap-1.5 text-red-600 text-xs font-bold bg-red-50 p-2.5 rounded-xl">
                  <AlertCircle size={14} />
                  <span>{profileError}</span>
                </div>
              )}

              <button 
                type="submit" 
                disabled={isUpdatingProfile}
                className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-xl font-bold shadow-md shadow-blue-200 transition-all flex items-center justify-center gap-2"
              >
                {isUpdatingProfile ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                Lưu Thay Đổi
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Main Navbar */}
      <header className="sticky top-0 bg-white border-b border-slate-200 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 lg:gap-3 shrink-0">
            <div className="p-1.5 lg:p-2 bg-blue-600 rounded-xl text-white shadow-md">
              <ShieldCheck size={20} className="lg:size-6" />
            </div>
            <div>
              <h1 className="text-sm lg:text-base xl:text-lg font-black text-slate-800 tracking-tight leading-tight">Báo giá VCX</h1>
              <p className="text-[9px] lg:text-[10px] text-red-600 font-bold tracking-wider uppercase">Bản dùng thử có thể có sai sót</p>
            </div>
          </div>

          {/* Right aligned group: Desktop navigation & profile */}
          <div className="hidden lg:flex items-center gap-4 ml-auto">
            <nav className="flex flex-row-reverse items-center gap-0.5 xl:gap-1.5 whitespace-nowrap">
              <button 
                onClick={() => setActiveTab('calc')}
                className={`px-1.5 py-1 lg:px-2 lg:py-1.5 xl:px-4 xl:py-2 rounded-lg lg:rounded-xl text-[11px] lg:text-xs xl:text-sm font-bold transition-all ${activeTab === 'calc' ? 'bg-blue-600 text-white shadow-md shadow-blue-100 hover:bg-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}
              >
                Báo giá
              </button>

              {currentUser && (
                <button 
                  onClick={() => setActiveTab('commissions')}
                  className={`px-1.5 py-1 lg:px-2 lg:py-1.5 xl:px-4 xl:py-2 rounded-lg lg:rounded-xl text-[11px] lg:text-xs xl:text-sm font-bold transition-all ${activeTab === 'commissions' ? 'bg-blue-600 text-white shadow-md shadow-blue-100 hover:bg-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}
                >
                  Quản lý Hoa hồng
                </button>
              )}

              {currentUser && currentUser.role !== 'user' && (
                <>
                  <button 
                    onClick={() => setActiveTab('users')}
                    className={`px-1.5 py-1 lg:px-2 lg:py-1.5 xl:px-4 xl:py-2 rounded-lg lg:rounded-xl text-[11px] lg:text-xs xl:text-sm font-bold transition-all ${activeTab === 'users' ? 'bg-blue-600 text-white shadow-md shadow-blue-100 hover:bg-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}
                  >
                    Quản lý Tài khoản
                  </button>
                  <button 
                    onClick={() => setActiveTab('logs')}
                    className={`px-1.5 py-1 lg:px-2 lg:py-1.5 xl:px-4 xl:py-2 rounded-lg lg:rounded-xl text-[11px] lg:text-xs xl:text-sm font-bold transition-all ${activeTab === 'logs' ? 'bg-blue-600 text-white shadow-md shadow-blue-100 hover:bg-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}
                  >
                    Lịch sử hệ thống
                  </button>
                </>
              )}

              {currentUser && currentUser.role === 'master' && (
                <>
                  <button 
                    onClick={() => setActiveTab('rates')}
                    className={`px-1.5 py-1 lg:px-2 lg:py-1.5 xl:px-4 xl:py-2 rounded-lg lg:rounded-xl text-[11px] lg:text-xs xl:text-sm font-bold transition-all ${activeTab === 'rates' ? 'bg-blue-600 text-white shadow-md shadow-blue-100 hover:bg-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}
                  >
                    Quản lý Tỉ lệ phí
                  </button>
                  <button 
                    onClick={() => setActiveTab('companies')}
                    className={`px-1.5 py-1 lg:px-2 lg:py-1.5 xl:px-4 xl:py-2 rounded-lg lg:rounded-xl text-[11px] lg:text-xs xl:text-sm font-bold transition-all ${activeTab === 'companies' ? 'bg-blue-600 text-white shadow-md shadow-blue-100 hover:bg-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}
                  >
                    Quản lý Hãng BH
                  </button>
                </>
              )}
            </nav>

            {/* User profile / Login trigger */}
            <div className="flex items-center gap-2 lg:gap-4 shrink-0 border-l border-slate-200 pl-4">
              {currentUser ? (
                <>
                  <div className="text-right hidden md:block">
                    <div className="font-bold text-slate-800 text-xs lg:text-sm whitespace-nowrap">{currentUser.name}</div>
                    <div className="text-[9px] lg:text-[10px] font-bold text-blue-600 uppercase tracking-widest leading-none">{currentUser.role === 'master' ? 'Chủ Sở Hữu' : currentUser.role}</div>
                  </div>
                  <button 
                    onClick={handleOpenProfileModal}
                    className="p-1.5 lg:p-2.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                    title="Hồ sơ cá nhân"
                  >
                    <Settings size={16} className="lg:size-5" />
                  </button>
                  <button 
                    onClick={handleLogout}
                    className="p-1.5 lg:p-2.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                    title="Đăng xuất"
                  >
                    <LogOut size={16} className="lg:size-5" />
                  </button>
                </>
              ) : (
                <button 
                  onClick={() => setShowLoginModal(true)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-md shadow-blue-200"
                >
                  <LogIn size={16} />
                  Đăng nhập
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Navigation bar */}
        {currentUser && (
          <div className="lg:hidden flex flex-row-reverse border-t border-slate-200 overflow-x-auto bg-white px-2 py-1 justify-start">
            <button 
              onClick={() => setActiveTab('calc')}
              className={`px-3 py-2 rounded-lg text-xs font-bold shrink-0 transition-all ${activeTab === 'calc' ? 'bg-blue-600 text-white shadow-sm hover:bg-blue-700' : 'text-slate-500 hover:bg-slate-100'}`}
            >
              Báo giá
            </button>
            <button 
              onClick={() => setActiveTab('commissions')}
              className={`px-3 py-2 rounded-lg text-xs font-bold shrink-0 transition-all ${activeTab === 'commissions' ? 'bg-blue-600 text-white shadow-sm hover:bg-blue-700' : 'text-slate-500 hover:bg-slate-100'}`}
            >
              Hoa hồng
            </button>
            {currentUser.role !== 'user' && (
              <>
                <button 
                  onClick={() => setActiveTab('users')}
                  className={`px-3 py-2 rounded-lg text-xs font-bold shrink-0 transition-all ${activeTab === 'users' ? 'bg-blue-600 text-white shadow-sm hover:bg-blue-700' : 'text-slate-500 hover:bg-slate-100'}`}
                >
                  Tài khoản
                </button>
                <button 
                  onClick={() => setActiveTab('logs')}
                  className={`px-3 py-2 rounded-lg text-xs font-bold shrink-0 transition-all ${activeTab === 'logs' ? 'bg-blue-600 text-white shadow-sm hover:bg-blue-700' : 'text-slate-500 hover:bg-slate-100'}`}
                >
                  Lịch sử
                </button>
              </>
            )}
            {currentUser.role === 'master' && (
              <>
                <button 
                  onClick={() => setActiveTab('rates')}
                  className={`px-3 py-2 rounded-lg text-xs font-bold shrink-0 transition-all ${activeTab === 'rates' ? 'bg-blue-600 text-white shadow-sm hover:bg-blue-700' : 'text-slate-500 hover:bg-slate-100'}`}
                >
                  Tỉ lệ phí
                </button>
                <button 
                  onClick={() => setActiveTab('companies')}
                  className={`px-3 py-2 rounded-lg text-xs font-bold shrink-0 transition-all ${activeTab === 'companies' ? 'bg-blue-600 text-white shadow-sm hover:bg-blue-700' : 'text-slate-500 hover:bg-slate-100'}`}
                >
                  Hãng bảo hiểm
                </button>
              </>
            )}
          </div>
        )}
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 md:px-8 mt-6">

        {/* Tab 1: Calculator */}
        {activeTab === 'calc' && (
          <div className="space-y-8 animate-in fade-in duration-200">
            {/* Input Form */}
            <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 space-y-6">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2 pb-4 border-b border-slate-100">
                <Calculator size={22} className="text-blue-600" />
                Thông tin tính phí
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                {/* Loại xe */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wide flex items-center gap-1">
                    <Car size={14} className="text-slate-400" />
                    Loại xe
                  </label>
                  <select 
                    value={carType}
                    onChange={(e) => {
                      setCarType(e.target.value);
                      carModelRef.current?.focus();
                    }}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white font-medium text-sm text-slate-800"
                  >
                    {(() => {
                      const groups: Record<string, any[]> = {};
                      vehiclesList.forEach(opt => {
                        if (!groups[opt.group]) groups[opt.group] = [];
                        groups[opt.group].push(opt);
                      });
                      return Object.entries(groups).map(([groupName, options]) => (
                        <optgroup key={groupName} label={groupName}>
                          {options.map(opt => (
                            <option key={opt.id} value={opt.id}>{opt.name}</option>
                          ))}
                        </optgroup>
                      ));
                    })()}
                  </select>
                </div>

                {/* Dòng xe */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wide flex items-center gap-1">
                    <Car size={14} className="text-slate-400" />
                    Dòng xe
                  </label>
                  <input 
                    ref={carModelRef}
                    type="text" 
                    placeholder="VD: Toyota Vios..."
                    value={carModel}
                    onChange={(e) => setCarModel(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') yearRef.current?.focus();
                    }}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm font-medium"
                  />
                </div>

                {/* Năm sản xuất */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wide flex items-center gap-1">
                    <Calendar size={14} className="text-slate-400" />
                    Năm sản xuất
                  </label>
                  <input 
                    ref={yearRef}
                    type="number" 
                    value={manufactureYear}
                    onChange={(e) => setManufactureYear(Number(e.target.value))}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') valueRef.current?.focus();
                    }}
                    min={1990}
                    max={currentYear}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm font-medium"
                  />
                </div>

                {/* Giá trị xe */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wide flex items-center gap-1">
                    <DollarSign size={14} className="text-slate-400" />
                    Giá trị xe (VNĐ)
                  </label>
                  <div className="relative">
                    <input 
                      ref={valueRef}
                      type="text" 
                      value={new Intl.NumberFormat('vi-VN').format(carValue)}
                      onChange={(e) => setCarValueStr(e.target.value.replace(/\D/g, ''))}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none font-bold text-sm text-slate-800"
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">VNĐ</div>
                  </div>
                </div>
              </div>

              {/* Extra attributes input row in stable grid layout */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                {/* Column 1: Ngân hàng */}
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Ngân hàng vay</span>
                  <select 
                    value={selectedBank}
                    onChange={(e) => setSelectedBank(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 bg-white font-bold text-xs text-slate-700"
                  >
                    {BANK_OPTIONS.map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>

                {/* Column 2: Profit margin */}
                {currentUser ? (
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Lợi nhuận mong muốn</span>
                    <div className="relative">
                      <input
                        type="text"
                        value={Number(profit).toLocaleString('vi-VN')}
                        onChange={(e) => setProfit(e.target.value.replace(/\D/g, ''))}
                        className="w-full pl-3 pr-10 py-2 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-xs font-bold text-slate-800"
                        placeholder="Nhập lợi nhuận..."
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-[10px]">VNĐ</span>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Lợi nhuận mong muốn</span>
                    <input 
                      type="text" 
                      disabled 
                      placeholder="Đăng nhập để xem"
                      className="w-full px-3 py-2 bg-slate-100/50 rounded-xl border border-slate-200 outline-none text-xs font-semibold text-slate-400 cursor-not-allowed"
                    />
                  </div>
                )}

                {/* Column 3: Seat count / Tonnage */}
                {showSeatCount && (
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Số chỗ</span>
                    <input 
                      type="number" 
                      value={seatCount}
                      onChange={(e) => setSeatCount(Number(e.target.value))}
                      min={1}
                      className="w-full px-3 py-2 bg-white rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none text-xs font-bold text-slate-800"
                    />
                  </div>
                )}
                {showTonnage && (
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Trọng tải</span>
                    <input 
                      type="number" 
                      value={tonnage}
                      onChange={(e) => setTonnage(Number(e.target.value))}
                      min={0.1}
                      step={0.1}
                      className="w-full px-3 py-2 bg-white rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none text-xs font-bold text-slate-800"
                    />
                  </div>
                )}
                {!showSeatCount && !showTonnage && (
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Số chỗ / Tải</span>
                    <input 
                      type="text" 
                      disabled 
                      placeholder="Không áp dụng"
                      className="w-full px-3 py-2 bg-slate-100/50 rounded-xl border border-slate-200 outline-none text-xs font-semibold text-slate-400 cursor-not-allowed"
                    />
                  </div>
                )}

                {/* Column 4: Động cơ / Dòng xe */}
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Động cơ / Dòng xe</span>
                  <select 
                    value={evModel}
                    onChange={(e) => setEvModel(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 bg-white font-bold text-xs text-slate-700"
                  >
                    {EV_MODELS.map(opt => (
                      <option key={opt.id} value={opt.id}>{opt.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Results Grid */}
            <div className="space-y-6">
              {/* Results Control Toolbar */}
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-sm">
                
                {/* Left section: View Mode and Checkbox Filters */}
                <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                  {/* View Mode Toggle */}
                  <div className="flex bg-slate-100 p-0.5 rounded-lg shrink-0">
                    <button
                      onClick={() => setViewMode('grid')}
                      className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${viewMode === 'grid' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                    >
                      Thẻ
                    </button>
                    <button
                      onClick={() => setViewMode('table')}
                      className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${viewMode === 'table' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                    >
                      Bảng
                    </button>
                    <button
                      onClick={() => setViewMode('agent')}
                      className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${viewMode === 'agent' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                    >
                      Đại lý
                    </button>
                  </div>

                  {/* Show/Hide Toggles - Always visible, never wraps, compact gaps */}
                  <div className="flex items-center gap-3 px-3 py-1 bg-slate-50 rounded-lg border border-slate-200 overflow-x-auto whitespace-nowrap scrollbar-none shrink-0">
                    <label className="flex items-center gap-1.5 cursor-pointer text-[10px] text-slate-700 font-bold">
                      <input 
                        type="checkbox" 
                        checked={showRate} 
                        onChange={(e) => setShowRate(e.target.checked)} 
                        className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      TỈ LỆ PHÍ
                    </label>
                    {currentUser && (
                      <label className="flex items-center gap-1.5 cursor-pointer text-[10px] text-slate-700 font-bold border-l border-slate-200 pl-3">
                        <input 
                          type="checkbox" 
                          checked={showCommission} 
                          onChange={(e) => setShowCommission(e.target.checked)} 
                          className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                        HOA HỒNG
                      </label>
                    )}
                    <label className="flex items-center gap-1.5 cursor-pointer text-[10px] text-slate-700 font-bold border-l border-slate-200 pl-3">
                      <input 
                        type="checkbox" 
                        checked={showTerms} 
                        onChange={(e) => setShowTerms(e.target.checked)} 
                        className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      ĐKBS
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer text-[10px] text-slate-700 font-bold border-l border-slate-200 pl-3">
                      <input 
                        type="checkbox" 
                        checked={showBasePremium} 
                        onChange={(e) => setShowBasePremium(e.target.checked)} 
                        className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      GIÁ BẢO HIỂM
                    </label>
                    {currentUser && (
                      <label className="flex items-center gap-1.5 cursor-pointer text-[10px] text-slate-700 font-bold border-l border-slate-200 pl-3">
                        <input 
                          type="checkbox" 
                          checked={showDiscountedPremium} 
                          onChange={(e) => setShowDiscountedPremium(e.target.checked)} 
                          className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                        GIẢM CÒN
                      </label>
                    )}
                  </div>
                </div>

                {/* Right section: Sort and Action buttons */}
                <div className="flex items-center justify-end gap-2 w-full md:w-auto shrink-0 flex-wrap sm:flex-nowrap">
                  {/* Sorting Dropdown */}
                  <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-lg text-[11px] font-bold text-slate-700 shrink-0">
                    <span>Sắp xếp:</span>
                    <select 
                      value={sortBy} 
                      onChange={(e) => setSortBy(e.target.value as any)}
                      className="bg-transparent border-none outline-none font-bold text-slate-800 cursor-pointer"
                    >
                      <option value="default">Mặc định</option>
                      <option value="price_asc">Giá tăng dần</option>
                      <option value="price_desc">Giá giảm dần</option>
                    </select>
                  </div>

                  {/* Actions Buttons Group */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button 
                      onClick={() => {
                        setCustomBasePremiums({});
                        setCustomDiscountedPremiums({});
                        setCustomDeductibles({});
                        setIsEditMode(false);
                      }}
                      className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 p-1.5 rounded-lg transition-all flex items-center justify-center shadow-sm shrink-0"
                      title="Khôi phục trạng thái ban đầu"
                    >
                      <RefreshCw size={15} />
                    </button>
                    {currentUser && (
                      <button 
                        onClick={() => setIsEditMode(!isEditMode)}
                        className={`${isEditMode ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-md' : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'} p-1.5 rounded-lg transition-all flex items-center justify-center shadow-sm shrink-0`}
                        title={isEditMode ? "Lưu phí chỉnh sửa" : "Chỉnh sửa phí trực tiếp"}
                      >
                        {isEditMode ? <Save size={15} /> : <Edit3 size={15} />}
                      </button>
                    )}
                    <button 
                      onClick={handleCopyImage}
                      disabled={isGenerating}
                      className="bg-slate-900 hover:bg-slate-800 disabled:bg-slate-700 text-white px-2.5 py-1.5 rounded-lg transition-all flex items-center justify-center shadow-sm gap-1 text-[11px] font-bold shrink-0"
                    >
                      {isGenerating ? <Loader2 size={13} className="animate-spin" /> : (isCopied ? <Check size={13} /> : <Copy size={13} />)}
                      <span>Copy Ảnh</span>
                    </button>
                    <button 
                      onClick={handleDownloadImage}
                      disabled={isGenerating}
                      className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-2.5 py-1.5 rounded-lg transition-all flex items-center justify-center shadow-sm gap-1 text-[11px] font-bold shrink-0"
                    >
                      {isGenerating ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
                      <span>Tải Ảnh</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Insurer Filters */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3 flex-wrap">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Lọc hãng:</span>
                {orderedCompanies.map(c => {
                  const getCompanyAbbreviation = (id: string, fullName: string): string => {
                    const mapping: Record<string, string> = {
                      'BM': 'BMI',
                      'PJI': 'PJICO',
                      'PJI_STAR': 'PJICO*',
                      'TAS': 'TASCO',
                      'DBV': 'DBV',
                      'BL': 'BL',
                      'PVI': 'PVI',
                      'MIC': 'MIC',
                      'PTI': 'PTI',
                      'BV': 'BV'
                    };
                    return mapping[id] || fullName;
                  };
                  return (
                    <label key={c.id} className="flex items-center gap-1.5 cursor-pointer text-xs font-bold text-slate-700 bg-slate-50 hover:bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
                      <input
                        type="checkbox"
                        checked={selectedCompanies.includes(c.id)}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedCompanies(prev => [...prev, c.id]);
                          else setSelectedCompanies(prev => prev.filter(id => id !== c.id));
                        }}
                        className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      {getCompanyAbbreviation(c.id, c.name)}
                    </label>
                  );
                })}
              </div>

              {/* PDF/Image Generation Area */}
              <div ref={resultsRef} className="p-6 bg-slate-50 rounded-3xl border border-slate-200 shadow-inner">
                {viewMode !== 'agent' && (
                  <div className="text-center mb-8 pb-5 border-b border-slate-200">
                    <h2 className="text-xl font-black text-blue-700 uppercase tracking-tight mb-2">BẢNG BÁO GIÁ BẢO HIỂM VẬT CHẤT XE</h2>
                    <h3 className="text-sm md:text-base font-extrabold text-slate-700 tracking-normal normal-case">
                      {titleText}
                    </h3>
                  </div>
                )}
                
                {viewMode === 'grid' ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {displayQuotes.map((quote, idx) => {
                      const compStyle = getCompanyStyles(quote.company);
                      return (
                        <div 
                          key={idx} 
                          className={`bg-white rounded-2xl shadow-sm border overflow-hidden flex flex-col transition-all hover:scale-[1.01] hover:shadow-md ${!quote.isAvailable ? 'border-slate-200' : compStyle.borderClass}`}
                          style={quote.isAvailable ? compStyle.borderStyle : {}}
                        >
                          <div 
                            className={`${!quote.isAvailable ? 'bg-slate-400' : compStyle.bgClass} p-4 text-white flex items-center justify-between`}
                            style={quote.isAvailable ? compStyle.bgStyle : {}}
                          >
                            <div className="flex items-center gap-2">
                              <h3 className="font-extrabold text-base">{quote.company.name}</h3>
                            </div>
                            {quote.isAvailable && <CheckCircle2 size={18} className="text-white/80" />}
                          </div>
                          
                          <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                            {!quote.isAvailable ? (
                              <div className="flex-1 flex flex-col items-center justify-center text-slate-400 space-y-2 py-6">
                                <AlertCircle size={28} />
                                <p className="text-center font-bold text-xs">Tuổi xe ngoài phân cấp.<br/>Liên hệ để có báo giá</p>
                              </div>
                            ) : (
                              <div className="space-y-4 flex-1 flex flex-col justify-between">
                                <div className="space-y-4">
                                  {showRate && (
                                    <div className="flex justify-between items-end pb-3 border-b border-slate-100">
                                      <span className="text-slate-400 text-xs font-bold uppercase">Tỉ lệ phí</span>
                                      <span className={`text-xl font-black ${compStyle.textClass}`} style={compStyle.textStyle}>{quote.displayRate}%</span>
                                    </div>
                                  )}
                                  {currentUser && showCommission && (
                                    <>
                                      <div className="flex justify-between items-end pb-3 border-b border-slate-100">
                                        <span className="text-slate-400 text-xs font-bold uppercase">Hoa hồng</span>
                                        <span className="text-sm font-bold text-slate-700">{(quote.commissionRate * 100).toFixed(1)}%</span>
                                      </div>
                                      {selectedBank !== 'Không vay ngân hàng' && (
                                        <>
                                          <div className="flex justify-between items-end pb-3 border-b border-slate-100">
                                            <span className="text-slate-400 text-xs font-bold uppercase">Chuyên thu</span>
                                            <span className="text-sm font-bold text-slate-700">{(quote.bankReferralRate * 100).toFixed(1)}%</span>
                                          </div>
                                          <div className="flex justify-between items-end pb-3 border-b border-slate-100">
                                            <span className="text-slate-400 text-xs font-bold uppercase">Thực nhận</span>
                                            <span className="text-sm font-black text-blue-600">{(quote.netCommissionRate * 100).toFixed(1)}%</span>
                                          </div>
                                        </>
                                      )}
                                    </>
                                  )}
                                {showTerms && (
                                  <div className="pb-3 border-b border-slate-100">
                                    <span className="text-slate-400 text-[10px] font-bold uppercase block mb-1">Quyền lợi:</span>
                                    <ul className="list-disc pl-4 space-y-0.5 text-xs font-medium text-slate-600">
                                      {age < 6 && <li>Lựa chọn gara sửa chữa</li>}
                                      <li>Thay mới bộ phận không khấu hao</li>
                                      <li>Bồi thường ngập nước/thuỷ kích</li>
                                      <li className="text-[10px] text-blue-500 font-semibold list-none -ml-4 mt-1">Khấu trừ: {new Intl.NumberFormat('vi-VN').format(quote.deductible ?? 500000)}đ/vụ</li>
                                    </ul>
                                  </div>
                                )}
                              </div>

                              <div className="pt-3">
                                <div className="space-y-1">
                                  {currentUser && isEditMode ? (
                                    <div className="space-y-2">
                                      {showBasePremium && (
                                        <div className="flex items-center gap-1.5">
                                          <span className="text-[10px] font-bold text-slate-400 uppercase w-14 shrink-0">Giá BH:</span>
                                          <input 
                                            type="text"
                                            value={new Intl.NumberFormat('vi-VN').format(customBasePremiums[quote.company.id] ?? quote.basePremium)}
                                            onChange={(e) => {
                                              const rawVal = Number(e.target.value.replace(/\D/g, ''));
                                              setCustomBasePremiums(prev => ({...prev, [quote.company.id]: rawVal}));
                                            }}
                                            className="w-full px-2 py-0.5 text-xs rounded border border-rose-300 bg-rose-50 font-bold outline-none"
                                          />
                                        </div>
                                      )}
                                      {showDiscountedPremium && (
                                        <div className="flex items-center gap-1.5">
                                          <span className="text-[10px] font-bold text-slate-400 uppercase w-14 shrink-0">Giảm còn:</span>
                                          <input 
                                            type="text"
                                            value={new Intl.NumberFormat('vi-VN').format(customDiscountedPremiums[quote.company.id] ?? Math.max(0, quote.discountedPremium))}
                                            onChange={(e) => {
                                              const rawVal = Number(e.target.value.replace(/\D/g, ''));
                                              setCustomDiscountedPremiums(prev => ({...prev, [quote.company.id]: rawVal}));
                                            }}
                                            className="w-full px-2 py-0.5 text-xs rounded border border-rose-300 bg-rose-50 font-bold outline-none"
                                          />
                                        </div>
                                      )}
                                    </div>
                                  ) : (
                                    <>
                                      {currentUser ? (
                                        <>
                                          {showBasePremium && (
                                            <div className="text-xs line-through text-slate-400 font-bold mb-2">
                                              {formatCurrency(customBasePremiums[quote.company.id] ?? quote.basePremium)}
                                            </div>
                                          )}
                                          {showDiscountedPremium && (
                                            <div className="text-xl font-bold tracking-tight" style={compStyle.textStyle}>
                                              {formatCurrency(customDiscountedPremiums[quote.company.id] ?? Math.max(0, quote.discountedPremium))}
                                            </div>
                                          )}
                                        </>
                                      ) : (
                                        showBasePremium && (
                                          <div className="text-xl font-bold tracking-tight" style={compStyle.textStyle}>
                                            {formatCurrency(customBasePremiums[quote.company.id] ?? quote.basePremium)}
                                          </div>
                                        )
                                      )}
                                    </>
                                  )}
                                </div>

                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  </div>
                ) : viewMode === 'table' ? (() => {
                  const totalColumns = 2 + (showBasePremium ? 1 : 0) + (showDiscountedPremium ? 1 : 0) + (currentUser && showCommission ? (selectedBank !== 'Không vay ngân hàng' ? 3 : 1) : 0);
                  return (
                    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs font-bold uppercase">
                            <th className="p-4">Hãng Bảo Hiểm</th>
                            {showBasePremium && <th className="p-4 text-right">Giá bảo hiểm</th>}
                            {currentUser && showCommission && (
                              <>
                                <th className="p-4 text-right">Hoa hồng</th>
                                {selectedBank !== 'Không vay ngân hàng' && (
                                  <>
                                    <th className="p-4 text-right">Chuyên thu</th>
                                    <th className="p-4 text-right">Thực nhận</th>
                                  </>
                                )}
                              </>
                            )}
                            {showDiscountedPremium && <th className="p-4 text-right">Giảm còn</th>}
                            <th className="p-4 text-right">Mức khấu trừ</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-sm font-medium text-slate-700">
                          {displayQuotes.filter(q => q.isAvailable).map((quote, idx) => {
                            const compStyle = getCompanyStyles(quote.company);
                            return (
                              <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                                <td className="p-4">
                                  <div className="flex items-center gap-2">
                                    <div className="font-extrabold text-slate-800">{quote.company.name}</div>
                                  </div>
                                </td>
                                
                                {showBasePremium && (
                                  <td className="p-4 text-right font-bold text-slate-800 text-sm">
                                    {currentUser && isEditMode ? (
                                      <input 
                                        type="text"
                                        value={new Intl.NumberFormat('vi-VN').format(customBasePremiums[quote.company.id] ?? quote.basePremium)}
                                        onChange={(e) => {
                                          const rawVal = Number(e.target.value.replace(/\D/g, ''));
                                          setCustomBasePremiums(prev => ({...prev, [quote.company.id]: rawVal}));
                                        }}
                                        className="w-32 text-right px-2 py-1 rounded border border-rose-300 bg-rose-50 font-bold outline-none"
                                      />
                                    ) : (
                                      formatCurrency(customBasePremiums[quote.company.id] ?? quote.basePremium)
                                    )}
                                  </td>
                                )}

                                {currentUser && showCommission && (
                                  <>
                                    <td className="p-4 text-right font-bold text-slate-700">
                                      {(quote.commissionRate * 100).toFixed(1)}%
                                    </td>
                                    {selectedBank !== 'Không vay ngân hàng' && (
                                      <>
                                        <td className="p-4 text-right font-bold text-slate-700">
                                          {(quote.bankReferralRate * 100).toFixed(1)}%
                                        </td>
                                        <td className="p-4 text-right font-bold text-rose-600">
                                          {(quote.netCommissionRate * 100).toFixed(1)}%
                                        </td>
                                      </>
                                    )}
                                  </>
                                )}
                                
                                {showDiscountedPremium && (
                                  <td className={`p-4 text-right font-bold text-sm ${compStyle.textClass}`} style={compStyle.textStyle}>
                                    {currentUser ? (
                                      isEditMode ? (
                                        <div className="flex flex-col items-end">
                                          <input 
                                            type="text"
                                            value={new Intl.NumberFormat('vi-VN').format(customDiscountedPremiums[quote.company.id] ?? Math.max(0, quote.discountedPremium))}
                                            onChange={(e) => {
                                              const rawVal = Number(e.target.value.replace(/\D/g, ''));
                                              setCustomDiscountedPremiums(prev => ({...prev, [quote.company.id]: rawVal}));
                                            }}
                                            className="w-32 text-right px-2 py-1 rounded border border-rose-300 bg-rose-50 font-bold outline-none"
                                          />
                                        </div>
                                      ) : (
                                        formatCurrency(customDiscountedPremiums[quote.company.id] ?? Math.max(0, quote.discountedPremium))
                                      )
                                    ) : (
                                      <span className="text-slate-400 text-xs font-semibold">Chỉ đại lý xem</span>
                                    )}
                                  </td>
                                )}
                                
                                <td className="p-4 text-right text-slate-500 font-bold">
                                  {currentUser && isEditMode ? (
                                    <div className="flex items-center justify-end gap-1">
                                      <input 
                                        type="text"
                                        value={new Intl.NumberFormat('vi-VN').format(customDeductibles[quote.company.id] ?? quote.deductible)}
                                        onChange={(e) => {
                                          const rawVal = Number(e.target.value.replace(/\D/g, ''));
                                          setCustomDeductibles(prev => ({...prev, [quote.company.id]: rawVal}));
                                        }}
                                        className="w-28 text-right px-2 py-1 rounded border border-rose-300 bg-rose-50 font-bold outline-none"
                                      />
                                      <span className="text-[10px] text-slate-400 font-bold">đ</span>
                                    </div>
                                  ) : (
                                    `${new Intl.NumberFormat('vi-VN').format(customDeductibles[quote.company.id] ?? quote.deductible)}đ/vụ`
                                  )}
                                </td>
                              </tr>
                            );
                          })}

                          {/* Quyền lợi Row */}
                          <tr className="bg-rose-50/10 border-none">
                            <td colSpan={totalColumns} className="p-6 border-t border-slate-200">
                              <div className="space-y-4 text-rose-900">
                                <h4 className="font-extrabold text-sm lg:text-base flex items-center gap-2 text-rose-700">
                                  <Info size={16} className="text-rose-500" />
                                  Tóm tắt quyền lợi bảo hiểm vật chất:
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs lg:text-sm font-semibold">
                                  <div className="space-y-1.5">
                                    <p className="font-bold text-slate-700">Xe được bảo hiểm khi gặp sự cố:</p>
                                    <ul className="list-disc pl-5 space-y-1 text-slate-600">
                                      <li>Đâm va, lật đổ, lệch trọng tâm, bị vật thể khác rơi vào</li>
                                      <li>Tai họa thiên tai bất khả kháng: Ngập lụt, giông bão, sạt lở, động đất,...</li>
                                      <li>Cháy nổ, hỏa hoạn / Trộm cắp toàn bộ xe</li>
                                    </ul>
                                  </div>
                                  <div className="space-y-1.5">
                                    <p className="font-bold text-slate-700">Đã bao gồm các điều khoản bổ sung cao cấp:</p>
                                    <ul className="list-disc pl-5 space-y-1 text-slate-600">
                                      {age < 6 && <li>Tự chọn xưởng sửa chữa chính hãng</li>}
                                      <li>Không khấu hao phụ tùng thay mới</li>
                                      <li>Bồi thường động cơ ngập nước (Thủy kích)</li>
                                    </ul>
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>

                          {/* Contact Row */}
                          {currentUser && (
                            <tr className="bg-white border-none">
                              <td colSpan={totalColumns} className="p-4 border-t border-slate-200">
                                <p className="text-center text-sm md:text-base lg:text-lg font-black tracking-wide leading-relaxed">
                                  <span className="text-red-600">Liên hệ Zalo: </span>
                                  <span style={{ color: '#2563eb' }}>{currentUser.name.toUpperCase()}</span>
                                  {currentUser.phone ? (
                                    <>
                                      <span className="text-slate-400"> - </span>
                                      <span className="text-red-600">{currentUser.phone}</span>
                                    </>
                                  ) : ''}
                                </p>
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  );
                })() : (
                  /* viewMode === 'agent' */
                  <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm p-4">
                    <table className="w-full text-left border-collapse table-fixed">
                      <colgroup>
                        <col className="w-[35%]" />
                        <col className="w-[20%]" />
                        <col className="w-[20%]" />
                        <col className="w-[25%]" />
                      </colgroup>
                      <tbody>
                        {/* Title Row - Centered inside colSpan 3 */}
                        <tr className="border-none">
                          <td colSpan={3} className="p-4 border-none text-center">
                            <div className="text-center mb-6 pb-4 border-b border-slate-200">
                              <h2 className="text-xl font-black text-rose-700 uppercase tracking-tight mb-2">BẢNG BÁO GIÁ BẢO HIỂM VẬT CHẤT XE</h2>
                              <h3 className="text-sm md:text-base font-extrabold text-slate-700 tracking-normal normal-case">
                                {titleText}
                              </h3>
                            </div>
                          </td>
                          <td className="border-none"></td>
                        </tr>

                        {/* Headers */}
                        <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs font-bold uppercase">
                          <th className="p-4">Hãng Bảo Hiểm</th>
                          <th className="p-4 text-right">Giá bảo hiểm</th>
                          <th className="p-4 text-right">Mức khấu trừ</th>
                          <th className="p-4 text-right bg-rose-50/20 border-l border-rose-100">Giảm còn</th>
                        </tr>

                        {/* Data Rows */}
                        {displayQuotes.filter(q => q.isAvailable).map((quote, idx) => {
                          const compStyle = getCompanyStyles(quote.company);
                          return (
                            <tr key={idx} className="hover:bg-slate-50/50 transition-colors border-b border-slate-100">
                              <td className="p-4">
                                <div className="font-extrabold text-slate-800">{quote.company.name}</div>
                              </td>
                              
                              <td className="p-4 text-right font-bold text-slate-800 text-sm">
                                {formatCurrency(customBasePremiums[quote.company.id] ?? quote.basePremium)}
                              </td>

                              <td className="p-4 text-right text-slate-500 font-bold text-sm">
                                {new Intl.NumberFormat('vi-VN').format(customDeductibles[quote.company.id] ?? quote.deductible)}đ/vụ
                              </td>

                              <td className={`p-4 text-right font-bold text-sm bg-rose-50/10 border-l border-rose-50/50 ${compStyle.textClass}`} style={compStyle.textStyle}>
                                {currentUser && showDiscountedPremium ? (
                                  formatCurrency(customDiscountedPremiums[quote.company.id] ?? Math.max(0, quote.discountedPremium))
                                ) : (
                                  <span className="text-slate-400 text-xs font-semibold">Chỉ đại lý xem</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}

                        {/* Quyền lợi Row - Centered inside colSpan 3 */}
                        <tr className="border-none">
                          <td colSpan={3} className="p-4 border-none">
                            <div className="space-y-4 text-rose-900 bg-rose-50/20 border border-slate-100 rounded-2xl p-6">
                              <h4 className="font-extrabold text-base flex items-center gap-2 text-rose-700">
                                <Info size={18} className="text-rose-500" />
                                Tóm tắt quyền lợi bảo hiểm vật chất:
                              </h4>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm font-semibold">
                                <div className="space-y-2">
                                  <p className="font-bold text-slate-700">Xe được bảo hiểm khi gặp sự cố:</p>
                                  <ul className="list-disc pl-5 space-y-1 text-slate-600">
                                    <li>Đâm va, lật đổ, lệch trọng tâm, bị vật thể khác rơi vào</li>
                                    <li>Tai họa thiên tai bất khả kháng: Ngập lụt, giông bão, sạt lở, động đất,...</li>
                                    <li>Cháy nổ, hỏa hoạn / Trộm cắp toàn bộ xe</li>
                                  </ul>
                                </div>
                                <div className="space-y-2">
                                  <p className="font-bold text-slate-700">Đã bao gồm các điều khoản bổ sung cao cấp:</p>
                                  <ul className="list-disc pl-5 space-y-1 text-slate-600">
                                    {age < 6 && <li>Tự chọn xưởng sửa chữa chính hãng</li>}
                                    <li>Không khấu hao phụ tùng thay mới</li>
                                    <li>Bồi thường động cơ ngập nước (Thủy kích)</li>
                                  </ul>
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="border-none"></td>
                        </tr>

                        {/* Contact Row - Centered inside colSpan 3 */}
                        {currentUser && (
                          <tr className="border-none">
                            <td colSpan={3} className="p-4 border-none">
                              <div className="p-3 bg-white rounded-2xl border border-rose-200 flex items-center justify-center shadow-sm hover:shadow-md transition-all">
                                <p className="text-center text-xs sm:text-sm md:text-base font-black tracking-wide leading-relaxed whitespace-nowrap">
                                  <span className="text-red-600">Liên hệ Zalo: </span>
                                  <span style={{ color: '#2563eb' }}>{currentUser.name.toUpperCase()}</span>
                                  {currentUser.phone ? (
                                    <>
                                      <span className="text-slate-400"> - </span>
                                      <span className="text-red-600">{currentUser.phone}</span>
                                    </>
                                  ) : ''}
                                </p>
                              </div>
                            </td>
                            <td className="border-none"></td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Combined Benefits Summary & Zalo Contact Block (for grid view) */}
                {viewMode === 'grid' && (
                  <div className="mt-6 space-y-0 rounded-2xl border border-slate-200 overflow-hidden shadow-sm bg-white">
                    {/* Benefits Summary Section */}
                    <div className="p-6 bg-rose-50/20 border-b border-slate-100 space-y-4">
                      <h4 className="font-extrabold text-sm lg:text-base flex items-center gap-2 text-rose-700">
                        <Info size={16} className="text-rose-500" />
                        Tóm tắt quyền lợi bảo hiểm vật chất:
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs lg:text-sm font-semibold">
                        <div className="space-y-1.5">
                          <p className="font-bold text-slate-700">Xe được bảo hiểm khi gặp sự cố:</p>
                          <ul className="list-disc pl-5 space-y-1 text-slate-600">
                            <li>Đâm va, lật đổ, lệch trọng tâm, bị vật thể khác rơi vào</li>
                            <li>Tai họa thiên tai bất khả kháng: Ngập lụt, giông bão, sạt lở, động đất,...</li>
                            <li>Cháy nổ, hỏa hoạn / Trộm cắp toàn bộ xe</li>
                          </ul>
                        </div>
                        <div className="space-y-1.5">
                          <p className="font-bold text-slate-700">Đã bao gồm các điều khoản bổ sung cao cấp:</p>
                          <ul className="list-disc pl-5 space-y-1 text-slate-600">
                            {age < 6 && <li>Tự chọn xưởng sửa chữa chính hãng</li>}
                            <li>Không khấu hao phụ tùng thay mới</li>
                            <li>Bồi thường động cơ ngập nước (Thủy kích)</li>
                          </ul>
                        </div>
                      </div>
                    </div>

                    {/* Zalo Contact Section */}
                    {currentUser && (
                      <div className="p-4 bg-white flex items-center justify-center">
                        <p className="text-center text-sm md:text-base lg:text-lg font-black tracking-wide leading-relaxed">
                          <span className="text-red-600">Liên hệ Zalo: </span>
                          <span style={{ color: '#2563eb' }}>{currentUser.name.toUpperCase()}</span>
                          {currentUser.phone ? (
                            <>
                              <span className="text-slate-400"> - </span>
                              <span className="text-red-600">{currentUser.phone}</span>
                            </>
                          ) : ''}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {!isGenerating && (
                  <div className="quote-footer text-center text-slate-400 text-xs font-bold mt-8 pt-4 border-t border-slate-200 uppercase tracking-widest">
                    Auto insurance check v4.2026.219 -  LEPS &copy;
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Users Management */}
        {activeTab === 'users' && currentUser && currentUser.role !== 'user' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
                <Users size={22} className="text-blue-600" />
                Quản lý Tài khoản
              </h2>

              <div className="flex items-center gap-2">
                {currentUser.role === 'master' && (
                  <button
                    onClick={() => {
                      const text = usersList.map(u => `Tài khoản: @${u.username} | Mật khẩu: ${u.password} | Vai trò: ${u.role.toUpperCase()} | Trực thuộc: ${u.parentUsername ? `@${u.parentUsername}` : 'MASTER'}`).join('\n');
                      navigator.clipboard.writeText(text);
                      triggerNotification('success', 'Đã sao chép danh sách tài khoản vào bộ nhớ tạm!');
                    }}
                    type="button"
                    className="px-4 py-2 bg-slate-950 hover:bg-slate-800 text-white rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 shadow-sm"
                  >
                    <Copy size={14} />
                    Xuất nhanh danh sách tài khoản
                  </button>
                )}
                <button 
                  onClick={() => setShowTreeDiagram(!showTreeDiagram)}
                  className="px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-xl font-bold text-xs border border-blue-200 transition-all flex items-center gap-1.5"
                >
                  <FileText size={16} />
                  {showTreeDiagram ? 'Xem dạng bảng' : 'Xem dạng sơ đồ cây'}
                </button>
              </div>
            </div>

            {showTreeDiagram ? (
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm overflow-x-auto">
                <h3 className="font-bold text-slate-700 text-sm mb-4">Sơ đồ cấu trúc cây tài khoản:</h3>
                {userTree.length > 0 ? (
                  <div className="inline-block min-w-full">
                    {renderTreeNodes(userTree)}
                  </div>
                ) : (
                  <div className="text-slate-400 text-sm py-8 text-center font-bold">Chưa có tài khoản cấp dưới trực thuộc</div>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                
                {/* Create Subordinate account form */}
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <UserPlus size={18} className="text-blue-600" />
                    Tạo tài khoản cấp dưới trực tiếp
                  </h3>

                  <form onSubmit={handleCreateUser} className="space-y-3.5">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Tên đăng nhập (Username)</label>
                      <input 
                        type="text" 
                        value={newUsername}
                        onChange={e => setNewUsername(e.target.value)}
                        required
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm font-semibold"
                        placeholder="Tên tài khoản..."
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Mật khẩu</label>
                      <input 
                        type="password" 
                        value={newPassword}
                        onChange={e => setNewPassword(e.target.value)}
                        required
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm font-semibold"
                        placeholder="Mật khẩu tài khoản..."
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Họ và tên</label>
                      <input 
                        type="text" 
                        value={newName}
                        onChange={e => setNewName(e.target.value)}
                        required
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm font-semibold"
                        placeholder="Họ và tên..."
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Số điện thoại (SĐT)</label>
                      <input 
                        type="text" 
                        value={newPhone}
                        onChange={e => setNewPhone(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm font-semibold"
                        placeholder="Số điện thoại..."
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Cấp bậc (Role)</label>
                      <select 
                        value={newRole}
                        onChange={e => setNewRole(e.target.value as any)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm font-semibold"
                      >
                        {currentUser.role === 'master' && (
                          <>
                            <option value="admin">ADMIN</option>
                            <option value="client">CLIENT</option>
                            <option value="user">USER</option>
                          </>
                        )}
                        {currentUser.role === 'admin' && <option value="client">CLIENT</option>}
                        {currentUser.role === 'client' && <option value="user">USER</option>}
                      </select>
                    </div>

                    {currentUser.role === 'master' && (newRole === 'client' || newRole === 'user') && (
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Tài khoản quản lý trực thuộc (Cha)</label>
                        <select 
                          value={selectedParentId}
                          onChange={e => setSelectedParentId(e.target.value)}
                          required
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm font-semibold"
                        >
                          <option value="">-- Chọn tài khoản quản lý --</option>
                          {newRole === 'client' && usersList.filter(u => u.role === 'admin').map(u => (
                            <option key={u.id} value={u.id}>{u.name} (@{u.username})</option>
                          ))}
                          {newRole === 'user' && usersList.filter(u => u.role === 'client').map(u => (
                            <option key={u.id} value={u.id}>{u.name} (@{u.username})</option>
                          ))}
                        </select>
                      </div>
                    )}

                    {userCrudError && (
                      <div className="flex items-center gap-1.5 text-red-600 text-xs font-bold bg-red-50 p-2.5 rounded-xl">
                        <AlertCircle size={14} />
                        <span>{userCrudError}</span>
                      </div>
                    )}

                    <button 
                      type="submit" 
                      className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm shadow-sm transition-all"
                    >
                      Tạo tài khoản
                    </button>
                  </form>
                </div>

                {/* Subordinate account table list */}
                <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                      {currentUser.role === 'master' ? 'Tất cả nhân sự trong hệ thống' : 'Danh sách nhân sự cấp dưới trực tiếp'}
                    </h3>
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-bold">{usersList.length} tài khoản</span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                          <th className="p-4">Tài khoản</th>
                          <th className="p-4">Họ tên</th>
                          <th className="p-4">SĐT</th>
                          {currentUser.role === 'master' && <th className="p-4">Mật khẩu</th>}
                          <th className="p-4">Vai trò</th>
                          {currentUser.role === 'master' && <th className="p-4">Trực thuộc</th>}
                          <th className="p-4 text-right">Thao tác</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                        {usersList.length > 0 ? (
                          usersList.map(u => (
                            <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                              <td className="p-4 font-bold text-slate-800">@{u.username}</td>
                              <td className="p-4">
                                {editingUserId === u.id ? (
                                  <input 
                                    type="text"
                                    value={editName}
                                    onChange={e => setEditName(e.target.value)}
                                    className="px-2 py-1 border rounded bg-slate-50 font-medium w-32"
                                  />
                                ) : (
                                  u.name
                                )}
                              </td>
                              <td className="p-4">
                                {editingUserId === u.id ? (
                                  <input 
                                    type="text"
                                    value={editPhone}
                                    onChange={e => setEditPhone(e.target.value)}
                                    className="px-2 py-1 border rounded bg-slate-50 font-medium w-28"
                                    placeholder="SĐT..."
                                  />
                                ) : (
                                  u.phone || '-'
                                )}
                              </td>
                              {currentUser.role === 'master' && (
                                <td className="p-4 text-blue-600 font-mono font-bold select-all bg-blue-50/20">{u.password}</td>
                              )}
                              <td className="p-4">
                                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                  u.role === 'admin' ? 'bg-blue-100 text-blue-700' :
                                  u.role === 'client' ? 'bg-teal-100 text-teal-700' :
                                  'bg-amber-100 text-amber-700'
                                }`}>
                                  {u.role}
                                </span>
                              </td>
                              {currentUser.role === 'master' && (
                                <td className="p-4 font-semibold text-slate-600">
                                  {u.parentUsername ? (
                                    <span className="bg-slate-100 text-slate-700 px-2 py-1 rounded font-bold">
                                      @{u.parentUsername}
                                    </span>
                                  ) : (
                                    <span className="text-slate-400 font-semibold italic">MASTER</span>
                                  )}
                                </td>
                              )}
                              <td className="p-4 text-right">
                                {editingUserId === u.id ? (
                                  <div className="flex items-center justify-end gap-2">
                                    <input 
                                      type="password"
                                      placeholder="Mật khẩu mới..."
                                      value={editPassword}
                                      onChange={e => setEditPassword(e.target.value)}
                                      className="px-2 py-1 border rounded bg-slate-50 font-medium w-28"
                                    />
                                    <button 
                                      onClick={() => handleUpdateUser(u.id)}
                                      className="px-2.5 py-1 bg-blue-600 text-white rounded font-bold"
                                    >
                                      Lưu
                                    </button>
                                    <button 
                                      onClick={() => setEditingUserId(null)}
                                      className="px-2.5 py-1 bg-slate-200 text-slate-700 rounded font-bold"
                                    >
                                      Hủy
                                    </button>
                                  </div>
                                ) : (
                                  <div className="flex items-center justify-end gap-2">
                                    <button 
                                      onClick={() => {
                                        setEditingUserId(u.id);
                                        setEditName(u.name);
                                        setEditPassword('');
                                        setEditPhone(u.phone || '');
                                      }}
                                      className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                      title="Đổi mật khẩu / tên / SĐT"
                                    >
                                      <Edit3 size={16} />
                                    </button>
                                    {/* Subordinate delete button: Master only deletes admin, admin deletes direct client, client deletes direct user */}
                                    {((currentUser.role === 'master' && u.role === 'admin') || 
                                      (currentUser.role === 'admin' && u.role === 'client') || 
                                      (currentUser.role === 'client' && u.role === 'user')) && (
                                      <button 
                                        onClick={() => handleDeleteUser(u.id, u.username)}
                                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                        title="Xoá tài khoản"
                                      >
                                        <Trash2 size={16} />
                                      </button>
                                    )}
                                  </div>
                                )}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={currentUser.role === 'master' ? 7 : 5} className="p-8 text-center text-slate-400 font-bold">Chưa có tài khoản cấp dưới trực thuộc</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Excel Batch Creation Card */}
            {(currentUser.role === 'master' || currentUser.role === 'admin' || currentUser.role === 'client') && (
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-3 border-b border-slate-100">
                  <div>
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <FileText size={18} className="text-blue-600" />
                      Tạo tài khoản hàng loạt bằng Excel (.xlsx)
                    </h3>
                    <p className="text-xs text-slate-500 font-semibold mt-0.5">Tải file mẫu về, nhập danh sách tài khoản rồi upload lên để tạo hàng loạt nhanh chóng.</p>
                  </div>

                  <button
                    onClick={downloadExcelTemplate}
                    type="button"
                    className="px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-xl font-bold text-xs border border-blue-200 transition-all flex items-center gap-1.5 shrink-0"
                  >
                    <Download size={14} />
                    Tải Excel mẫu
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                  {/* File Upload Selector */}
                  <div className="space-y-3">
                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide">Chọn File Excel đã chỉnh sửa:</label>
                    <div 
                      onDragEnter={handleDrag}
                      onDragOver={handleDrag}
                      onDragLeave={handleDrag}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                      className={`w-full py-8 px-4 border-2 border-dashed rounded-2xl transition-all cursor-pointer flex flex-col items-center justify-center gap-2 bg-slate-50/50 hover:bg-slate-50 ${isDragActive ? 'border-blue-600 bg-blue-50/30' : 'border-slate-300 hover:border-slate-400'}`}
                    >
                      <input 
                        type="file" 
                        ref={fileInputRef}
                        accept=".xlsx, .xls"
                        onChange={handleExcelUpload}
                        className="hidden"
                      />
                      <Upload className="text-slate-400" size={28} />
                      <div className="text-xs font-bold text-slate-700 text-center">
                        Kéo thả file Excel vào đây hoặc click để chọn tệp
                      </div>
                      <div className="text-[10px] font-semibold text-slate-400 uppercase">
                        Hỗ trợ định dạng .xlsx, .xls
                      </div>
                    </div>
                  </div>

                  {/* Parsed Rows Preview & Action */}
                  {parsedExcelRows.length > 0 && (
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3 animate-in fade-in duration-200">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-700">Đã đọc được {parsedExcelRows.length} tài khoản</span>
                        <button
                          onClick={handleConfirmBatchCreate}
                          disabled={isUploading}
                          type="button"
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-xl font-bold text-xs transition-all flex items-center gap-1 shrink-0"
                        >
                          {isUploading ? <Loader2 className="animate-spin" size={12} /> : <Plus size={12} />}
                          Xác nhận tạo tài khoản
                        </button>
                      </div>

                      <div className="max-h-[120px] overflow-y-auto border border-slate-200 rounded-lg bg-white p-2 space-y-1">
                        {parsedExcelRows.slice(0, 10).map((row, index) => (
                          <div key={index} className="text-[10px] font-semibold text-slate-600 flex justify-between border-b border-slate-100 pb-0.5">
                            <span>@{row.username} ({row.name})</span>
                            <span className="text-blue-600 uppercase font-bold">{row.role} → @{row.parentUsername || 'master'}</span>
                          </div>
                        ))}
                        {parsedExcelRows.length > 10 && (
                          <div className="text-[9px] text-slate-400 text-center font-bold italic pt-1">... và {parsedExcelRows.length - 10} tài khoản khác</div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Batch Upload Errors Display */}
                {batchUploadErrors.length > 0 && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-2xl space-y-2 animate-in fade-in duration-200">
                    <h4 className="text-red-800 font-bold text-xs flex items-center gap-1">
                      <AlertCircle size={14} />
                      Có lỗi xảy ra khi tạo tài khoản hàng loạt:
                    </h4>
                    <ul className="list-disc pl-4 text-xs font-semibold text-red-700 space-y-1 max-h-[150px] overflow-y-auto">
                      {batchUploadErrors.map((err, i) => <li key={i}>{err}</li>)}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Quick text credentials list removed - copy action moved to header */}
          </div>
        )/* Tab 2 end */}

        {/* Tab 3: Commission Management */}
        {activeTab === 'commissions' && currentUser && (
          <div className="space-y-8 animate-in fade-in duration-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
              <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
                <Percent size={22} className="text-blue-600" />
                Quản lý Hoa hồng & Chuyên thu
              </h2>

              {/* Sub-tabs header for MASTER */}
              {currentUser.role === 'master' && (
                <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200 shadow-inner max-w-sm shrink-0">
                  <button
                    onClick={() => setCommissionsSubTab('commission')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${commissionsSubTab === 'commission' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                  >
                    Hoa hồng VCX
                  </button>
                  <button
                    onClick={() => setCommissionsSubTab('bank-referrals')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${commissionsSubTab === 'bank-referrals' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                  >
                    Chuyên thu Ngân hàng
                  </button>
                </div>
              )}
            </div>

            {(commissionsSubTab === 'commission' || currentUser.role !== 'master') && (
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                <div className="space-y-1">
                  <h3 className="font-extrabold text-slate-800 text-base">
                    {selectedCommUser === currentUser.id ? 'Hoa hồng của tôi' : 'Biểu phí hoa hồng nhánh'}
                  </h3>
                  <p className="text-xs text-slate-500 font-semibold">
                    {isEditable 
                      ? 'Xem và điều chỉnh hoa hồng của tài khoản được chọn.' 
                      : 'Xem chi tiết tỷ lệ chiết khấu hoa hồng hiện tại (Chỉ xem).'}
                  </p>
                </div>

                <div className="flex items-center gap-2 text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl">
                  <span>Chọn tài khoản:</span>
                  <select 
                    value={selectedCommUser}
                    onChange={e => {
                      setSelectedCommUser(e.target.value);
                      setCommPreviewData(null);
                    }}
                    className="bg-transparent border-none outline-none font-bold text-blue-600"
                  >
                    {currentUser.role === 'master' && (
                      <option value={currentUser.id}>Hệ thống mặc định (Chủ Sở Hữu)</option>
                    )}
                    {currentUser.role !== 'master' && (
                      <option value={currentUser.id}>Bản thân tôi (Tôi)</option>
                    )}
                    {usersList.map(u => (
                      <option key={u.id} value={u.id}>{u.name} (@{u.username} - {u.role.toUpperCase()})</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Upload Card for Commissions (shown only if editable) */}
              {isEditable && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 p-6 rounded-2xl border border-slate-200 shadow-inner">
                  <div className="space-y-3">
                    <h4 className="font-extrabold text-slate-800 text-sm">Cập nhật nhanh qua tệp tin</h4>
                    <p className="text-xs text-slate-500 font-semibold leading-relaxed">
                      Tải lên file Excel, hình ảnh bảng biểu, hoặc file văn bản quy tắc hoa hồng.
                      Hệ thống tự động phân tích và tạo bảng xem trước để áp dụng.
                    </p>
                    <div className="flex flex-wrap gap-2 pt-1">
                      <button 
                        onClick={downloadCommExcelTemplate}
                        className="px-3 py-1.5 bg-white border border-slate-300 hover:border-slate-400 text-slate-700 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1 shrink-0"
                      >
                        <Download size={12} />
                        Tải file Excel mẫu
                      </button>
                    </div>
                  </div>

                  <div className="relative">
                    <input 
                      type="file"
                      ref={commFileInputRef}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
                          handleCommExcelUpload(file);
                        } else {
                          handleCommDocUpload(file);
                        }
                        if (commFileInputRef.current) commFileInputRef.current.value = '';
                      }}
                      accept=".xlsx,.xls,.png,.jpg,.jpeg,.txt"
                      className="hidden"
                    />
                    <div 
                      onClick={() => commFileInputRef.current?.click()}
                      className="border-2 border-dashed border-slate-300 hover:border-blue-500 hover:bg-blue-50/20 rounded-xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2 h-full min-h-[100px]"
                    >
                      {isCommUploading ? (
                        <>
                          <Loader2 className="animate-spin text-blue-600" size={24} />
                          <span className="text-[10px] font-bold text-slate-500 animate-pulse">Hệ thống đang phân tích tài liệu...</span>
                        </>
                      ) : (
                        <>
                          <Upload className="text-slate-400" size={24} />
                          <span className="text-[11px] font-bold text-slate-600">Kéo thả hoặc nhấp để tải Excel, Ảnh, Txt hoa hồng</span>
                          <span className="text-[9px] text-slate-400 font-semibold">Hỗ trợ .xlsx, .xls, .png, .jpg, .jpeg, .txt</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Comm Preview Grid or main Grid */}
              {commPreviewData ? (
                <div className="space-y-4 border-2 border-amber-300 bg-amber-50/10 p-5 rounded-2xl animate-in zoom-in-95 duration-200">
                  <div className="flex items-center justify-between border-b border-amber-200 pb-3">
                    <div>
                      <h4 className="font-extrabold text-amber-800 text-sm">XEM TRƯỚC BIỂU PHÍ HOA HỒNG</h4>
                      <p className="text-[10px] text-amber-600 font-bold">Hãy kiểm tra các ô có sự thay đổi (màu vàng). Nhấn "Áp dụng thay thế" để lưu chính thức.</p>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => {
                          const overrides: Array<{ carType: string, companyId: string, rate: number }> = [];
                          Object.entries(commPreviewData).forEach(([carType, compMap]) => {
                            Object.entries(compMap).forEach(([companyId, rate]) => {
                              overrides.push({ carType, companyId, rate });
                            });
                          });

                          fetch(`/api/commissions/user/${selectedCommUser}`, {
                            method: 'PUT',
                            headers: {
                              'Content-Type': 'application/json',
                              Authorization: `Bearer ${token}`
                            },
                            body: JSON.stringify({ overrides })
                          })
                          .then(async res => {
                            if (!res.ok) {
                              const data = await res.json();
                              throw new Error(data.message || 'Lưu thất bại');
                            }
                            triggerNotification('success', 'Đã áp dụng hoa hồng xem trước thành công!');
                            setCustomCommsGrid(commPreviewData);
                            setCommPreviewData(null);
                            
                            if (selectedCommUser === currentUser?.id) {
                              fetch('/api/commissions', { headers: { Authorization: `Bearer ${token}` } })
                                .then(res => res.json())
                                .then(data => setCommissionsData(data));
                            }
                          })
                          .catch(err => {
                            triggerNotification('error', err.message);
                          });
                        }}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm"
                      >
                        Áp dụng thay thế
                      </button>
                      <button 
                        onClick={() => setCommPreviewData(null)}
                        className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-bold transition-all"
                      >
                        Hủy
                      </button>
                    </div>
                  </div>

                  <div className="overflow-x-auto rounded-xl border border-amber-200">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-amber-100/50 border-b border-amber-200 text-amber-800 text-[10px] font-bold uppercase tracking-wider">
                          <th className="p-4 min-w-[240px]">Loại xe / Nghiệp vụ</th>
                          {companies.map(c => (
                            <th key={c.id} className="p-4 text-center">{c.name}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-amber-100 text-xs font-semibold text-slate-700 bg-white">
                        {vehiclesList.map(opt => (
                          <tr key={opt.id} className="hover:bg-amber-50/30 transition-colors">
                            <td className="p-4 font-bold text-slate-800">{opt.name}</td>
                            {companies.map(c => {
                              const oldVal = (customCommsGrid[opt.id] && customCommsGrid[opt.id][c.id] !== undefined)
                                ? customCommsGrid[opt.id][c.id]
                                : 0.15;
                              const newVal = (commPreviewData[opt.id] && commPreviewData[opt.id][c.id] !== undefined)
                                ? commPreviewData[opt.id][c.id]
                                : 0.15;
                              
                              const hasChanged = !isSameCommission(oldVal, newVal);

                              return (
                                <td key={c.id} className={`p-2 text-center ${hasChanged ? 'bg-amber-100/40' : ''}`}>
                                  {hasChanged ? (
                                    <div className="flex flex-col items-center">
                                      <span className="text-[10px] text-slate-400 line-through">{formatCommissionValue(oldVal)}</span>
                                      <span className="text-emerald-600 font-extrabold">{formatCommissionValue(newVal)}</span>
                                    </div>
                                  ) : (
                                    <span className="text-slate-500 font-bold">{formatCommissionValue(oldVal)}</span>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-2xl border border-slate-200">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                        <th className="p-4 min-w-[240px]">Loại xe / Nghiệp vụ</th>
                        {companies.map(c => (
                          <th key={c.id} className="p-4 text-center">{c.name}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                      {vehiclesList.map(opt => (
                        <tr key={opt.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="p-4 font-bold text-slate-800">{opt.name}</td>
                          {companies.map(c => {
                            const val = (customCommsGrid[opt.id] && customCommsGrid[opt.id][c.id] !== undefined)
                              ? customCommsGrid[opt.id][c.id]
                              : 0.15;

                            return (
                              <td key={c.id} className="p-2 text-center">
                                {isEditable ? (
                                  <div className="inline-flex items-center gap-1 bg-slate-50 border border-slate-300 rounded-lg px-2 py-1 max-w-[80px]">
                                    <input 
                                      type="number"
                                      step="0.5"
                                      min="0"
                                      max="100"
                                      value={getEditRateValue(val)}
                                      onChange={(e) => {
                                        const inputRate = parseFloat(e.target.value) / 100;
                                        setCustomCommsGrid(prev => ({
                                          ...prev,
                                          [opt.id]: {
                                            ...(prev[opt.id] || {}),
                                            [c.id]: isNaN(inputRate) ? 0 : inputRate
                                          }
                                        }));
                                      }}
                                      className="w-10 bg-transparent border-none text-center outline-none text-xs font-bold text-slate-800"
                                    />
                                    <span className="text-[10px] font-black text-slate-400">%</span>
                                  </div>
                                ) : (
                                  <span className="text-slate-800 font-bold">{formatCommissionValue(val)}</span>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {isEditable && !commPreviewData && (
                <div className="flex justify-end pt-4">
                  <button
                    onClick={handleSaveCustomComms}
                    className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm shadow-md transition-all"
                  >
                    Lưu thay đổi hoa hồng
                  </button>
                </div>
              )}
            </div>
          )}

          {commissionsSubTab === 'bank-referrals' && currentUser.role === 'master' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* Toolbar: Search, Filters, Add, and Excel Upload */}
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
                  {/* Search & Filters */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 flex-1 max-w-xl">
                    <input
                      type="text"
                      placeholder="Tìm kiếm ngân hàng..."
                      value={bankSearchQuery}
                      onChange={(e) => setBankSearchQuery(e.target.value)}
                      className="px-4 py-2 bg-slate-50 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm font-semibold"
                    />
                    <select
                      value={bankFilterCompany}
                      onChange={(e) => setBankFilterCompany(e.target.value)}
                      className="px-4 py-2 bg-slate-50 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm font-semibold"
                    >
                      <option value="">Tất cả hãng bảo hiểm</option>
                      {companies.map(c => (
                        <option key={c.id} value={c.id}>{c.name} ({c.id})</option>
                      ))}
                    </select>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      onClick={downloadBankReferralsTemplate}
                      className="px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 shadow-sm"
                    >
                      <Download size={14} />
                      Tải file mẫu
                    </button>

                    <input 
                      type="file"
                      accept=".xlsx"
                      ref={bankReferralsFileInputRef}
                      onChange={handleUploadBankReferralsExcel}
                      className="hidden"
                    />
                    <button 
                      onClick={() => bankReferralsFileInputRef.current?.click()}
                      className="px-4 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 shadow-sm"
                    >
                      <Upload size={14} />
                      Import Excel
                    </button>

                    <button
                      onClick={handleStartAddBankRef}
                      className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 shadow-md shadow-blue-200"
                    >
                      <Plus size={14} />
                      Thêm thủ công
                    </button>
                  </div>
                </div>

                {/* Excel Preview Notification & Action Bar */}
                {bankReferralsPreviewData && (
                  <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in slide-in-from-top-2">
                    <div className="space-y-1">
                      <h4 className="font-bold text-sm text-amber-800">Chế độ Xem trước Excel Chuyên thu</h4>
                      <p className="text-xs text-amber-700 font-semibold">
                        Hệ thống đang hiển thị bản xem trước gồm **{bankReferralsPreviewData.length}** dòng từ file vừa chọn. Nhấp Lưu cấu hình để ghi đè dữ liệu cũ.
                      </p>
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
                      <button
                        onClick={handleApplyBankReferralsPreview}
                        className="flex-1 sm:flex-initial px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold text-xs transition-all"
                      >
                        Lưu cấu hình
                      </button>
                      <button
                        onClick={handleCancelBankReferralsPreview}
                        className="flex-1 sm:flex-initial px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl font-bold text-xs transition-all"
                      >
                        Huỷ bỏ
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Matrix View Container */}
              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto max-h-[600px] scrollbar-thin">
                  <table className="w-full text-left border-collapse table-fixed min-w-[1200px]">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[10px] font-bold uppercase tracking-wider sticky top-0 z-10">
                        <th className="p-4 w-[220px] bg-slate-50 sticky left-0 z-20 shadow-[2px_0_5px_rgba(0,0,0,0.05)] border-r border-slate-200">Ngân hàng</th>
                        {companies.filter(c => c.hasRates && (bankFilterCompany === '' || c.id === bankFilterCompany)).map(comp => (
                          <th key={comp.id} className="p-4 text-center text-xs font-bold whitespace-nowrap">{comp.name}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                      {(() => {
                        const filteredBanks = BANK_OPTIONS.slice(1).filter(bName => 
                          bankSearchQuery === '' || bName.toLowerCase().includes(bankSearchQuery.toLowerCase())
                        );

                        if (filteredBanks.length === 0) {
                          return (
                            <tr>
                              <td colSpan={companies.filter(c => c.hasRates && (bankFilterCompany === '' || c.id === bankFilterCompany)).length + 1} className="p-8 text-center text-slate-400 font-bold">
                                Không tìm thấy ngân hàng nào phù hợp
                              </td>
                            </tr>
                          );
                        }

                        const getReferralRate = (bankName: string, companyId: string) => {
                          if (bankReferralsPreviewData) {
                            const match = bankReferralsPreviewData.find(r => r.companyVal === companyId && r.bankVal === bankName);
                            return match ? { rate: match.rateVal, isPreview: true } : null;
                          } else {
                            const match = bankReferralsData.find(r => r.companyId === companyId && r.bankName === bankName);
                            return match ? { id: match.id, rate: match.rate, isPreview: false } : null;
                          }
                        };

                        return filteredBanks.map(bankName => (
                          <tr key={bankName} className="hover:bg-slate-50/50 transition-colors">
                            {/* Sticky Left Column: Bank Name */}
                            <td className="p-4 font-bold text-slate-800 bg-white sticky left-0 z-10 shadow-[2px_0_5px_rgba(0,0,0,0.05)] border-r border-slate-200">
                              {bankName}
                            </td>
                            {companies.filter(c => c.hasRates && (bankFilterCompany === '' || c.id === bankFilterCompany)).map(comp => {
                              const rateInfo = getReferralRate(bankName, comp.id);
                              return (
                                <td 
                                  key={comp.id} 
                                  onClick={() => {
                                    if (bankReferralsPreviewData) return;
                                    
                                    if (rateInfo && !rateInfo.isPreview) {
                                      setEditingBankRef({
                                        id: rateInfo.id!,
                                        companyId: comp.id,
                                        bankName: bankName,
                                        rate: rateInfo.rate
                                      });
                                      setBankRefCompanyInput(comp.id);
                                      setBankRefNameInput(bankName);
                                      setBankRefRateInput((rateInfo.rate * 100).toString());
                                    } else {
                                      setEditingBankRef(null);
                                      setBankRefCompanyInput(comp.id);
                                      setBankRefNameInput(bankName);
                                      setBankRefRateInput('5');
                                    }
                                    setShowBankRefModal(true);
                                  }}
                                  className={`p-4 text-center cursor-pointer hover:bg-blue-50/50 transition-colors group relative ${rateInfo?.isPreview ? 'bg-amber-50' : ''}`}
                                >
                                  {rateInfo ? (
                                    <span className={`font-black text-xs ${rateInfo.isPreview ? 'text-amber-700' : 'text-blue-600'}`}>
                                      {(rateInfo.rate * 100).toFixed(1)}%
                                    </span>
                                  ) : (
                                    <span className="text-slate-300 font-normal">-</span>
                                  )}
                                  
                                  {!bankReferralsPreviewData && (
                                    <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-white/80 p-0.5 rounded shadow z-10">
                                      <Edit3 size={10} className="text-blue-500" />
                                    </div>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        ));
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
          </div>
        )}

        {/* Tab 4: Rates Management (MASTER only) */}
        {activeTab === 'rates' && currentUser && currentUser.role === 'master' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
              <Calculator size={22} className="text-blue-600" />
              Quản lý Tỉ lệ phí
            </h2>

            <div className="space-y-6">
              {/* Excel Import/Export Panel */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-3">
                  <button 
                    onClick={handleDownloadActiveRates}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    <Download size={14} />
                    Tải xuống biểu phí hiện tại
                  </button>

                  <input 
                    type="file"
                    accept=".xlsx"
                    ref={ratesFileInputRef}
                    onChange={handleUploadRatesExcel}
                    className="hidden"
                  />
                  <button 
                    onClick={() => ratesFileInputRef.current?.click()}
                    className="px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    <FileText size={14} />
                    Chọn file Excel (.xlsx)
                  </button>
                </div>

                {ratesPreviewData ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-[10px] text-amber-600 font-bold bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-200 text-center">
                      Đang xem trước file Excel vừa tải lên.
                    </p>
                    <button 
                      onClick={handleApplyRatesPreview}
                      disabled={isApplyingRates}
                      className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 shadow-sm"
                    >
                      {isApplyingRates ? <Loader2 className="animate-spin" size={14} /> : <Check size={14} />}
                      Lưu biểu phí xem trước
                    </button>
                    <button 
                      onClick={() => setRatesPreviewData(null)}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5"
                    >
                      Huỷ xem trước
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={handleSaveActiveRates}
                      disabled={isApplyingRates}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 shadow-sm shadow-blue-100"
                    >
                      {isApplyingRates ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />}
                      Lưu biểu phí hiện tại
                    </button>
                  </div>
                )}
              </div>

              {/* Rates Editor Container */}
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6">
                <div className="flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-4 pb-3 border-b border-slate-100">
                  <div>
                    <h3 className="font-black text-slate-800 text-xl lg:text-2xl tracking-tight">
                      {ratesPreviewData ? 'Bảng tỷ lệ phí xem trước (Excel/Sheet)' : 'Bảng tỷ lệ phí hiện tại đang sử dụng'}
                    </h3>
                    <p className="text-xs text-slate-500 font-semibold mt-0.5">
                      {ratesPreviewData 
                        ? 'Đang xem dữ liệu chưa áp dụng. Sửa trên ô rồi bấm "Lưu biểu phí xem trước".' 
                        : 'Đang xem dữ liệu chính thức. Sửa trực tiếp trên ô rồi bấm "Lưu biểu phí hiện tại".'}
                    </p>
                  </div>

                  {(ratesPreviewData || ratesData.length > 0) && (
                    <div className="flex flex-wrap items-center gap-3">
                      {/* Engine Type Filter (Xe xăng/dầu vs Xe điện) */}
                      <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-bold shrink-0">
                        <button
                          type="button"
                          onClick={() => setEditIsEV(false)}
                          className={`px-3 py-1.5 rounded-lg transition-all ${!editIsEV ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                        >
                          Xe Xăng/Dầu
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditIsEV(true)}
                          className={`px-3 py-1.5 rounded-lg transition-all ${editIsEV ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                        >
                          Xe điện (EV)
                        </button>
                      </div>

                      {/* EV model selector if editIsEV is true */}
                      {editIsEV && selectedInsurerForEdit === 'BV' && (
                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl">
                          <span>Dòng EV:</span>
                          <select 
                            value={editEvModel}
                            onChange={e => setEditEvModel(e.target.value)}
                            className="bg-transparent border-none outline-none font-bold text-blue-600 bg-white rounded cursor-pointer"
                          >
                            {EV_MODELS.filter(m => m.id !== 'other').map(m => (
                              <option key={m.id} value={m.id}>{m.id}</option>
                            ))}
                          </select>
                        </div>
                      )}

                      {/* Hãng bảo hiểm selector */}
                      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl">
                        <span>Hãng:</span>
                        <select 
                          value={selectedInsurerForEdit}
                          onChange={e => setSelectedInsurerForEdit(e.target.value)}
                          className="bg-transparent border-none outline-none font-bold text-blue-600 bg-white rounded cursor-pointer"
                        >
                          {companies.filter(c => c.hasRates).map(c => (
                            <option key={c.id} value={c.id}>{c.name} ({c.id})</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}
                </div>

                {!ratesPreviewData && ratesData.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-slate-400 space-y-3">
                    <Calculator size={48} className="text-slate-300 stroke-[1.5]" />
                    <p className="text-sm font-bold">Chưa có dữ liệu biểu phí</p>
                    <p className="text-xs text-slate-500 max-w-sm text-center">
                      Hệ thống đang tải hoặc biểu phí đang trống. Bạn có thể tải lên file Excel (.xlsx).
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-2xl border border-slate-200 max-h-[600px] overflow-y-auto w-full">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[10px] font-bold uppercase tracking-wider sticky top-0 z-10">
                          <th className="p-3 text-left whitespace-nowrap min-w-[200px]">Loại xe / Nghiệp vụ</th>
                          <th className="p-3 text-center whitespace-nowrap">Giá trị xe (triệu)</th>
                          <th className="p-3 text-center whitespace-nowrap font-bold text-blue-700 bg-blue-50/30">&lt; 3 năm</th>
                          <th className="p-3 text-center whitespace-nowrap font-bold text-blue-700 bg-blue-50/30">3 - 6 năm</th>
                          <th className="p-3 text-center whitespace-nowrap font-bold text-blue-700 bg-blue-50/30">6 - 10 năm</th>
                          <th className="p-3 text-center whitespace-nowrap font-bold text-blue-700 bg-blue-50/30">10 - 15 năm</th>
                          <th className="p-3 text-center whitespace-nowrap font-bold text-blue-700 bg-blue-50/30">15 - 20 năm</th>
                          <th className="p-3 text-center whitespace-nowrap font-bold text-blue-700 bg-blue-50/30">&gt; 20 năm</th>
                          <th className="p-3 text-center whitespace-nowrap font-bold text-emerald-700 bg-emerald-50/30">Phí tối thiểu</th>
                          <th className="p-3 text-center whitespace-nowrap font-bold text-teal-700 bg-teal-50/30">Mức khấu trừ</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                        {(() => {
                          const activeRatesSource = ratesPreviewData || ratesData;
                          const filteredOptions = vehiclesList.filter(opt => {
                            // If editIsEV is true, only show categories that actually have rules matching isEV = true & evModel
                            if (editIsEV) {
                              return activeRatesSource.some(r => 
                                r.companyId === selectedInsurerForEdit && 
                                r.carType === opt.id && 
                                r.isEV === true && 
                                (selectedInsurerForEdit !== 'BV' ? !r.evModel : r.evModel === editEvModel)
                              );
                            }
                            return true;
                          });

                          if (filteredOptions.length === 0) {
                            return (
                              <tr>
                                <td colSpan={8} className="p-8 text-center text-slate-400 font-bold">
                                  Không tìm thấy loại xe nào phù hợp
                                </td>
                              </tr>
                            );
                          }

                          // Group filtered options by their group prefix for clean display
                          let currentGroup = '';

                          return filteredOptions.flatMap(opt => {
                            const activeRatesSource = ratesPreviewData || ratesData;
                            const ruleItem = activeRatesSource.find(r => 
                              r.companyId === selectedInsurerForEdit && 
                              r.carType === opt.id && 
                              r.isEV === editIsEV &&
                              (!editIsEV || (selectedInsurerForEdit !== 'BV' ? !r.evModel : r.evModel === editEvModel))
                            );

                            // If no rule found, use a fallback
                            const subRules = ruleItem?.rules || [{ maxVal: null, rates: [0, 0, 0, 0] as [number, number, number, number] }];
                            
                            const rows: React.ReactNode[] = [];

                            // Group header row
                            if (opt.group !== currentGroup) {
                              currentGroup = opt.group;
                              rows.push(
                                <tr key={`group-${opt.group}`} className="bg-slate-50/50">
                                  <td colSpan={8} className="p-3 font-extrabold text-slate-500 uppercase tracking-wide text-[10px]">
                                    {opt.group}
                                  </td>
                                </tr>
                              );
                            }

                            subRules.forEach((rule, ruleIdx) => {
                              const limitText = rule.maxVal === null 
                                ? 'Mọi giá trị' 
                                : `Dưới ${(rule.maxVal / 1e6).toFixed(0)}`;

                              rows.push(
                                <tr key={`${opt.id}-${ruleIdx}`} className="hover:bg-slate-50/50 transition-colors">
                                  {ruleIdx === 0 ? (
                                    <td className="p-3 font-bold text-slate-800 align-middle" rowSpan={subRules.length}>
                                      {opt.name}
                                    </td>
                                  ) : null}
                                  <td className="p-2 text-center text-slate-600 font-semibold bg-slate-50/30">
                                    {limitText}
                                  </td>
                                  {[0, 1, 2, 3, 4, 5].map(ageIdx => {
                                    const val = rule.rates[ageIdx] ?? 0;
                                    return (
                                      <td key={ageIdx} className="p-1 text-center">
                                        <div className="flex items-center justify-center border border-slate-200 rounded-lg px-1 py-1 bg-slate-50/50 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500">
                                          <input 
                                            type="number"
                                            step="any"
                                            value={val === 0 ? '' : val}
                                            placeholder="0"
                                            onChange={(e) => {
                                              const parsed = parseFloat(e.target.value);
                                              handleUpdateRate(opt.id, ruleIdx, ageIdx, isNaN(parsed) ? 0 : parsed);
                                            }}
                                            className="w-12 bg-transparent border-none text-center outline-none text-xs font-bold text-slate-800 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                          />
                                          <span className="text-[10px] font-black text-slate-400">%</span>
                                        </div>
                                      </td>
                                    );
                                  })}
                                  
                                  {/* Phí tối thiểu input */}
                                  <td className="p-1 text-center">
                                    <div className="flex items-center justify-center border border-slate-200 rounded-lg px-1 py-1 bg-slate-50/50 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500">
                                      <input 
                                        type="text"
                                        value={rule.minPremium !== undefined && rule.minPremium !== null ? rule.minPremium.toLocaleString('vi-VN') : ''}
                                        placeholder="0"
                                        onChange={(e) => {
                                          const cleanVal = e.target.value.replace(/\D/g, '');
                                          const parsed = parseInt(cleanVal, 10);
                                          handleUpdateMinPremium(opt.id, ruleIdx, isNaN(parsed) ? null : parsed);
                                        }}
                                        className="w-20 bg-transparent border-none text-center outline-none text-xs font-bold text-slate-800"
                                      />
                                      <span className="text-[10px] font-black text-slate-400 ml-0.5">đ</span>
                                    </div>
                                  </td>

                                  {/* Mức khấu trừ input */}
                                  <td className="p-1 text-center">
                                    <div className="flex items-center justify-center border border-slate-200 rounded-lg px-1 py-1 bg-slate-50/50 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500">
                                      <input 
                                        type="text"
                                        value={rule.deductible !== undefined && rule.deductible !== null ? rule.deductible.toLocaleString('vi-VN') : ''}
                                        placeholder="0"
                                        onChange={(e) => {
                                          const cleanVal = e.target.value.replace(/\D/g, '');
                                          const parsed = parseInt(cleanVal, 10);
                                          handleUpdateDeductible(opt.id, ruleIdx, isNaN(parsed) ? null : parsed);
                                        }}
                                        className="w-20 bg-transparent border-none text-center outline-none text-xs font-bold text-slate-800"
                                      />
                                      <span className="text-[10px] font-black text-slate-400 ml-0.5">đ</span>
                                    </div>
                                  </td>
                                </tr>
                              );
                            });
                            return rows;
                          });
                        })()}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

        {/* Tab 5: Companies Management (MASTER only) */}
        {activeTab === 'companies' && currentUser && currentUser.role === 'master' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
              <Settings size={22} className="text-blue-600" />
              Quản lý hãng bảo hiểm
            </h2>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
              
              {/* Add New Company Form */}
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">
                  {editingCompanyId ? 'Chỉnh sửa hãng bảo hiểm' : 'Thêm hãng bảo hiểm mới'}
                </h3>
                
                <form onSubmit={handleCreateCompany} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Mã hãng (Viết tắt)</label>
                    <input 
                      type="text"
                      placeholder="VD: BV, PVI, PTI..."
                      value={newCompanyId}
                      onChange={e => setNewCompanyId(e.target.value)}
                      required
                      disabled={!!editingCompanyId}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm font-semibold disabled:opacity-60"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Tên hãng đầy đủ</label>
                    <input 
                      type="text"
                      placeholder="VD: Bảo Việt..."
                      value={newCompanyName}
                      onChange={e => setNewCompanyName(e.target.value)}
                      required
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm font-semibold"
                    />
                  </div>

                  {/* Preset Colors Grid Swatches */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Chọn nhanh bộ màu</label>
                    <div className="grid grid-cols-8 gap-1.5 p-2 bg-slate-50 rounded-2xl border border-slate-200 max-h-[120px] overflow-y-auto">
                      {COLOR_PRESETS.map((p, idx) => {
                        const isSelected = newCompanyColor.toLowerCase() === p.hex.toLowerCase();
                        return (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => {
                              setNewCompanyColor(p.hex);
                              setNewCompanyText('');
                              setNewCompanyBorder('');
                            }}
                            className="w-6 h-6 rounded-full transition-all duration-200 relative flex items-center justify-center shadow-sm hover:scale-110 active:scale-95 mx-auto"
                            style={{ backgroundColor: p.hex }}
                            title={p.name}
                          >
                            {isSelected && (
                              <div className="w-2 h-2 bg-white rounded-full shadow-md" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Nhập mã màu HEX trực tiếp */}
                  <div className="space-y-3 p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                      Nhập mã màu của hãng (HEX)
                    </label>
                    <div className="flex gap-2">
                      <input 
                        type="text"
                        placeholder="VD: #2563EB"
                        value={newCompanyColor}
                        onChange={(e) => {
                          setNewCompanyColor(e.target.value);
                          setNewCompanyText('');
                          setNewCompanyBorder('');
                        }}
                        className="flex-1 px-4 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none text-xs font-semibold text-slate-800 uppercase"
                      />
                      <input 
                        type="color" 
                        value={newCompanyColor.startsWith('#') && newCompanyColor.length === 7 ? newCompanyColor : '#2563eb'}
                        onChange={e => {
                          setNewCompanyColor(e.target.value);
                          setNewCompanyText('');
                          setNewCompanyBorder('');
                        }}
                        className="w-10 h-10 border border-slate-300 bg-transparent cursor-pointer rounded-xl overflow-hidden shrink-0"
                      />
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                      <span className="text-[10px] font-bold text-slate-400">Xem trước màu:</span>
                      {/* Preview Badge */}
                      <span 
                        className="inline-block px-2.5 py-0.5 rounded-xl text-[10px] font-bold border"
                        style={{
                          backgroundColor: newCompanyColor.startsWith('#') ? `${newCompanyColor}15` : undefined,
                          color: newCompanyColor.startsWith('#') ? newCompanyColor : undefined,
                          borderColor: newCompanyColor.startsWith('#') ? `${newCompanyColor}33` : undefined
                        }}
                      >
                        Bản xem trước
                      </span>
                    </div>
                  </div>

                  <label className="flex items-center gap-3 cursor-pointer">
                    <div className="relative">
                      <input 
                        type="checkbox" 
                        checked={newCompanyHasRates}
                        onChange={(e) => setNewCompanyHasRates(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                    </div>
                    <span className="text-xs font-bold text-slate-600 uppercase">Áp dụng Tỉ lệ phí</span>
                  </label>

                  <div className="flex gap-2 pt-2">
                    <button 
                      type="submit"
                      className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs shadow-sm transition-all"
                    >
                      {editingCompanyId ? 'Cập nhật Hãng' : 'Tạo Hãng bảo hiểm'}
                    </button>
                    {editingCompanyId && (
                      <button 
                        type="button"
                        onClick={handleCancelEditCompany}
                        className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-bold text-xs transition-all"
                      >
                        Huỷ
                      </button>
                    )}
                  </div>
                </form>
              </div>

              {/* List of existing companies */}
              <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Danh sách hãng bảo hiểm</h3>
                  <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-bold">{companies.length} hãng</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                        <th className="p-4">Mã</th>
                        <th className="p-4">Tên hãng</th>
                        <th className="p-4">Màu sắc</th>
                        <th className="p-4 text-center">Biểu phí</th>
                        <th className="p-4 text-center">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                      {orderedCompanies.map(c => (
                        <tr key={c.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="p-4 font-bold text-slate-800">{c.id}</td>
                          <td className="p-4 font-bold text-slate-800">{c.name}</td>
                          <td className="p-4">
                            {(() => {
                              const compStyle = getCompanyStyles(c);
                              return (
                                <span 
                                  className={`inline-block px-3 py-1 rounded-xl text-xs font-bold border ${compStyle.bgClass} ${compStyle.textClass} ${compStyle.borderClass}`}
                                  style={{
                                    ...compStyle.bgStyle,
                                    ...compStyle.textStyle,
                                    ...compStyle.borderStyle,
                                    backgroundColor: compStyle.isHex ? `${c.color}15` : undefined,
                                  }}
                                >
                                  Mẫu hiển thị
                                </span>
                              );
                            })()}
                          </td>
                          <td className="p-4 text-center">
                            {c.hasRates ? (
                              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full text-[10px] font-bold">Có biểu phí</span>
                            ) : (
                              <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full text-[10px] font-bold">Không</span>
                            )}
                          </td>
                          <td className="p-4 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => handleStartEditCompany(c)}
                                className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                title="Sửa"
                              >
                                <Edit3 size={14} />
                              </button>
                              <button
                                onClick={() => handleDeleteCompany(c.id, c.name)}
                                className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                title="Xoá"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          </div>
        )}



        {/* Tab 6: Audit Log Viewer (visible to non-user roles) */}
        {activeTab === 'logs' && currentUser && currentUser.role !== 'user' && (
          <AuditLogTab token={token} />
        )}
      </main>

      {/* Bank Referral CRUD Modal */}
      {showBankRefModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl border border-slate-200 p-8 space-y-6 animate-in zoom-in-95 duration-200 relative">
            <button 
              onClick={() => setShowBankRefModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 font-bold text-sm bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-xl transition-all"
            >
              Đóng
            </button>

            <div className="text-center space-y-2">
              <div className="inline-flex p-4 bg-blue-50 rounded-2xl text-blue-600 shadow-inner">
                <Percent size={36} />
              </div>
              <h2 className="text-xl font-black text-slate-800 tracking-tight">
                {editingBankRef ? 'Cập nhật Chuyên thu' : 'Thêm Chuyên thu Ngân hàng'}
              </h2>
              <p className="text-xs text-slate-500 font-bold">Cấu hình tỷ lệ phí chuyển ngân hàng cho hãng</p>
            </div>

            <form onSubmit={handleSaveBankReferral} className="space-y-4">
              {/* Insurer Select */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Hãng bảo hiểm</label>
                <select
                  value={bankRefCompanyInput}
                  onChange={(e) => setBankRefCompanyInput(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm font-semibold"
                >
                  {companies.map(c => (
                    <option key={c.id} value={c.id}>{c.name} ({c.id})</option>
                  ))}
                </select>
              </div>

              {/* Bank Select */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Ngân hàng</label>
                <select
                  value={bankRefNameInput}
                  onChange={(e) => setBankRefNameInput(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm font-semibold"
                >
                  {BANK_OPTIONS.slice(1).map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>

              {/* Referral rate input */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Tỷ lệ Chuyên thu (%)</label>
                <div className="relative">
                  <input 
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    placeholder="VD: 5.5"
                    value={bankRefRateInput}
                    onChange={(e) => setBankRefRateInput(e.target.value)}
                    required
                    className="w-full pl-4 pr-12 py-3 bg-slate-50 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm font-semibold text-slate-800"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-extrabold text-sm">%</span>
                </div>
              </div>

              <button 
                type="submit" 
                className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-md shadow-blue-200 transition-all flex items-center justify-center gap-2"
              >
                <Save size={18} />
                Lưu cấu hình
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Fallback Copy Image Modal for HTTP / Insecure Contexts */}
      {fallbackImageSrc && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-xl shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-200 flex flex-col my-8">
            <div className="p-6 border-b border-slate-150 flex items-center justify-between">
              <div>
                <h3 className="font-black text-slate-800 text-base md:text-lg">Không thể tự động Copy ảnh</h3>
                <p className="text-red-500 text-xs mt-1 font-bold">
                  Trình duyệt chặn tính năng tự sao chép khi trang web chạy trên HTTP (Không bảo mật)
                </p>
              </div>
              <button 
                onClick={() => setFallbackImageSrc(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-all font-bold text-sm"
              >
                ✕
              </button>
            </div>
            
            <div className="p-6 space-y-4 flex-1 overflow-y-auto max-h-[60vh] flex flex-col items-center">
              <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 text-xs font-semibold text-blue-800 w-full space-y-1">
                <p className="font-bold text-sm text-blue-900">Hướng dẫn Copy thủ công:</p>
                <ul className="list-disc pl-4 space-y-1">
                  <li><strong>Máy tính:</strong> Click chuột phải vào ảnh bên dưới và chọn <strong>"Sao chép hình ảnh"</strong> (Copy image).</li>
                  <li><strong>Điện thoại:</strong> Nhấn giữ vào ảnh bên dưới khoảng 2 giây và chọn <strong>"Sao chép"</strong> (Copy) hoặc <strong>"Lưu ảnh"</strong>.</li>
                </ul>
              </div>

              <div className="border border-slate-200 rounded-2xl overflow-hidden p-2 bg-slate-100 shadow-inner w-full max-w-md">
                <img 
                  src={fallbackImageSrc} 
                  alt="Báo giá VCX" 
                  className="w-full h-auto rounded-xl pointer-events-auto select-all cursor-pointer border border-white"
                  title="Click chuột phải để copy hình ảnh này"
                />
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-between gap-3">
              <button 
                onClick={() => {
                  const a = document.createElement('a');
                  a.href = fallbackImageSrc;
                  a.download = `VCX-BaoGia-${carModel || 'Xe'}-${manufactureYear}.png`;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                }}
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
              >
                Tải ảnh về máy
              </button>
              <button 
                onClick={() => setFallbackImageSrc(null)}
                className="px-4 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold transition-all"
              >
                Đóng lại
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function LogDiffViewer({ oldValue, newValue }: { oldValue?: string; newValue?: string }) {
  if (!oldValue && !newValue) return <p className="text-slate-500 text-xs italic">Không có dữ liệu chi tiết</p>;
  
  let oldJson: any = null;
  let newJson: any = null;
  try { if (oldValue) oldJson = JSON.parse(oldValue); } catch(e) {}
  try { if (newValue) newJson = JSON.parse(newValue); } catch(e) {}

  if (typeof oldJson !== 'object' && typeof newJson !== 'object') {
    return (
      <div className="grid grid-cols-2 gap-4 text-xs font-semibold">
        <div className="bg-red-50 text-red-700 p-3 rounded-xl border border-red-100">
          <span className="block text-[10px] uppercase font-bold text-red-500 mb-1">Giá trị cũ</span>
          <pre className="whitespace-pre-wrap font-mono">{oldValue || '(Trống)'}</pre>
        </div>
        <div className="bg-emerald-50 text-emerald-700 p-3 rounded-xl border border-emerald-100">
          <span className="block text-[10px] uppercase font-bold text-emerald-500 mb-1">Giá trị mới</span>
          <pre className="whitespace-pre-wrap font-mono">{newValue || '(Trống)'}</pre>
        </div>
      </div>
    );
  }

  if (Array.isArray(oldJson) || Array.isArray(newJson)) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-semibold">
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 overflow-x-auto max-h-96">
          <span className="block text-[10px] uppercase font-bold text-red-600 mb-2 border-b pb-1">Dữ liệu gốc (Trước thay đổi)</span>
          <pre className="font-mono text-[11px] whitespace-pre-wrap">{oldValue ? JSON.stringify(oldJson, null, 2) : '(Không có dữ liệu)'}</pre>
        </div>
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 overflow-x-auto max-h-96">
          <span className="block text-[10px] uppercase font-bold text-emerald-600 mb-2 border-b pb-1">Dữ liệu mới (Sau thay đổi)</span>
          <pre className="font-mono text-[11px] whitespace-pre-wrap">{newValue ? JSON.stringify(newJson, null, 2) : '(Không có dữ liệu)'}</pre>
        </div>
      </div>
    );
  }

  const allKeys = Array.from(new Set([
    ...Object.keys(oldJson || {}),
    ...Object.keys(newJson || {})
  ]));

  const filteredKeys = allKeys.filter(k => k !== 'passwordHash');

  const formatVal = (val: any) => {
    if (val === null || val === undefined) return '(Trống)';
    if (typeof val === 'object') return JSON.stringify(val, null, 2);
    return String(val);
  };

  return (
    <div className="border border-slate-200 rounded-2xl overflow-hidden text-xs">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
            <th className="p-3">Thuộc tính</th>
            <th className="p-3 bg-red-50/50 text-red-700">Giá trị cũ</th>
            <th className="p-3 bg-emerald-50/50 text-emerald-700">Giá trị mới</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 font-semibold">
          {filteredKeys.map(key => {
            const oldVal = oldJson?.[key];
            const newVal = newJson?.[key];
            const isChanged = JSON.stringify(oldVal) !== JSON.stringify(newVal);

            return (
              <tr key={key} className={isChanged ? "bg-amber-50/20" : "text-slate-500"}>
                <td className="p-3 font-mono font-bold text-slate-600">{key}</td>
                <td className={`p-3 font-mono ${isChanged && oldVal !== undefined ? "bg-red-50/30 text-red-600 line-through" : ""}`}>
                  {formatVal(oldVal)}
                </td>
                <td className={`p-3 font-mono ${isChanged && newVal !== undefined ? "bg-emerald-50/30 text-emerald-600 font-bold" : ""}`}>
                  {formatVal(newVal)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function AuditLogTab({ token }: { token: string | null }) {
  const [logs, setLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLog, setSelectedLog] = useState<any | null>(null);

  const fetchLogs = () => {
    if (!token) return;
    setIsLoading(true);
    fetch('/api/logs', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setLogs(data);
        }
      })
      .catch(err => console.error('Failed to load logs:', err))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    fetchLogs();
  }, [token]);

  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      const search = searchTerm.toLowerCase();
      return (
        log.username?.toLowerCase().includes(search) ||
        log.action?.toLowerCase().includes(search) ||
        log.details?.toLowerCase().includes(search)
      );
    });
  }, [logs, searchTerm]);

  const formatDate = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      return d.toLocaleString('vi-VN');
    } catch (e) {
      return isoStr;
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'LOGIN': return 'bg-sky-50 text-sky-700 border-sky-200';
      case 'CREATE_USER':
      case 'CREATE_COMPANY':
      case 'CREATE_VEHICLE': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'UPDATE_USER':
      case 'UPDATE_COMPANY':
      case 'UPDATE_VEHICLE':
      case 'UPDATE_COMMISSIONS':
      case 'AI_UPDATE': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'DELETE_USER':
      case 'DELETE_COMPANY':
      case 'DELETE_VEHICLE': return 'bg-red-50 text-red-700 border-red-200';
      case 'SYNC_COMMISSIONS':
      case 'SYNC_RATES':
      case 'APPLY_RATES': return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      default: return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
          <FileText size={22} className="text-blue-600" />
          Nhật ký hoạt động hệ thống
        </h2>
        <button 
          onClick={fetchLogs} 
          disabled={isLoading}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition-all disabled:opacity-60"
        >
          <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} />
          Tải lại
        </button>
      </div>

      <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm space-y-4">
        <div className="relative max-w-md">
          <input
            type="text"
            placeholder="Tìm kiếm theo người dùng, hành động, mô tả..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-3 pr-10 py-2 bg-slate-50 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-xs font-semibold"
          />
        </div>

        <div className="overflow-x-auto rounded-2xl border border-slate-100">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                <th className="p-3">Thời gian</th>
                <th className="p-3">Người dùng</th>
                <th className="p-3">Hành động</th>
                <th className="p-3">Mô tả chi tiết</th>
                <th className="p-3 text-center">Thay đổi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
              {isLoading && logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-400">Đang tải nhật ký...</td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-400">Không tìm thấy nhật ký hoạt động nào</td>
                </tr>
              ) : (
                filteredLogs.map(log => (
                  <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-3 text-slate-500 whitespace-nowrap">{formatDate(log.timestamp)}</td>
                    <td className="p-3 font-bold text-slate-800">@{log.username}</td>
                    <td className="p-3">
                      <span className={`inline-block px-2 py-0.5 rounded-lg border text-[10px] font-bold uppercase ${getActionColor(log.action)}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="p-3 text-slate-600 max-w-xs md:max-w-md lg:max-w-lg truncate" title={log.details}>
                      {log.details}
                    </td>
                    <td className="p-3 text-center">
                      {(log.oldValue || log.newValue) ? (
                        <button
                          onClick={() => setSelectedLog(log)}
                          className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg text-[10px] font-bold transition-all border border-blue-100"
                        >
                          Chi tiết
                        </button>
                      ) : (
                        <span className="text-slate-300 text-[10px] italic">Không có</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedLog && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-150">
            <div className="p-6 border-b border-slate-150 flex items-center justify-between">
              <div>
                <h3 className="font-black text-slate-800 text-lg">Chi tiết thay đổi dữ liệu</h3>
                <p className="text-slate-500 text-xs mt-1 font-bold">
                  Thực hiện bởi <span className="text-slate-700 font-bold">@{selectedLog.username}</span> lúc {formatDate(selectedLog.timestamp)}
                </p>
              </div>
              <button 
                onClick={() => setSelectedLog(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-all"
              >
                ✕
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                <span className="block text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1">Mô tả hành động</span>
                <p className="text-slate-700 text-sm font-bold">{selectedLog.details}</p>
              </div>

              <LogDiffViewer oldValue={selectedLog.oldValue} newValue={selectedLog.newValue} />
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex justify-end">
              <button 
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition-all"
              >
                Đóng lại
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
