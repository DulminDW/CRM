const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

async function inspectLoginPage() {
  console.log('1. Launching Chrome...');
  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: false,
    defaultViewport: null,
    args: ['--start-maximized', '--no-sandbox']
  });

  const page = await browser.newPage();
  
  const consoleLogs = [];
  page.on('console', msg => consoleLogs.push({ type: msg.type(), text: msg.text() }));

  const failedReqs = [];
  page.on('requestfailed', req => failedReqs.push({ url: req.url(), error: req.failure() ? req.failure().errorText : '' }));

  console.log('2. Navigating to http://localhost:5173/login ...');
  await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle2' });
  
  // Inspect input fields
  const emailInput = await page.$('input[type="email"]');
  const passInput = await page.$('input[type="password"]');
  const submitBtn = await page.$('button[type="submit"]');

  console.log('Email input present:', Boolean(emailInput));
  console.log('Password input present:', Boolean(passInput));
  console.log('Submit button present:', Boolean(submitBtn));

  // Check form submit validation
  if (submitBtn) {
    await submitBtn.click();
    await new Promise(r => setTimeout(r, 1000));
    const validationMessage = await page.evaluate(() => {
      const el = document.querySelector('p.text-xs.text-red-700, .bg-red-50');
      return el ? el.innerText : null;
    });
    console.log('Client-side form validation message:', validationMessage);
  }

  // Check ProtectedRoute redirection behavior
  console.log('3. Navigating to protected route http://localhost:5173/ ...');
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle2' });
  console.log('URL after navigating to / :', page.url());

  console.log('4. Navigating to protected route http://localhost:5173/calculator ...');
  await page.goto('http://localhost:5173/calculator', { waitUntil: 'networkidle2' });
  console.log('URL after navigating to /calculator :', page.url());

  console.log('\n--- BROWSER CONSOLE LOGS ---');
  console.log(consoleLogs);

  console.log('\n--- FAILED NETWORK REQUESTS ---');
  console.log(failedReqs);

  const shotPath = path.join(__dirname, '..', 'docs', 'testing', 'evidence', 'login_inspected.png');
  await page.screenshot({ path: shotPath });
  console.log('\nSaved screenshot to', shotPath);

  await new Promise(r => setTimeout(r, 3000));
  await browser.close();
}

inspectLoginPage().catch(err => {
  console.error('Inspection error:', err);
  process.exit(1);
});

