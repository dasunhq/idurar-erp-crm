const { URL } = require('url');

function checkAndCorrectURL(url) {
  const allowedDomains = ['localhost', 'idurarapp.com', 'demo.idurarapp.com', 'cloud.idurarapp.com']; // Add your allowed domains here

  // detect if it has http or https:
  const hasHttps = url.startsWith('https://');
  
  // Remove "http://" or "https://" if present
  let cleanUrl = url.replace(/^https?:\/\//i, '');

  // Remove trailing slashes
  cleanUrl = cleanUrl.replace(/\/+$/, '');

  try {
    const urlObject = new URL('http://' + cleanUrl);
    if (!allowedDomains.includes(urlObject.hostname)) {
      throw new Error('Invalid domain');
    }
  } catch (error) {
    throw new Error('Invalid URL');
  }

  const httpType = hasHttps ? 'https://' : 'http://';
  return httpType + cleanUrl;
}

module.exports = checkAndCorrectURL;
