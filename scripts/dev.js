import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('--- KHỞI CHẠY HỆ THỐNG VCX FULL-STACK ---');

// Spawn server (Express)
const serverProcess = spawn('npx', ['tsx', 'server/server.ts'], {
  stdio: 'inherit',
  shell: true,
  cwd: path.resolve(__dirname, '..')
});

// Spawn client (Vite)
const clientProcess = spawn('npx', ['vite', '--port=3000', '--host=0.0.0.0'], {
  stdio: 'inherit',
  shell: true,
  cwd: path.resolve(__dirname, '..')
});

const cleanup = () => {
  console.log('\n--- ĐANG DỌN DẸP TIẾN TRÌNH... ---');
  try {
    serverProcess.kill('SIGINT');
  } catch (e) {}
  try {
    clientProcess.kill('SIGINT');
  } catch (e) {}
  process.exit(0);
};

// Handle process termination events to clean up ports
process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
process.on('exit', cleanup);

serverProcess.on('exit', (code) => {
  console.log(`Server exited with code ${code}`);
  cleanup();
});

clientProcess.on('exit', (code) => {
  console.log(`Client exited with code ${code}`);
  cleanup();
});
