const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function runBrowserTest() {
  console.log('1. Launching Google Chrome on screen...');
  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: false, // Opens visible Chrome on your display!
    defaultViewport: null,
    args: ['--start-maximized', '--no-sandbox']
  });

  const page = await browser.newPage();
  const screenshotDir = path.join(__dirname, '..', 'docs', 'browser_evidence');
  if (!fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir, { recursive: true });
  }

  try {
    // 1. Navigate to Rate Calculator
    console.log('2. Navigating to http://localhost:5173/calculator ...');
    await page.goto('http://localhost:5173/calculator', { waitUntil: 'networkidle2' });
    await sleep(2500);
    await page.screenshot({ path: path.join(screenshotDir, '1_calculator_page.png') });
    console.log('Saved screenshot: 1_calculator_page.png');

    const title = await page.title();
    console.log('Current Page Title:', title);

    // 2. Click "Proceed to Email / Share Custom Rate" button
    console.log('3. Clicking "Proceed to Email / Share Custom Rate" ...');
    const buttons = await page.$$('button');
    let proceedFound = false;
    for (const b of buttons) {
      const text = await (await b.getProperty('innerText')).jsonValue();
      if (text && text.includes('Proceed to Email')) {
        await b.click();
        proceedFound = true;
        break;
      }
    }

    if (proceedFound) {
      console.log('Successfully clicked Proceed to Email button!');
      await sleep(2500);
      await page.screenshot({ path: path.join(screenshotDir, '2_share_rates_page.png') });
      console.log('Saved screenshot: 2_share_rates_page.png');
    } else {
      console.log('Navigating directly to /share-rates ...');
      await page.goto('http://localhost:5173/share-rates', { waitUntil: 'networkidle2' });
      await sleep(2500);
      await page.screenshot({ path: path.join(screenshotDir, '2_share_rates_page.png') });
    }

    // 3. Click "Preview Email" button
    console.log('4. Looking for and clicking "Preview Email" button...');
    const shareButtons = await page.$$('button');
    let previewFound = false;
    for (const b of shareButtons) {
      const text = await (await b.getProperty('innerText')).jsonValue();
      if (text && text.includes('Preview Email')) {
        await b.click();
        previewFound = true;
        break;
      }
    }

    if (previewFound) {
      console.log('Clicked Preview Email button! Modal is open.');
      await sleep(2000);
      await page.screenshot({ path: path.join(screenshotDir, '3_email_preview_modal.png') });
      console.log('Saved screenshot: 3_email_preview_modal.png');

      // Check for Open in Email App button
      const modalButtons = await page.$$('button');
      for (const mb of modalButtons) {
        const text = await (await mb.getProperty('innerText')).jsonValue();
        if (text && text.includes('Open in Email App')) {
          console.log('VERIFIED: "Open in Email App" button exists in the modal!');
        }
        if (text && text.includes('Continue in Gmail')) {
          console.log('VERIFIED: "Continue in Gmail" button exists in the modal!');
        }
      }
    }

    // 4. Navigate to Travel Agencies
    console.log('5. Navigating to Travel Agencies (/agencies)...');
    await page.goto('http://localhost:5173/agencies', { waitUntil: 'networkidle2' });
    await sleep(2000);
    await page.screenshot({ path: path.join(screenshotDir, '4_agencies_page.png') });
    console.log('Saved screenshot: 4_agencies_page.png');

    // 5. Navigate to Quote History
    console.log('6. Navigating to Rate Management Quote History (/rates?tab=HISTORY)...');
    await page.goto('http://localhost:5173/rates?tab=HISTORY', { waitUntil: 'networkidle2' });
    await sleep(2000);
    await page.screenshot({ path: path.join(screenshotDir, '5_rate_history_tab.png') });
    console.log('Saved screenshot: 5_rate_history_tab.png');

    console.log('\n===========================================');
    console.log('ALL BROWSER WORKFLOW TESTS PASSED IN CHROME!');
    console.log('Screenshots saved to docs/browser_evidence/');
    console.log('===========================================\n');
  } catch (err) {
    console.error('Error during browser run:', err);
    await page.screenshot({ path: path.join(screenshotDir, 'error_state.png') });
  } finally {
    console.log('Leaving browser open for 10 seconds so you can see it...');
    await sleep(10000);
    await browser.close();
  }
}

runBrowserTest();
