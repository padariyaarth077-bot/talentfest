import { chromium } from 'playwright';
import { spawn } from 'child_process';
import { createClient } from '@supabase/supabase-js';
import { createRequire } from 'module';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

const require = createRequire(import.meta.url);
// Override to avoid WebSocket requirement in Node 20
process.env.SUPABASE_URL = process.env.SUPABASE_URL || '';
process.env.VITE_SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
process.env.VITE_SUPABASE_PUBLISHABLE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';
process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL || '';
const ADMIN_PASS = process.env.E2E_ADMIN_PASS || '';
const BASE_URL = 'http://127.0.0.1:5173';
const TIMESTAMP = Date.now();
const UNIQUE = `E2E${TIMESTAMP}`;
const TEST_PHONE = `+9199999${String(TIMESTAMP).slice(-5)}`;
const TEST_EMAIL = `e2e.test.${TIMESTAMP}@telentfest.test`;
const TEST_PHONE_VISITOR = `+9188888${String(TIMESTAMP).slice(-5)}`;
const TEST_EMAIL_VISITOR = `e2e.visitor.${TIMESTAMP}@telentfest.test`;

const RESULTS = { passed: [], failed: [], fixed: [], blocked: [], errors: [] };
let browser, page, context, supabase;
let participantRegId, participantPassId;
let visitorRegId, visitorPassId;
let awardRegId;

// Override fetch to use apikey header format compatible with new Supabase keys
function createSupabaseClient() {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  const customFetch = async (input, init) => {
    const headers = new Headers(init?.headers);
    if (headers.get('Authorization')?.startsWith('Bearer sb_')) {
      headers.delete('Authorization');
    }
    headers.set('apikey', key);
    return fetch(input, { ...init, headers });
  };
  return createClient(url, key, {
    global: { fetch: customFetch },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function pass(name) { RESULTS.passed.push(name); console.log(`  ✅ PASS: ${name}`); }
function fail(name, msg) { RESULTS.failed.push({ name, msg }); console.log(`  ❌ FAIL: ${name} — ${msg}`); }

async function waitForServer(url, maxRetries = 30) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const res = await fetch(url);
      if (res.ok) return true;
    } catch {}
    await new Promise(r => setTimeout(r, 2000));
  }
  return false;
}

async function screenshot(name) {
  try {
    await page.screenshot({ path: `e2e-screenshots/${name}-${TIMESTAMP}.png`, fullPage: true });
  } catch {}
}

async function dbQuery(table, select, filters = {}) {
  let query = supabase.from(table).select(select);
  for (const [key, value] of Object.entries(filters)) {
    query = query.eq(key, value);
  }
  const { data, error } = await query;
  if (error) throw new Error(`DB query ${table}: ${error.message}`);
  return data;
}

async function dbInsert(table, payload) {
  const { data, error } = await supabase.from(table).insert(payload).select().single();
  if (error) throw new Error(`DB insert ${table}: ${error.message}`);
  return data;
}

// ────────────────────────────────────────────────────
// SECTION 0: Setup
// ────────────────────────────────────────────────────
async function setup() {
  console.log('\n═══ SETUP ═══');
  
  // Create screenshots dir
  try { fs.mkdirSync('e2e-screenshots'); } catch {}
  
  // Kill any existing vite
  try {
    if (process.platform === 'win32') {
      require('child_process').execSync('taskkill /F /IM node.exe /FI "WINDOWTITLE eq vite*" 2>nul', { stdio: 'ignore' });
    }
  } catch {}
  
  // Start dev server
  console.log('  Starting dev server...');
  const server = spawn('npx', ['vite', 'dev', '--port', '5173', '--host', '127.0.0.1', '--force'], {
    cwd: process.cwd(),
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: true,
  });
  server.stdout.on('data', (d) => {});
  server.stderr.on('data', (d) => {});
  
  const started = await waitForServer(BASE_URL);
  if (!started) {
    fail('Server Start', 'Dev server did not start');
    process.exit(1);
  }
  console.log('  ✅ Dev server running');
  
  // Setup Supabase client
  supabase = createSupabaseClient();
  console.log('  ✅ Supabase client ready');
  
  // Launch browser
  browser = await chromium.launch({ headless: true });
  context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  page = await context.newPage();
  page.on('pageerror', (err) => RESULTS.errors.push({ type: 'pageerror', msg: err.message }));
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      RESULTS.errors.push({ type: 'console.error', msg: msg.text(), url: msg.location()?.url });
    }
  });
  page.on('response', (res) => {
    if (res.status() >= 400) {
      RESULTS.errors.push({ type: 'http_error', url: res.url(), status: res.status() });
    }
  });
  console.log('  ✅ Browser launched');
  return server;
}

// ────────────────────────────────────────────────────
// SECTION 2: Admin Login Test
// ────────────────────────────────────────────────────
async function testAdminLogin() {
  console.log('\n═══ ADMIN LOGIN ═══');
  
  // Test invalid credentials first
  await page.goto(`${BASE_URL}/admin/login`);
  await page.waitForSelector('input[type="email"]');
  await page.fill('input[type="email"]', 'wrong@test.com');
  await page.fill('input[type="password"]', 'wrongpass');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(2000);
  
  const errorVisible = await page.isVisible('text=not authorized') || await page.isVisible('text=Invalid login');
  if (errorVisible) pass('Invalid credentials rejected');
  else fail('Invalid credentials rejected', 'No error shown for bad login');
  await screenshot('admin-login-fail');
  
  // Valid login
  await page.goto(`${BASE_URL}/admin/login`);
  await page.waitForSelector('input[type="email"]');
  await page.fill('input[type="email"]', ADMIN_EMAIL);
  await page.fill('input[type="password"]', ADMIN_PASS);
  await page.click('button[type="submit"]');
  
  // Wait for redirect to /admin
  try {
    await page.waitForURL('**/admin', { timeout: 10000 });
    pass('Valid admin login succeeds');
  } catch {
    fail('Valid admin login succeeds', 'Did not redirect to /admin after login');
    await screenshot('admin-login-success');
    return false;
  }
  
  // Check admin panel loaded
  await page.waitForTimeout(2000);
  const dashboardVisible = await page.isVisible('text=Dashboard') || await page.isVisible('text=Passes') || await page.isVisible('text=Admin');
  if (dashboardVisible) pass('Admin dashboard visible');
  else fail('Admin dashboard visible', 'No dashboard content found');
  
  // Check user_roles
  try {
    const roles = await dbQuery('user_roles', '*', { user_id: '3393eb94-590c-46b1-b67b-202fe5f219e3', role: 'admin' });
    if (roles.length > 0) pass('Admin user_roles row exists');
    else fail('Admin user_roles row exists', 'No matching user_roles row');
  } catch (e) {
    fail('Admin user_roles row exists', e.message);
  }
  
  // Test session persistence
  await page.reload();
  await page.waitForTimeout(2000);
  const stillAdmin = await page.isVisible('text=Dashboard') || page.url().includes('/admin');
  if (stillAdmin) pass('Admin session survives refresh');
  else fail('Admin session survives refresh', 'Not on admin after refresh');
  
  return true;
}

// ────────────────────────────────────────────────────
// SECTION 3 & 6: Participant + Visitor Registration
// ────────────────────────────────────────────────────
async function testParticipantRegistration() {
  console.log('\n═══ PARTICIPANT REGISTRATION ═══');
  
  await page.goto(`${BASE_URL}/entry-pass`);
  await page.waitForTimeout(2000);
  
  // Ensure participant tab is selected
  const participantTab = page.locator('button:has-text("PARTICIPANT PASS")');
  await participantTab.click();
  await page.waitForTimeout(1000);
  
  // Fill form
  await page.fill('input[placeholder="First"]', 'E2E');
  await page.fill('input[placeholder="Middle (optional)"]', 'TEST');
  await page.fill('input[placeholder="Last"]', 'PARTICIPANT');
  
  // Phone: remove +91 prefix fill
  const phoneInput = page.locator('input[placeholder="9876543210"]').first();
  await phoneInput.fill(TEST_PHONE.replace('+91', ''));
  
  await page.fill('input[type="email"]', TEST_EMAIL);
  
  // Aadhaar: 12 digits
  const aadhaar = '111122223333';
  const aadhaarInput = page.locator('input[placeholder="1234 5678 9012"]');
  await aadhaarInput.fill(aadhaar);
  
  // Aadhaar consent
  const consentCheckbox = page.locator('input[type="checkbox"]').last();
  await consentCheckbox.check();
  
  // Select event
  const eventSelect = page.locator('select').first();
  await eventSelect.selectOption({ index: 1 }); // First real event
  await page.waitForTimeout(2000);
  
  // Check event details loaded
  const eventDetails = await page.isVisible('text=Talent Fest') || await page.isVisible('text=Rs.');
  if (eventDetails) pass('Event details load after selection');
  else fail('Event details load after selection', 'No event details visible');
  
  // Select activity category - wait for it to load
  await page.waitForTimeout(1000);
  const categorySelect = page.locator('select').last();
  const catOptions = await categorySelect.locator('option').all();
  if (catOptions.length > 1) {
    await categorySelect.selectOption({ index: 1 });
    pass('Activity categories load');
  } else {
    fail('Activity categories load', 'No category options available');
    await screenshot('participant-no-categories');
  }
  
  // Submit
  await page.click('button:has-text("Continue to Checkout")');
  
  // Wait for redirect to checkout
  try {
    await page.waitForURL('**/checkout**', { timeout: 15000 });
    pass('Participant registration submitted, redirected to checkout');
  } catch {
    const errorText = await page.textContent('body');
    fail('Participant registration submitted', `Did not redirect to checkout. Page: ${errorText.slice(0, 200)}`);
    await screenshot('participant-reg-fail');
    return null;
  }
  
  // Get regId from URL
  const url = page.url();
  const regIdMatch = url.match(/regId=([^&]+)/);
  if (!regIdMatch) {
    fail('Registration ID in URL', 'No regId found in checkout URL');
    await screenshot('participant-no-regid');
    return null;
  }
  participantRegId = regIdMatch[1];
  console.log(`  Participant Registration ID: ${participantRegId}`);
  pass('Registration ID present in checkout URL');
  
  // Verify checkout page loaded correctly
  await page.waitForTimeout(2000);
  const checkoutContent = await page.isVisible('text=Review Your');
  if (checkoutContent) pass('Checkout page loads correctly');
  else fail('Checkout page loads correctly', 'No checkout content');
  await screenshot('participant-checkout');
  
  return participantRegId;
}

// ────────────────────────────────────────────────────
// SECTION 8: Payment Flow
// ────────────────────────────────────────────────────
async function testPayment() {
  console.log('\n═══ PAYMENT ═══');
  
  if (!participantRegId) {
    fail('Payment flow', 'No registration ID available');
    return false;
  }
  
  // Navigate to payment
  await page.goto(`${BASE_URL}/payment?regId=${participantRegId}&amount=299`);
  await page.waitForTimeout(3000);
  
  // Check test payment mode
  const testMode = await page.isVisible('text=Test Payment Mode');
  if (testMode) pass('Payment page shows test mode');
  else fail('Payment page shows test mode', 'No test mode indicator');
  
  await screenshot('payment-ready');
  
  // Click pay button
  const payButton = page.locator('button:has-text("Pay")').first();
  if (await payButton.isVisible()) {
    await payButton.click();
  } else {
    // Try "Complete Payment" or primary action button
    const anyPay = page.locator('button').filter({ hasText: /Pay|Complete|Submit/ }).first();
    await anyPay.click();
  }
  
  // Wait for success
  try {
    await page.waitForURL('**/thank-you**', { timeout: 20000 });
    pass('Payment successful, redirected to thank-you page');
  } catch {
    const currentUrl = page.url();
    const pageContent = await page.textContent('body');
    fail('Payment successful', `Not on thank-you. URL: ${currentUrl}, Content: ${pageContent.slice(0, 300)}`);
    await screenshot('payment-fail');
    return false;
  }
  
  await page.waitForTimeout(2000);
  
  // Verify thank-you page shows passes
  const passesVisible = await page.isVisible('text=Pass') || await page.isVisible('text=pass') || await page.isVisible('text=Download');
  if (passesVisible) pass('Thank-you page shows passes');
  else fail('Thank-you page shows passes', 'No pass content');
  await screenshot('payment-thankyou');
  
  return true;
}

// ────────────────────────────────────────────────────
// SECTION 3 (cont): Verify Database Records
// ────────────────────────────────────────────────────
async function verifyDatabaseRecords() {
  console.log('\n═══ DATABASE VERIFICATION ═══');
  
  // Check registration
  try {
    const regs = await dbQuery('registrations', '*', { id: participantRegId });
    if (regs.length === 0) {
      fail('Registration in database', 'No registration record found');
      return;
    }
    const reg = regs[0];
    console.log(`  Registration: ${reg.registration_number} | ${reg.full_name} | ${reg.registration_type} | ${reg.payment_status}`);
    
    // Verify fields
    const checks = [
      ['first_name', reg.first_name === 'E2E'],
      ['middle_name', reg.middle_name === 'TEST'],
      ['last_name', reg.last_name === 'PARTICIPANT'],
      ['full_name', reg.full_name === 'E2E TEST PARTICIPANT'],
      ['phone', reg.phone === TEST_PHONE],
      ['email', reg.email === TEST_EMAIL],
      ['registration_type', reg.registration_type === 'participant'],
      ['payment_status', reg.payment_status === 'paid'],
      ['registration_status', reg.registration_status === 'confirmed'],
      ['aadhaar_last_four', reg.aadhaar_last_four === '3333'],
    ];
    for (const [field, ok] of checks) {
      if (ok) pass(`Registration field: ${field}`);
      else fail(`Registration field: ${field}`, `Value: ${JSON.stringify(reg[field])}`);
    }
  } catch (e) {
    fail('Registration in database', e.message);
    return;
  }
  
  // Check payments
  try {
    const payments = await dbQuery('payments', '*', { registration_id: participantRegId });
    if (payments.length > 0) {
      const pmt = payments[0];
      pass('Payment record exists');
      const pmtChecks = [
        ['status', pmt.status === 'paid'],
        ['provider', pmt.provider === 'dummy'],
        ['amount', Number(pmt.amount) > 0],
        ['order_id', !!pmt.order_id],
        ['transaction_id', !!pmt.transaction_id],
      ];
      for (const [field, ok] of pmtChecks) {
        if (ok) pass(`Payment field: ${field}`);
        else fail(`Payment field: ${field}`, JSON.stringify(pmt[field]));
      }
    } else {
      fail('Payment record exists', 'No payment found');
    }
  } catch (e) {
    fail('Payment records', e.message);
  }
  
  // Check passes
  try {
    const passes = await dbQuery('passes', '*', { registration_id: participantRegId });
    if (passes.length > 0) {
      pass('Passes created');
      participantPassId = passes[0].id;
      const pChecks = [
        ['pass_type', passes.some(p => p.pass_type === 'participant')],
        ['status', passes.every(p => p.status === 'active')],
        ['pass_number', passes.some(p => !!p.pass_number)],
        ['secure_qr_token', passes.some(p => !!p.secure_qr_token)],
      ];
      for (const [field, ok] of pChecks) {
        if (ok) pass(`Pass field: ${field}`);
        else fail(`Pass field: ${field}`, JSON.stringify(passes.map(p => p[field])));
      }
    } else {
      fail('Passes created', 'No passes found');
    }
  } catch (e) {
    fail('Passes', e.message);
  }
  
  // Check guests if applicable
  
  // Check relationship
  try {
    const regCheck = await dbQuery('registrations', 'id', { id: participantRegId });
    const payCheck = await dbQuery('payments', 'registration_id', { registration_id: participantRegId });
    if (payCheck.length > 0 && payCheck[0].registration_id === regCheck[0].id) {
      pass('Payment links to registration');
    } else {
      fail('Payment links to registration', 'Mismatch');
    }
  } catch (e) {
    fail('Relationship check', e.message);
  }
}

// ────────────────────────────────────────────────────
// SECTION 4 & 5: Admin Modal + Participants Page
// ────────────────────────────────────────────────────
async function testAdminModal() {
  console.log('\n═══ ADMIN MODAL VERIFICATION ═══');
  
  // We should already be logged in as admin
  await page.goto(`${BASE_URL}/admin`);
  await page.waitForTimeout(3000);
  
  // Navigate to Passes section
  const passesTab = page.locator('text=Passes').first();
  if (await passesTab.isVisible()) {
    await passesTab.click();
    await page.waitForTimeout(2000);
  }
  
  // Search by registration number or name
  const searchInput = page.locator('input[placeholder*="Search"]').first();
  if (await searchInput.isVisible()) {
    await searchInput.fill('E2E TEST PARTICIPANT');
    await page.waitForTimeout(2000);
  }
  await screenshot('admin-search');
  
  // Click on the matching entry
  const entry = page.locator('text=E2E TEST PARTICIPANT').first();
  if (await entry.isVisible()) {
    await entry.click();
    await page.waitForTimeout(2000);
    pass('Admin modal opens for participant');
  } else {
    fail('Admin modal opens for participant', 'Could not find participant in admin list');
    await screenshot('admin-no-entry');
    return;
  }
  
  // Check modal values
  await screenshot('admin-modal');
  
  // Check for fallback text
  const modalContent = await page.textContent('body');
  const fallbackValues = ['N/A', 'Unknown', 'New Registration', 'Legacy', 'Not tracked', 'Not available'];
  let hasFallback = false;
  for (const fb of fallbackValues) {
    if (modalContent.includes(fb)) {
      hasFallback = true;
      console.log(`  ⚠️ Found fallback value: "${fb}"`);
    }
  }
  if (hasFallback) fail('Admin modal shows real data', 'Fallback values found in modal');
  else pass('Admin modal shows real data');
  
  // Check specific fields
  const fieldChecks = [
    ['Participant name', 'E2E TEST PARTICIPANT'],
    ['Payment status', 'paid'],
    ['Pass status', 'active'],
  ];
  for (const [name, value] of fieldChecks) {
    if (modalContent.includes(value)) pass(`Modal has: ${name}`);
    else fail(`Modal has: ${name}`, `"${value}" not found`);
  }
}

// ────────────────────────────────────────────────────
// SECTION 5: Participants Admin Page
// ────────────────────────────────────────────────────
async function testParticipantsPage() {
  console.log('\n═══ PARTICIPANTS PAGE ═══');
  
  await page.goto(`${BASE_URL}/admin`);
  await page.waitForTimeout(2000);
  
  // Navigate to Participants tab
  const participantsTab = page.locator('text=Participants').first();
  if (await participantsTab.isVisible()) {
    await participantsTab.click();
    await page.waitForTimeout(2000);
  }
  await screenshot('participants-page');
  
  // Search for our participant
  const searchInput = page.locator('input[placeholder*="Search"]').first();
  if (await searchInput.isVisible()) {
    await searchInput.fill('E2E TEST PARTICIPANT');
    await page.waitForTimeout(2000);
  }
  
  const found = await page.isVisible('text=E2E TEST PARTICIPANT');
  if (found) pass('Participant appears in Participants page');
  else fail('Participant appears in Participants page', 'Not found');
}

// ────────────────────────────────────────────────────
// SECTION 6: Visitor Registration
// ────────────────────────────────────────────────────
async function testVisitorRegistration() {
  console.log('\n═══ VISITOR REGISTRATION ═══');
  
  await page.goto(`${BASE_URL}/entry-pass`);
  await page.waitForTimeout(2000);
  
  // Click VISITOR tab
  const visitorTab = page.locator('button:has-text("VISITOR ENTRY PASS")');
  await visitorTab.click();
  await page.waitForTimeout(2000);
  
  // Fill form
  const nameInput = page.locator('input[placeholder*="full name"]').first();
  if (!await nameInput.isVisible()) {
    fail('Visitor form visible', 'Could not find visitor form');
    return null;
  }
  
  await nameInput.fill('E2E VISITOR');
  
  const phoneInputs = page.locator('input[placeholder="9876543210"]');
  await phoneInputs.last().fill(TEST_PHONE_VISITOR.replace('+91', ''));
  
  const emailInput = page.locator('input[type="email"]');
  await emailInput.fill(TEST_EMAIL_VISITOR);
  
  // Aadhaar
  const aadhaarInput = page.locator('input[placeholder*="Aadhaar"]');
  if (await aadhaarInput.isVisible()) {
    await aadhaarInput.fill('444455556666');
  }
  
  // Consent
  const consentCheck = page.locator('input[type="checkbox"]').last();
  await consentCheck.check();
  
  // Select event
  const eventSelect = page.locator('select').first();
  await eventSelect.selectOption({ index: 1 });
  await page.waitForTimeout(1000);
  
  // Submit
  await page.click('button:has-text("Continue to Checkout")');
  
  try {
    await page.waitForURL('**/checkout**', { timeout: 15000 });
    pass('Visitor registration submitted');
  } catch {
    fail('Visitor registration submitted', 'Did not redirect to checkout');
    await screenshot('visitor-reg-fail');
    return null;
  }
  
  const url = page.url();
  const regIdMatch = url.match(/regId=([^&]+)/);
  if (regIdMatch) {
    visitorRegId = regIdMatch[1];
    console.log(`  Visitor Registration ID: ${visitorRegId}`);
    pass('Visitor registration ID obtained');
  } else {
    fail('Visitor registration ID obtained', 'No regId in URL');
    return null;
  }
  
  // Process payment
  await page.goto(`${BASE_URL}/payment?regId=${visitorRegId}&amount=199`);
  await page.waitForTimeout(2000);
  
  const payBtn = page.locator('button').filter({ hasText: /Pay|Complete|Submit/ }).first();
  if (await payBtn.isVisible()) {
    await payBtn.click();
    try {
      await page.waitForURL('**/thank-you**', { timeout: 20000 });
      pass('Visitor payment successful');
    } catch {
      fail('Visitor payment successful', 'Did not redirect to thank-you');
      await screenshot('visitor-payment-fail');
    }
  }
  
  return visitorRegId;
}

// ────────────────────────────────────────────────────
// SECTION 9: QR and Check-in
// ────────────────────────────────────────────────────
async function testQRCheckIn() {
  console.log('\n═══ QR & CHECK-IN ═══');
  
  // Get the secure QR token from DB
  try {
    const passes = await dbQuery('passes', 'secure_qr_token, id, pass_number', { registration_id: participantRegId, pass_type: 'participant' });
    if (passes.length === 0 || !passes[0].secure_qr_token) {
      fail('QR token available', 'No secure_qr_token found');
      return;
    }
    
    const token = passes[0].secure_qr_token;
    const passId = passes[0].id;
    console.log(`  QR Token: ${token}`);
    pass('Secure QR token exists in database');
    
    // Open verify-pass route
    await page.goto(`${BASE_URL}/verify-pass/${token}`);
    await page.waitForTimeout(3000);
    await screenshot('verify-pass');
    
    const verifyContent = await page.textContent('body');
    if (verifyContent.includes('E2E TEST PARTICIPANT') || verifyContent.includes('VALID') || verifyContent.includes('valid')) {
      pass('QR token verification displays correct record');
    } else {
      fail('QR token verification displays correct record', 'Content does not match expected');
    }
    
  } catch (e) {
    fail('QR token verification', e.message);
  }
}

// ────────────────────────────────────────────────────
// SECTION 10: Employee Award Ceremony
// ────────────────────────────────────────────────────
async function testEmployeeAward() {
  console.log('\n═══ EMPLOYEE AWARD ═══');
  
  await page.goto(`${BASE_URL}/employee-award-ceremony-2026`);
  await page.waitForTimeout(2000);
  
  // Fill form
  const fillField = async (label, value) => {
    const input = page.locator(`input[placeholder*="${label}"], input[aria-label*="${label}"]`).first();
    if (await input.isVisible()) await input.fill(value);
  };
  
  // Fill basic fields
  const inputs = page.locator('input');
  const inputCount = await inputs.count();
  
  // Fill company name
  await page.locator('input').nth(0).fill('E2E TEST COMPANY');
  await page.locator('input').nth(1).fill('E2E TEST ADDRESS');
  await page.locator('input').nth(2).fill('E2E COORDINATOR');
  // Phone
  const phoneInputs = page.locator('input[inputmode="numeric"]');
  if (await phoneInputs.count() > 0) await phoneInputs.nth(0).fill('9876543210');
  
  // Email
  const emailInputs = page.locator('input[type="email"]');
  if (await emailInputs.count() > 0) await emailInputs.nth(0).fill(`e2e.award.${TIMESTAMP}@test.com`);
  
  // Employee name
  await page.locator('input').nth(6).fill('E2E EMPLOYEE');
  
  // Award category selection
  const awardCheckbox = page.locator('text=Best Employee Award').first();
  if (await awardCheckbox.isVisible()) {
    await awardCheckbox.click();
    pass('Award category selectable');
  }
  
  // Declaration
  const declarationCheck = page.locator('input[type="checkbox"]').last();
  if (await declarationCheck.isVisible()) {
    await declarationCheck.check();
  }
  
  // Signature
  const sigInputs = page.locator('input').filter({ has: page.locator('[value=""]') });
  // Just submit and see what happens
  await screenshot('award-form');
  
  // Submit
  const submitBtn = page.locator('button[type="submit"]');
  if (await submitBtn.isVisible()) {
    await submitBtn.click();
    await page.waitForTimeout(3000);
    pass('Employee award form submitted');
  } else {
    fail('Employee award form submitted', 'No submit button');
  }
  
  // Check DB
  try {
    const awards = await dbQuery('employee_award_registrations', '*', { company_name: 'E2E TEST COMPANY' });
    if (awards.length > 0) {
      awardRegId = awards[0].id;
      pass('Employee award registration in database');
      console.log(`  Award ID: ${awardRegId}`);
    } else {
      fail('Employee award registration in database', 'No matching record');
    }
  } catch (e) {
    fail('Employee award DB check', e.message);
  }
}

// ────────────────────────────────────────────────────
// SECTION 11: Event Management
// ────────────────────────────────────────────────────
async function testEventManagement() {
  console.log('\n═══ EVENT MANAGEMENT ═══');
  
  await page.goto(`${BASE_URL}/admin`);
  await page.waitForTimeout(2000);
  
  const eventsTab = page.locator('text=Events').first();
  if (await eventsTab.isVisible()) {
    await eventsTab.click();
    await page.waitForTimeout(2000);
    pass('Events admin page accessible');
    await screenshot('admin-events');
  } else {
    fail('Events admin page accessible', 'Events tab not found');
  }
}

// ────────────────────────────────────────────────────
// SECTION 12: Concert Info
// ────────────────────────────────────────────────────
async function testConcertInfo() {
  console.log('\n═══ CONCERT INFO ═══');
  
  await page.goto(`${BASE_URL}/admin`);
  await page.waitForTimeout(2000);
  
  const concertTab = page.locator('text=Concert').first();
  if (await concertTab.isVisible()) {
    await concertTab.click();
    await page.waitForTimeout(2000);
    pass('Concert admin page accessible');
    await screenshot('admin-concert');
  } else {
    fail('Concert admin page accessible', 'Concert tab not found');
  }
}

// ────────────────────────────────────────────────────
// SECTION 13: Dashboard Counts
// ────────────────────────────────────────────────────
async function testDashboardCounts() {
  console.log('\n═══ DASHBOARD COUNTS ═══');
  
  await page.goto(`${BASE_URL}/admin`);
  await page.waitForTimeout(3000);
  
  const dashboardTab = page.locator('text=Dashboard').first();
  if (await dashboardTab.isVisible()) {
    await dashboardTab.click();
    await page.waitForTimeout(2000);
  }
  await screenshot('admin-dashboard');
  
  // Get DB counts
  try {
    const totalRegs = (await dbQuery('registrations', 'id', {}))?.length || 0;
    const totalPasses = (await dbQuery('passes', 'id', { status: 'active' }))?.length || 0;
    const totalPaid = (await dbQuery('registrations', 'id', { payment_status: 'paid' }))?.length || 0;
    
    console.log(`  DB: ${totalRegs} registrations, ${totalPasses} active passes, ${totalPaid} paid`);
    pass('Dashboard DB query works');
  } catch (e) {
    fail('Dashboard counts', e.message);
  }
}

// ────────────────────────────────────────────────────
// SECTION 15: Storage Test
// ────────────────────────────────────────────────────
async function testStorage() {
  console.log('\n═══ STORAGE ═══');
  
  try {
    const { data: buckets } = await supabase.storage.listBuckets();
    const bucketNames = buckets.map(b => b.name);
    console.log(`  Buckets: ${bucketNames.join(', ')}`);
    if (bucketNames.includes('event-images')) pass('event-images bucket exists');
    else fail('event-images bucket exists', 'Bucket not found');
  } catch (e) {
    fail('Storage test', e.message);
  }
}

// ────────────────────────────────────────────────────
// SECTION 14: Schema Audit
// ────────────────────────────────────────────────────
async function testSchemaAudit() {
  console.log('\n═══ SCHEMA AUDIT ═══');
  
  const tablesToCheck = ['registrations', 'payments', 'passes', 'guests', 'events', 'employee_award_registrations', 'concert_settings', 'concert_artists', 'check_in_logs', 'contact_messages', 'user_roles', 'event_activity_categories', 'activity_categories'];
  
  for (const table of tablesToCheck) {
    try {
      const { data, error } = await supabase.from(table).select('*').limit(1);
      if (!error) pass(`Table exists: ${table}`);
      else fail(`Table exists: ${table}`, error.message);
    } catch (e) {
      fail(`Table exists: ${table}`, e.message);
    }
  }
}

// ────────────────────────────────────────────────────
// SECTION 16: Cleanup
// ────────────────────────────────────────────────────
async function cleanup(server) {
  console.log('\n═══ CLEANUP ═══');
  
  // Clean up test records
  try {
    if (participantRegId) {
      await supabase.from('passes').delete().eq('registration_id', participantRegId);
      await supabase.from('payments').delete().eq('registration_id', participantRegId);
      await supabase.from('guests').delete().eq('registration_id', participantRegId);
      await supabase.from('registrations').delete().eq('id', participantRegId);
    }
    if (visitorRegId) {
      await supabase.from('passes').delete().eq('registration_id', visitorRegId);
      await supabase.from('payments').delete().eq('registration_id', visitorRegId);
      await supabase.from('registrations').delete().eq('id', visitorRegId);
    }
    if (awardRegId) {
      await supabase.from('employee_award_registrations').delete().eq('id', awardRegId);
    }
    console.log('  ✅ Test records cleaned up');
  } catch (e) {
    console.log(`  ⚠️ Cleanup issue: ${e.message}`);
  }
  
  if (browser) await browser.close();
  if (server) server.kill();
}

// ────────────────────────────────────────────────────
// MAIN
// ────────────────────────────────────────────────────
async function main() {
  console.log('═══════════════════════════════════════════════════');
  console.log('  TELENT FEST E2E TEST SUITE');
  console.log(`  Timestamp: ${new Date().toISOString()}`);
  console.log('═══════════════════════════════════════════════════');
  
  const server = await setup();
  
  try {
    const adminOk = await testAdminLogin();
    if (!adminOk) {
      fail('Subsequent tests', 'Admin login required for admin tests');
    }
    
    // Create a fresh event with proper data for testing
    // First check available events
    const events = await dbQuery('events', 'id, name');
    
    await testParticipantRegistration();
    
    if (participantRegId) {
      await testPayment();
      await verifyDatabaseRecords();
      if (adminOk) {
        await testAdminModal();
        await testParticipantsPage();
      }
      await testQRCheckIn();
    }
    
    await testVisitorRegistration();
    await testEmployeeAward();
    await testEventManagement();
    await testConcertInfo();
    await testDashboardCounts();
    await testStorage();
    await testSchemaAudit();
    
  } catch (e) {
    fail('Test suite error', e.message);
    console.error(e);
  } finally {
    await cleanup(server);
  }
  
  // Report
  console.log('\n═══════════════════════════════════════════════════');
  console.log('  FINAL TEST REPORT');
  console.log('═══════════════════════════════════════════════════');
  console.log(`  PASSED: ${RESULTS.passed.length}`);
  console.log(`  FAILED: ${RESULTS.failed.length}`);
  console.log(`  ERRORS: ${RESULTS.errors.length}`);
  console.log('');
  
  if (RESULTS.failed.length > 0) {
    console.log('  FAILED ITEMS:');
    for (const f of RESULTS.failed) {
      console.log(`    ❌ ${f.name}: ${f.msg}`);
    }
  }
  
  if (RESULTS.errors.length > 0) {
    console.log('  CONSOLE/NETWORK ERRORS:');
    const unique = new Set(RESULTS.errors.map(e => `${e.type}:${e.msg?.slice(0,200)}`));
    for (const errMsg of unique) {
      console.log(`    ⚠️  ${errMsg}`);
    }
  }
  
  console.log(`\n  ${RESULTS.failed.length === 0 ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);
  
  // Write results JSON
  fs.writeFileSync(`e2e-results-${TIMESTAMP}.json`, JSON.stringify({
    timestamp: new Date().toISOString(),
    passed: RESULTS.passed,
    failed: RESULTS.failed,
    errors: RESULTS.errors.slice(0, 50),
    participantRegId,
    visitorRegId,
    awardRegId,
  }, null, 2));
  
  process.exit(RESULTS.failed.length > 0 ? 1 : 0);
}

main();
