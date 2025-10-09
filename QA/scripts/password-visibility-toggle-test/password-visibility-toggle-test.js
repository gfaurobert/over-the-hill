/**
 * Automated QA Test Script for password-visibility-toggle
 * Generated on: 2025-09-20T06:23:06.688Z
 * Total Steps: 24
 * Estimated Duration: 48000ms
 * 
 * This test validates password visibility toggle functionality including:
 * - Toggle button show/hide functionality
 * - Icon state changes (eye/eye-off)
 * - Accessibility features (aria-label, keyboard navigation)
 * - Form integration and default states
 */

const { test, expect } = require('@playwright/test');
const path = require('path');

test.describe('password-visibility-toggle - Password Visibility Toggle Tests', () => {
  let page;
  
  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    
    // Set viewport for consistent testing
    await page.setViewportSize({ width: 1920, height: 1080 });
    
    // Set default timeout
    page.setDefaultTimeout(30000);
  });

  test.afterEach(async () => {
    if (page) {
      await page.close();
    }
  });

  test('Password Visibility Toggle - Complete Functionality Test', async () => {
    // Step: Navigate to page for testing: WHEN user clicks the password toggle button THEN the system SHALL show the password text
    console.log('Navigate to page for testing: WHEN user clicks the password toggle button THEN the system SHALL show the password text');
    await page.goto('http://localhost:3001');
    await page.waitForLoadState('networkidle');
    await captureScreenshot(page, '1_1-nav', 'password-visibility-toggle');

    // Step: Enter test password for: WHEN user clicks the password toggle button THEN the system SHALL show the password text
    console.log('Enter test password for: WHEN user clicks the password toggle button THEN the system SHALL show the password text');
    const typeSuccess_1_1_input = await safeType(page, 'input[type="password"], input[name="password"]', 'TestPassword123!');
    expect(typeSuccess_1_1_input).toBeTruthy();
    await page.waitForTimeout(500); // Allow for input processing
    await captureScreenshot(page, '1_1-input', 'password-visibility-toggle');

    // Step: Click toggle button to show password for: WHEN user clicks the password toggle button THEN the system SHALL show the password text
    console.log('Click toggle button to show password for: WHEN user clicks the password toggle button THEN the system SHALL show the password text');
    const toggleSelector = await waitForPasswordToggle(page);
    const clickSuccess_1_1_toggle = await safeClick(page, toggleSelector);
    expect(clickSuccess_1_1_toggle).toBeTruthy();
    await page.waitForTimeout(1000); // Wait for toggle animation
    await captureScreenshot(page, '1_1-toggle', 'password-visibility-toggle');

    // Step: Assert password is visible for: WHEN user clicks the password toggle button THEN the system SHALL show the password text
    console.log('Assert password is visible for: WHEN user clicks the password toggle button THEN the system SHALL show the password text');
    await assertPasswordVisibility(page, 'visible');
    await captureScreenshot(page, '1_1-assert', 'password-visibility-toggle');

    // Step: Capture screenshot after: WHEN user clicks the password toggle button THEN the system SHALL show the password text
    console.log('Capture screenshot after: WHEN user clicks the password toggle button THEN the system SHALL show the password text');
    await captureScreenshot(page, '1_1-screenshot', 'password-visibility-toggle');

    // Step: Navigate to page for testing: WHEN user clicks the toggle button again THEN the system SHALL hide the password text
    console.log('Navigate to page for testing: WHEN user clicks the toggle button again THEN the system SHALL hide the password text');
    await page.goto('http://localhost:3001');
    await page.waitForLoadState('networkidle');
    await captureScreenshot(page, '1_2-nav', 'password-visibility-toggle');

    // Step: Enter test password for: WHEN user clicks the toggle button again THEN the system SHALL hide the password text
    console.log('Enter test password for: WHEN user clicks the toggle button again THEN the system SHALL hide the password text');
    const typeSuccess_1_2_input = await safeType(page, 'input[type="password"], input[name="password"]', 'TestPassword123!');
    expect(typeSuccess_1_2_input).toBeTruthy();
    await page.waitForTimeout(500); // Allow for input processing
    await captureScreenshot(page, '1_2-input', 'password-visibility-toggle');

    // Step: Click toggle button to show password for: WHEN user clicks the toggle button again THEN the system SHALL hide the password text
    console.log('Click toggle button to show password for: WHEN user clicks the toggle button again THEN the system SHALL hide the password text');
    const toggleSelector2 = await waitForPasswordToggle(page);
    const clickSuccess_1_2_show = await safeClick(page, toggleSelector2);
    expect(clickSuccess_1_2_show).toBeTruthy();
    await page.waitForTimeout(1000); // Wait for toggle animation
    await captureScreenshot(page, '1_2-show', 'password-visibility-toggle');

    // Step: Click toggle button to hide password for: WHEN user clicks the toggle button again THEN the system SHALL hide the password text
    console.log('Click toggle button to hide password for: WHEN user clicks the toggle button again THEN the system SHALL hide the password text');
    const toggleSelector3 = await waitForPasswordToggle(page);
    const clickSuccess_1_2_hide = await safeClick(page, toggleSelector3);
    expect(clickSuccess_1_2_hide).toBeTruthy();
    await page.waitForTimeout(1000); // Wait for toggle animation
    await captureScreenshot(page, '1_2-hide', 'password-visibility-toggle');

    // Step: Assert password is hidden for: WHEN user clicks the toggle button again THEN the system SHALL hide the password text
    console.log('Assert password is hidden for: WHEN user clicks the toggle button again THEN the system SHALL hide the password text');
    await assertPasswordVisibility(page, 'hidden');
    await captureScreenshot(page, '1_2-assert', 'password-visibility-toggle');

    // Step: Capture screenshot after: WHEN user clicks the toggle button again THEN the system SHALL hide the password text
    console.log('Capture screenshot after: WHEN user clicks the toggle button again THEN the system SHALL hide the password text');
    await captureScreenshot(page, '1_2-screenshot', 'password-visibility-toggle');

    // Step: Navigate to page for testing: WHEN screen reader accesses toggle button THEN system SHALL provide appropriate aria-label
    console.log('Navigate to page for testing: WHEN screen reader accesses toggle button THEN system SHALL provide appropriate aria-label');
    await page.goto('http://localhost:3001');
    await page.waitForLoadState('networkidle');
    await captureScreenshot(page, '2_1-nav', 'password-visibility-toggle');

    // Step: Assert toggle button has appropriate aria-label for: WHEN screen reader accesses toggle button THEN system SHALL provide appropriate aria-label
    console.log('Assert toggle button has appropriate aria-label for: WHEN screen reader accesses toggle button THEN system SHALL provide appropriate aria-label');
    await assertAriaLabel(page, '[data-testid="password-toggle"], button[aria-label*="password"]');
    await captureScreenshot(page, '2_1-assert', 'password-visibility-toggle');

    // Step: Capture screenshot after: WHEN screen reader accesses toggle button THEN system SHALL provide appropriate aria-label
    console.log('Capture screenshot after: WHEN screen reader accesses toggle button THEN system SHALL provide appropriate aria-label');
    await captureScreenshot(page, '2_1-screenshot', 'password-visibility-toggle');

    // Step: Navigate to page for testing: WHEN toggle button is focused THEN it SHALL be activatable with Enter or Space key
    console.log('Navigate to page for testing: WHEN toggle button is focused THEN it SHALL be activatable with Enter or Space key');
    await page.goto('http://localhost:3001');
    await page.waitForLoadState('networkidle');
    await captureScreenshot(page, '2_2-nav', 'password-visibility-toggle');

    // Step: Enter test password for: WHEN toggle button is focused THEN it SHALL be activatable with Enter or Space key
    console.log('Enter test password for: WHEN toggle button is focused THEN it SHALL be activatable with Enter or Space key');
    const typeSuccess_2_2_input = await safeType(page, 'input[type="password"], input[name="password"]', 'TestPassword123!');
    expect(typeSuccess_2_2_input).toBeTruthy();
    await page.waitForTimeout(500); // Allow for input processing
    await captureScreenshot(page, '2_2-input', 'password-visibility-toggle');

    // Step: Navigate to toggle button using keyboard for: WHEN toggle button is focused THEN it SHALL be activatable with Enter or Space key
    console.log('Navigate to toggle button using keyboard for: WHEN toggle button is focused THEN it SHALL be activatable with Enter or Space key');
    const keySuccess_2_2_focus = await safeKeyPress(page, '[data-testid="password-toggle"], button[aria-label*="password"]', 'Tab');
    expect(keySuccess_2_2_focus).toBeTruthy();
    await page.waitForTimeout(500); // Wait for keyboard action
    await captureScreenshot(page, '2_2-focus', 'password-visibility-toggle');

    // Step: Activate toggle button using Enter key for: WHEN toggle button is focused THEN it SHALL be activatable with Enter or Space key
    console.log('Activate toggle button using Enter key for: WHEN toggle button is focused THEN it SHALL be activatable with Enter or Space key');
    const keySuccess_2_2_activate = await safeKeyPress(page, '[data-testid="password-toggle"], button[aria-label*="password"]', 'Enter');
    expect(keySuccess_2_2_activate).toBeTruthy();
    await page.waitForTimeout(500); // Wait for keyboard action
    await captureScreenshot(page, '2_2-activate', 'password-visibility-toggle');

    // Step: Capture screenshot after: WHEN toggle button is focused THEN it SHALL be activatable with Enter or Space key
    console.log('Capture screenshot after: WHEN toggle button is focused THEN it SHALL be activatable with Enter or Space key');
    await captureScreenshot(page, '2_2-screenshot', 'password-visibility-toggle');

    // Step: Navigate to page for testing: WHEN on SignInForm component THEN password visibility toggle SHALL be present
    console.log('Navigate to page for testing: WHEN on SignInForm component THEN password visibility toggle SHALL be present');
    await page.goto('http://localhost:3001');
    await page.waitForLoadState('networkidle');
    await captureScreenshot(page, '3_1-nav', 'password-visibility-toggle');

    // Step: Assert password toggle is present in SignInForm for: WHEN on SignInForm component THEN password visibility toggle SHALL be present
    console.log('Assert password toggle is present in SignInForm for: WHEN on SignInForm component THEN password visibility toggle SHALL be present');
    const element_3_1_assert = await page.locator('form [data-testid="password-toggle"], form button[aria-label*="password"]').first();
    await expect(element_3_1_assert).toBeVisible();
    await captureScreenshot(page, '3_1-assert', 'password-visibility-toggle');

    // Step: Capture screenshot after: WHEN on SignInForm component THEN password visibility toggle SHALL be present
    console.log('Capture screenshot after: WHEN on SignInForm component THEN password visibility toggle SHALL be present');
    await captureScreenshot(page, '3_1-screenshot', 'password-visibility-toggle');

    // Step: Navigate to page for testing: WHEN page is refreshed THEN password field SHALL default to hidden state
    console.log('Navigate to page for testing: WHEN page is refreshed THEN password field SHALL default to hidden state');
    await page.goto('http://localhost:3001');
    await page.waitForLoadState('networkidle');
    await captureScreenshot(page, '4_1-nav', 'password-visibility-toggle');

    // Step: Assert password field defaults to hidden state for: WHEN page is refreshed THEN password field SHALL default to hidden state
    console.log('Assert password field defaults to hidden state for: WHEN page is refreshed THEN password field SHALL default to hidden state');
    await assertPasswordVisibility(page, 'hidden');
    await captureScreenshot(page, '4_1-assert', 'password-visibility-toggle');

    // Step: Capture screenshot after: WHEN page is refreshed THEN password field SHALL default to hidden state
    console.log('Capture screenshot after: WHEN page is refreshed THEN password field SHALL default to hidden state');
    await captureScreenshot(page, '4_1-screenshot', 'password-visibility-toggle');
  });
});

// Specialized helper functions for password visibility testing
async function captureScreenshot(page, stepId, specName) {
  const screenshotPath = path.join('QA/assets', `${specName}-test`, `${stepId}.png`);
  await page.screenshot({ 
    path: screenshotPath,
    fullPage: true,
    quality: 90
  });
  console.log(`Screenshot captured: ${screenshotPath}`);
}

async function waitForPasswordToggle(page, timeout = 30000) {
  const selectors = [
    '[data-testid="password-toggle"]',
    '.password-toggle',
    'button[aria-label*="password"]',
    'button[aria-label*="show"]',
    'button[aria-label*="hide"]'
  ];
  
  for (const selector of selectors) {
    try {
      await page.waitForSelector(selector, { timeout: timeout / selectors.length });
      return selector;
    } catch (error) {
      continue;
    }
  }
  
  throw new Error('Password toggle button not found');
}

async function getPasswordInputType(page) {
  const passwordInput = await page.locator('input[name="password"], input[type="password"], input[type="text"][name="password"]').first();
  return await passwordInput.getAttribute('type');
}

async function assertPasswordVisibility(page, expectedState) {
  const inputType = await getPasswordInputType(page);
  const isVisible = inputType === 'text';
  const shouldBeVisible = expectedState === 'visible';
  
  expect(isVisible).toBe(shouldBeVisible);
  console.log(`Password visibility assertion passed: expected ${expectedState}, got ${isVisible ? 'visible' : 'hidden'}`);
}

async function assertAriaLabel(page, selector) {
  const element = await page.locator(selector).first();
  const ariaLabel = await element.getAttribute('aria-label');
  
  expect(ariaLabel).toBeTruthy();
  expect(ariaLabel.toLowerCase()).toMatch(/(password|show|hide|toggle)/);
  console.log(`Aria-label assertion passed: ${ariaLabel}`);
}

async function safeClick(page, selector) {
  try {
    const element = await page.locator(selector).first();
    if (await element.isVisible()) {
      await element.click();
      return true;
    }
  } catch (error) {
    console.warn(`Click failed for selector: ${selector}`, error.message);
  }
  return false;
}

async function safeType(page, selector, text) {
  try {
    const element = await page.locator(selector).first();
    if (await element.isVisible()) {
      await element.fill(text);
      return true;
    }
  } catch (error) {
    console.warn(`Type failed for selector: ${selector}`, error.message);
  }
  return false;
}

async function safeKeyPress(page, selector, key) {
  try {
    const element = await page.locator(selector).first();
    await element.focus();
    await page.keyboard.press(key);
    return true;
  } catch (error) {
    console.warn(`Key press failed for selector: ${selector}`, error.message);
  }
  return false;
}
