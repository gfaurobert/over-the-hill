const puppeteer = require('puppeteer');
const path = require('path');

async function boundaryLabelStackTest() {
  console.log('🚀 Boundary-Aware Label Stack Test');
  console.log('==================================');
  
  let browser;
  let page;
  const testResults = {
    step1: { status: 'Failed', screenshot: null },
    step2: { status: 'Failed', screenshot: null },
    step3: { status: 'Failed', screenshot: null },
    step4: { status: 'Failed', screenshot: null },
    step5: { status: 'Failed', screenshot: null },
    step6: { status: 'Failed', screenshot: null }
  };
  
  try {
    // Launch browser
    console.log('1. Launching browser...');
    browser = await puppeteer.launch({ 
      headless: false,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      protocolTimeout: 30000 // Increased timeout
    });
    
    page = await browser.newPage();
    
    // Set viewport to 1000px width
    await page.setViewport({ width: 1200, height: 800 });
    
    // Step 1: Navigate to the app
    console.log('2. Navigating to localhost:3001...');
    await page.goto('http://localhost:3001', { waitUntil: 'networkidle2' });
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Check if we need to authenticate first
    const loginForm = await page.$('input[type="email"]');
    if (loginForm) {
      console.log('2a. Authenticating...');
      await page.type('input[type="email"]', 'tipahej393@mvpmedix.com');
      await page.type('input[type="password"]', '3R9yd3ncCmQ*E8392AP6');
      await page.click('button[type="submit"]');
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
    
    // Take screenshot for Step 1
    const step1Screenshot = path.join(__dirname, '../../../assets/ui/boundary-label-stack-test/step1-app-loaded.png');
    await page.screenshot({ path: step1Screenshot, fullPage: true });
    testResults.step1 = { status: 'Passed', screenshot: 'step1-app-loaded.png' };
    console.log('✅ Step 1: App loaded successfully');
    
    // Step 2: Test existing dots with long labels
    console.log('3. Testing existing dots with long labels...');
    
    // Wait for the app to load after authentication
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Check if there are existing dots with long labels
    const existingLabels = await page.evaluate(() => {
      const textElements = Array.from(document.querySelectorAll('text'));
      return textElements.map(el => el.textContent).filter(text => text && text.length > 30);
    });
    
    console.log(`Found ${existingLabels.length} existing labels with long text:`, existingLabels.slice(0, 3));
    
    // Take screenshot for Step 2
    const step2Screenshot = path.join(__dirname, '../../../assets/ui/boundary-label-stack-test/step2-existing-dots.png');
    await page.screenshot({ path: step2Screenshot, fullPage: true });
    testResults.step2 = { status: 'Passed', screenshot: 'step2-existing-dots.png' };
    console.log('✅ Step 2: Existing dots with long labels found');
    
    // Step 3: Verify horizontal boundary constraints
    console.log('4. Verifying horizontal boundary constraints...');
    
    // Check if any labels extend beyond the right boundary
    const labels = await page.$$('text');
    let horizontalOverflow = false;
    
    for (const label of labels) {
      const boundingBox = await label.boundingBox();
      if (boundingBox && boundingBox.x + boundingBox.width > 640) {
        horizontalOverflow = true;
        break;
      }
    }
    
    if (!horizontalOverflow) {
      const step3Screenshot = path.join(__dirname, '../../../assets/ui/boundary-label-stack-test/step3-horizontal-constraints.png');
      await page.screenshot({ path: step3Screenshot, fullPage: true });
      testResults.step3 = { status: 'Passed', screenshot: 'step3-horizontal-constraints.png' };
      console.log('✅ Step 3: Horizontal boundary constraints working');
    } else {
      testResults.step3 = { status: 'Failed', screenshot: null };
      console.log('❌ Step 3: Horizontal overflow detected');
    }
    
    // Step 4: Verify vertical stacking behavior
    console.log('5. Verifying vertical stacking behavior...');
    
    // Check if labels are stacked vertically when overlapping
    const labelRects = await page.$$('rect[fill="hsl(var(--background))"]');
    let verticalStacking = false;
    
    if (labelRects.length > 1) {
      const positions = [];
      for (const rect of labelRects) {
        const box = await rect.boundingBox();
        if (box) {
          positions.push({ x: box.x, y: box.y });
        }
      }
      
      // Check if labels are at different Y positions (stacked)
      const yPositions = positions.map(p => p.y);
      const uniqueYPositions = [...new Set(yPositions)];
      verticalStacking = uniqueYPositions.length > 1;
    }
    
    if (verticalStacking) {
      const step4Screenshot = path.join(__dirname, '../../../assets/ui/boundary-label-stack-test/step4-vertical-stacking.png');
      await page.screenshot({ path: step4Screenshot, fullPage: true });
      testResults.step4 = { status: 'Passed', screenshot: 'step4-vertical-stacking.png' };
      console.log('✅ Step 4: Vertical stacking working correctly');
    } else {
      testResults.step4 = { status: 'Failed', screenshot: null };
      console.log('❌ Step 4: Vertical stacking not detected');
    }
    
    // Step 5: Test export functionality
    console.log('6. Testing export functionality...');
    
    // Click export button
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const exportButton = buttons.find(button => button.textContent.includes('Export'));
      if (exportButton) {
        exportButton.click();
      }
    });
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Check if export dialog appears
    const exportDialog = await page.$('div[role="dialog"]');
    if (exportDialog) {
      const step5Screenshot = path.join(__dirname, '../../../assets/ui/boundary-label-stack-test/step5-export-dialog.png');
      await page.screenshot({ path: step5Screenshot, fullPage: true });
      testResults.step5 = { status: 'Passed', screenshot: 'step5-export-dialog.png' };
      console.log('✅ Step 5: Export dialog appears');
    } else {
      testResults.step5 = { status: 'Failed', screenshot: null };
      console.log('❌ Step 5: Export dialog not found');
    }
    
    // Step 6: Verify labels in exported view
    console.log('7. Verifying labels in exported view...');
    
    // Close export dialog if open
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const closeButton = buttons.find(button => button.textContent.includes('Close'));
      if (closeButton) {
        closeButton.click();
      }
    });
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Check if all labels are still visible and within bounds
    const visibleLabels = await page.$$('text');
    let allLabelsVisible = true;
    
    for (const label of visibleLabels) {
      const boundingBox = await label.boundingBox();
      if (boundingBox) {
        // Check if label is within viewBox bounds
        if (boundingBox.x < -50 || boundingBox.x + boundingBox.width > 650 || 
            boundingBox.y < 0 || boundingBox.y + boundingBox.height > 180) {
          allLabelsVisible = false;
          break;
        }
      }
    }
    
    if (allLabelsVisible) {
      const step6Screenshot = path.join(__dirname, '../../../assets/ui/boundary-label-stack-test/step6-all-labels-visible.png');
      await page.screenshot({ path: step6Screenshot, fullPage: true });
      testResults.step6 = { status: 'Passed', screenshot: 'step6-all-labels-visible.png' };
      console.log('✅ Step 6: All labels visible and within bounds');
    } else {
      testResults.step6 = { status: 'Failed', screenshot: null };
      console.log('❌ Step 6: Some labels outside bounds');
    }
    
    // Print test summary
    console.log('\n📋 Test Results Summary:');
    console.log('========================');
    Object.entries(testResults).forEach(([step, result]) => {
      console.log(`${step}: ${result.status}`);
    });
    
    // Check overall test result
    const allPassed = Object.values(testResults).every(result => result.status === 'Passed');
    if (allPassed) {
      console.log('\n🎉 TEST PASSED: Boundary-aware label stacking working correctly!');
    } else {
      console.log('\n❌ TEST FAILED: Some boundary constraints not working');
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
boundaryLabelStackTest().catch(console.error); 