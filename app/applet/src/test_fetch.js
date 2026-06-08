const https = require('https');

https.get('https://docs.google.com/spreadsheets/d/10XEt3hznI6BjTnX7ktHiDg9U-Ihx4seg19xgJu1_40A/htmlview', (res) => {
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  res.on('end', () => {
    const regex = /gid=(\d+)/g;
    const matches = [...data.matchAll(regex)];
    const gids = [...new Set(matches.map(m => m[1]))];
    console.log(gids);
  });
});
