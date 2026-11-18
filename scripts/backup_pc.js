import { Client } from 'ssh2';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BACKUP_DIR = 'D:\\CODE\\4.Auto VCX\\DATABASE BACKUP';
const VPS_CONFIG = {
  host: '180.93.102.128',
  port: 22,
  username: 'root',
  password: '4rPrNcazeX1xFa7y',
  readyTimeout: 30000
};

const REMOTE_DB_SQLITE = '/var/www/auto-vcx/server/data/db.sqlite';

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

async function runBackup() {
  console.log(`[${new Date().toLocaleString()}] Starting backup from VPS to PC...`);

  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }

  const timestamp = getFormattedTimestamp();
  const localFileName = `db_backup_${timestamp}.sqlite`;
  const localFilePath = path.join(BACKUP_DIR, localFileName);

  const conn = new Client();

  return new Promise((resolve, reject) => {
    conn.on('ready', () => {
      console.log('Connected to VPS successfully.');
      conn.sftp((err, sftp) => {
        if (err) {
          conn.end();
          return reject(err);
        }

        console.log(`Downloading ${REMOTE_DB_SQLITE} -> ${localFilePath}...`);
        sftp.fastGet(REMOTE_DB_SQLITE, localFilePath, (err) => {
          conn.end();
          if (err) {
            return reject(err);
          }

          const stats = fs.statSync(localFilePath);
          console.log(`✅ Backup SUCCESSFUL! File saved to: ${localFilePath} (${(stats.size / 1024).toFixed(1)} KB)`);

          // Keep the last 60 backup files to save disk space
          try {
            const files = fs.readdirSync(BACKUP_DIR)
              .filter(f => f.startsWith('db_backup_') && f.endsWith('.sqlite'))
              .sort();
            if (files.length > 60) {
              const toDelete = files.slice(0, files.length - 60);
              for (const f of toDelete) {
                fs.unlinkSync(path.join(BACKUP_DIR, f));
                console.log(`Cleaned up old backup: ${f}`);
              }
            }
          } catch (e) {
            // Ignore cleanup error
          }

          resolve(localFilePath);
        });
      });
    }).on('error', (err) => {
      console.error('SSH Connection Error:', err);
      reject(err);
    }).connect(VPS_CONFIG);
  });
}

runBackup().catch((err) => {
  console.error('❌ Backup FAILED:', err);
  process.exit(1);
});
