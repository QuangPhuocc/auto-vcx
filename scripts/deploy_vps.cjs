const { Client } = require('ssh2');

const conn = new Client();

const runCmd = (cmd) => {
  return new Promise((resolve, reject) => {
    console.log(`\n>>> EXECUTING ON VPS: ${cmd}`);
    conn.exec(cmd, (err, stream) => {
      if (err) return reject(err);
      let stdout = '';
      let stderr = '';
      stream.on('close', (code) => {
        if (code === 0) {
          resolve(stdout);
        } else {
          console.error(`[EXIT CODE ${code}] ${stderr}`);
          resolve(stdout + stderr);
        }
      }).on('data', (data) => {
        process.stdout.write(data.toString());
      }).stderr.on('data', (data) => {
        process.stderr.write(data.toString());
      });
    });
  });
};

conn.on('ready', async () => {
  console.log('=== CONNECTED TO PRODUCTION VPS (180.93.102.128) ===');
  try {
    await runCmd('cd /var/www/auto-vcx && git fetch origin && git reset --hard origin/main');
    await runCmd('cd /var/www/auto-vcx && npm install');
    await runCmd('cd /var/www/auto-vcx && npm run build');
    await runCmd('pm2 restart auto-vcx');
    await runCmd('pm2 status auto-vcx');
    console.log('\n>>> Production deployment completed successfully!');
  } catch (err) {
    console.error('Error during deployment:', err);
  } finally {
    conn.end();
  }
}).on('error', (err) => {
  console.error('SSH Connection Error:', err);
}).connect({
  host: '180.93.102.128',
  port: 22,
  username: 'root',
  password: '4rPrNcazeX1xFa7y',
  readyTimeout: 30000
});
