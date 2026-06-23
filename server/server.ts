import express from 'express';
import dotenv from 'dotenv';
import { readDb, writeDb, logAction, User, RateRule, CommissionRule, UserCommissionOverride, InsuranceCompany, VehicleType, BankReferral } from './db';
import { seedData } from './seed';
import * as XLSX from 'xlsx';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'MY_SUPER_SECRET_JWT_TOKEN_123456@';

const vehicles = [
  'personal', 'grab', 'taxi', 'commercial_passenger', 'tractor', 'trailer',
  'pickup', 'van_minivan', 'truck_non_commercial', 'truck_commercial',
  'truck_refrigerated', 'training', 'internal', 'specialized',
  'electric_personal', 'electric_taxi', 'electric_grab'
];

export const BANK_OPTIONS = [
  'Không vay ngân hàng',
  'CÔNG TY TÀI CHÍNH TOYOTA TFSVN',
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

const app = express();
const PORT = process.env.PORT || 5000;

// Trust proxy for Nginx reverse proxy and express-rate-limit
app.set('trust proxy', 1);

// Helmet security headers
app.use(helmet({
  contentSecurityPolicy: false,
}));

const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',') 
  : [];

// Native CORS Middleware with origin validation
app.use((req, res, next) => {
  const origin = req.headers.origin;
  const isProd = process.env.NODE_ENV === 'production';
  
  if (origin) {
    if (!isProd || ALLOWED_ORIGINS.includes(origin)) {
      res.header('Access-Control-Allow-Origin', origin);
    }
  } else if (!isProd) {
    res.header('Access-Control-Allow-Origin', '*');
  }
  
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Login Rate Limiter (Brute-force protection)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit to 5 attempts
  message: { message: 'Thử đăng nhập sai quá nhiều lần. Vui lòng thử lại sau 15 phút.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Seed database on startup
seedData();

// Helper to authenticate requests and get user role/id using secure JWT
const getAuthUser = (req: express.Request): User | null => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return null;
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string; role: string };
    const db = readDb();
    return db.users.find(u => u.id === decoded.id) || null;
  } catch (err) {
    return null;
  }
};

// ==========================================
// AUTHENTICATION ENDPOINTS
// ==========================================

app.post('/api/auth/login', loginLimiter, (req, res) => {
  const { username, password } = req.body;
  const db = readDb();
  
  const user = db.users.find(u => u.username === username);
  if (!user || (user.passwordHash.startsWith('$2b$') ? !bcrypt.compareSync(password, user.passwordHash) : user.passwordHash !== password)) {
    return res.status(401).json({ message: 'Tên đăng nhập hoặc mật khẩu không đúng' });
  }

  logAction(user.id, user.username, 'LOGIN', `Đăng nhập thành công`);
  
  const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
  
  res.json({
    token,
    user: {
      id: user.id,
      username: user.username,
      role: user.role,
      name: user.name,
      parentId: user.parentId
    }
  });
});

app.get('/api/auth/me', (req, res) => {
  const user = getAuthUser(req);
  if (!user) {
    return res.status(401).json({ message: 'Không được cấp quyền' });
  }
  res.json({
    id: user.id,
    username: user.username,
    role: user.role,
    name: user.name,
    phone: user.phone || '',
    password: user.passwordHash,
    parentId: user.parentId
  });
});

// ==========================================
// USER HIERARCHY & CRUD ENDPOINTS
// ==========================================

// Get list of users belonging to the branch (restricted to 1 level below for Admin/Client, all for Master)
app.get('/api/users', (req, res) => {
  const currentUser = getAuthUser(req);
  if (!currentUser) return res.status(401).json({ message: 'Không được cấp quyền' });

  const db = readDb();
  let visibleUsers: User[] = [];

  if (currentUser.role === 'master') {
    // Master sees everyone in the system (except master itself)
    visibleUsers = db.users.filter(u => u.role !== 'master');
  } else if (currentUser.role === 'admin') {
    // Admin sees only direct clients they created
    visibleUsers = db.users.filter(u => u.parentId === currentUser.id && u.role === 'client');
  } else if (currentUser.role === 'client') {
    // Client sees only direct users they created
    visibleUsers = db.users.filter(u => u.parentId === currentUser.id && u.role === 'user');
  } else {
    // User sees no one
    visibleUsers = [];
  }

  res.json(visibleUsers.map(u => {
    const parentUser = db.users.find(p => p.id === u.parentId);
    return {
      id: u.id,
      username: u.username,
      role: u.role,
      name: u.name,
      parentId: u.parentId,
      parentUsername: parentUser ? parentUser.username : null,
      parentName: parentUser ? parentUser.name : null,
      createdAt: u.createdAt,
      password: currentUser.role === 'master' ? u.passwordHash : undefined // Expose password only to MASTER
    };
  }));
});

// Get user tree structure (respected by roles: Master sees all, Admin/Client see themselves and direct children)
app.get('/api/users/tree', (req, res) => {
  const currentUser = getAuthUser(req);
  if (!currentUser) return res.status(401).json({ message: 'Không được cấp quyền' });

  const db = readDb();

  interface TreeNode {
    id: string;
    username: string;
    role: string;
    name: string;
    phone?: string;
    children: TreeNode[];
  }

  const buildFullTree = (user: User): TreeNode => {
    const children = db.users.filter(u => u.parentId === user.id);
    return {
      id: user.id,
      username: user.username,
      role: user.role,
      name: user.name,
      phone: user.phone || '',
      children: children.map(buildFullTree)
    };
  };

  if (currentUser.role === 'master') {
    // Master builds full tree: ADMIN -> CLIENT -> USER
    const admins = db.users.filter(u => u.role === 'admin');
    return res.json(admins.map(buildFullTree));
  }
  
  if (currentUser.role === 'admin') {
    // Admin sees themselves and their direct CLIENTs (no users below clients)
    const clients = db.users.filter(u => u.parentId === currentUser.id && u.role === 'client');
    const tree: TreeNode = {
      id: currentUser.id,
      username: currentUser.username,
      role: currentUser.role,
      name: currentUser.name,
      children: clients.map(c => ({
        id: c.id,
        username: c.username,
        role: c.role,
        name: c.name,
        children: []
      }))
    };
    return res.json([tree]);
  }
  
  if (currentUser.role === 'client') {
    // Client sees themselves and their direct USERs
    const users = db.users.filter(u => u.parentId === currentUser.id && u.role === 'user');
    const tree: TreeNode = {
      id: currentUser.id,
      username: currentUser.username,
      role: currentUser.role,
      name: currentUser.name,
      children: users.map(u => ({
        id: u.id,
        username: u.username,
        role: u.role,
        name: u.name,
        children: []
      }))
    };
    return res.json([tree]);
  }

  return res.json([]);
});

// Create User
app.post('/api/users', (req, res) => {
  const currentUser = getAuthUser(req);
  if (!currentUser) return res.status(401).json({ message: 'Không được cấp quyền' });

  const { username, password, role, name, parentId, phone } = req.body;
  const db = readDb();

  // Check if username exists
  if (db.users.some(u => u.username === username)) {
    return res.status(400).json({ message: 'Tên đăng nhập đã tồn tại' });
  }

  // Resolve parentId
  let resolvedParentId = currentUser.id;
  if (currentUser.role === 'master') {
    resolvedParentId = parentId || 'master-id';
  } else {
    // Other roles can only create directly under themselves
    if (parentId && parentId !== currentUser.id) {
      return res.status(400).json({ message: 'Bạn chỉ được tạo tài khoản trực thuộc chính mình' });
    }
  }

  // Validate parent exists
  let parentUser: User | null = null;
  if (resolvedParentId === 'master-id') {
    parentUser = db.users.find(u => u.role === 'master') || null;
  } else {
    parentUser = db.users.find(u => u.id === resolvedParentId) || null;
    if (!parentUser) {
      return res.status(400).json({ message: 'Tài khoản trực thuộc không tồn tại' });
    }
  }

  // Enforce role constraints based on the parent's role
  const parentRole = parentUser ? parentUser.role : 'master';
  if (parentRole === 'master' && role !== 'admin') {
    return res.status(400).json({ message: 'Tài khoản trực thuộc MASTER phải có vai trò là ADMIN' });
  }
  if (parentRole === 'admin' && role !== 'client') {
    return res.status(400).json({ message: 'Tài khoản trực thuộc ADMIN phải có vai trò là CLIENT' });
  }
  if (parentRole === 'client' && role !== 'user') {
    return res.status(400).json({ message: 'Tài khoản trực thuộc CLIENT phải có vai trò là USER' });
  }
  if (parentRole === 'user') {
    return res.status(400).json({ message: 'Không thể tạo tài khoản dưới cấp USER' });
  }

  const newUser: User = {
    id: Math.random().toString(36).substring(2, 9),
    username,
    passwordHash: password,
    role,
    name,
    phone: phone || '',
    parentId: resolvedParentId,
    createdAt: new Date().toISOString()
  };

  db.users.push(newUser);
  writeDb(db);

  logAction(currentUser.id, currentUser.username, 'CREATE_USER', `Tạo tài khoản ${role}: ${username} (${name})`);
  res.status(201).json({ id: newUser.id, username: newUser.username, role: newUser.role, name: newUser.name });
});

// Batch Create Users from Excel Import
app.post('/api/users/batch', (req, res) => {
  const currentUser = getAuthUser(req);
  if (!currentUser) return res.status(401).json({ message: 'Không được cấp quyền' });

  const { users } = req.body;
  if (!Array.isArray(users)) {
    return res.status(400).json({ message: 'Định dạng dữ liệu không hợp lệ' });
  }

  const db = readDb();
  const createdUsers: User[] = [];
  const errors: string[] = [];

  for (let i = 0; i < users.length; i++) {
    const item = users[i];
    const { username, password, name, role, parentUsername } = item;

    if (!username || !password || !name || !role) {
      errors.push(`Dòng ${i + 1}: Thiếu thông tin bắt buộc (username, password, name, role)`);
      continue;
    }

    let normalizedRole = role.toLowerCase().trim();
    if (normalizedRole === 'quản lý' || normalizedRole === 'quan ly') {
      normalizedRole = 'admin';
    } else if (normalizedRole === 'đại lý' || normalizedRole === 'dai ly') {
      normalizedRole = 'client';
    } else if (normalizedRole === 'ctv') {
      normalizedRole = 'user';
    }

    if (!['admin', 'client', 'user'].includes(normalizedRole)) {
      errors.push(`Dòng ${i + 1} (@${username}): Vai trò không hợp lệ (phải là Quản lý, Đại lý, hoặc CTV)`);
      continue;
    }

    if (db.users.some(u => u.username === username) || createdUsers.some(u => u.username === username)) {
      errors.push(`Dòng ${i + 1} (@${username}): Tên đăng nhập đã tồn tại`);
      continue;
    }

    // Resolve parent based on parentUsername
    let parentId: string | null = null;
    if (currentUser.role === 'master') {
      if (!parentUsername || parentUsername.toLowerCase().trim() === 'master') {
        parentId = 'master-id';
      } else {
        const parent = db.users.find(u => u.username === parentUsername.trim()) || createdUsers.find(u => u.username === parentUsername.trim());
        if (!parent) {
          errors.push(`Dòng ${i + 1} (@${username}): Không tìm thấy tài khoản cha @${parentUsername}`);
          continue;
        }
        parentId = parent.id;
      }
    } else {
      if (parentUsername && parentUsername.trim() !== currentUser.username) {
        errors.push(`Dòng ${i + 1} (@${username}): Bạn chỉ được tạo tài khoản trực thuộc tài khoản của bạn (@${currentUser.username})`);
        continue;
      }
      parentId = currentUser.id;
    }

    // Check role constraints based on resolved parent
    let parentUser: User | null = null;
    if (parentId === 'master-id') {
      parentUser = db.users.find(u => u.role === 'master') || null;
    } else {
      parentUser = db.users.find(u => u.id === parentId) || createdUsers.find(u => u.id === parentId) || null;
    }

    const parentRole = parentUser ? parentUser.role : 'master';
    if (parentRole === 'master' && normalizedRole !== 'admin') {
      errors.push(`Dòng ${i + 1} (@${username}): Tài khoản trực thuộc MASTER phải có vai trò là ADMIN`);
      continue;
    }
    if (parentRole === 'admin' && normalizedRole !== 'client') {
      errors.push(`Dòng ${i + 1} (@${username}): Tài khoản trực thuộc ADMIN phải có vai trò là CLIENT`);
      continue;
    }
    if (parentRole === 'client' && normalizedRole !== 'user') {
      errors.push(`Dòng ${i + 1} (@${username}): Tài khoản trực thuộc CLIENT phải có vai trò là USER`);
      continue;
    }
    if (parentRole === 'user') {
      errors.push(`Dòng ${i + 1} (@${username}): Không thể tạo tài khoản dưới cấp USER`);
      continue;
    }

    if (currentUser.role === 'admin' && normalizedRole !== 'client') {
      errors.push(`Dòng ${i + 1} (@${username}): Bạn chỉ được quyền tạo tài khoản CLIENT`);
      continue;
    }
    if (currentUser.role === 'client' && normalizedRole !== 'user') {
      errors.push(`Dòng ${i + 1} (@${username}): Bạn chỉ được quyền tạo tài khoản USER`);
      continue;
    }

    const newUser: User = {
      id: Math.random().toString(36).substring(2, 9),
      username: username.trim(),
      passwordHash: password.toString().trim(),
      role: normalizedRole,
      name: name.trim(),
      parentId: parentId,
      createdAt: new Date().toISOString()
    };

    createdUsers.push(newUser);
  }

  if (createdUsers.length > 0) {
    db.users.push(...createdUsers);
    writeDb(db);
    logAction(currentUser.id, currentUser.username, 'BATCH_CREATE_USERS', `Tạo nhanh bằng Excel: ${createdUsers.length} tài khoản thành công`);
  }

  res.json({
    success: createdUsers.length,
    failed: errors.length,
    errors
  });
});

// Update User
app.put('/api/users/:id', (req, res) => {
  const currentUser = getAuthUser(req);
  if (!currentUser) return res.status(401).json({ message: 'Không được cấp quyền' });

  const { id } = req.params;
  const { name, username, phone, password } = req.body;
  const db = readDb();

  const user = db.users.find(u => u.id === id);
  if (!user) return res.status(404).json({ message: 'Không tìm thấy người dùng' });

  // Verify ownership (Cannot modify random branch user unless parent or self)
  const isParent = (parentId: string | null, childId: string): boolean => {
    if (!parentId) return false;
    if (parentId === currentUser.id) return true;
    const parent = db.users.find(u => u.id === parentId);
    return parent ? isParent(parent.parentId, childId) : false;
  };

  if (currentUser.role !== 'master' && user.id !== currentUser.id && !isParent(user.parentId, user.id)) {
    return res.status(403).json({ message: 'Không có quyền chỉnh sửa tài khoản này' });
  }

  // Check if username changes and is already taken
  if (username && username !== user.username) {
    if (db.users.some(u => u.username === username && u.id !== id)) {
      return res.status(400).json({ message: 'Tên đăng nhập đã tồn tại' });
    }
    user.username = username;
  }

  const oldValue = JSON.parse(JSON.stringify(user));

  if (name) user.name = name;
  if (phone !== undefined) user.phone = phone;
  if (password) user.passwordHash = password;

  writeDb(db);
  const newValue = JSON.parse(JSON.stringify(user));
  logAction(currentUser.id, currentUser.username, 'UPDATE_USER', `Cập nhật thông tin tài khoản: ${user.username}`, oldValue, newValue);
  res.json({ message: 'Cập nhật thành công' });
});

// Delete User
app.delete('/api/users/:id', (req, res) => {
  const currentUser = getAuthUser(req);
  if (!currentUser) return res.status(401).json({ message: 'Không được cấp quyền' });

  const { id } = req.params;
  const db = readDb();

  const userIndex = db.users.findIndex(u => u.id === id);
  if (userIndex === -1) return res.status(404).json({ message: 'Không tìm thấy người dùng' });

  const user = db.users[userIndex];

  // Restrict who can delete
  if (currentUser.role === 'master' && user.role !== 'admin') {
    return res.status(403).json({ message: 'Master chỉ có quyền xoá tài khoản Admin' });
  }
  if (currentUser.role === 'admin' && user.parentId !== currentUser.id) {
    return res.status(403).json({ message: 'Admin chỉ được xoá Client trực thuộc' });
  }
  if (currentUser.role === 'client' && user.parentId !== currentUser.id) {
    return res.status(403).json({ message: 'Client chỉ được xoá User trực thuộc' });
  }
  if (currentUser.role === 'user') {
    return res.status(403).json({ message: 'User không thể xoá tài khoản' });
  }

  // Delete all descendants recursively
  const getDescendantIds = (parentId: string): string[] => {
    const children = db.users.filter(u => u.parentId === parentId);
    let ids = children.map(c => c.id);
    children.forEach(c => {
      ids = [...ids, ...getDescendantIds(c.id)];
    });
    return ids;
  };

  const toDelete = [id, ...getDescendantIds(id)];

  db.users = db.users.filter(u => !toDelete.includes(u.id));
  // Clean up user commission overrides
  db.userCommissions = db.userCommissions.filter(uc => !toDelete.includes(uc.userId));
  
  writeDb(db);
  logAction(currentUser.id, currentUser.username, 'DELETE_USER', `Xoá tài khoản ${user.username} và các cấp dưới`);
  res.json({ message: 'Xoá tài khoản thành công' });
});

// ==========================================
// INSURANCE COMPANY ENDPOINTS
// ==========================================

app.get('/api/companies', (req, res) => {
  const db = readDb();
  res.json(db.companies);
});

app.post('/api/companies', (req, res) => {
  const currentUser = getAuthUser(req);
  if (!currentUser || currentUser.role !== 'master') {
    return res.status(403).json({ message: 'Chỉ MASTER mới được quản lý hãng bảo hiểm' });
  }

  const { id, name, color, hasRates } = req.body;
  const db = readDb();

  if (db.companies.some(c => c.id === id)) {
    return res.status(400).json({ message: 'Mã hãng đã tồn tại' });
  }

  const newCompany: InsuranceCompany = { 
    id, 
    name, 
    color, 
    text: '', 
    border: '', 
    hasRates 
  };
  db.companies.push(newCompany);
  writeDb(db);

  logAction(currentUser.id, currentUser.username, 'CREATE_COMPANY', `Tạo hãng bảo hiểm: ${name} (${id})`);
  res.status(201).json(newCompany);
});

app.put('/api/companies/:id', (req, res) => {
  const currentUser = getAuthUser(req);
  if (!currentUser || currentUser.role !== 'master') {
    return res.status(403).json({ message: 'Chỉ MASTER mới được quản lý hãng bảo hiểm' });
  }

  const { id } = req.params;
  const { name, color, hasRates } = req.body;
  const db = readDb();

  const company = db.companies.find(c => c.id === id);
  if (!company) return res.status(404).json({ message: 'Không tìm thấy hãng' });

  const oldValue = JSON.parse(JSON.stringify(company));

  if (name) company.name = name;
  if (color) company.color = color;
  if (hasRates !== undefined) company.hasRates = hasRates;

  writeDb(db);
  const newValue = JSON.parse(JSON.stringify(company));
  logAction(currentUser.id, currentUser.username, 'UPDATE_COMPANY', `Cập nhật hãng bảo hiểm: ${id}`, oldValue, newValue);
  res.json(company);
});

app.delete('/api/companies/:id', (req, res) => {
  const currentUser = getAuthUser(req);
  if (!currentUser || currentUser.role !== 'master') {
    return res.status(403).json({ message: 'Chỉ MASTER mới được quản lý hãng bảo hiểm' });
  }

  const { id } = req.params;
  const db = readDb();

  db.companies = db.companies.filter(c => c.id !== id);
  // Clean up rates and commissions associated with company
  db.rates = db.rates.filter(r => r.companyId !== id);
  db.commissions = db.commissions.filter(c => c.companyId !== id);
  db.userCommissions = db.userCommissions.filter(uc => uc.companyId !== id);

  writeDb(db);
  logAction(currentUser.id, currentUser.username, 'DELETE_COMPANY', `Xoá hãng bảo hiểm: ${id}`);
  res.json({ message: 'Xoá thành công' });
});

// ==========================================
// VEHICLE CATEGORIES ENDPOINTS
// ==========================================

app.get('/api/vehicles', (req, res) => {
  const db = readDb();
  res.json(db.vehicles || []);
});

app.post('/api/vehicles', (req, res) => {
  const currentUser = getAuthUser(req);
  if (!currentUser || currentUser.role !== 'master') {
    return res.status(403).json({ message: 'Chỉ MASTER mới được quản lý danh mục xe' });
  }

  const { id, name, group, dbCarType } = req.body;
  const db = readDb();

  if (!id || !name || !group || !dbCarType) {
    return res.status(400).json({ message: 'Thiếu thông tin bắt buộc' });
  }

  const normalizedId = id.trim().toLowerCase();

  if (db.vehicles && db.vehicles.some(v => v.id === normalizedId)) {
    return res.status(400).json({ message: 'Mã loại xe đã tồn tại' });
  }

  const newVehicle: VehicleType = { id: normalizedId, name: name.trim(), group: group.trim(), dbCarType: dbCarType.trim() };
  if (!db.vehicles) db.vehicles = [];
  db.vehicles.push(newVehicle);

  // Automatically initialize rates & commissions for this new vehicle category
  db.companies.forEach(company => {
    // 1. Non-EV Rate
    const rateIdGas = `${normalizedId}_${company.id}`;
    if (!db.rates.some(r => r.id === rateIdGas)) {
      db.rates.push({
        id: rateIdGas,
        carType: normalizedId,
        companyId: company.id,
        isEV: false,
        evModel: null,
        rules: [{ maxVal: null, rates: [0, 0, 0, 0] }]
      });
    }

    // 2. EV Rate
    const rateIdEV = `${normalizedId}_${company.id}_ev`;
    if (!db.rates.some(r => r.id === rateIdEV)) {
      if (company.id === 'BV') {
        // Bảo Việt has specific models
        const models = ['VF3', 'VF5', 'VFe34', 'VF6', 'VF7', 'VF8_9', 'other'];
        models.forEach(model => {
          db.rates.push({
            id: `${normalizedId}_BV_ev_${model}`,
            carType: normalizedId,
            companyId: 'BV',
            isEV: true,
            evModel: model,
            rules: [{ maxVal: null, rates: [0, 0, 0, 0] }]
          });
        });
      } else {
        db.rates.push({
          id: rateIdEV,
          carType: normalizedId,
          companyId: company.id,
          isEV: true,
          evModel: null,
          rules: [{ maxVal: null, rates: [0, 0, 0, 0] }]
        });
      }
    }

    // 3. Commission Rule
    const commId = `${normalizedId}_${company.id}`;
    if (!db.commissions.some(c => c.id === commId)) {
      // Default rate of 15% (0.15)
      db.commissions.push({
        id: commId,
        carType: normalizedId,
        companyId: company.id,
        rules: [{ maxVal: null, rate: 0.15 }]
      });
    }
  });

  writeDb(db);
  logAction(currentUser.id, currentUser.username, 'CREATE_VEHICLE', `Tạo loại xe: ${name} (${normalizedId})`);
  res.status(201).json(newVehicle);
});

app.put('/api/vehicles/:id', (req, res) => {
  const currentUser = getAuthUser(req);
  if (!currentUser || currentUser.role !== 'master') {
    return res.status(403).json({ message: 'Chỉ MASTER mới được quản lý danh mục xe' });
  }

  const { id } = req.params;
  const { name, group, dbCarType } = req.body;
  const db = readDb();

  const vehicle = db.vehicles.find(v => v.id === id);
  if (!vehicle) return res.status(404).json({ message: 'Không tìm thấy loại xe' });

  const oldValue = JSON.parse(JSON.stringify(vehicle));

  if (name) vehicle.name = name.trim();
  if (group) vehicle.group = group.trim();
  if (dbCarType) vehicle.dbCarType = dbCarType.trim();

  writeDb(db);
  const newValue = JSON.parse(JSON.stringify(vehicle));
  logAction(currentUser.id, currentUser.username, 'UPDATE_VEHICLE', `Cập nhật loại xe: ${id}`, oldValue, newValue);
  res.json(vehicle);
});

app.delete('/api/vehicles/:id', (req, res) => {
  const currentUser = getAuthUser(req);
  if (!currentUser || currentUser.role !== 'master') {
    return res.status(403).json({ message: 'Chỉ MASTER mới được quản lý danh mục xe' });
  }

  const { id } = req.params;
  const db = readDb();

  const vehicleIndex = db.vehicles.findIndex(v => v.id === id);
  if (vehicleIndex === -1) return res.status(404).json({ message: 'Không tìm thấy loại xe' });

  const vehicle = db.vehicles[vehicleIndex];

  // Remove vehicle
  db.vehicles.splice(vehicleIndex, 1);

  // Clean up associated rates, commissions, overrides
  db.rates = db.rates.filter(r => r.carType !== id);
  db.commissions = db.commissions.filter(c => c.carType !== id);
  db.userCommissions = db.userCommissions.filter(uc => uc.carType !== id);

  writeDb(db);
  logAction(currentUser.id, currentUser.username, 'DELETE_VEHICLE', `Xoá loại xe: ${vehicle.name} (${id})`);
  res.json({ message: 'Xoá thành công' });
});

// ==========================================
// RATES & COMMISSIONS ACCESS & SYNC
// ==========================================

// Get rates config
app.get('/api/rates', (req, res) => {
  const db = readDb();
  // Filter only companies that have hasRates = true
  const activeCompanyIds = db.companies.filter(c => c.hasRates).map(c => c.id);
  const activeRates = db.rates.filter(r => activeCompanyIds.includes(r.companyId));
  res.json(activeRates);
});

// Helper to format commission rules for client payload representation
const formatCommissionForClient = (rules: Array<{ maxVal: number | null, rate: number }> | undefined | null) => {
  if (!rules || rules.length === 0) return 0.15;
  if (rules.length === 1 && rules[0].maxVal === null) return rules[0].rate;
  return rules;
};

// Get commissions for current user context
app.get('/api/commissions', (req, res) => {
  const currentUser = getAuthUser(req);
  if (!currentUser) return res.status(401).json({ message: 'Không được cấp quyền' });

  const db = readDb();

  // Return override commissions for a user, or default if none
  const getCommissionsForUser = (userId: string) => {
    const overrides = db.userCommissions.filter(uc => uc.userId === userId);

    const result: Record<string, Record<string, any>> = {};
    db.commissions.forEach(c => {
      if (!result[c.carType]) result[c.carType] = {};
      
      const override = overrides.find(uc => uc.carType === c.carType && uc.companyId === c.companyId);
      if (override) {
        if (override.rules && override.rules.length > 0) {
          result[c.carType][c.companyId] = formatCommissionForClient(override.rules);
        } else {
          result[c.carType][c.companyId] = override.rate ?? 0.15;
        }
      } else {
        result[c.carType][c.companyId] = formatCommissionForClient(c.rules);
      }
    });

    return result;
  };

  res.json(getCommissionsForUser(currentUser.id));
});

// Get override commissions for lower-level accounts (restricted to self or direct child for non-master)
app.get('/api/commissions/user/:userId', (req, res) => {
  const currentUser = getAuthUser(req);
  if (!currentUser) return res.status(401).json({ message: 'Không được cấp quyền' });

  const { userId } = req.params;
  const db = readDb();

  const targetUser = db.users.find(u => u.id === userId);
  if (!targetUser) return res.status(404).json({ message: 'Không tìm thấy người dùng' });

  // Verification: non-master can only see self or direct child (1 level below)
  const isSelf = currentUser.id === userId;
  const isDirectChild = targetUser.parentId === currentUser.id;

  if (currentUser.role !== 'master' && !isSelf && !isDirectChild) {
    return res.status(403).json({ message: 'Không có quyền truy cập dữ liệu người dùng này' });
  }

  // Return the complete commission rules mapped to values for the selected user
  const getCommissionsForUser = (uid: string) => {
    const overrides = db.userCommissions.filter(uc => uc.userId === uid);

    const result: Record<string, Record<string, any>> = {};
    db.commissions.forEach(c => {
      if (!result[c.carType]) result[c.carType] = {};
      
      const override = overrides.find(uc => uc.carType === c.carType && uc.companyId === c.companyId);
      if (override) {
        if (override.rules && override.rules.length > 0) {
          result[c.carType][c.companyId] = formatCommissionForClient(override.rules);
        } else {
          result[c.carType][c.companyId] = override.rate ?? 0.15;
        }
      } else {
        result[c.carType][c.companyId] = formatCommissionForClient(c.rules);
      }
    });

    return result;
  };

  res.json(getCommissionsForUser(userId));
});

// Get Audit Logs
app.get('/api/logs', (req, res) => {
  const currentUser = getAuthUser(req);
  if (!currentUser) return res.status(401).json({ message: 'Không được cấp quyền' });
  if (currentUser.role === 'user') {
    return res.status(403).json({ message: 'User không được quyền xem lịch sử hệ thống' });
  }
  
  const db = readDb();
  
  // Master sees all logs. Admin/Client see logs of themselves and their descendants
  if (currentUser.role === 'master') {
    return res.json(db.logs);
  }
  
  // Non-master roles: Admin, Client
  // Find all children IDs recursively
  const getDescendantIds = (parentId: string): string[] => {
    const children = db.users.filter(u => u.parentId === parentId);
    let ids = children.map(c => c.id);
    children.forEach(c => {
      ids = [...ids, ...getDescendantIds(c.id)];
    });
    return ids;
  };
  
  const visibleUserIds = [currentUser.id, ...getDescendantIds(currentUser.id)];
  const filteredLogs = db.logs.filter(l => visibleUserIds.includes(l.userId));
  res.json(filteredLogs);
});

// Edit commission for a user
app.put('/api/commissions/user/:userId', (req, res) => {
  const currentUser = getAuthUser(req);
  if (!currentUser) return res.status(401).json({ message: 'Không được cấp quyền' });

  const { userId } = req.params;
  const { overrides } = req.body; // Array of { carType, companyId, rate }
  const db = readDb();

  // 1. Sửa hoa hồng của BẢN THÂN
  if (userId === currentUser.id) {
    if (currentUser.role === 'user') {
      return res.status(403).json({ message: 'User không được phép sửa đổi hoa hồng của bản thân' });
    }

    if (currentUser.role === 'master') {
      // MASTER sửa hoa hồng gốc của hệ thống (db.commissions)
      const oldValue = JSON.parse(JSON.stringify(db.commissions));
      overrides.forEach((o: { carType: string, companyId: string, rate: any }) => {
        const idx = db.commissions.findIndex(c => c.carType === o.carType && c.companyId === o.companyId);
        if (idx !== -1) {
          if (Array.isArray(o.rate)) {
            db.commissions[idx].rules = o.rate;
          } else {
            db.commissions[idx].rules = [{ maxVal: null, rate: o.rate }];
          }
        } else {
          db.commissions.push({
            id: Math.random().toString(36).substring(2, 9),
            companyId: o.companyId,
            carType: o.carType,
            rules: Array.isArray(o.rate) ? o.rate : [{ maxVal: null, rate: o.rate }]
          });
        }
      });
      writeDb(db);
      const newValue = JSON.parse(JSON.stringify(db.commissions));
      logAction(currentUser.id, currentUser.username, 'UPDATE_COMMISSIONS', `Master cập nhật hoa hồng mặc định hệ thống (bản thân)`, oldValue, newValue);
      return res.json({ message: 'Cập nhật hoa hồng mặc định thành công' });
    } else {
      // ADMIN, CLIENT sửa hoa hồng overrides của chính họ (db.userCommissions)
      const oldValue = JSON.parse(JSON.stringify(db.userCommissions.filter(uc => uc.userId === currentUser.id)));
      overrides.forEach((o: { carType: string, companyId: string, rate: any }) => {
        const existingIndex = db.userCommissions.findIndex(uc => uc.userId === currentUser.id && uc.carType === o.carType && uc.companyId === o.companyId);
        if (existingIndex !== -1) {
          if (Array.isArray(o.rate)) {
            db.userCommissions[existingIndex].rules = o.rate;
            delete db.userCommissions[existingIndex].rate;
          } else {
            db.userCommissions[existingIndex].rate = o.rate;
            delete db.userCommissions[existingIndex].rules;
          }
        } else {
          const newOverride: any = {
            id: Math.random().toString(36).substring(2, 9),
            userId: currentUser.id,
            carType: o.carType,
            companyId: o.companyId
          };
          if (Array.isArray(o.rate)) {
            newOverride.rules = o.rate;
          } else {
            newOverride.rate = o.rate;
          }
          db.userCommissions.push(newOverride);
        }
      });
      writeDb(db);
      const newValue = JSON.parse(JSON.stringify(db.userCommissions.filter(uc => uc.userId === currentUser.id)));
      logAction(currentUser.id, currentUser.username, 'UPDATE_COMMISSIONS', `Cập nhật hoa hồng của bản thân`, oldValue, newValue);
      return res.json({ message: 'Cập nhật hoa hồng bản thân thành công' });
    }
  }

  // 2. Sửa hoa hồng của TÀI KHOẢN KHÁC (Admin sửa Client, Client sửa User)
  const targetUser = db.users.find(u => u.id === userId);
  if (!targetUser) return res.status(404).json({ message: 'Không tìm thấy người dùng' });

  if (currentUser.role === 'master') {
    return res.status(403).json({ message: 'Master không được phép điều chỉnh hoa hồng của tài khoản khác' });
  }

  if (currentUser.role === 'user') {
    return res.status(403).json({ message: 'User không được phép sửa đổi hoa hồng của tài khoản khác' });
  }

  // Admin chỉ sửa Client, Client chỉ sửa User
  if (currentUser.role === 'admin' && targetUser.role !== 'client') {
    return res.status(403).json({ message: 'Admin chỉ được phép điều chỉnh hoa hồng cho Client' });
  }
  if (currentUser.role === 'client' && targetUser.role !== 'user') {
    return res.status(403).json({ message: 'Client chỉ được phép điều chỉnh hoa hồng cho User' });
  }

  const isDirectChild = targetUser.parentId === currentUser.id;
  if (!isDirectChild) {
    return res.status(403).json({ message: 'Bạn chỉ được phép điều chỉnh hoa hồng cho cấp dưới trực tiếp' });
  }

  // Apply overrides
  const oldValue = JSON.parse(JSON.stringify(db.userCommissions.filter(uc => uc.userId === userId)));
  overrides.forEach((o: { carType: string, companyId: string, rate: any }) => {
    const existingIndex = db.userCommissions.findIndex(uc => uc.userId === userId && uc.carType === o.carType && uc.companyId === o.companyId);
    if (existingIndex !== -1) {
      if (Array.isArray(o.rate)) {
        db.userCommissions[existingIndex].rules = o.rate;
        delete db.userCommissions[existingIndex].rate;
      } else {
        db.userCommissions[existingIndex].rate = o.rate;
        delete db.userCommissions[existingIndex].rules;
      }
    } else {
      const newOverride: any = {
        id: Math.random().toString(36).substring(2, 9),
        userId,
        carType: o.carType,
        companyId: o.companyId
      };
      if (Array.isArray(o.rate)) {
        newOverride.rules = o.rate;
      } else {
        newOverride.rate = o.rate;
      }
      db.userCommissions.push(newOverride);
    }
  });

  writeDb(db);
  const newValue = JSON.parse(JSON.stringify(db.userCommissions.filter(uc => uc.userId === userId)));
  logAction(currentUser.id, currentUser.username, 'UPDATE_COMMISSIONS', `Cập nhật hoa hồng cho cấp dưới trực tiếp: ${targetUser.username}`, oldValue, newValue);
  res.json({ message: 'Cập nhật hoa hồng thành công' });
});

// ==========================================
// GOOGLE SHEETS SYNC ENDPOINTS
// ==========================================

// Helper to extract Spreadsheet ID and GID
const extractSheetInfo = (url: string) => {
  const matchId = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
  const matchGid = url.match(/gid=([0-9]+)/);
  return {
    spreadsheetId: matchId ? matchId[1] : null,
    gid: matchGid ? matchGid[1] : '0'
  };
};

// Sync commissions
app.post('/api/sync/commissions', async (req, res) => {
  const currentUser = getAuthUser(req);
  if (!currentUser || currentUser.role !== 'master') {
    return res.status(403).json({ message: 'Chỉ MASTER mới được đồng bộ dữ liệu gốc' });
  }

  const { url } = req.body;
  if (!url) return res.status(400).json({ message: 'Thiếu đường dẫn Google Sheets' });

  const { spreadsheetId, gid } = extractSheetInfo(url);
  if (!spreadsheetId) return res.status(400).json({ message: 'Đường dẫn Google Sheets không hợp lệ' });

  try {
    const csvUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${gid}`;
    const response = await fetch(csvUrl);
    if (!response.ok) throw new Error('Không thể tải CSV từ Google Sheet');
    const csvData = await response.text();

    const db = readDb();
    const oldCommissions = JSON.parse(JSON.stringify(db.commissions));
    
    // Parse CSV: Hãng, Ghi chú, %
    const lines = csvData.split('\n').map(line => line.trim()).filter(Boolean);
    
    // Company name mapping
    const nameMap: Record<string, string> = {
      'BẢO VIỆT': 'BV',
      'LIBERTY': 'LB',
      'PTI BƯU ĐIỆN': 'PTI',
      'BẢO MINH': 'BM',
      'MIC QUÂN ĐỘI': 'MIC',
      'TASCO': 'TAS',
      'BẢO LONG': 'BL',
      'DBV HÀNG KHÔNG': 'DBV',
      'PJICO': 'PJI',
      'PJICO *': 'PJI_STAR',
      'PVI DẦU KHÍ': 'PVI'
    };

    let currentCompanyId = '';
    const tempRules: Record<string, Array<{ maxVal: number | null, rate: number }>> = {};

    lines.forEach(line => {
      // Split by comma ignoring commas inside quotes
      const parts = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(p => p.trim().replace(/^"|"$/g, ''));
      if (parts.length < 3) return;

      const compName = parts[0];
      const conditionText = parts[1];
      const rateText = parts[2];

      if (compName) {
        currentCompanyId = nameMap[compName.toUpperCase()] || compName;
      }

      if (!currentCompanyId) return;

      // Parse rate
      const matchRate = rateText.match(/([0-9.,]+)%?/);
      if (!matchRate) return;
      const rateVal = parseFloat(matchRate[1].replace(',', '.')) / 100;

      // Parse condition limit
      let maxVal: number | null = null;
      const condition = conditionText.toLowerCase();
      if (condition.includes('dưới 500')) maxVal = 500000000;
      else if (condition.includes('dưới 600')) maxVal = 600000000;
      else if (condition.includes('dưới 700')) maxVal = 700000000;
      else if (condition.includes('dưới 800')) maxVal = 800000000;
      else if (condition.includes('500-700')) maxVal = 700000000;
      else if (condition.includes('600-800')) maxVal = 800000000;
      else if (condition.includes('701- 1 tỷ') || condition.includes('701-1 tỷ')) maxVal = 1000000000;

      if (!tempRules[currentCompanyId]) tempRules[currentCompanyId] = [];
      tempRules[currentCompanyId].push({ maxVal, rate: rateVal });
    });

    const changes: Array<{ companyName: string, changesText: string }> = [];

    // Apply rules to all vehicle categories in DB
    db.commissions = db.commissions.map(comm => {
      const newRules = tempRules[comm.companyId];
      if (newRules) {
        // Detect change
        const oldRulesStr = JSON.stringify(comm.rules);
        const newRulesStr = JSON.stringify(newRules);
        
        if (oldRulesStr !== newRulesStr) {
          const comp = db.companies.find(c => c.id === comm.companyId);
          const compName = comp ? comp.name : comm.companyId;
          const detail = `Đồng bộ từ Sheet: ${newRules.map(r => `${r.maxVal ? `Dưới ${(r.maxVal/1e6).toFixed(0)}Tr` : 'Mọi giá trị'}: ${(r.rate * 100).toFixed(1)}%`).join(', ')}`;
          
          if (!changes.some(c => c.companyName === compName)) {
            changes.push({ companyName: compName, changesText: detail });
          }
          return { ...comm, rules: newRules };
        }
      }
      return comm;
    });

    writeDb(db);
    logAction(currentUser.id, currentUser.username, 'SYNC_COMMISSIONS', `Đồng bộ hoa hồng từ Google Sheet`, oldCommissions, JSON.parse(JSON.stringify(db.commissions)));
    res.json({ message: 'Đồng bộ hoa hồng thành công', changes });
  } catch (err: any) {
    res.status(500).json({ message: 'Không thể đồng bộ dữ liệu: ' + err.message });
  }
});

// Sync rates
app.post('/api/sync/rates', async (req, res) => {
  const currentUser = getAuthUser(req);
  if (!currentUser || currentUser.role !== 'master') {
    return res.status(403).json({ message: 'Chỉ MASTER mới được đồng bộ dữ liệu gốc' });
  }

  const { url } = req.body;
  if (!url) return res.status(400).json({ message: 'Thiếu đường dẫn Google Sheets' });

  const { spreadsheetId, gid } = extractSheetInfo(url);
  if (!spreadsheetId) return res.status(400).json({ message: 'Đường dẫn Google Sheets không hợp lệ' });

  try {
    const csvUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${gid}`;
    const response = await fetch(csvUrl);
    if (!response.ok) throw new Error('Không thể tải CSV từ Google Sheet');
    const csvData = await response.text();

    const db = readDb();
    const oldValue = JSON.parse(JSON.stringify(db.rates));
    
    // Simple parser for EV Rates
    const lines = csvData.split('\n').map(line => line.trim()).filter(Boolean);
    const changes: Array<{ companyName: string, changesText: string }> = [];

    // Parse logic for the specific rates table
    // E.g., looking for "Xe điện VF9 không KDVT", then "Sửa chữa chính hãng...", "1,35", "1,47"
    let currentModel = '';
    lines.forEach(line => {
      const parts = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(p => p.trim().replace(/^"|"$/g, ''));
      if (parts.length < 3) return;

      const title = parts[0].toLowerCase();
      if (title.includes('vf9')) currentModel = 'VF9';
      else if (title.includes('e34') || title.includes('vf8') || title.includes('vf6') || title.includes('vf7')) currentModel = 'VFe34'; // mapped models
      else if (title.includes('vf5')) currentModel = 'VF5';
      else if (title.includes('vf3')) currentModel = 'VF3';

      if (title.includes('sửa chữa chính hãng') && currentModel) {
        // Parse rates under bracket 0 (<3 years) and bracket 1 (3-6 years)
        const rate0 = parseFloat(parts[1].replace(',', '.'));
        const rate1 = parseFloat(parts[2].replace(',', '.'));

        if (!isNaN(rate0) && !isNaN(rate1)) {
          // Find rate in database and update
          db.rates = db.rates.map(r => {
            if (r.companyId === 'BV' && r.isEV && r.evModel === currentModel) {
              const updatedRules = [{ maxVal: null, rates: [rate0, rate1, 0, 0] as [number, number, number, number] }];
              const oldStr = JSON.stringify(r.rules);
              const newStr = JSON.stringify(updatedRules);
              
              if (oldStr !== newStr) {
                changes.push({
                  companyName: `Bảo Việt (${currentModel})`,
                  changesText: `Tỉ lệ phí thay đổi: <3 năm: ${rate0}%, 3-6 năm: ${rate1}%`
                });
                return { ...r, rules: updatedRules };
              }
            }
            return r;
          });
        }
      }
    });

    writeDb(db);
    logAction(currentUser.id, currentUser.username, 'SYNC_RATES', `Đồng bộ tỷ lệ phí từ Google Sheet`, oldValue, JSON.parse(JSON.stringify(db.rates)));
    res.json({ message: 'Đồng bộ tỷ lệ phí thành công', changes });
  } catch (err: any) {
    res.status(500).json({ message: 'Không thể đồng bộ tỷ lệ phí: ' + err.message });
  }
});

const normalizeRateCell = (cell: any): number => {
  if (cell === null || cell === undefined || cell === '' || cell === '-') return 0;
  const num = typeof cell === 'number' ? cell : parseFloat(cell.toString().replace(',', '.').trim());
  if (isNaN(num)) return 0;
  // Excel date serial values mapping (handles date interpretation of decimals)
  if (num === 46143) return 1.10;
  if (num === 46204) return 1.40;
  if (num === 46296) return 1.10;
  if (num === 46297) return 1.80;
  return num;
};

// Preview synced rates side-by-side
app.post('/api/sync/rates/preview', async (req, res) => {
  const currentUser = getAuthUser(req);
  if (!currentUser || currentUser.role !== 'master') {
    return res.status(403).json({ message: 'Chỉ MASTER mới được đồng bộ dữ liệu gốc' });
  }

  const { url } = req.body;
  if (!url) return res.status(400).json({ message: 'Thiếu đường dẫn Google Sheets' });

  const { spreadsheetId } = extractSheetInfo(url);
  if (!spreadsheetId) return res.status(400).json({ message: 'Đường dẫn Google Sheets không hợp lệ' });

  try {
    const xlsxUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=xlsx`;
    const response = await fetch(xlsxUrl);
    if (!response.ok) throw new Error('Không thể tải file Excel từ Google Sheets. Hãy chắc chắn rằng trang tính ở chế độ công khai (bất kỳ ai có liên kết đều xem được).');
    const buffer = await response.arrayBuffer();
    const workbook = XLSX.read(Buffer.from(buffer), { type: 'buffer' });

    // Parse PJICO sheet
    let pjicoRates: Record<string, any> = {};
    if (workbook.SheetNames.includes('PJICO')) {
      const sheet = workbook.Sheets['PJICO'];
      const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
      
      const findRowIndex = (text: string) => {
        return rows.findIndex(row => row && row.some(cell => cell && cell.toString().toLowerCase().includes(text.toLowerCase())));
      };

      const parse4Rates = (row: any[]): [number, number, number, number] => {
        return [
          normalizeRateCell(row[3]),
          normalizeRateCell(row[4]),
          normalizeRateCell(row[5]),
          normalizeRateCell(row[6])
        ];
      };

      // 1. Personal
      const personalIdx = findRowIndex('không kinh doanh');
      if (personalIdx !== -1) {
        pjicoRates['personal'] = [
          { maxVal: 400000000, rates: parse4Rates(rows[personalIdx + 1]) },
          { maxVal: 600000000, rates: parse4Rates(rows[personalIdx + 2]) },
          { maxVal: 800000000, rates: parse4Rates(rows[personalIdx + 3]) },
          { maxVal: null, rates: parse4Rates(rows[personalIdx + 4]) }
        ];
      }

      // 2. Training
      const trainingIdx = findRowIndex('tập lái');
      if (trainingIdx !== -1) {
        pjicoRates['training'] = [
          { maxVal: null, rates: parse4Rates(rows[trainingIdx]) }
        ];
      }

      // 3. Taxi
      const taxiIdx = findRowIndex('Taxi truyền thống');
      if (taxiIdx !== -1) {
        pjicoRates['taxi'] = [
          { maxVal: 800000000, rates: parse4Rates(rows[taxiIdx + 1]) },
          { maxVal: null, rates: parse4Rates(rows[taxiIdx + 2]) }
        ];
      }

      // 4. Grab
      const grabIdx = findRowIndex('ứng dụng công nghệ');
      if (grabIdx !== -1) {
        pjicoRates['grab'] = [
          { maxVal: 400000000, rates: parse4Rates(rows[grabIdx + 1]) },
          { maxVal: 600000000, rates: parse4Rates(rows[grabIdx + 2]) },
          { maxVal: 800000000, rates: parse4Rates(rows[grabIdx + 3]) },
          { maxVal: null, rates: parse4Rates(rows[grabIdx + 4]) }
        ];
      }

      // 5. Commercial Passenger
      const commPassengerIdx = findRowIndex('còn lại / kd LIÊN TỈNH');
      if (commPassengerIdx !== -1) {
        pjicoRates['commercial_passenger'] = [
          { maxVal: 400000000, rates: parse4Rates(rows[commPassengerIdx + 1]) },
          { maxVal: 600000000, rates: parse4Rates(rows[commPassengerIdx + 2]) },
          { maxVal: 800000000, rates: parse4Rates(rows[commPassengerIdx + 3]) },
          { maxVal: null, rates: parse4Rates(rows[commPassengerIdx + 4]) }
        ];
      }

      // 6. Truck Non-commercial
      const truckNonCommIdx = findRowIndex('không KDVT');
      if (truckNonCommIdx !== -1) {
        pjicoRates['truck_non_commercial'] = [
          { maxVal: null, rates: parse4Rates(rows[truckNonCommIdx]) }
        ];
      }

      // 7. Truck Commercial
      const truckCommIdx = findRowIndex('chở hàng KDVT');
      if (truckCommIdx !== -1) {
        pjicoRates['truck_commercial'] = [
          { maxVal: null, rates: parse4Rates(rows[truckCommIdx]) }
        ];
      }

      // 8. Truck Refrigerated
      const truckRefIdx = findRowIndex('đông lạnh');
      if (truckRefIdx !== -1) {
        pjicoRates['truck_refrigerated'] = [
          { maxVal: null, rates: parse4Rates(rows[truckRefIdx]) }
        ];
      }

      // 9. Tractor
      const tractorIdx = findRowIndex('đầu kéo');
      if (tractorIdx !== -1) {
        pjicoRates['tractor'] = [
          { maxVal: null, rates: parse4Rates(rows[tractorIdx]) }
        ];
      }

      // 10. Trailer
      const trailerIdx = findRowIndex('Rơ mooc');
      if (trailerIdx !== -1) {
        pjicoRates['trailer'] = [
          { maxVal: null, rates: parse4Rates(rows[trailerIdx]) }
        ];
      }

      // 11. Pickup
      const pickupIdx = findRowIndex('pickup, vừa chở người');
      if (pickupIdx !== -1) {
        pjicoRates['pickup'] = [
          { maxVal: null, rates: parse4Rates(rows[pickupIdx]) }
        ];
      }

      // 12. Specialized & Internal
      pjicoRates['specialized'] = [{ maxVal: null, rates: [0, 0, 0, 0] }];
      pjicoRates['internal'] = [{ maxVal: null, rates: [0, 0, 0, 0] }];

      // 13. Electric Personal
      const elecPersonalIdx = findRowIndex('(I.1) Xe chở người');
      if (elecPersonalIdx !== -1) {
        pjicoRates['electric_personal'] = [
          { maxVal: 400000000, rates: parse4Rates(rows[elecPersonalIdx + 1]) },
          { maxVal: 600000000, rates: parse4Rates(rows[elecPersonalIdx + 2]) },
          { maxVal: 800000000, rates: parse4Rates(rows[elecPersonalIdx + 3]) },
          { maxVal: null, rates: parse4Rates(rows[elecPersonalIdx + 4]) }
        ];
      }

      // 14. Electric Taxi / Grab
      const elecTaxiIdx = findRowIndex('Xe KDVT chở người còn lại');
      if (elecTaxiIdx !== -1) {
        pjicoRates['electric_taxi'] = [
          { maxVal: 400000000, rates: parse4Rates(rows[elecTaxiIdx + 1]) },
          { maxVal: 600000000, rates: parse4Rates(rows[elecTaxiIdx + 2]) },
          { maxVal: 800000000, rates: parse4Rates(rows[elecTaxiIdx + 3]) },
          { maxVal: null, rates: parse4Rates(rows[elecTaxiIdx + 4]) }
        ];
        pjicoRates['electric_grab'] = pjicoRates['electric_taxi'];
      }
    } else {
      throw new Error('Không tìm thấy trang tính "PJICO" trong Google Sheets.');
    }

    // Parse PJICO* (Trang tính12)
    let pjicoStarRates: Record<string, any> = {};
    if (workbook.SheetNames.includes('Trang tính12')) {
      const sheet = workbook.Sheets['Trang tính12'];
      const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
      
      const findRowIndex = (text: string) => {
        return rows.findIndex(row => row && row.some(cell => cell && cell.toString().toLowerCase().includes(text.toLowerCase())));
      };

      const parse4Rates = (row: any[]): [number, number, number, number] => {
        return [
          normalizeRateCell(row[3]),
          normalizeRateCell(row[4]),
          normalizeRateCell(row[5]),
          normalizeRateCell(row[6])
        ];
      };

      // 1. Personal
      const personalIdx = findRowIndex('không Kinh doanh');
      if (personalIdx !== -1) {
        pjicoStarRates['personal'] = [
          { maxVal: 500000000, rates: parse4Rates(rows[personalIdx]) },
          { maxVal: 700000000, rates: parse4Rates(rows[personalIdx + 2]) },
          { maxVal: null, rates: parse4Rates(rows[personalIdx + 4]) }
        ];
      }

      // 2. Grab
      const grabIdx = findRowIndex('ứng dụng công nghệ');
      if (grabIdx !== -1) {
        pjicoStarRates['grab'] = [
          { maxVal: 500000000, rates: parse4Rates(rows[grabIdx]) },
          { maxVal: 700000000, rates: parse4Rates(rows[grabIdx + 2]) },
          { maxVal: null, rates: parse4Rates(rows[grabIdx + 4]) }
        ];
      }

      // 3. Commercial Passenger
      const commPassengerIdx = findRowIndex('chở người còn lại');
      if (commPassengerIdx !== -1) {
        pjicoStarRates['commercial_passenger'] = [
          { maxVal: 500000000, rates: parse4Rates(rows[commPassengerIdx]) },
          { maxVal: 700000000, rates: parse4Rates(rows[commPassengerIdx + 2]) },
          { maxVal: null, rates: parse4Rates(rows[commPassengerIdx + 4]) }
        ];
      }

      // 4. Pickup
      const pickupIdx = findRowIndex('bán tải');
      if (pickupIdx !== -1) {
        pjicoStarRates['pickup'] = [
          { maxVal: null, rates: parse4Rates(rows[pickupIdx]) }
        ];
      }
    } else {
      throw new Error('Không tìm thấy trang tính "Trang tính12" (PJICO*) trong Google Sheets.');
    }

    // Map everything to the new 40 detailed categories (A.1 to E.3)
    const db = readDb();
    const currentRates = db.rates;
    const newRates: RateRule[] = [];

    const detailedCategories = [
      { id: 'personal_under_9', dbType: 'personal', pjicoSource: 'personal', pjicoStarSource: 'personal' },
      { id: 'personal_over_9', dbType: 'personal', pjicoSource: 'personal', pjicoStarSource: 'personal' },
      { id: 'training', dbType: 'training', pjicoSource: 'training', pjicoStarSource: null },
      { id: 'bus', dbType: 'commercial_passenger', pjicoSource: 'commercial_passenger', pjicoStarSource: 'commercial_passenger' },
      { id: 'internal', dbType: 'internal', pjicoSource: 'internal', pjicoStarSource: null },
      { id: 'grab', dbType: 'grab', pjicoSource: 'grab', pjicoStarSource: 'grab' },
      { id: 'taxi', dbType: 'taxi', pjicoSource: 'taxi', pjicoStarSource: null },
      { id: 'self_drive', dbType: 'commercial_passenger', pjicoSource: 'commercial_passenger', pjicoStarSource: 'commercial_passenger' },
      { id: 'commercial_under_9', dbType: 'commercial_passenger', pjicoSource: 'commercial_passenger', pjicoStarSource: 'commercial_passenger' },
      { id: 'commercial_over_9', dbType: 'commercial_passenger', pjicoSource: 'commercial_passenger', pjicoStarSource: 'commercial_passenger' },
      { id: 'commercial_interprovincial', dbType: 'commercial_passenger', pjicoSource: 'commercial_passenger', pjicoStarSource: 'commercial_passenger' },
      { id: 'demo_car', dbType: 'personal', pjicoSource: 'personal', pjicoStarSource: 'personal' },
      { id: 'money_car', dbType: 'specialized', pjicoSource: 'specialized', pjicoStarSource: null },
      { id: 'truck_non_commercial_under_10', dbType: 'truck_non_commercial', pjicoSource: 'truck_non_commercial', pjicoStarSource: null },
      { id: 'truck_non_commercial_over_10', dbType: 'truck_non_commercial', pjicoSource: 'truck_non_commercial', pjicoStarSource: null },
      { id: 'truck_commercial_under_10', dbType: 'truck_commercial', pjicoSource: 'truck_commercial', pjicoStarSource: null },
      { id: 'truck_commercial_over_10', dbType: 'truck_commercial', pjicoSource: 'truck_commercial', pjicoStarSource: null },
      { id: 'truck_refrigerated_under_3_5', dbType: 'truck_refrigerated', pjicoSource: 'truck_refrigerated', pjicoStarSource: null },
      { id: 'truck_refrigerated_over_3_5', dbType: 'truck_refrigerated', pjicoSource: 'truck_refrigerated', pjicoStarSource: null },
      { id: 'truck_mining', dbType: 'truck_refrigerated', pjicoSource: 'truck_refrigerated', pjicoStarSource: null },
      { id: 'truck_fuel', dbType: 'specialized', pjicoSource: 'specialized', pjicoStarSource: null },
      { id: 'truck_oversized', dbType: 'truck_commercial', pjicoSource: 'truck_commercial', pjicoStarSource: null },
      { id: 'truck_other', dbType: 'truck_commercial', pjicoSource: 'truck_commercial', pjicoStarSource: null },
      { id: 'specialized_ambulance', dbType: 'specialized', pjicoSource: 'specialized', pjicoStarSource: null },
      { id: 'specialized_fire', dbType: 'specialized', pjicoSource: 'specialized', pjicoStarSource: null },
      { id: 'specialized_ladder', dbType: 'specialized', pjicoSource: 'specialized', pjicoStarSource: null },
      { id: 'specialized_sanitation', dbType: 'specialized', pjicoSource: 'specialized', pjicoStarSource: null },
      { id: 'specialized_sweeper', dbType: 'specialized', pjicoSource: 'specialized', pjicoStarSource: null },
      { id: 'specialized_concrete', dbType: 'specialized', pjicoSource: 'specialized', pjicoStarSource: null },
      { id: 'specialized_drill', dbType: 'specialized', pjicoSource: 'specialized', pjicoStarSource: null },
      { id: 'specialized_tanker', dbType: 'specialized', pjicoSource: 'specialized', pjicoStarSource: null },
      { id: 'specialized_other', dbType: 'specialized', pjicoSource: 'specialized', pjicoStarSource: null },
      { id: 'tractor', dbType: 'tractor', pjicoSource: 'tractor', pjicoStarSource: null },
      { id: 'trailer_flatbed', dbType: 'trailer', pjicoSource: 'trailer', pjicoStarSource: null },
      { id: 'trailer_tipper', dbType: 'trailer', pjicoSource: 'trailer', pjicoStarSource: null },
      { id: 'trailer_specialized', dbType: 'trailer', pjicoSource: 'trailer', pjicoStarSource: null },
      { id: 'pickup', dbType: 'pickup', pjicoSource: 'pickup', pjicoStarSource: 'pickup' },
      { id: 'van_minivan', dbType: 'van_minivan', pjicoSource: 'pickup', pjicoStarSource: 'pickup' },
      { id: 'pickup_other', dbType: 'pickup', pjicoSource: 'pickup', pjicoStarSource: 'pickup' }
    ];

    detailedCategories.forEach(cat => {
      // 1. PJICO (PJI)
      const pjiRules = pjicoRates[cat.pjicoSource] || [{ maxVal: null, rates: [0, 0, 0, 0] }];
      newRates.push({
        id: `${cat.id}_PJI`,
        carType: cat.id,
        companyId: 'PJI',
        isEV: false,
        evModel: null,
        rules: JSON.parse(JSON.stringify(pjiRules))
      });

      // 2. PJICO* (PJI_STAR)
      const pjiStarRules = cat.pjicoStarSource ? (pjicoStarRates[cat.pjicoStarSource] || [{ maxVal: null, rates: [0, 0, 0, 0] }]) : [{ maxVal: null, rates: [0, 0, 0, 0] }];
      newRates.push({
        id: `${cat.id}_PJI_STAR`,
        carType: cat.id,
        companyId: 'PJI_STAR',
        isEV: false,
        evModel: null,
        rules: JSON.parse(JSON.stringify(pjiStarRules))
      });

      // 3. Other insurers (BM, TAS, DBV, PVI, PTI, BL, BV, MIC)
      const otherCompanies = ['BM', 'TAS', 'DBV', 'PVI', 'PTI', 'BL', 'BV', 'MIC'];
      otherCompanies.forEach(compId => {
        const existing = currentRates.find(r => r.companyId === compId && r.carType === cat.dbType && !r.isEV);
        const rules = existing ? existing.rules : [{ maxVal: null, rates: [0, 0, 0, 0] as [number, number, number, number] }];
        newRates.push({
          id: `${cat.id}_${compId}`,
          carType: cat.id,
          companyId: compId,
          isEV: false,
          evModel: null,
          rules: JSON.parse(JSON.stringify(rules))
        });
      });
    });

    // 4. Duplicate/Generate EV rates for detailed categories
    detailedCategories.forEach(cat => {
      // 4.1. PJICO (PJI): parses from Sheet, no evModel. Only add if it's a passenger/commercial/taxi/grab category
      let pjiEvRules = null;
      if (['personal_under_9', 'personal_over_9', 'demo_car'].includes(cat.id)) {
        pjiEvRules = pjicoRates['electric_personal'];
      } else if (cat.dbType === 'taxi' || cat.dbType === 'commercial_passenger') {
        pjiEvRules = pjicoRates['electric_taxi'];
      } else if (cat.dbType === 'grab') {
        pjiEvRules = pjicoRates['electric_grab'];
      }
      
      if (pjiEvRules) {
        newRates.push({
          id: `${cat.id}_PJI_ev`,
          carType: cat.id,
          companyId: 'PJI',
          isEV: true,
          evModel: null,
          rules: JSON.parse(JSON.stringify(pjiEvRules))
        });
      }

      // 4.2. Bảo Minh (BM): copies electric_personal / electric_taxi / electric_grab / self_drive from DB/rules, no evModel
      let bmEvRules = null;
      if (['personal_under_9', 'personal_over_9', 'demo_car'].includes(cat.id)) {
        bmEvRules = [
          { maxVal: 500000000, rates: [1.87, 1.87, 1.87, 1.87] },
          { maxVal: null, rates: [1.375, 1.375, 1.375, 1.375] }
        ];
      } else if (cat.id === 'taxi') {
        bmEvRules = [
          { maxVal: 500000000, rates: [3.52, 3.52, 3.52, 3.52] },
          { maxVal: null, rates: [2.42, 2.42, 2.42, 2.42] }
        ];
      } else if (cat.id === 'self_drive') {
        bmEvRules = [
          { maxVal: 500000000, rates: [3.52, 3.52, 3.52, 3.52] },
          { maxVal: null, rates: [1.98, 1.98, 1.98, 1.98] }
        ];
      } else if (cat.id === 'grab') {
        bmEvRules = [
          { maxVal: 500000000, rates: [2.97, 2.97, 2.97, 2.97] },
          { maxVal: null, rates: [1.76, 1.76, 1.76, 1.76] }
        ];
      }
      
      if (bmEvRules) {
        newRates.push({
          id: `${cat.id}_BM_ev`,
          carType: cat.id,
          companyId: 'BM',
          isEV: true,
          evModel: null,
          rules: JSON.parse(JSON.stringify(bmEvRules))
        });
      }

      // 4.3. Bảo Long (BL): copies personal/grab/taxi/commercial_passenger EV rules from DB, no evModel
      let blEvRules = null;
      if (['personal_under_9', 'personal_over_9', 'demo_car'].includes(cat.id)) {
        const existing = currentRates.find(r => r.companyId === 'BL' && r.carType === 'personal' && r.isEV);
        blEvRules = existing ? existing.rules : [
          { maxVal: 500000000, rates: [1.8, 0, 0, 0] },
          { maxVal: null, rates: [1.35, 0, 0, 0] }
        ];
      } else if (['bus', 'commercial_under_9', 'commercial_over_9', 'commercial_interprovincial', 'self_drive'].includes(cat.id)) {
        const existing = currentRates.find(r => r.companyId === 'BL' && r.carType === 'commercial_passenger' && r.isEV);
        blEvRules = existing ? existing.rules : [
          { maxVal: 500000000, rates: [2.5, 0, 0, 0] },
          { maxVal: null, rates: [1.7, 0, 0, 0] }
        ];
      } else if (cat.id === 'taxi') {
        const existing = currentRates.find(r => r.companyId === 'BL' && r.carType === 'taxi' && r.isEV);
        blEvRules = existing ? existing.rules : [
          { maxVal: 500000000, rates: [2.95, 0, 0, 0] },
          { maxVal: null, rates: [2.5, 0, 0, 0] }
        ];
      } else if (cat.id === 'grab') {
        const existing = currentRates.find(r => r.companyId === 'BL' && r.carType === 'grab' && r.isEV);
        blEvRules = existing ? existing.rules : [
          { maxVal: 500000000, rates: [2.95, 0, 0, 0] },
          { maxVal: null, rates: [2.5, 0, 0, 0] }
        ];
      }
      
      if (blEvRules) {
        newRates.push({
          id: `${cat.id}_BL_ev`,
          carType: cat.id,
          companyId: 'BL',
          isEV: true,
          evModel: null,
          rules: JSON.parse(JSON.stringify(blEvRules))
        });
      }

      // 4.4. Gasoline-matching companies: PJICO* (PJI_STAR), TASCO (TAS), HÀNG KHÔNG (DBV), PVI DẦU KHÍ (PVI), PTI BƯU ĐIỆN (PTI), MIC QUÂN ĐỘI (MIC)
      const gasMatchCompanies = ['PJI_STAR', 'TAS', 'DBV', 'PVI', 'PTI', 'MIC'];
      gasMatchCompanies.forEach(compId => {
        const gasRule = newRates.find(r => r.companyId === compId && r.carType === cat.id && !r.isEV);
        const rules = gasRule ? gasRule.rules : [{ maxVal: null, rates: [0, 0, 0, 0] as [number, number, number, number] }];
        newRates.push({
          id: `${cat.id}_${compId}_ev`,
          carType: cat.id,
          companyId: compId,
          isEV: true,
          evModel: null,
          rules: JSON.parse(JSON.stringify(rules))
        });
      });

      // 4.5. Bảo Việt (BV): model-specific rules
      const isBVSupportedCategory = ['personal', 'grab', 'taxi', 'commercial_passenger'].includes(cat.dbType);
      if (isBVSupportedCategory) {
        const bvEvRules = currentRates.filter(r => r.companyId === 'BV' && r.carType === cat.dbType && r.isEV);
        if (bvEvRules.length > 0) {
          bvEvRules.forEach(bvRule => {
            newRates.push({
              id: `${cat.id}_BV_ev_${bvRule.evModel}`,
              carType: cat.id,
              companyId: 'BV',
              isEV: true,
              evModel: bvRule.evModel,
              rules: JSON.parse(JSON.stringify(bvRule.rules))
            });
          });
        } else {
          const gasRule = newRates.find(r => r.companyId === 'BV' && r.carType === cat.id && !r.isEV);
          const rules = gasRule ? gasRule.rules : [{ maxVal: null, rates: [0, 0, 0, 0] as [number, number, number, number] }];
          const evModels = ['VF3', 'VF5', 'VFe34', 'VF6', 'VF7', 'VF8_9', 'other'];
          evModels.forEach(model => {
            newRates.push({
              id: `${cat.id}_BV_ev_${model}`,
              carType: cat.id,
              companyId: 'BV',
              isEV: true,
              evModel: model,
              rules: JSON.parse(JSON.stringify(rules))
            });
          });
        }
      }
    });

    res.json({
      message: 'Đã phân tích và lập bảng xem trước thành công',
      previewRates: newRates
    });
  } catch (err: any) {
    res.status(500).json({ message: 'Lỗi phân tích bảng tính: ' + err.message });
  }
});

// Apply preview rates
app.post('/api/sync/rates/apply', (req, res) => {
  const currentUser = getAuthUser(req);
  if (!currentUser || currentUser.role !== 'master') {
    return res.status(403).json({ message: 'Chỉ MASTER mới được lưu biểu phí' });
  }

  const { rates, vehicles } = req.body;
  if (!Array.isArray(rates)) {
    return res.status(400).json({ message: 'Dữ liệu biểu phí không hợp lệ' });
  }

  try {
    const db = readDb();
    const oldValue = JSON.parse(JSON.stringify({ rates: db.rates, commissions: db.commissions, vehicles: db.vehicles }));
    
    // Save rates
    db.rates = rates;

    // Save vehicles if provided (auto-creation of new vehicles)
    if (vehicles && Array.isArray(vehicles)) {
      db.vehicles = vehicles;
    }

    // Migrate/update default commissions grid too
    const detailedCategoriesList = [
      'personal_under_9', 'personal_over_9', 'training', 'bus', 'internal', 'grab', 'taxi', 
      'self_drive', 'commercial_under_9', 'commercial_over_9', 'commercial_interprovincial', 
      'demo_car', 'money_car', 'truck_non_commercial_under_10', 'truck_non_commercial_over_10', 
      'truck_commercial_under_10', 'truck_commercial_over_10', 'truck_refrigerated_under_3_5', 
      'truck_refrigerated_over_3_5', 'truck_mining', 'truck_fuel', 'truck_oversized', 'truck_other', 
      'specialized_ambulance', 'specialized_fire', 'specialized_ladder', 'specialized_sanitation', 
      'specialized_sweeper', 'specialized_concrete', 'specialized_drill', 'specialized_tanker', 
      'specialized_other', 'tractor', 'trailer_flatbed', 'trailer_tipper', 'trailer_specialized', 
      'pickup', 'van_minivan', 'pickup_other'
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

    const newCommissions: CommissionRule[] = [];
    detailedCategoriesList.forEach(catId => {
      const dbType = mapToDbCarType(catId);
      const activeCompanyIds = db.companies.map(c => c.id);
      
      activeCompanyIds.forEach(compId => {
        const existing = db.commissions.find(c => c.companyId === compId && c.carType === dbType);
        const rules = existing ? existing.rules : [{ maxVal: null, rate: 0.15 }];
        newCommissions.push({
          id: `${catId}_${compId}`,
          carType: catId,
          companyId: compId,
          rules: JSON.parse(JSON.stringify(rules))
        });
      });
    });

    if (newCommissions.length > 0) {
      db.commissions = newCommissions;
    }

    writeDb(db);
    const newValue = JSON.parse(JSON.stringify({ rates: db.rates, commissions: db.commissions, vehicles: db.vehicles }));
    logAction(currentUser.id, currentUser.username, 'APPLY_RATES', `Đồng bộ biểu phí của các hãng bảo hiểm từ Google Sheet`, oldValue, newValue);
    res.json({ message: 'Đã lưu biểu phí vào cơ sở dữ liệu và áp dụng thành công!' });
  } catch (err: any) {
    res.status(500).json({ message: 'Lỗi lưu biểu phí: ' + err.message });
  }
});

// ==========================================
// GEMINI AI INTEGRATION
// ==========================================

app.post('/api/ai/parse-conditions', async (req, res) => {
  const currentUser = getAuthUser(req);
  if (!currentUser) return res.status(401).json({ message: 'Không được cấp quyền' });

  const { text, type } = req.body; // type is 'rates' or 'commissions'
  if (!text) return res.status(400).json({ message: 'Thiếu nội dung điều kiện' });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return res.status(500).json({ message: 'Gemini API Key chưa được thiết lập trên máy chủ' });
  }

  const db = readDb();
  const oldValue = JSON.parse(JSON.stringify({ rates: db.rates, commissions: db.commissions }));
  
  // Format current state of rates/commissions for prompt context
  const companiesList = db.companies.map(c => `${c.name} (${c.id})`).join(', ');
  const vehiclesList = vehicles.join(', ');

  const prompt = `
Bạn là trợ lý AI chuyên nghiệp phân tích điều kiện tính phí/hoa hồng bảo hiểm xe ô tô bằng tiếng Việt.
Hệ thống hiện tại có các Hãng bảo hiểm sau: [${companiesList}].
Các Loại xe sau: [${vehiclesList}].

Người dùng cung cấp văn bản yêu cầu điều kiện đặc biệt sau:
"${text}"

Hãy phân tích kỹ yêu cầu và thực hiện một trong hai hành động dưới đây:
1. Nếu yêu cầu có điểm chưa rõ ràng, thiếu chi tiết (ví dụ: không biết áp dụng cho hãng nào, loại xe nào, giá trị cụ thể bao nhiêu, hoặc các thuật ngữ mơ hồ), bạn phải trả về trạng thái "clarification_needed" kèm danh sách các câu hỏi cụ thể cần làm rõ.
2. Nếu yêu cầu rõ ràng, hãy ánh xạ thành cấu trúc cập nhật quy tắc và trả về trạng thái "success" kèm danh sách các thay đổi cần áp dụng.

Định dạng phản hồi BẮT BUỘC là JSON như sau:
Nếu thành công (success):
{
  "status": "success",
  "updates": [
    {
      "companyId": "Mã hãng (ví dụ: BV, PVI, PTI)",
      "carType": "Loại xe (ví dụ: personal, grab, taxi hoặc 'all')",
      "minVal": 0, (giá trị xe tối thiểu, số nguyên hoặc null)
      "maxVal": 800000000, (giá trị xe tối đa, số nguyên hoặc null)
      "rate": 0.15 (tỉ lệ hoa hồng hoặc tỉ lệ phí mới, ví dụ 15% là 0.15)
    }
  ]
}

Nếu cần làm rõ (clarification_needed):
{
  "status": "clarification_needed",
  "questions": [
    "Câu hỏi 1 để làm rõ...",
    "Câu hỏi 2 để làm rõ..."
  ]
}

Lưu ý: Không được thêm bất kì dòng text giải thích nào ngoài định dạng JSON chuẩn. Phản hồi phải là JSON thuần túy.
`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: 'application/json' }
        })
      }
    );

    if (!response.ok) throw new Error('Yêu cầu tới Gemini API thất bại');
    const aiData = await response.json();
    const aiText = aiData.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!aiText) throw new Error('AI không trả về nội dung');

    const result = JSON.parse(aiText.trim());

    if (result.status === 'clarification_needed') {
      return res.json({ status: 'clarification_needed', questions: result.questions });
    }

    if (result.status === 'success' && Array.isArray(result.updates)) {
      const appliedChanges: string[] = [];

      result.updates.forEach((u: any) => {
        const targetCarTypes = u.carType === 'all' ? vehicles : [u.carType];
        
        targetCarTypes.forEach((ct: string) => {
          if (type === 'commissions') {
            // Find commission rule and update
            const commIndex = db.commissions.findIndex(c => c.carType === ct && c.companyId === u.companyId);
            if (commIndex !== -1) {
              // Modify rules
              const companyName = db.companies.find(c => c.id === u.companyId)?.name || u.companyId;
              const carTypeName = ct;

              // Insert or overwrite the rule range
              const comm = db.commissions[commIndex];
              const existingRule = comm.rules.find(r => r.maxVal === u.maxVal);
              if (existingRule) {
                existingRule.rate = u.rate;
              } else {
                comm.rules.push({ maxVal: u.maxVal, rate: u.rate });
                comm.rules.sort((a, b) => (a.maxVal === null ? Infinity : a.maxVal) - (b.maxVal === null ? Infinity : b.maxVal));
              }
              appliedChanges.push(`Đã cập nhật hoa hồng cho ${companyName} (${carTypeName}): ${u.maxVal ? `Dưới ${(u.maxVal/1e6).toFixed(0)}Tr` : 'Mọi giá trị'} = ${(u.rate * 100).toFixed(1)}%`);
            }
          } else {
            // Rates update (similarly, modify rate rules)
            const rateIndex = db.rates.findIndex(r => r.carType === ct && r.companyId === u.companyId);
            if (rateIndex !== -1) {
              const r = db.rates[rateIndex];
              const existingRule = r.rules.find(rule => rule.maxVal === u.maxVal);
              const companyName = db.companies.find(c => c.id === u.companyId)?.name || u.companyId;
              
              if (existingRule) {
                existingRule.rates = [u.rate, u.rate, u.rate, u.rate]; // Flat rate across age brackets
              } else {
                r.rules.push({ maxVal: u.maxVal, rates: [u.rate, u.rate, u.rate, u.rate] });
                r.rules.sort((a, b) => (a.maxVal === null ? Infinity : a.maxVal) - (b.maxVal === null ? Infinity : b.maxVal));
              }
              appliedChanges.push(`Đã cập nhật tỷ lệ phí cho ${companyName} (${ct}): ${u.maxVal ? `Dưới ${(u.maxVal/1e6).toFixed(0)}Tr` : 'Mọi giá trị'} = ${u.rate}%`);
            }
          }
        });
      });

      writeDb(db);
      const newValue = JSON.parse(JSON.stringify({ rates: db.rates, commissions: db.commissions }));
      logAction(currentUser.id, currentUser.username, 'AI_UPDATE', `Cập nhật dữ liệu bằng AI: ${text}`, oldValue, newValue);

      return res.json({
        status: 'success',
        message: 'Đã tích hợp điều kiện đặc biệt bằng AI thành công',
        changes: appliedChanges
      });
    }

    res.status(500).json({ message: 'Định dạng AI trả về không đúng' });
  } catch (err: any) {
    res.status(500).json({ message: 'Không thể phân tích bằng AI: ' + err.message });
  }
});

// Parse document (TXT or Image) for commissions using Gemini API without mentioning AI on front-end
app.post('/api/auto/parse-document', async (req, res) => {
  const currentUser = getAuthUser(req);
  if (!currentUser) return res.status(401).json({ message: 'Không được cấp quyền' });

  const { fileType, text, base64, mimeType } = req.body;
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return res.status(500).json({ message: 'Gemini API Key chưa được thiết lập trên máy chủ' });
  }

  const db = readDb();
  const companiesList = db.companies.map(c => `${c.name} (${c.id})`).join(', ');
  // vehicles list matches detailed vehicle IDs in database
  const vehiclesList = db.vehicles.map(v => `${v.name} (${v.id})`).join(', ');

  const prompt = `
Bạn là một trợ lý chuyên nghiệp tự động đọc tài liệu hoa hồng bảo hiểm xe ô tô bằng tiếng Việt.
Hệ thống hiện tại có các Hãng bảo hiểm sau: [${companiesList}].
Các loại xe có mã ID như sau: [${vehiclesList}].

Hãy đọc tài liệu hoa hồng này (văn bản hoặc hình ảnh) và trích xuất ra các quy tắc hoa hồng.
Định dạng phản hồi BẮT BUỘC là JSON như sau:
{
  "status": "success",
  "updates": [
    {
      "companyId": "Mã hãng (ví dụ: BV, PVI, PTI, LB, VS)",
      "carType": "Mã loại xe (phải khớp chính xác với một trong các mã ID loại xe ở trên, hoặc điền \"all\" nếu áp dụng cho mọi loại xe)",
      "rules": [
        {
          "maxVal": 500000000, // Giá trị xe tối đa (VND) áp dụng mức này (ví dụ: dưới 500 triệu là 500000000). Nếu không giới hạn hoặc là khoảng trên cùng (ví dụ: trên 1 tỷ), sử dụng null.
          "rate": 0.11 // Tỉ lệ hoa hồng, ví dụ 11% là 0.11, 17.5% là 0.175
        }
      ]
    }
  ]
}
Nếu tài liệu không rõ ràng hoặc không trích xuất được, trả về:
{
  "status": "error",
  "message": "Lý do không đọc được..."
}

Lưu ý:
- Nếu một hãng bảo hiểm có cùng tỷ lệ hoa hồng cho mọi giá trị xe của loại xe đó, mảng "rules" chỉ cần chứa một phần tử duy nhất với "maxVal": null.
- Hãy phân tích kỹ các ngưỡng giá trị (ví dụ: dưới 700tr, từ 700tr trở lên) để quy đổi chính xác sang các khoảng maxVal tương ứng.
- Đảm bảo tỷ lệ hoa hồng được biểu diễn dưới dạng số thập phân.
- Không được thêm bất kì dòng giải thích nào ngoài định dạng JSON chuẩn. Phản hồi phải là JSON thuần túy.
`;

  try {
    let parts: any[] = [];
    if (fileType === 'txt') {
      parts.push({ text: `${prompt}\n\nNội dung văn bản tài liệu:\n"${text}"` });
    } else if (fileType === 'image') {
      const cleanBase64 = base64.replace(/^data:image\/\w+;base64,/, '');
      parts.push({ text: prompt });
      parts.push({
        inlineData: {
          data: cleanBase64,
          mimeType: mimeType || 'image/jpeg'
        }
      });
    } else {
      return res.status(400).json({ message: 'Loại tài liệu không hỗ trợ' });
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: parts }],
          generationConfig: { responseMimeType: 'application/json' }
        })
      }
    );

    if (!response.ok) throw new Error('Yêu cầu tới Gemini API thất bại');
    const aiData = await response.json();
    const aiText = aiData.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!aiText) throw new Error('Không nhận được phản hồi từ hệ thống phân tích');

    const result = JSON.parse(aiText.trim());
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ message: 'Lỗi phân tích tài liệu: ' + err.message });
  }
});

// ==========================================
// BANK REFERRALS (CHUYÊN THU) ENDPOINTS
// ==========================================

// Get all bank referrals (accessible to all authenticated users for calculation)
app.get('/api/bank-referrals', (req, res) => {
  const currentUser = getAuthUser(req);
  if (!currentUser) return res.status(401).json({ message: 'Không được cấp quyền' });

  const db = readDb();
  res.json(db.bankReferrals || []);
});

// Create bank referral (restricted to MASTER)
app.post('/api/bank-referrals', (req, res) => {
  const currentUser = getAuthUser(req);
  if (!currentUser || currentUser.role !== 'master') {
    return res.status(403).json({ message: 'Chỉ tài khoản MASTER mới được quản lý chuyên thu ngân hàng' });
  }

  const { companyId, bankName, rate } = req.body;
  const db = readDb();

  let rateToStore: number | string = 0;
  if (rate === 'Hết hoa hồng' || rate === '?' || rate === 'x') {
    rateToStore = rate;
  } else if (rate === '' || rate === undefined) {
    rateToStore = 0;
  } else {
    const num = Number(rate);
    if (isNaN(num) || num < 0 || num > 1) {
      return res.status(400).json({ message: 'Thông tin chuyên thu không hợp lệ' });
    }
    rateToStore = num;
  }

  // Validate company exists
  if (!db.companies.some(c => c.id === companyId)) {
    return res.status(400).json({ message: `Hãng bảo hiểm ${companyId} không tồn tại` });
  }

  // Validate bankName
  if (!BANK_OPTIONS.includes(bankName)) {
    return res.status(400).json({ message: `Ngân hàng ${bankName} không hợp lệ` });
  }

  // Check if configuration already exists
  if (db.bankReferrals && db.bankReferrals.some(b => b.companyId === companyId && b.bankName === bankName)) {
    return res.status(400).json({ message: `Cấu hình chuyên thu cho ${companyId} và ${bankName} đã tồn tại` });
  }

  const newRef: BankReferral = {
    id: Math.random().toString(36).substring(2, 9),
    companyId,
    bankName,
    rate: rateToStore
  };

  if (!db.bankReferrals) db.bankReferrals = [];
  db.bankReferrals.push(newRef);
  writeDb(db);

  const rateDesc = typeof rateToStore === 'string' ? rateToStore : `${(Number(rateToStore) * 100).toFixed(1)}%`;
  logAction(currentUser.id, currentUser.username, 'CREATE_BANK_REFERRAL', `Thêm chuyên thu: Hãng ${companyId}, Ngân hàng ${bankName}, Tỷ lệ ${rateDesc}`, null, newRef);

  res.status(201).json(newRef);
});

// Update bank referral (restricted to MASTER)
app.put('/api/bank-referrals/:id', (req, res) => {
  const currentUser = getAuthUser(req);
  if (!currentUser || currentUser.role !== 'master') {
    return res.status(403).json({ message: 'Chỉ tài khoản MASTER mới được quản lý chuyên thu ngân hàng' });
  }

  const { id } = req.params;
  const { companyId, bankName, rate } = req.body;
  const db = readDb();

  if (!db.bankReferrals) db.bankReferrals = [];
  const ref = db.bankReferrals.find(b => b.id === id);
  if (!ref) {
    return res.status(404).json({ message: 'Không tìm thấy cấu hình chuyên thu ngân hàng' });
  }

  let rateToStore: number | string = 0;
  if (rate === 'Hết hoa hồng' || rate === '?' || rate === 'x') {
    rateToStore = rate;
  } else if (rate === '' || rate === undefined) {
    rateToStore = 0;
  } else {
    const num = Number(rate);
    if (isNaN(num) || num < 0 || num > 1) {
      return res.status(400).json({ message: 'Thông tin chuyên thu không hợp lệ' });
    }
    rateToStore = num;
  }

  // Validate company exists
  if (!db.companies.some(c => c.id === companyId)) {
    return res.status(400).json({ message: `Hãng bảo hiểm ${companyId} không tồn tại` });
  }

  // Validate bankName
  if (!BANK_OPTIONS.includes(bankName)) {
    return res.status(400).json({ message: `Ngân hàng ${bankName} không hợp lệ` });
  }

  // Check if configuration already exists for another entry
  if (db.bankReferrals.some(b => b.companyId === companyId && b.bankName === bankName && b.id !== id)) {
    return res.status(400).json({ message: `Cấu hình chuyên thu cho ${companyId} và ${bankName} đã tồn tại` });
  }

  const oldValue = JSON.parse(JSON.stringify(ref));
  ref.companyId = companyId;
  ref.bankName = bankName;
  ref.rate = rateToStore;

  writeDb(db);

  const rateDesc = typeof rateToStore === 'string' ? rateToStore : `${(Number(rateToStore) * 100).toFixed(1)}%`;
  logAction(currentUser.id, currentUser.username, 'UPDATE_BANK_REFERRAL', `Cập nhật chuyên thu ID ${id}: Hãng ${companyId}, Ngân hàng ${bankName}, Tỷ lệ ${rateDesc}`, oldValue, ref);

  res.json(ref);
});

// Delete bank referral (restricted to MASTER)
app.delete('/api/bank-referrals/:id', (req, res) => {
  const currentUser = getAuthUser(req);
  if (!currentUser || currentUser.role !== 'master') {
    return res.status(403).json({ message: 'Chỉ tài khoản MASTER mới được quản lý chuyên thu ngân hàng' });
  }

  const { id } = req.params;
  const db = readDb();

  if (!db.bankReferrals) db.bankReferrals = [];
  const refIndex = db.bankReferrals.findIndex(b => b.id === id);
  if (refIndex === -1) {
    return res.status(404).json({ message: 'Không tìm thấy cấu hình chuyên thu ngân hàng' });
  }

  const ref = db.bankReferrals[refIndex];
  db.bankReferrals.splice(refIndex, 1);
  writeDb(db);

  const rateDesc = typeof ref.rate === 'string' ? ref.rate : `${(Number(ref.rate) * 100).toFixed(1)}%`;
  logAction(currentUser.id, currentUser.username, 'DELETE_BANK_REFERRAL', `Xóa chuyên thu: Hãng ${ref.companyId}, Ngân hàng ${ref.bankName}, Tỷ lệ ${rateDesc}`, ref, null);

  res.json({ message: 'Xóa cấu hình thành công' });
});

// Import bank referrals from JSON parsed from Excel (restricted to MASTER)
app.post('/api/bank-referrals/import', (req, res) => {
  const currentUser = getAuthUser(req);
  if (!currentUser || currentUser.role !== 'master') {
    return res.status(403).json({ message: 'Chỉ tài khoản MASTER mới được quản lý chuyên thu ngân hàng' });
  }

  const { referrals } = req.body;
  if (!Array.isArray(referrals)) {
    return res.status(400).json({ message: 'Dữ liệu chuyên thu không hợp lệ' });
  }

  const db = readDb();
  const errors: string[] = [];
  const validReferrals: BankReferral[] = [];

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

  for (let i = 0; i < referrals.length; i++) {
    const item = referrals[i];
    const { companyVal, bankVal, rateVal } = item;

    if (!companyVal || !bankVal) {
      errors.push(`Dòng ${i + 1}: Thiếu thông tin bắt buộc (Hãng bảo hiểm, Ngân hàng)`);
      continue;
    }

    // Match company
    const company = db.companies.find(c => 
      c.id.toLowerCase() === companyVal.toString().trim().toLowerCase() ||
      c.name.toLowerCase().replace(/\s+/g, '') === companyVal.toString().trim().toLowerCase().replace(/\s+/g, '')
    );
    if (!company) {
      errors.push(`Dòng ${i + 1}: Hãng bảo hiểm '${companyVal}' không tồn tại trong hệ thống`);
      continue;
    }

    // Match bank
    const matchedBank = matchBankName(bankVal.toString());
    if (!matchedBank) {
      errors.push(`Dòng ${i + 1}: Ngân hàng '${bankVal}' không hợp lệ hoặc không có trong danh sách hỗ trợ`);
      continue;
    }

    // Parse rate
    let rateToStore: number | string = 0;
    const rateStr = rateVal !== undefined && rateVal !== null ? rateVal.toString().trim() : '';

    if (rateStr === 'Hết hoa hồng' || rateStr === '?' || rateStr === 'x') {
      rateToStore = rateStr;
    } else if (rateStr === '') {
      rateToStore = 0;
    } else {
      let rateNum = NaN;
      if (rateStr.endsWith('%')) {
        rateNum = parseFloat(rateStr.slice(0, -1)) / 100;
      } else {
        const parsed = parseFloat(rateStr);
        if (!isNaN(parsed)) {
          if (parsed > 1) {
            rateNum = parsed / 100; // e.g. 5 means 5% = 0.05
          } else {
            rateNum = parsed; // e.g. 0.05
          }
        }
      }

      if (isNaN(rateNum) || rateNum < 0 || rateNum > 1) {
        errors.push(`Dòng ${i + 1}: Tỷ lệ chuyên thu '${rateVal}' không hợp lệ (phải là số từ 0% đến 100%, hoặc 'Hết hoa hồng', '?', 'x')`);
        continue;
      }
      rateToStore = rateNum;
    }

    // Prevent duplicates in the import batch
    if (validReferrals.some(r => r.companyId === company.id && r.bankName === matchedBank)) {
      errors.push(`Dòng ${i + 1}: Cấu hình bị trùng lặp cho hãng '${company.id}' và ngân hàng '${matchedBank}' trong file Excel`);
      continue;
    }

    validReferrals.push({
      id: Math.random().toString(36).substring(2, 9),
      companyId: company.id,
      bankName: matchedBank,
      rate: rateToStore
    });
  }

  if (errors.length > 0) {
    return res.status(400).json({ message: 'Dữ liệu Excel có lỗi, vui lòng kiểm tra lại', errors });
  }

  const oldValue = JSON.parse(JSON.stringify(db.bankReferrals || []));
  db.bankReferrals = validReferrals;
  writeDb(db);

  logAction(currentUser.id, currentUser.username, 'IMPORT_BANK_REFERRALS', `Nhập chuyên thu bằng Excel: Cập nhật thành công ${validReferrals.length} cấu hình`, oldValue, validReferrals);

  res.json({
    message: `Đã nhập và cập nhật thành công ${validReferrals.length} cấu hình chuyên thu ngân hàng!`,
    success: validReferrals.length
  });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
