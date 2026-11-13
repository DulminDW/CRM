const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const evidenceDir = path.join(__dirname, '..', 'docs', 'testing', 'evidence');
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function runComprehensiveAudit() {
  console.log('=== STARTING CHROME END-TO-END UI AUDIT ===');
  console.log('Target evidence directory:', evidenceDir);

  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: false, // Visible Chrome on desktop
    defaultViewport: null,
    args: ['--start-maximized', '--no-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  const auditLog = {
    pages: [],
    consoleErrors: [],
    failedRequests: [],
    responsiveTests: []
  };

  // Listen to console errors and network failures
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      auditLog.consoleErrors.push({ url: page.url(), text: msg.text() });
      console.log('[BROWSER CONSOLE ERROR]:', msg.text());
    }
  });

  page.on('requestfailed', (req) => {
    auditLog.failedRequests.push({
      url: req.url(),
      errorText: req.failure() ? req.failure().errorText : 'failed'
    });
    console.log('[NETWORK REQUEST FAILED]:', req.url(), req.failure() ? req.failure().errorText : '');
  });

  const pagesToTest = [
    { name: '01_login_page', url: 'http://localhost:5173/login' },
    { name: '02_dashboard', url: 'http://localhost:5173/' },
    { name: '03_agencies', url: 'http://localhost:5173/agencies' },
    { name: '04_members', url: 'http://localhost:5173/members' },
    { name: '05_hotels', url: 'http://localhost:5173/hotels' },
    { name: '06_hotel_seasons', url: 'http://localhost:5173/seasons' },
    { name: '07_contracts', url: 'http://localhost:5173/contracts' },
    { name: '08_rate_management_hub', url: 'http://localhost:5173/rates' },
    { name: '09_rate_calculator', url: 'http://localhost:5173/calculator' },
    { name: '10_share_rates_page', url: 'http://localhost:5173/share-rates' },
    { name: '11_shared_rate_history', url: 'http://localhost:5173/rates?tab=HISTORY' }
  ];

  for (const p of pagesToTest) {
    console.log(`\nNavigating to ${p.name} (${p.url})...`);
    try {
      await page.goto(p.url, { waitUntil: 'networkidle2', timeout: 15000 });
      await sleep(1500);

      const title = await page.title();
      const screenshotPath = path.join(evidenceDir, `${p.name}.png`);
      await page.screenshot({ path: screenshotPath, fullPage: false });

      auditLog.pages.push({
        name: p.name,
        url: p.url,
        title,
        status: 'OPENED_SUCCESSFULLY',
        screenshot: `${p.name}.png`
      });
      console.log(`✓ ${p.name} opened. Title: "${title}". Saved: ${p.name}.png`);
    } catch (err) {
      console.error(`✗ Error on ${p.name}:`, err.message);
      auditLog.pages.push({
        name: p.name,
        url: p.url,
        status: 'FAILED',
        error: err.message
      });
    }
  }

  // --- SECTION: TEST RATE SHARING & PREVIEW MODAL WORKFLOW ---
  console.log('\nTesting Rate Sharing Email Preview & Modal Workflow on /share-rates ...');
  try {
    await page.goto('http://localhost:5173/share-rates', { waitUntil: 'networkidle2' });
    await sleep(2000);

    // Look for Preview Email button
    const buttons = await page.$$('button');
    let previewClicked = false;
    for (const b of buttons) {
      const text = await (await b.getProperty('innerText')).jsonValue();
      if (text && text.includes('Preview Email')) {
        console.log('Found Preview Email button. Checking if disabled...');
        const isDisabled = await page.evaluate(el => el.disabled, b);
        console.log('Preview Email button disabled state:', isDisabled);
        if (!isDisabled) {
          await b.click();
          previewClicked = true;
          await sleep(2000);
          await page.screenshot({ path: path.join(evidenceDir, '12_email_preview_modal_open.png') });
          console.log('Saved 12_email_preview_modal_open.png');
        } else {
          console.log('Preview Email button is disabled because database has 0 hotels/recipients (Expected empty state).');
          await page.screenshot({ path: path.join(evidenceDir, '12_share_rates_empty_db_state.png') });
        }
        break;
      }
    }
  } catch (err) {
    console.error('Error testing rate sharing modal:', err.message);
  }

  // --- SECTION: RESPONSIVE VIEWPORT TESTING ---
  console.log('\nTesting Responsive Viewports with Chrome Emulation...');
  const viewports = [
    { name: 'desktop_1440x900', width: 1440, height: 900 },
    { name: 'tablet_ipad_768x1024', width: 768, height: 1024 },
    { name: 'mobile_android_393x851', width: 393, height: 851 },
    { name: 'mobile_iphone_390x844', width: 390, height: 844 }
  ];

  for (const vp of viewports) {
    console.log(`Setting viewport: ${vp.name} (${vp.width}x${vp.height})...`);
    await page.setViewport({ width: vp.width, height: vp.height });
    await page.goto('http://localhost:5173/share-rates', { waitUntil: 'networkidle2' });
    await sleep(1500);
    const vpShot = path.join(evidenceDir, `responsive_${vp.name}.png`);
    await page.screenshot({ path: vpShot });
    auditLog.responsiveTests.push({
      viewport: vp.name,
      width: vp.width,
      height: vp.height,
      screenshot: `responsive_${vp.name}.png`
    });
    console.log(`Saved screenshot: responsive_${vp.name}.png`);
  }

  // Save audit log json
  fs.writeFileSync(path.join(evidenceDir, 'audit_run_results.json'), JSON.stringify(auditLog, null, 2));
  console.log('\nAudit data saved to audit_run_results.json');

  console.log('Keeping Chrome open for 5 seconds before closing...');
  await sleep(5000);
  await browser.close();
  console.log('=== CHROME END-TO-END AUDIT FINISHED ===');
}

runComprehensiveAudit().catch(err => {
  console.error('FATAL AUDIT ERROR:', err);
  process.exit(1);
});

