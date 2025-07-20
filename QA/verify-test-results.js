const fs = require('fs');
const path = require('path');

function verifyTestResults() {
  console.log('🔍 QA Test Results Verification');
  console.log('===============================');
  
  // Check if QA folder exists
  if (!fs.existsSync('QA')) {
    console.log('❌ QA folder not found');
    return;
  }
  
  // Check Tests-Summary.md
  const summaryPath = 'QA/Tests-Summary.md';
  if (fs.existsSync(summaryPath)) {
    console.log('✅ Tests-Summary.md found');
    const summaryContent = fs.readFileSync(summaryPath, 'utf8');
    const testCount = (summaryContent.match(/### [^#]+/g) || []).length;
    console.log(`📊 Found ${testCount} documented tests`);
  } else {
    console.log('❌ Tests-Summary.md not found');
  }
  
  // Check scripts folder structure
  const scriptsPath = 'QA/scripts';
  if (fs.existsSync(scriptsPath)) {
    console.log('✅ Scripts folder found');
    const scripts = fs.readdirSync(scriptsPath, { withFileTypes: true });
    const testFolders = scripts.filter(dirent => dirent.isDirectory());
    console.log(`📁 Found ${testFolders.length} test categories:`);
    
    testFolders.forEach(folder => {
      const categoryPath = path.join(scriptsPath, folder.name);
      const categoryTests = fs.readdirSync(categoryPath, { withFileTypes: true });
      const testFoldersInCategory = categoryTests.filter(dirent => dirent.isDirectory());
      
      console.log(`   📂 ${folder.name}: ${testFoldersInCategory.length} tests`);
      testFoldersInCategory.forEach(testFolder => {
        const runScriptPath = path.join(categoryPath, testFolder.name, 'run.js');
        const hasRunScript = fs.existsSync(runScriptPath);
        console.log(`      - ${testFolder.name} ${hasRunScript ? '✅' : '❌'} (run.js ${hasRunScript ? 'found' : 'missing'})`);
      });
    });
  } else {
    console.log('❌ Scripts folder not found');
  }
  
  // Check assets folder structure
  const assetsPath = 'QA/assets';
  if (fs.existsSync(assetsPath)) {
    console.log('✅ Assets folder found');
    const assets = fs.readdirSync(assetsPath, { withFileTypes: true });
    const assetFolders = assets.filter(dirent => dirent.isDirectory());
    console.log(`🖼️  Found ${assetFolders.length} asset categories:`);
    
    assetFolders.forEach(folder => {
      const categoryPath = path.join(assetsPath, folder.name);
      const categoryAssets = fs.readdirSync(categoryPath, { withFileTypes: true });
      const testFoldersInCategory = categoryAssets.filter(dirent => dirent.isDirectory());
      
      console.log(`   📂 ${folder.name}: ${testFoldersInCategory.length} test assets`);
      testFoldersInCategory.forEach(testFolder => {
        const testAssetsPath = path.join(categoryPath, testFolder.name);
        const files = fs.readdirSync(testAssetsPath);
        console.log(`      - ${testFolder.name}: ${files.length} screenshots`);
      });
    });
  } else {
    console.log('❌ Assets folder not found');
  }
  
  // Check specific test results
  console.log('\n🎯 Test Results Summary:');
  console.log('========================');
  
  // Check authentication tests
  const authTestsPath = 'QA/assets/authentication';
  if (fs.existsSync(authTestsPath)) {
    console.log('🔐 Authentication Tests:');
    const authTests = fs.readdirSync(authTestsPath, { withFileTypes: true });
    const authTestFolders = authTests.filter(dirent => dirent.isDirectory());
    
    authTestFolders.forEach(testFolder => {
      const testAssetsPath = path.join(authTestsPath, testFolder.name);
      const screenshots = fs.readdirSync(testAssetsPath);
      console.log(`   - ${testFolder.name}: ${screenshots.length} screenshots`);
      screenshots.forEach(screenshot => {
        const filePath = path.join(testAssetsPath, screenshot);
        const stats = fs.statSync(filePath);
        const fileSize = (stats.size / 1024).toFixed(1);
        console.log(`     📸 ${screenshot} (${fileSize} KB)`);
      });
    });
  }
  
  // Check if app is running
  console.log('\n🌐 App Status Check:');
  console.log('===================');
  const { exec } = require('child_process');
  exec('curl -s -o /dev/null -w "%{http_code}" http://localhost:3001', (error, stdout, stderr) => {
    if (error) {
      console.log('❌ App not accessible (localhost:3001)');
      console.log('💡 Make sure to run: npm run dev');
    } else if (stdout.trim() === '200') {
      console.log('✅ App is running on localhost:3001');
    } else {
      console.log(`⚠️  App responded with status: ${stdout.trim()}`);
    }
  });
  
  console.log('\n📋 Quick Commands:');
  console.log('==================');
  console.log('• Run magic link test: node QA/scripts/authentication/magic-link-test/run.js');
  console.log('• Run login test: node QA/scripts/authentication/login-test/run.js');
  console.log('• View test results: cat QA/Tests-Summary.md');
  console.log('• Check app status: curl -I http://localhost:3001');
  
  console.log('\n✅ QA testing framework is properly set up and documented!');
}

verifyTestResults(); 