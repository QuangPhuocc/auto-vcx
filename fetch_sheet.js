const https = require('https');
https.get('https://docs.google.com/spreadsheets/d/10XEt3hznI6BjTnX7ktHiDg9U-Ihx4seg19xgJu1_40A/edit', (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    const matches = data.match(/\\\["\d+","[^"]+",/g) || data.match(/\["\d+","[^"]+"/g) || [];
    console.log(matches.slice(0, 100));
    
    // Also try to find the word hoa hong
    const idx = data.indexOf('hoa h');
    if (idx > -1) console.log(data.slice(idx - 50, idx + 50));
  });
});
