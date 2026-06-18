const https = require('https');

const url = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSZzXNGPn9vDOM9ROUaJHAeuoWCnHiM3oIbGmwcjZ0pD7aul2wzli6DwR_aeEZRMjfJbY1QAFoX8vNH/pub?gid=0&single=true&output=csv";

function get(url) {
  https.get(url, (res) => {
    if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
      return get(res.headers.location);
    }
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      console.log(data.substring(0, 500));
    });
  });
}

get(url);
