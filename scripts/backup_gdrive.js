import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Client } from 'ssh2';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

const GDRIVE_FOLDER_ID = '1uZwyc7s9A7N2QkYneTAn4k4z749BYDcq';

// Paths to check for Service Account credentials
const CREDENTIALS_CANDIDATES = [
  path.join(ROOT_DIR, 'credentials', 'service-account.json'),
  path.join(ROOT_DIR, 'credentials', 'google-service-account.json'),
  'D:\\CODE\\5. TAKE INFO\\credentials\\service-account.json'
];

const VPS_CONFIG = {
  host: '180.93.102.128',
  port: 22,
  username: 'root',
  password: '4rPrNcazeX1xFa7y',
  readyTimeout: 30000
};

function getCredentialsPath() {
  for (const p of CREDENTIALS_CANDIDATES) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

function getFormattedTimestamp() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const MM = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const HH = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  const ss = String(now.getSeconds()).padStart(2, '0');
  return `${yyyy}-${MM}-${dd}_${HH}-${mm}-${ss}`;
}

async function fetchDbFromVps(destPath) {
  const conn = new Client();
  return new Promise((resolve, reject) => {
    conn.on('ready', () => {
      conn.sftp((err, sftp) => {
        if (err) {
          conn.end();
          return reject(err);
        }
        sftp.fastGet('/var/www/auto-vcx/server/data/db.sqlite', destPath, (err) => {
          conn.end();
          if (err) return reject(err);
          resolve(destPath);
        });
      });
    }).on('error', (err) => reject(err)).connect(VPS_CONFIG);
  });
}

export async function uploadToGoogleDrive(filePath) {
  const credPath = getCredentialsPath();
  if (!credPath) {
    throw new Error(
      'Không tìm thấy file credentials Google Service Account (.json).\n' +
      'Vui lòng đặt file Service Account vào: D:\\CODE\\4.Auto VCX\\credentials\\service-account.json'
    );
  }

  const credentials = JSON.parse(fs.readFileSync(credPath, 'utf8'));
  const auth = new google.auth.JWT({
    email: credentials.client_email,
    key: credentials.private_key,
    scopes: ['https://www.googleapis.com/auth/drive']
  });

  const drive = google.drive({ version: 'v3', auth });

  const fileName = `AutoVCX_DB_Backup_${getFormattedTimestamp()}.sqlite`;
  console.log(`[Google Drive] Đang tải lên file ${fileName} vào folder: ${GDRIVE_FOLDER_ID}...`);

  const res = await drive.files.create({
    requestBody: {
      name: fileName,
      parents: [GDRIVE_FOLDER_ID]
    },
    media: {
      mimeType: 'application/x-sqlite3',
      body: fs.createReadStream(filePath)
    },
    fields: 'id, name, webViewLink, size'
  });

  console.log(`✅ [Google Drive] Tải lên thành công! File ID: ${res.data.id}`);
  console.log(`Link: ${res.data.webViewLink}`);
  return res.data;
}

async function main() {
  console.log(`[${new Date().toLocaleString()}] Bắt đầu quy trình Backup Google Drive...`);
  const tmpBackupPath = path.join(ROOT_DIR, 'scratch', 'temp_gdrive_backup.sqlite');
  
  if (!fs.existsSync(path.dirname(tmpBackupPath))) {
    fs.mkdirSync(path.dirname(tmpBackupPath), { recursive: true });
  }

  // 1. Kéo DB mới nhất từ VPS về temp
  console.log('1. Đang lấy database mới nhất từ VPS...');
  await fetchDbFromVps(tmpBackupPath);

  // 2. Upload lên Google Drive
  console.log('2. Đang gửi dữ liệu lên Google Drive...');
  await uploadToGoogleDrive(tmpBackupPath);

  // 3. Dọn dẹp file temp
  if (fs.existsSync(tmpBackupPath)) {
    fs.unlinkSync(tmpBackupPath);
  }
  console.log('Hoàn thành xuất sắc!');
}

// Chạy trực tiếp nếu file được thực thi
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error('❌ Lỗi Backup Google Drive:', err.message);
    process.exit(1);
  });
}
