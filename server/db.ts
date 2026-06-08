import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = path.join(__dirname, 'data', 'db.json');

// Ensure database directory exists
const ensureDir = () => {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

export interface User {
  id: string;
  username: string;
  passwordHash: string; // Stored as plain string for admin viewing/debugging as requested
  role: 'master' | 'admin' | 'client' | 'user';
  name: string;
  phone?: string; // User phone number
  parentId: string | null;
  createdAt: string;
}

export interface InsuranceCompany {
  id: string;
  name: string;
  color: string;
  text?: string;
  border?: string;
  hasRates: boolean; // CRUD insurance company: if hasRates is false, do not display fee rate
}

export interface RateRule {
  id: string;
  carType: string;
  companyId: string;
  isEV: boolean;
  evModel?: string | null; // e.g. 'VF3', 'VF5', 'other'
  minSeats?: number | null;
  maxSeats?: number | null;
  minTonnage?: number | null;
  maxTonnage?: number | null;
  rules: Array<{
    maxVal: number | null; // null means Infinity
    rates: number[]; // index corresponds to AgeBracket
    minPremium?: number | null;
    deductible?: number | null;
  }>;
}

export interface CommissionRule {
  id: string;
  carType: string;
  companyId: string;
  rules: Array<{
    maxVal: number | null;
    rate: number; // e.g., 0.18
  }>;
}

export interface UserCommissionOverride {
  id: string;
  userId: string;
  carType: string;
  companyId: string;
  rate?: number;
  rules?: Array<{
    maxVal: number | null;
    rate: number;
  }>;
}

export interface AuditLog {
  id: string;
  userId: string;
  username: string;
  action: string;
  details: string;
  timestamp: string;
}

export interface VehicleType {
  id: string;
  name: string;
  group: string;
  dbCarType: string;
}

export interface DbSchema {
  users: User[];
  companies: InsuranceCompany[];
  rates: RateRule[];
  commissions: CommissionRule[];
  userCommissions: UserCommissionOverride[];
  logs: AuditLog[];
  vehicles: VehicleType[];
}

const DEFAULT_COMPANIES: InsuranceCompany[] = [
  { id: 'BM', name: 'Bảo Minh', color: 'bg-blue-600', text: 'text-blue-600', border: 'border-blue-200', hasRates: true },
  { id: 'PJI', name: 'PJICO', color: 'bg-emerald-600', text: 'text-emerald-600', border: 'border-emerald-200', hasRates: true },
  { id: 'TAS', name: 'TASCO', color: 'bg-orange-600', text: 'text-orange-600', border: 'border-orange-200', hasRates: true },
  { id: 'DBV', name: 'DBV Hàng Không', color: 'bg-indigo-600', text: 'text-indigo-600', border: 'border-indigo-200', hasRates: true },
  { id: 'PVI', name: 'PVI Dầu Khí', color: 'bg-red-600', text: 'text-red-600', border: 'border-red-200', hasRates: true },
  { id: 'PTI', name: 'PTI Bưu Điện', color: 'bg-yellow-600', text: 'text-yellow-600', border: 'border-yellow-200', hasRates: true },
  { id: 'BL', name: 'Bảo Long', color: 'bg-teal-600', text: 'text-teal-600', border: 'border-teal-200', hasRates: true },
  { id: 'BV', name: 'Bảo Việt', color: 'bg-sky-600', text: 'text-sky-600', border: 'border-sky-200', hasRates: true },
  { id: 'MIC', name: 'MIC Quân Đội', color: 'bg-blue-800', text: 'text-blue-800', border: 'border-blue-800', hasRates: true },
  { id: 'PJI_STAR', name: 'PJICO*', color: 'bg-blue-600', text: 'text-blue-600', border: 'border-blue-200', hasRates: true },
  { id: 'LB', name: 'Liberty', color: '#be185d', text: '', border: '', hasRates: false },
  { id: 'VS', name: 'VASS', color: '#b45309', text: '', border: '', hasRates: false }
];

export const DEFAULT_VEHICLES: VehicleType[] = [
  // A. XE CHỞ NGƯỜI
  { id: 'personal_under_9', name: 'Xe chở người không kinh doanh dưới 9 chỗ', group: 'A. XE CHỞ NGƯỜI', dbCarType: 'personal' },
  { id: 'personal_over_9', name: 'Xe chở người không kinh doanh từ 9 chỗ trở lên', group: 'A. XE CHỞ NGƯỜI', dbCarType: 'personal' },
  { id: 'training', name: 'Xe tập lái', group: 'A. XE CHỞ NGƯỜI', dbCarType: 'training' },
  { id: 'bus', name: 'Xe bus', group: 'A. XE CHỞ NGƯỜI', dbCarType: 'commercial_passenger' },
  { id: 'internal', name: 'Xe hoạt động nội bộ cảng / KCN / sân bay', group: 'A. XE CHỞ NGƯỜI', dbCarType: 'internal' },
  { id: 'grab', name: 'Xe kinh doanh công nghệ (Grab, Be, FastGo, Xanh SM...)', group: 'A. XE CHỞ NGƯỜI', dbCarType: 'grab' },
  { id: 'taxi', name: 'Taxi truyền thống', group: 'A. XE CHỞ NGƯỜI', dbCarType: 'taxi' },
  { id: 'self_drive', name: 'Xe cho thuê tự lái', group: 'A. XE CHỞ NGƯỜI', dbCarType: 'commercial_passenger' },
  { id: 'commercial_under_9', name: 'Xe kinh doanh chở người dưới 9 chỗ, xe hợp đồng (không phải Grab, Taxi)', group: 'A. XE CHỞ NGƯỜI', dbCarType: 'commercial_passenger' },
  { id: 'commercial_over_9', name: 'Xe kinh doanh chở người từ 9 chỗ trở lên', group: 'A. XE CHỞ NGƯỜI', dbCarType: 'commercial_passenger' },
  { id: 'commercial_interprovincial', name: 'Xe kinh doanh vận tải hành khách liên tỉnh', group: 'A. XE CHỞ NGƯỜI', dbCarType: 'commercial_passenger' },
  { id: 'demo_car', name: 'Xe Demo / Test Drive', group: 'A. XE CHỞ NGƯỜI', dbCarType: 'personal' },
  { id: 'money_car', name: 'Xe chở tiền', group: 'A. XE CHỞ NGƯỜI', dbCarType: 'specialized' },

  // B. XE CHỞ HÀNG
  { id: 'truck_non_commercial_under_10', name: 'Xe tải không kinh doanh ≤ 10 tấn', group: 'B. XE CHỞ HÀNG', dbCarType: 'truck_non_commercial' },
  { id: 'truck_non_commercial_over_10', name: 'Xe tải không kinh doanh > 10 tấn', group: 'B. XE CHỞ HÀNG', dbCarType: 'truck_non_commercial' },
  { id: 'truck_commercial_under_10', name: 'Xe tải kinh doanh ≤ 10 tấn', group: 'B. XE CHỞ HÀNG', dbCarType: 'truck_commercial' },
  { id: 'truck_commercial_over_10', name: 'Xe tải kinh doanh > 10 tấn', group: 'B. XE CHỞ HÀNG', dbCarType: 'truck_commercial' },
  { id: 'truck_refrigerated_under_3_5', name: 'Xe đông lạnh / bảo ôn ≤ 3.5 tấn', group: 'B. XE CHỞ HÀNG', dbCarType: 'truck_refrigerated' },
  { id: 'truck_refrigerated_over_3_5', name: 'Xe đông lạnh / bảo ôn > 3.5 tấn', group: 'B. XE CHỞ HÀNG', dbCarType: 'truck_refrigerated' },
  { id: 'truck_mining', name: 'Xe hoạt động vùng khai thác khoáng sản', group: 'B. XE CHỞ HÀNG', dbCarType: 'truck_refrigerated' },
  { id: 'truck_fuel', name: 'Xe chở xăng dầu, khí hóa lỏng, nhiên liệu', group: 'B. XE CHỞ HÀNG', dbCarType: 'specialized' },
  { id: 'truck_oversized', name: 'Xe chở hàng siêu trường siêu trọng', group: 'B. XE CHỞ HÀNG', dbCarType: 'truck_commercial' },
  { id: 'truck_other', name: 'Xe chở hàng còn lại', group: 'B. XE CHỞ HÀNG', dbCarType: 'truck_commercial' },

  // C. XE CHUYÊN DÙNG
  { id: 'specialized_ambulance', name: 'Xe cứu thương', group: 'C. XE CHUYÊN DÙNG', dbCarType: 'specialized' },
  { id: 'specialized_fire', name: 'Xe cứu hỏa', group: 'C. XE CHUYÊN DÙNG', dbCarType: 'specialized' },
  { id: 'specialized_ladder', name: 'Xe thang', group: 'C. XE CHUYÊN DÙNG', dbCarType: 'specialized' },
  { id: 'specialized_sanitation', name: 'Xe vệ sinh môi trường', group: 'C. XE CHUYÊN DÙNG', dbCarType: 'specialized' },
  { id: 'specialized_sweeper', name: 'Xe quét đường', group: 'C. XE CHUYÊN DÙNG', dbCarType: 'specialized' },
  { id: 'specialized_concrete', name: 'Xe bơm bê tông', group: 'C. XE CHUYÊN DÙNG', dbCarType: 'specialized' },
  { id: 'specialized_drill', name: 'Xe khoan', group: 'C. XE CHUYÊN DÙNG', dbCarType: 'specialized' },
  { id: 'specialized_tanker', name: 'Xe téc chở chất lỏng', group: 'C. XE CHUYÊN DÙNG', dbCarType: 'specialized' },
  { id: 'specialized_other', name: 'Xe chuyên dùng khác', group: 'C. XE CHUYÊN DÙNG', dbCarType: 'specialized' },

  // D. ĐẦU KÉO - RƠ MOÓC
  { id: 'tractor', name: 'Xe đầu kéo', group: 'D. ĐẦU KÉO - RƠ MOÓC', dbCarType: 'tractor' },
  { id: 'trailer_flatbed', name: 'Rơ moóc thường / rơ moóc sàn', group: 'D. ĐẦU KÉO - RƠ MOÓC', dbCarType: 'trailer' },
  { id: 'trailer_tipper', name: 'Rơ moóc ben / tự đổ', group: 'D. ĐẦU KÉO - RƠ MOÓC', dbCarType: 'trailer' },
  { id: 'trailer_specialized', name: 'Rơ moóc gắn thiết bị chuyên dùng', group: 'D. ĐẦU KÉO - RƠ MOÓC', dbCarType: 'trailer' },

  // E. PICKUP - VAN
  { id: 'pickup', name: 'Xe bán tải Pickup', group: 'E. PICKUP - VAN', dbCarType: 'pickup' },
  { id: 'van_minivan', name: 'Xe Van', group: 'E. PICKUP - VAN', dbCarType: 'van_minivan' },
  { id: 'pickup_other', name: 'Xe vừa chở người vừa chở hàng khác', group: 'E. PICKUP - VAN', dbCarType: 'pickup' }
];

export const readDb = (): DbSchema => {
  ensureDir();
  if (!fs.existsSync(DB_PATH)) {
    const initialDb: DbSchema = {
      users: [
        {
          id: 'master-id',
          username: 'admin',
          passwordHash: bcrypt.hashSync('0906643381@', 10),
          role: 'master',
          name: 'CÔNG TY CPDV THẾ GIỚI BẢO HIỂM',
          parentId: null,
          phone: '0906 643 381',
          createdAt: new Date().toISOString()
        }
      ],
      companies: DEFAULT_COMPANIES,
      rates: [],
      commissions: [],
      userCommissions: [],
      logs: [],
      vehicles: DEFAULT_VEHICLES
    };
    writeDb(initialDb);
    return initialDb;
  }
  try {
    const data = fs.readFileSync(DB_PATH, 'utf8');
    const db = JSON.parse(data);
    if (!db.vehicles) {
      db.vehicles = DEFAULT_VEHICLES;
      writeDb(db);
    }
    return db;
  } catch (err) {
    console.error('Error reading database file, using fallback empty state', err);
    return { users: [], companies: [], rates: [], commissions: [], userCommissions: [], logs: [], vehicles: [] };
  }
};

export const writeDb = (db: DbSchema) => {
  ensureDir();
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf8');
};

export const logAction = (userId: string, username: string, action: string, details: string) => {
  const db = readDb();
  const newLog: AuditLog = {
    id: Math.random().toString(36).substring(2, 9),
    userId,
    username,
    action,
    details,
    timestamp: new Date().toISOString()
  };
  db.logs.unshift(newLog);
  // Keep only the last 1000 logs
  if (db.logs.length > 1000) {
    db.logs = db.logs.slice(0, 1000);
  }
  writeDb(db);
};
