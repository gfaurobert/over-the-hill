const puppeteer = require('puppeteer');
const path = require('path');

async function testMagicLink() {
  console.log('🚀 Magic Link Authentication Test');
  console.log('==================================');
  
  let browser;
  let page;
  const testResults = {
    step1: { status: 'Failed', screenshot: null },
    step2: { status: 'Failed', screenshot: null },
    step3: { status: 'Failed', screenshot: null },
    step4: { status: 'Failed', screenshot: null },
    step5: { status: 'Failed', screenshot: null }
  };
  
  try {
    // Launch browser
    console.log('1. Launching browser...');
    browser = await puppeteer.launch({ 
      headless: false,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    page = await browser.newPage();
    
    // Step 1: Navigate to the app
    console.log('2. Navigating to localhost:3001...');
    await page.goto('http://localhost:3001', { waitUntil: 'networkidle2' });
    
    // Wait for the page to fully load
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Take screenshot for Step 1
    const step1Screenshot = path.join(__dirname, '../../../assets/authentication/magic-link-test/step1-app-loaded.png');
    await page.screenshot({ path: step1Screenshot, fullPage: true });
    testResults.step1 = { status: 'Passed', screenshot: 'step1-app-loaded.png' };
    console.log('✅ Step 1: App loaded successfully');
    
    // Step 2: Find and fill email input
    console.log('3. Looking for email input field...');
    const emailInput = await page.$('input[type="email"]');
    if (emailInput) {
      console.log('✅ Found email input field');
      
      // Enter test email
      await emailInput.type('tadeva1577@mvpmedix.com');
      console.log('✅ Email entered: tadeva1577@mvpmedix.com');
      
      // Take screenshot for Step 2
      const step2Screenshot = path.join(__dirname, '../../../assets/authentication/magic-link-test/step2-email-entered.png');
      await page.screenshot({ path: step2Screenshot, fullPage: true });
      testResults.step2 = { status: 'Passed', screenshot: 'step2-email-entered.png' };
      console.log('✅ Step 2: Email entered successfully');
    } else {
      console.log('❌ No email input field found');
      testResults.step2 = { status: 'Failed', screenshot: null };
      return;
    }
    
    // Step 3: Find and click "Send Magic Link" button
    console.log('4. Looking for "Send Magic Link" button...');
    const buttons = await page.$$('button');
    let magicLinkButton = null;
    
    for (let i = 0; i < buttons.length; i++) {
      const buttonText = await page.evaluate(el => el.textContent, buttons[i]);
      if (buttonText === 'Send Magic Link') {
        magicLinkButton = buttons[i];
        console.log('✅ Found "Send Magic Link" button');
        break;
      }
    }
    
    if (magicLinkButton) {
      // Click the magic link button
      console.log('5. Clicking "Send Magic Link" button...');
      await magicLinkButton.click();
      console.log('✅ Magic link button clicked');
      
      // Wait for response
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Take screenshot for Step 3
      const step3Screenshot = path.join(__dirname, '../../../assets/authentication/magic-link-test/step3-button-clicked.png');
      await page.screenshot({ path: step3Screenshot, fullPage: true });
      testResults.step3 = { status: 'Passed', screenshot: 'step3-button-clicked.png' };
      console.log('✅ Step 3: Magic link button clicked successfully');
    } else {
      console.log('❌ "Send Magic Link" button not found');
      testResults.step3 = { status: 'Failed', screenshot: null };
      return;
    }
    
    // Step 4: Check for response
    console.log('6. Checking for response...');
    
    // Wait a bit more for the response
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Check if the button text changed to indicate success
    const updatedButtons = await page.$$('button');
    let responseReceived = false;
    
    for (let i = 0; i < updatedButtons.length; i++) {
      const buttonText = await page.evaluate(el => el.textContent, updatedButtons[i]);
      if (buttonText === 'Magic Link Sent!') {
        responseReceived = true;
        console.log('✅ Magic link sent successfully');
        break;
      }
    }
    
    // Take screenshot for Step 4
    const step4Screenshot = path.join(__dirname, '../../../assets/authentication/magic-link-test/step4-response-received.png');
    await page.screenshot({ path: step4Screenshot, fullPage: true });
    
    if (responseReceived) {
      testResults.step4 = { status: 'Passed', screenshot: 'step4-response-received.png' };
      console.log('✅ Step 4: Response received successfully');
    } else {
      testResults.step4 = { status: 'Failed', screenshot: 'step4-response-received.png' };
      console.log('❌ Step 4: No response received');
    }
    
    // Step 5: Verify no errors
    console.log('7. Checking for errors...');
    
    // Wait a bit more and check for any error messages
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const pageText = await page.evaluate(() => document.body.innerText);
    const hasError = pageText.includes('error') || pageText.includes('Error') || pageText.includes('Invalid');
    
    // Take screenshot for Step 5
    const step5Screenshot = path.join(__dirname, '../../../assets/authentication/magic-link-test/step5-final-state.png');
    await page.screenshot({ path: step5Screenshot, fullPage: true });
    
    if (!hasError) {
      testResults.step5 = { status: 'Passed', screenshot: 'step5-final-state.png' };
      console.log('✅ Step 5: No errors detected');
    } else {
      testResults.step5 = { status: 'Failed', screenshot: 'step5-final-state.png' };
      console.log('❌ Step 5: Errors detected');
      console.log('Error details:', pageText);
    }
    
    // Print test summary
    console.log('\n📋 Test Results Summary:');
    console.log('========================');
    console.log('Step 1 - App Loaded:', testResults.step1.status);
    console.log('Step 2 - Email Entered:', testResults.step2.status);
    console.log('Step 3 - Button Clicked:', testResults.step3.status);
    console.log('Step 4 - Response Received:', testResults.step4.status);
    console.log('Step 5 - No Errors:', testResults.step5.status);
    
    // Check overall test result
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
testMagicLink().catch(console.error); 