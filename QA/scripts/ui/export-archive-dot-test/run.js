const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

async function exportArchiveDotTest() {
  console.log('🚀 Export/Archive Dot Test');
  console.log('========================');

  let browser;
  let page;
  const testResults = {
    step1: { status: 'Failed', screenshot: null },
    step2: { status: 'Failed', screenshot: null },
    step3: { status: 'Failed', screenshot: null },
    step4: { status: 'Failed', screenshot: null },
    step5: { status: 'Failed', screenshot: null },
    step6: { status: 'Failed', screenshot: null },
    step7: { status: 'Failed', screenshot: null },
    step8: { status: 'Failed', screenshot: null },
    step9: { status: 'Failed', screenshot: null },
    step10: { status: 'Failed', screenshot: null },
    step11: { status: 'Failed', screenshot: null },
    step12: { status: 'Failed', screenshot: null },
  };

  try {
    // Launch browser (Firefox)
    browser = await puppeteer.launch({
      headless: false,
      product: 'firefox',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    page = await browser.newPage();

    // Step 1: Open localhost:3001
    await page.goto('http://localhost:3001', { waitUntil: 'networkidle2' });
    await new Promise(resolve => setTimeout(resolve, 2000));
    // Login step
    await page.type('input[type="email"]', 'tipahej393@mvpmedix.com');
    await page.type('input[type="password"]', '3R9yd3ncCmQ*E8392AP6');
    await page.click('button[type="submit"]');
    await new Promise(resolve => setTimeout(resolve, 3000)); // Wait for login to complete
    // Debug: Take screenshot and log all visible div text
    const debugScreenshot = path.join(__dirname, '../../../assets/ui/export-archive-dot-test/debug-after-login.png');
    await page.screenshot({ path: debugScreenshot, fullPage: true });
    const allDivTexts = await page.evaluate(() => Array.from(document.querySelectorAll('div')).map(el => el.textContent.trim()).filter(Boolean));
    console.log('All visible div texts after login:', allDivTexts);
    const step1Screenshot = path.join(__dirname, '../../../assets/ui/export-archive-dot-test/step1-app-loaded.png');
    await page.screenshot({ path: step1Screenshot, fullPage: true });
    testResults.step1 = { status: 'Passed', screenshot: 'step1-app-loaded.png' };
    console.log('✅ Step 1: App loaded and logged in');

    // Step 2: Open ellipsis menu at dot "Import JSON"
    // Find and click the dot by text content using page.evaluate
    const dotClicked = await page.evaluate(() => {
      const elements = Array.from(document.querySelectorAll('div'));
      const target = elements.find(el => el.textContent && el.textContent.trim() === 'Import JSON');
      if (target) {
        target.click();
        return true;
      }
      return false;
    });
    if (!dotClicked) throw new Error('Could not find dot "Import JSON"');
    await new Promise(resolve => setTimeout(resolve, 500));
    // Try to find the ellipsis button near the dot
    const ellipsisButton = await page.$('button[aria-label="Dot menu"]');
    if (!ellipsisButton) throw new Error('Could not find dot ellipsis menu');
    await ellipsisButton.click();
    await new Promise(resolve => setTimeout(resolve, 500));
    const step2Screenshot = path.join(__dirname, '../../../assets/ui/export-archive-dot-test/step2-dot-ellipsis-opened.png');
    await page.screenshot({ path: step2Screenshot, fullPage: true });
    testResults.step2 = { status: 'Passed', screenshot: 'step2-dot-ellipsis-opened.png' };
    console.log('✅ Step 2: Dot ellipsis menu opened');

    // Step 3: Select "Archive"
    await page.evaluate(() => {
      const items = Array.from(document.querySelectorAll('button, div'));
      const archiveBtn = items.find(el => el.textContent && el.textContent.match(/Archive/i));
      if (archiveBtn) archiveBtn.click();
    });
    await new Promise(resolve => setTimeout(resolve, 1000));
    const step3Screenshot = path.join(__dirname, '../../../assets/ui/export-archive-dot-test/step3-dot-archived.png');
    await page.screenshot({ path: step3Screenshot, fullPage: true });
    testResults.step3 = { status: 'Passed', screenshot: 'step3-dot-archived.png' };
    console.log('✅ Step 3: Dot archived');

    // Step 4: Open main ellipsis menu
    const mainEllipsis = await page.$('button[aria-label="Main menu"]');
    if (!mainEllipsis) throw new Error('Could not find main ellipsis menu');
    await mainEllipsis.click();
    await new Promise(resolve => setTimeout(resolve, 500));
    const step4Screenshot = path.join(__dirname, '../../../assets/ui/export-archive-dot-test/step4-main-ellipsis-opened.png');
    await page.screenshot({ path: step4Screenshot, fullPage: true });
    testResults.step4 = { status: 'Passed', screenshot: 'step4-main-ellipsis-opened.png' };
    console.log('✅ Step 4: Main ellipsis menu opened');

    // Step 5: Select Export collections
    await page.evaluate(() => {
      const items = Array.from(document.querySelectorAll('button, div'));
      const exportBtn = items.find(el => el.textContent && el.textContent.match(/Export collections/i));
      if (exportBtn) exportBtn.click();
    });
    await new Promise(resolve => setTimeout(resolve, 2000));
    const step5Screenshot = path.join(__dirname, '../../../assets/ui/export-archive-dot-test/step5-export-clicked.png');
    await page.screenshot({ path: step5Screenshot, fullPage: true });
    testResults.step5 = { status: 'Passed', screenshot: 'step5-export-clicked.png' };
    console.log('✅ Step 5: Export collections clicked');

    // Step 6: Copy downloaded file to assets and verify archived=true
    // Find the most recent hill-chart-data_*.json in downloads
    const downloadsDir = path.join(process.env.HOME, 'Downloads');
    const files = fs.readdirSync(downloadsDir).filter(f => f.startsWith('hill-chart-data_') && f.endsWith('.json'));
    if (files.length === 0) throw new Error('No export file found in Downloads');
    const latestFile = files.map(f => ({ f, t: fs.statSync(path.join(downloadsDir, f)).mtime.getTime() }))
      .sort((a, b) => b.t - a.t)[0].f;
    const src = path.join(downloadsDir, latestFile);
    const dest = path.join(__dirname, '../../../assets/ui/export-archive-dot-test/', latestFile.replace('.json', '_test_archived.json'));
    fs.copyFileSync(src, dest);
    const exportedData = JSON.parse(fs.readFileSync(src, 'utf8'));
    const importJsonDot = exportedData.collections.flatMap(collection => collection.dots).find(dot => dot.label === 'Import JSON');
    if (!importJsonDot) throw new Error('Import JSON dot not found in export');
    if (importJsonDot.archived !== true) throw new Error('Import JSON dot archived property is not true after archiving');
    testResults.step6 = { status: 'Passed', screenshot: null };
    console.log('✅ Step 6: Exported file copied and archived=true verified');

    // Step 7: Go back to app (already open)
    await page.bringToFront();
    await new Promise(resolve => setTimeout(resolve, 500));
    testResults.step7 = { status: 'Passed', screenshot: null };
    console.log('✅ Step 7: Returned to app');

    // Step 8: Find archived dot "Import JSON"
    // Find and click the dot by text content using page.evaluate
    const archivedDotClicked = await page.evaluate(() => {
      const elements = Array.from(document.querySelectorAll('div'));
      const target = elements.find(el => el.textContent && el.textContent.trim() === 'Import JSON');
      if (target) {
        target.click();
        return true;
      }
      return false;
    });
    if (!archivedDotClicked) throw new Error('Could not find archived dot "Import JSON"');
    await new Promise(resolve => setTimeout(resolve, 500));
    testResults.step8 = { status: 'Passed', screenshot: null };
    console.log('✅ Step 8: Archived dot found');

    // Step 9: Open dot ellipsis and select Unarchive
    const dotEllipsis2 = await page.$('button[aria-label="Dot menu"]');
    if (!dotEllipsis2) throw new Error('Could not find dot ellipsis menu (unarchive)');
    await dotEllipsis2.click();
    await new Promise(resolve => setTimeout(resolve, 500));
    await page.evaluate(() => {
      const items = Array.from(document.querySelectorAll('button, div'));
      const unarchiveBtn = items.find(el => el.textContent && el.textContent.match(/Unarchive/i));
      if (unarchiveBtn) unarchiveBtn.click();
    });
    await new Promise(resolve => setTimeout(resolve, 1000));
    const step9Screenshot = path.join(__dirname, '../../../assets/ui/export-archive-dot-test/step9-dot-unarchived.png');
    await page.screenshot({ path: step9Screenshot, fullPage: true });
    testResults.step9 = { status: 'Passed', screenshot: 'step9-dot-unarchived.png' };
    console.log('✅ Step 9: Dot unarchived');

    // Step 10: Open main ellipsis menu again
    const mainEllipsis2 = await page.$('button[aria-label="Main menu"]');
    if (!mainEllipsis2) throw new Error('Could not find main ellipsis menu (again)');
    await mainEllipsis2.click();
    await new Promise(resolve => setTimeout(resolve, 500));
    const step10Screenshot = path.join(__dirname, '../../../assets/ui/export-archive-dot-test/step10-main-ellipsis-opened.png');
    await page.screenshot({ path: step10Screenshot, fullPage: true });
    testResults.step10 = { status: 'Passed', screenshot: 'step10-main-ellipsis-opened.png' };
    console.log('✅ Step 10: Main ellipsis menu opened again');

    // Step 11: Select Export collections again
    await page.evaluate(() => {
      const items = Array.from(document.querySelectorAll('button, div'));
      const exportBtn = items.find(el => el.textContent && el.textContent.match(/Export collections/i));
      if (exportBtn) exportBtn.click();
    });
    await new Promise(resolve => setTimeout(resolve, 2000));
    const step11Screenshot = path.join(__dirname, '../../../assets/ui/export-archive-dot-test/step11-export-clicked.png');
    await page.screenshot({ path: step11Screenshot, fullPage: true });
    testResults.step11 = { status: 'Passed', screenshot: 'step11-export-clicked.png' };
    console.log('✅ Step 11: Export collections clicked again');

    // Step 12: Copy downloaded file to assets and verify archived=false
    const files2 = fs.readdirSync(downloadsDir).filter(f => f.startsWith('hill-chart-data_') && f.endsWith('.json'));
    if (files2.length === 0) throw new Error('No export file found in Downloads (unarchive)');
    const latestFile2 = files2.map(f => ({ f, t: fs.statSync(path.join(downloadsDir, f)).mtime.getTime() }))
      .sort((a, b) => b.t - a.t)[0].f;
    const src2 = path.join(downloadsDir, latestFile2);
    const dest2 = path.join(__dirname, '../../../assets/ui/export-archive-dot-test/', latestFile2.replace('.json', '_test_unarchived.json'));
    fs.copyFileSync(src2, dest2);
    const exportedData2 = JSON.parse(fs.readFileSync(src2, 'utf8'));
    const importJsonDot2 = exportedData2.collections.flatMap(collection => collection.dots).find(dot => dot.label === 'Import JSON');
    if (!importJsonDot2) throw new Error('Import JSON dot not found in export (unarchive)');
    if (importJsonDot2.archived !== false) throw new Error('Import JSON dot archived property is not false after unarchiving');
    testResults.step12 = { status: 'Passed', screenshot: null };
    console.log('✅ Step 12: Exported file copied and archived=false verified');

    // Print test summary
    console.log('\n📋 Test Results Summary:');
    console.log('========================');
    Object.entries(testResults).forEach(([step, result]) => {
      console.log(`${step}: ${result.status}`);
    });
    const allPassed = Object.values(testResults).every(result => result.status === 'Passed');
    if (allPassed) {
      console.log('\n🎉 TEST PASSED: All steps completed successfully!');
    } else {
      console.log('\n❌ TEST FAILED: Some steps failed');
    }
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Run the test
exportArchiveDotTest().catch(console.error); 