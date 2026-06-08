import https from 'https';
import fs from 'fs';

const file = fs.createWriteStream("sheet.xlsx");
https.get("https://docs.google.com/spreadsheets/d/10XEt3hznI6BjTnX7ktHiDg9U-Ihx4seg19xgJu1_40A/export?format=xlsx", function(response) {
  if (response.statusCode === 307 || response.statusCode === 302) {
    https.get(response.headers.location, function(res) {
      res.pipe(file);
      file.on('finish', function() {
        file.close();
        console.log('Downloaded');
      });
    });
  } else {
    response.pipe(file);
    file.on('finish', function() {
      file.close();
      console.log('Downloaded');
    });
  }
});
