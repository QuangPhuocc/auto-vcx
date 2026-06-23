import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import initSqlJs from 'sql.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_DIR = path.join(__dirname, 'data');
const SQLITE_PATH = path.join(DB_DIR, 'db.sqlite');
const DB_PATH = path.join(DB_DIR, 'db.json');

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
  oldValue?: string;
  newValue?: string;
}

export interface VehicleType {
  id: string;
  name: string;
  group: string;
  dbCarType: string;
}

export interface BankReferral {
  id: string;
  companyId: string;
  bankName: string;
  rate: number | string;
}

export interface DbSchema {
  users: User[];
  companies: InsuranceCompany[];
  rates: RateRule[];
  commissions: CommissionRule[];
  userCommissions: UserCommissionOverride[];
  logs: AuditLog[];
  vehicles: VehicleType[];
  bankReferrals: BankReferral[];
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

const SQL = await initSqlJs();

let sqljsDbInner: any = null;
let sqliteDb: SqlJsDatabase | null = null;
let transactionDepth = 0;

const saveDatabase = () => {
  if (transactionDepth === 0 && sqljsDbInner) {
    const data = sqljsDbInner.export();
    fs.writeFileSync(SQLITE_PATH, Buffer.from(data));
  }
};

class SqlJsStatement {
  private stmt: any;
  constructor(stmt: any) {
    this.stmt = stmt;
  }
  
  run(...params: any[]) {
    if (params.length > 0) {
      const mappedParams = params.map(p => typeof p === 'boolean' ? (p ? 1 : 0) : p);
      this.stmt.bind(mappedParams);
    }
    this.stmt.step();
    this.stmt.reset();
    saveDatabase();
  }

  get(...params: any[]) {
    if (params.length > 0) {
      const mappedParams = params.map(p => typeof p === 'boolean' ? (p ? 1 : 0) : p);
      this.stmt.bind(mappedParams);
    }
    const hasRow = this.stmt.step();
    const result = hasRow ? this.stmt.getAsObject() : undefined;
    this.stmt.reset();
    return result;
  }

  all(...params: any[]) {
    if (params.length > 0) {
      const mappedParams = params.map(p => typeof p === 'boolean' ? (p ? 1 : 0) : p);
      this.stmt.bind(mappedParams);
    }
    const results: any[] = [];
    while (this.stmt.step()) {
      results.push(this.stmt.getAsObject());
    }
    this.stmt.reset();
    return results;
  }
}

class SqlJsDatabase {
  private db: any;
  constructor(db: any) {
    this.db = db;
  }

  exec(sql: string) {
    this.db.exec(sql);
    saveDatabase();
  }

  pragma(sql: string) {
    try {
      this.db.exec(`PRAGMA ${sql}`);
    } catch (e) {
      // ignore
    }
  }

  prepare(sql: string) {
    return new SqlJsStatement(this.db.prepare(sql));
  }

  transaction(fn: (...args: any[]) => any) {
    return (...args: any[]) => {
      transactionDepth++;
      this.db.exec('BEGIN TRANSACTION');
      try {
        const result = fn(...args);
        this.db.exec('COMMIT');
        transactionDepth--;
        if (transactionDepth === 0) {
          saveDatabase();
        }
        return result;
      } catch (err) {
        this.db.exec('ROLLBACK');
        transactionDepth--;
        throw err;
      }
    };
  }
}

export const getSqliteDb = (): SqlJsDatabase => {
  if (!sqliteDb) {
    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true });
    }
    if (fs.existsSync(SQLITE_PATH)) {
      const filebuffer = fs.readFileSync(SQLITE_PATH);
      sqljsDbInner = new SQL.Database(filebuffer);
    } else {
      sqljsDbInner = new SQL.Database();
      const data = sqljsDbInner.export();
      fs.writeFileSync(SQLITE_PATH, Buffer.from(data));
    }
    sqliteDb = new SqlJsDatabase(sqljsDbInner);
    sqliteDb.pragma('journal_mode = WAL');
    
    // Create tables
    sqliteDb.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE,
        passwordHash TEXT,
        role TEXT,
        name TEXT,
        phone TEXT,
        parentId TEXT,
        createdAt TEXT
      );
      CREATE TABLE IF NOT EXISTS companies (
        id TEXT PRIMARY KEY,
        name TEXT,
        color TEXT,
        text TEXT,
        border TEXT,
        hasRates INTEGER
      );
      CREATE TABLE IF NOT EXISTS rates (
        id TEXT PRIMARY KEY,
        carType TEXT,
        companyId TEXT,
        isEV INTEGER,
        evModel TEXT,
        rules TEXT
      );
      CREATE TABLE IF NOT EXISTS commissions (
        id TEXT PRIMARY KEY,
        carType TEXT,
        companyId TEXT,
        rules TEXT
      );
      CREATE TABLE IF NOT EXISTS userCommissions (
        id TEXT PRIMARY KEY,
        userId TEXT,
        carType TEXT,
        companyId TEXT,
        rate REAL,
        rules TEXT
      );
      CREATE TABLE IF NOT EXISTS logs (
        id TEXT PRIMARY KEY,
        userId TEXT,
        username TEXT,
        action TEXT,
        details TEXT,
        timestamp TEXT,
        oldValue TEXT,
        newValue TEXT
      );
      CREATE TABLE IF NOT EXISTS vehicles (
        id TEXT PRIMARY KEY,
        name TEXT,
        [group] TEXT,
        dbCarType TEXT
      );
      CREATE TABLE IF NOT EXISTS bankReferrals (
        id TEXT PRIMARY KEY,
        companyId TEXT,
        bankName TEXT,
        rate REAL
      );
    `);
    
    // Check if migration is needed (table users has 0 rows and db.json exists)
    const userCount = (sqliteDb.prepare('SELECT COUNT(*) as count FROM users').get() as any).count;
    if (userCount === 0 && fs.existsSync(DB_PATH)) {
      try {
        console.log('--- DETECTED OLD DATABASE: MIGRATING TO SQLITE ---');
        const fileData = fs.readFileSync(DB_PATH, 'utf8');
        const dbJson = JSON.parse(fileData);
        
        sqliteDb.transaction(() => {
          // Insert users
          if (Array.isArray(dbJson.users)) {
            const insertUser = sqliteDb!.prepare(`
              INSERT INTO users (id, username, passwordHash, role, name, phone, parentId, createdAt)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `);
            for (const u of dbJson.users) {
              insertUser.run(u.id, u.username, u.passwordHash, u.role, u.name, u.phone || '', u.parentId, u.createdAt);
            }
          }
          
          // Insert companies
          if (Array.isArray(dbJson.companies)) {
            const insertCompany = sqliteDb!.prepare(`
              INSERT INTO companies (id, name, color, text, border, hasRates)
              VALUES (?, ?, ?, ?, ?, ?)
            `);
            for (const c of dbJson.companies) {
              insertCompany.run(c.id, c.name, c.color, c.text || '', c.border || '', c.hasRates ? 1 : 0);
            }
          }
          
          // Insert rates
          if (Array.isArray(dbJson.rates)) {
            const insertRate = sqliteDb!.prepare(`
              INSERT INTO rates (id, carType, companyId, isEV, evModel, rules)
              VALUES (?, ?, ?, ?, ?, ?)
            `);
            for (const r of dbJson.rates) {
              insertRate.run(r.id, r.carType, r.companyId, r.isEV ? 1 : 0, r.evModel || null, JSON.stringify(r.rules));
            }
          }
          
          // Insert commissions
          if (Array.isArray(dbJson.commissions)) {
            const insertComm = sqliteDb!.prepare(`
              INSERT INTO commissions (id, carType, companyId, rules)
              VALUES (?, ?, ?, ?)
            `);
            for (const c of dbJson.commissions) {
              insertComm.run(c.id, c.carType, c.companyId, JSON.stringify(c.rules));
            }
          }
          
          // Insert userCommissions
          if (Array.isArray(dbJson.userCommissions)) {
            const insertUserComm = sqliteDb!.prepare(`
              INSERT INTO userCommissions (id, userId, carType, companyId, rate, rules)
              VALUES (?, ?, ?, ?, ?, ?)
            `);
            for (const uc of dbJson.userCommissions) {
              insertUserComm.run(uc.id, uc.userId, uc.carType, uc.companyId, uc.rate !== undefined ? uc.rate : null, uc.rules ? JSON.stringify(uc.rules) : null);
            }
          }
          
          // Insert logs
          if (Array.isArray(dbJson.logs)) {
            const insertLog = sqliteDb!.prepare(`
              INSERT INTO logs (id, userId, username, action, details, timestamp, oldValue, newValue)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `);
            for (const l of dbJson.logs) {
              insertLog.run(l.id, l.userId, l.username, l.action, l.details, l.timestamp, l.oldValue || null, l.newValue || null);
            }
          }
          
          // Insert vehicles
          if (Array.isArray(dbJson.vehicles)) {
            const insertVehicle = sqliteDb!.prepare(`
              INSERT INTO vehicles (id, name, [group], dbCarType)
              VALUES (?, ?, ?, ?)
            `);
            for (const v of dbJson.vehicles) {
              insertVehicle.run(v.id, v.name, v.group, v.dbCarType);
            }
          }
        })();
        
        console.log('--- DATABASE MIGRATION COMPLETED SUCCESSFULLY ---');
        fs.renameSync(DB_PATH, DB_PATH + '.bak');
        console.log(`Renamed ${DB_PATH} to ${DB_PATH}.bak for archival.`);
      } catch (err) {
        console.error('Error migrating database to SQLite:', err);
      }
    } else if (userCount === 0) {
      console.log('--- INITIALIZING FRESH SQLITE DATABASE ---');
      sqliteDb.transaction(() => {
        const insertUser = sqliteDb!.prepare(`
          INSERT INTO users (id, username, passwordHash, role, name, phone, parentId, createdAt)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);
        insertUser.run(
          'master-id',
          'master',
          'Qphuocins2104@@',
          'master',
          'QUANG PHƯỚC',
          '0869200835',
          null,
          new Date().toISOString()
        );
        
        const insertCompany = sqliteDb!.prepare(`
          INSERT INTO companies (id, name, color, text, border, hasRates)
          VALUES (?, ?, ?, ?, ?, ?)
        `);
        for (const c of DEFAULT_COMPANIES) {
          insertCompany.run(c.id, c.name, c.color, c.text || '', c.border || '', c.hasRates ? 1 : 0);
        }
        
        const insertVehicle = sqliteDb!.prepare(`
          INSERT INTO vehicles (id, name, [group], dbCarType)
          VALUES (?, ?, ?, ?)
        `);
        for (const v of DEFAULT_VEHICLES) {
          insertVehicle.run(v.id, v.name, v.group, v.dbCarType);
        }
      })();
      console.log('--- FRESH DATABASE INITIALIZATION COMPLETED ---');
    }
  }
  return sqliteDb;
};

export const readDb = (): DbSchema => {
  const db = getSqliteDb();
  try {
    const users = db.prepare('SELECT * FROM users').all() as any[];
    const companies = db.prepare('SELECT * FROM companies').all() as any[];
    const rates = db.prepare('SELECT * FROM rates').all() as any[];
    const commissions = db.prepare('SELECT * FROM commissions').all() as any[];
    const userCommissions = db.prepare('SELECT * FROM userCommissions').all() as any[];
    const logs = db.prepare('SELECT * FROM logs ORDER BY timestamp DESC LIMIT 1000').all() as any[];
    const vehicles = db.prepare('SELECT * FROM vehicles').all() as any[];
    const bankReferrals = db.prepare('SELECT * FROM bankReferrals').all() as any[];
    
    return {
      users: users.map(u => ({
        id: u.id,
        username: u.username,
        passwordHash: u.passwordHash,
        role: u.role,
        name: u.name,
        phone: u.phone || undefined,
        parentId: u.parentId || null,
        createdAt: u.createdAt
      })),
      companies: companies.map(c => ({
        id: c.id,
        name: c.name,
        color: c.color,
        text: c.text || undefined,
        border: c.border || undefined,
        hasRates: c.hasRates === 1
      })),
      rates: rates.map(r => ({
        id: r.id,
        carType: r.carType,
        companyId: r.companyId,
        isEV: r.isEV === 1,
        evModel: r.evModel || undefined,
        rules: JSON.parse(r.rules)
      })),
      commissions: commissions.map(c => ({
        id: c.id,
        carType: c.carType,
        companyId: c.companyId,
        rules: JSON.parse(c.rules)
      })),
      userCommissions: userCommissions.map(uc => {
        const item: any = {
          id: uc.id,
          userId: uc.userId,
          carType: uc.carType,
          companyId: uc.companyId
        };
        if (uc.rate !== null && uc.rate !== undefined) {
          item.rate = uc.rate;
        }
        if (uc.rules) {
          item.rules = JSON.parse(uc.rules);
        }
        return item;
      }),
      logs: logs.map(l => ({
        id: l.id,
        userId: l.userId,
        username: l.username,
        action: l.action,
        details: l.details,
        timestamp: l.timestamp,
        oldValue: l.oldValue || undefined,
        newValue: l.newValue || undefined
      })),
      vehicles: vehicles.map(v => ({
        id: v.id,
        name: v.name,
        group: v.group,
        dbCarType: v.dbCarType
      })),
      bankReferrals: bankReferrals.map(b => ({
        id: b.id,
        companyId: b.companyId,
        bankName: b.bankName,
        rate: b.rate
      }))
    };
  } catch (err) {
    console.error('Error reading from SQLite database:', err);
    return { users: [], companies: [], rates: [], commissions: [], userCommissions: [], logs: [], vehicles: [], bankReferrals: [] };
  }
};

export const writeDb = (dbSchema: DbSchema) => {
  const db = getSqliteDb();
  db.transaction(() => {
    // 1. Users
    db.prepare('DELETE FROM users').run();
    const insertUser = db.prepare(`
      INSERT INTO users (id, username, passwordHash, role, name, phone, parentId, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const u of dbSchema.users) {
      insertUser.run(u.id, u.username, u.passwordHash, u.role, u.name, u.phone || '', u.parentId, u.createdAt);
    }
    
    // 2. Companies
    db.prepare('DELETE FROM companies').run();
    const insertCompany = db.prepare(`
      INSERT INTO companies (id, name, color, text, border, hasRates)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    for (const c of dbSchema.companies) {
      insertCompany.run(c.id, c.name, c.color, c.text || '', c.border || '', c.hasRates ? 1 : 0);
    }
    
    // 3. Rates
    db.prepare('DELETE FROM rates').run();
    const insertRate = db.prepare(`
      INSERT INTO rates (id, carType, companyId, isEV, evModel, rules)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    for (const r of dbSchema.rates) {
      insertRate.run(r.id, r.carType, r.companyId, r.isEV ? 1 : 0, r.evModel || null, JSON.stringify(r.rules));
    }
    
    // 4. Commissions
    db.prepare('DELETE FROM commissions').run();
    const insertComm = db.prepare(`
      INSERT INTO commissions (id, carType, companyId, rules)
      VALUES (?, ?, ?, ?)
    `);
    for (const c of dbSchema.commissions) {
      insertComm.run(c.id, c.carType, c.companyId, JSON.stringify(c.rules));
    }
    
    // 5. UserCommissions
    db.prepare('DELETE FROM userCommissions').run();
    const insertUserComm = db.prepare(`
      INSERT INTO userCommissions (id, userId, carType, companyId, rate, rules)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    for (const uc of dbSchema.userCommissions) {
      insertUserComm.run(uc.id, uc.userId, uc.carType, uc.companyId, uc.rate !== undefined ? uc.rate : null, uc.rules ? JSON.stringify(uc.rules) : null);
    }
    
    // 6. Logs
    db.prepare('DELETE FROM logs').run();
    const insertLog = db.prepare(`
      INSERT INTO logs (id, userId, username, action, details, timestamp, oldValue, newValue)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const l of dbSchema.logs) {
      insertLog.run(l.id, l.userId, l.username, l.action, l.details, l.timestamp, l.oldValue || null, l.newValue || null);
    }
    
    // 7. Vehicles
    db.prepare('DELETE FROM vehicles').run();
    const insertVehicle = db.prepare(`
      INSERT INTO vehicles (id, name, [group], dbCarType)
      VALUES (?, ?, ?, ?)
    `);
    for (const v of dbSchema.vehicles) {
      insertVehicle.run(v.id, v.name, v.group, v.dbCarType);
    }

    // 8. BankReferrals
    db.prepare('DELETE FROM bankReferrals').run();
    const insertBankRef = db.prepare(`
      INSERT INTO bankReferrals (id, companyId, bankName, rate)
      VALUES (?, ?, ?, ?)
    `);
    for (const b of dbSchema.bankReferrals || []) {
      insertBankRef.run(b.id, b.companyId, b.bankName, b.rate);
    }
  })();
};

export const logAction = (
  userId: string,
  username: string,
  action: string,
  details: string,
  oldValue?: string | object | null,
  newValue?: string | object | null
) => {
  const db = getSqliteDb();
  try {
    const id = Math.random().toString(36).substring(2, 9);
    const timestamp = new Date().toISOString();
    
    let oldValStr: string | null = null;
    if (oldValue !== undefined && oldValue !== null) {
      oldValStr = typeof oldValue === 'string' ? oldValue : JSON.stringify(oldValue);
    }
    
    let newValStr: string | null = null;
    if (newValue !== undefined && newValue !== null) {
      newValStr = typeof newValue === 'string' ? newValue : JSON.stringify(newValue);
    }
    
    db.prepare(`
      INSERT INTO logs (id, userId, username, action, details, timestamp, oldValue, newValue)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, userId, username, action, details, timestamp, oldValStr, newValStr);
    
    // Prune logs if count exceeds 1000
    const logCount = (db.prepare('SELECT COUNT(*) as count FROM logs').get() as any).count;
    if (logCount > 1000) {
      db.prepare(`
        DELETE FROM logs WHERE id IN (
          SELECT id FROM logs ORDER BY timestamp ASC LIMIT ?
        )
      `).run(logCount - 1000);
    }
  } catch (err) {
    console.error('Error logging action to SQLite:', err);
  }
};
