import https from 'https';

https.get('https://docs.google.com/spreadsheets/d/10XEt3hznI6BjTnX7ktHiDg9U-Ihx4seg19xgJu1_40A/edit?usp=sharing', (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    const matches = data.match(/gid=\d+/g);
    if (matches) {
      console.log([...new Set(matches)]);
    } else {
      console.log('No gids found');
    }
  });
}).on('error', (err) => {
  console.log('Error: ' + err.message);
});
