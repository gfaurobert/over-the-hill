const puppeteer = require('puppeteer');

async function simpleBoundaryTest() {
  console.log('🚀 Simple Boundary-Aware Label Stack Test');
  console.log('==========================================');
  
  let browser;
  let page;
  
  try {
    // Launch browser
    console.log('1. Launching browser...');
    browser = await puppeteer.launch({ 
      headless: false,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    page = await browser.newPage();
    await page.setViewport({ width: 1000, height: 800 });
    
    // Navigate to the app
    console.log('2. Navigating to localhost:3001...');
    await page.goto('http://localhost:3001', { waitUntil: 'networkidle2' });
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Authenticate
    const loginForm = await page.$('input[type="email"]');
    if (loginForm) {
      console.log('2a. Authenticating...');
      await page.type('input[type="email"]', 'tipahej393@mvpmedix.com');
      await page.type('input[type="password"]', '3R9yd3ncCmQ*E8392AP6');
      await page.click('button[type="submit"]');
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
    
    console.log('✅ App loaded and authenticated');
    
    // Check for existing labels
    console.log('3. Checking existing labels...');
    const labels = await page.evaluate(() => {
      const textElements = Array.from(document.querySelectorAll('text'));
      return textElements.map(el => el.textContent).filter(text => text && text.length > 0);
    });
    
    console.log(`Found ${labels.length} labels:`, labels.slice(0, 5));
    
    // Check for horizontal overflow
    console.log('4. Checking horizontal boundary constraints...');
    const horizontalOverflow = await page.evaluate(() => {
      const textElements = Array.from(document.querySelectorAll('text'));
      let overflow = false;
      textElements.forEach(el => {
        const rect = el.getBoundingClientRect();
        if (rect.x + rect.width > 640) {
          overflow = true;
          console.log('Overflow detected:', el.textContent, 'at x:', rect.x, 'width:', rect.width);
        }
      });
      return overflow;
    });
    
    if (!horizontalOverflow) {
      console.log('✅ Horizontal boundary constraints working');
    } else {
      console.log('❌ Horizontal overflow detected');
    }
    
    // Check for vertical stacking
    console.log('5. Checking vertical stacking...');
    const verticalStacking = await page.evaluate(() => {
      const rects = Array.from(document.querySelectorAll('rect[fill="hsl(var(--background))"]'));
      const yPositions = rects.map(rect => rect.getBoundingClientRect().y);
      const uniqueYPositions = [...new Set(yPositions)];
      return uniqueYPositions.length > 1;
    });
    
    if (verticalStacking) {
      console.log('✅ Vertical stacking working');
    } else {
      console.log('❌ Vertical stacking not detected');
    }
    
    console.log('\n📋 Test Summary:');
    console.log('================');
    console.log(`Labels found: ${labels.length}`);
    console.log(`Horizontal overflow: ${horizontalOverflow ? 'Yes' : 'No'}`);
    console.log(`Vertical stacking: ${verticalStacking ? 'Yes' : 'No'}`);
    
    if (!horizontalOverflow && verticalStacking) {
      console.log('\n🎉 TEST PASSED: Boundary-aware label stacking working correctly!');
    } else {
      console.log('\n❌ TEST FAILED: Boundary constraints not working properly');
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
simpleBoundaryTest().catch(console.error); 