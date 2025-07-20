const puppeteer = require('puppeteer');
const path = require('path');

async function testLogin() {
  console.log('🚀 Login Authentication Test');
  console.log('============================');
  
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
    const step1Screenshot = path.join(__dirname, '../../../assets/authentication/login-test/step1-app-loaded.png');
    await page.screenshot({ path: step1Screenshot, fullPage: true });
    testResults.step1 = { status: 'Passed', screenshot: 'step1-app-loaded.png' };
    console.log('✅ Step 1: App loaded successfully');
    
    // Step 2: Find and fill email input
    console.log('3. Looking for email input field...');
    const emailInput = await page.$('input[type="email"]');
    if (emailInput) {
      console.log('✅ Found email input field');
      
      // Enter test email
      await emailInput.type('tipahej393@mvpmedix.com');
      console.log('✅ Email entered: tipahej393@mvpmedix.com');
      
      // Take screenshot for Step 2
      const step2Screenshot = path.join(__dirname, '../../../assets/authentication/login-test/step2-email-entered.png');
      await page.screenshot({ path: step2Screenshot, fullPage: true });
      testResults.step2 = { status: 'Passed', screenshot: 'step2-email-entered.png' };
      console.log('✅ Step 2: Email entered successfully');
    } else {
      console.log('❌ No email input field found');
      testResults.step2 = { status: 'Failed', screenshot: null };
      return;
    }
    
    // Step 3: Find and fill password input
    console.log('4. Looking for password input field...');
    const passwordInput = await page.$('input[type="password"]');
    if (passwordInput) {
      console.log('✅ Found password input field');
      
      // Enter test password
      await passwordInput.type('3R9yd3ncCmQ*E8392AP6');
      console.log('✅ Password entered');
      
      // Take screenshot for Step 3
      const step3Screenshot = path.join(__dirname, '../../../assets/authentication/login-test/step3-password-entered.png');
      await page.screenshot({ path: step3Screenshot, fullPage: true });
      testResults.step3 = { status: 'Passed', screenshot: 'step3-password-entered.png' };
      console.log('✅ Step 3: Password entered successfully');
    } else {
      console.log('❌ No password input field found');
      testResults.step3 = { status: 'Failed', screenshot: null };
      return;
    }
    
    // Step 4: Find and click login button
    console.log('5. Looking for login button...');
    const buttons = await page.$$('button');
    let loginButton = null;
    
    for (let i = 0; i < buttons.length; i++) {
      const buttonText = await page.evaluate(el => el.textContent, buttons[i]);
      if (buttonText === 'Sign In' || buttonText === 'Login') {
        loginButton = buttons[i];
        console.log(`✅ Found login button: "${buttonText}"`);
        break;
      }
    }
    
    if (loginButton) {
      // Click the login button
      console.log('6. Clicking login button...');
      await loginButton.click();
      console.log('✅ Login button clicked');
      
      // Wait for response
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Take screenshot for Step 4
      const step4Screenshot = path.join(__dirname, '../../../assets/authentication/login-test/step4-login-clicked.png');
      await page.screenshot({ path: step4Screenshot, fullPage: true });
      testResults.step4 = { status: 'Passed', screenshot: 'step4-login-clicked.png' };
      console.log('✅ Step 4: Login button clicked successfully');
    } else {
      console.log('❌ Login button not found');
      testResults.step4 = { status: 'Failed', screenshot: null };
      return;
    }
    
    // Step 5: Check for successful login
    console.log('7. Checking for successful login...');
    
    // Wait a bit more for any redirects or state changes
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Check if we're still on the login page or if we've been redirected
    const currentUrl = page.url();
    const pageText = await page.evaluate(() => document.body.innerText);
    
    // Take screenshot for Step 5
    const step5Screenshot = path.join(__dirname, '../../../assets/authentication/login-test/step5-login-result.png');
    await page.screenshot({ path: step5Screenshot, fullPage: true });
    
    // Check for success indicators
    const hasError = pageText.includes('error') || pageText.includes('Error') || pageText.includes('Invalid');
    const hasSuccess = pageText.includes('Sign Out') || pageText.includes('Welcome') || !pageText.includes('Sign In');
    
    if (hasError) {
      testResults.step5 = { status: 'Failed', screenshot: 'step5-login-result.png' };
      console.log('❌ Step 5: Login failed - error detected');
      console.log('Error details:', pageText);
    } else if (hasSuccess) {
      testResults.step5 = { status: 'Passed', screenshot: 'step5-login-result.png' };
      console.log('✅ Step 5: Login successful - user authenticated');
    } else {
      testResults.step5 = { status: 'Failed', screenshot: 'step5-login-result.png' };
      console.log('⚠️  Step 5: Login status unclear');
      console.log('Page content:', pageText);
    }
    
    // Print test summary
    console.log('\n📋 Test Results Summary:');
    console.log('========================');
    console.log('Step 1 - App Loaded:', testResults.step1.status);
    console.log('Step 2 - Email Entered:', testResults.step2.status);
    console.log('Step 3 - Password Entered:', testResults.step3.status);
    console.log('Step 4 - Login Clicked:', testResults.step4.status);
    console.log('Step 5 - Login Result:', testResults.step5.status);
    
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
testLogin().catch(console.error); 