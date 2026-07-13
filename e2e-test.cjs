const { chromium } = require('playwright');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
// Provide WebSocket for Node 20 compatibility
try { global.WebSocket = require('ws'); } catch {};

process.env.VITE_SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
process.env.VITE_SUPABASE_PUBLISHABLE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';
process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL || '';
const ADMIN_PASS = process.env.E2E_ADMIN_PASS || '';
const BASE_URL = 'http://127.0.0.1:8080';
const TIMESTAMP = Date.now();
const TEST_PHONE = `+9199999${String(TIMESTAMP).slice(-5)}`;
const TEST_EMAIL = `e2e.test.${TIMESTAMP}@telentfest.test`;
const TEST_PHONE_VISITOR = `+9188888${String(TIMESTAMP).slice(-5)}`;
const TEST_EMAIL_VISITOR = `e2e.visitor.${TIMESTAMP}@telentfest.test`;

const RESULTS = { passed: [], failed: [], fixed: [], blocked: [], errors: [] };
let browser, page, context, supabase;
let participantRegId, visitorRegId, awardRegId;

const SVC_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function makeSupabase() {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
  const key = SVC_KEY;
  const customFetch = async (input, init) => {
    const headers = new Headers(init?.headers);
    if (headers.get('Authorization') && headers.get('Authorization').startsWith('Bearer sb_')) {
      headers.delete('Authorization');
    }
    headers.set('apikey', key);
    return fetch(input, { ...init, headers });
  };
  // Disable realtime to avoid WebSocket requirement in Node 20
  process.env.SUPABASE_REALTIME_DISABLED = 'true';
  return createClient(url, key, {
    global: { fetch: customFetch },
    auth: { persistSession: false, autoRefreshToken: false },
    realtime: { enabled: false },
  });
}

function pass(name) { RESULTS.passed.push(name); console.log(`  ✅ PASS: ${name}`); }
function fail(name, msg) { RESULTS.failed.push({ name, msg }); console.log(`  ❌ FAIL: ${name} — ${msg}`); }

async function screenshot(name) {
  try { if (page) await page.screenshot({ path: `e2e-shots/${name}-${TIMESTAMP}.png`, fullPage: true }); } catch {}
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function waitForServer(url, maxRetries = 40) {
  for (let i = 0; i < maxRetries; i++) {
    try { const r = await fetch(url); if (r.ok) return true; } catch {}
    await sleep(3000);
  }
  return false;
}

async function dbQuery(table, select, filters = {}) {
  let q = supabase.from(table).select(select);
  for (const [k, v] of Object.entries(filters)) q = q.eq(k, v);
  const { data, error } = await q;
  if (error) throw new Error(`${table}: ${error.message}`);
  return data;
}

// ─── SETUP ───
async function setup() {
  console.log('\n═══ SETUP ═══');
  try { fs.mkdirSync('e2e-shots'); } catch {}

  console.log('  Connecting to dev server on ' + BASE_URL + '...');
  const started = await waitForServer(BASE_URL);
  if (!started) { fail('Server', 'Dev server not running at ' + BASE_URL); process.exit(1); }
  console.log('  ✅ Dev server running');

  supabase = makeSupabase();
  console.log('  ✅ Supabase client ready');

  browser = await chromium.launch({ headless: true });
  context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  page = await context.newPage();
  page.on('pageerror', (e) => RESULTS.errors.push({ type: 'pageerror', msg: e.message?.slice(0,200) }));
  page.on('response', (r) => { if (r.status() >= 400) RESULTS.errors.push({ type: 'http', url: r.url().slice(0,100), status: r.status() }); });
  console.log('  ✅ Browser launched');
}

// ─── ADMIN LOGIN ───
async function testAdminLogin() {
  console.log('\n═══ ADMIN LOGIN ═══');

  // Invalid login
  await page.goto(`${BASE_URL}/admin/login`);
  await page.waitForSelector('input[type="email"]', { timeout: 10000 });
  await page.fill('input[type="email"]', 'wrong@test.com');
  await page.fill('input[type="password"]', 'wrongpass');
  await page.click('button[type="submit"]');
  await sleep(3000);
  const body = await page.textContent('body');
  if (body.includes('not authorized') || body.includes('Invalid') || body.includes('error')) {
    pass('Invalid credentials rejected');
  } else fail('Invalid credentials rejected', 'No error shown');
  await screenshot('admin-login-fail');

  // Valid login
  await page.goto(`${BASE_URL}/admin/login`);
  await page.waitForSelector('input[type="email"]');
  await page.fill('input[type="email"]', ADMIN_EMAIL);
  await page.fill('input[type="password"]', ADMIN_PASS);
  await page.click('button[type="submit"]');

  try {
    await page.waitForURL('**/admin', { timeout: 15000 });
    pass('Valid admin login');
  } catch {
    fail('Valid admin login', 'No redirect');
    await screenshot('admin-login-fail2');
    return false;
  }

  await sleep(2000);
  const body2 = await page.textContent('body');
  if (body2.includes('Dashboard') || body2.includes('Passes') || body2.includes('Admin')) {
    pass('Admin dashboard visible');
  } else fail('Admin dashboard visible', body2.slice(0, 200));

  // Check user_roles
  try {
    const roles = await dbQuery('user_roles', '*', { user_id: '3393eb94-590c-46b1-b67b-202fe5f219e3', role: 'admin' });
    if (roles.length > 0) pass('Admin user_roles row exists');
    else fail('Admin user_roles row', 'No row found');
  } catch (e) { fail('Admin user_roles row', e.message); }

  // Session persistence
  await page.reload();
  await sleep(2000);
  if (page.url().includes('/admin')) pass('Session survives refresh');
  else fail('Session survives refresh', 'Lost session');
  return true;
}

// ─── PARTICIPANT REG ───
async function testParticipantReg() {
  console.log('\n═══ PARTICIPANT REGISTRATION ═══');
  await page.goto(`${BASE_URL}/entry-pass`);
  await sleep(2000);

  // Select participant tab
  await page.locator('button:has-text("PARTICIPANT PASS")').click();
  await sleep(1000);

// Fill fields - use specific IDs or better selectors
  await page.fill('input[placeholder="First"]', 'E2E');
  await page.fill('input[placeholder="Middle (optional)"]', 'TEST');
  await page.fill('input[placeholder="Last"]', 'PARTICIPANT');
  
  const phoneInput = page.locator('input[placeholder="9876543210"]').first();
  await phoneInput.fill(TEST_PHONE.replace('+91', ''));
  
  // Email - use the first email input
  const emailInput = page.locator('input[type="email"]').first();
  await emailInput.fill(TEST_EMAIL);
  
  // Aadhaar - find the aadhaar input
  const aadhaarInput = page.locator('input[placeholder="1234 5678 9012"]').first();
  if (await aadhaarInput.isVisible()) await aadhaarInput.fill('111122223333');
  
  // Consent checkbox - find the one with consent text
  const checkboxes = page.locator('input[type="checkbox"]');
  const cbCount = await checkboxes.count();
  for (let i = 0; i < cbCount; i++) {
    const label = await page.evaluate(el => el.closest('label')?.textContent || '', await checkboxes.nth(i).elementHandle());
    if (label && label.includes('consent')) { await checkboxes.nth(i).check(); break; }
  }
  }

  // Select event
  const selects = page.locator('select');
  const evSelect = selects.first();
  const evOptions = await evSelect.locator('option').all();
  if (evOptions.length > 1) {
    await evSelect.selectOption({ index: 1 });
    await sleep(2000);
    pass('Event selected');
  } else fail('Event selection', 'No options');

  // Check event details
  const evDetails = await page.textContent('body');
  if (evDetails.includes('Rs.') || evDetails.includes('Talent Fest')) pass('Event details loaded');
  else fail('Event details loaded', evDetails.slice(400, 600));

  // Select category
  const catSelect = selects.last();
  const catOptions = await catSelect.locator('option').all();
  if (catOptions.length > 1) {
    await catSelect.selectOption({ index: 1 });
    pass('Category selected');
  } else {
    // Try selecting after event - give more time
    await sleep(3000);
    const catOptions2 = await catSelect.locator('option').all();
    if (catOptions2.length > 1) {
      await catSelect.selectOption({ index: 1 });
      pass('Category selected (after wait)');
    } else fail('Category selection', `Only ${catOptions2.length} options`);
  }

  // Submit
  await page.locator('button:has-text("Continue to Checkout")').click();

  try {
    await page.waitForURL('**/checkout**', { timeout: 20000 });
    pass('Redirected to checkout');
  } catch {
    fail('Redirect to checkout', await page.textContent('body').then(t => t.slice(0, 300)));
    await screenshot('reg-fail');
    return null;
  }

  const url = page.url();
  const m = url.match(/regId=([^&]+)/);
  if (m) {
    participantRegId = m[1];
    console.log(`  Reg ID: ${participantRegId}`);
    pass('Registration ID captured');
  } else { fail('Registration ID', 'Not in URL'); return null; }

  await sleep(2000);
  const checkoutBody = await page.textContent('body');
  if (checkoutBody.includes('Review')) pass('Checkout page renders');
  else fail('Checkout page renders', checkoutBody.slice(0, 200));
  await screenshot('checkout');
  return participantRegId;
}

// ─── PAYMENT ───
async function testPayment() {
  console.log('\n═══ PAYMENT ═══');
  if (!participantRegId) { fail('Payment', 'No regId'); return false; }

  await page.goto(`${BASE_URL}/payment?regId=${participantRegId}&amount=299`);
  await sleep(3000);

  const body = await page.textContent('body');
  if (body.includes('Test Payment')) pass('Payment page shows test mode');
  else fail('Payment page test mode', body.slice(0, 200));
  await screenshot('payment-ready');

  // Click pay
  const payBtn = page.locator('button').filter({ hasText: /Pay|Complete|Submit/ }).first();
  if (await payBtn.isVisible()) {
    await payBtn.click();
  } else fail('Pay button', 'Not found');

  try {
    await page.waitForURL('**/thank-you**', { timeout: 30000 });
    pass('Payment succeeded, on thank-you');
  } catch {
    fail('Payment redirect', await page.textContent('body').then(t => t.slice(0, 300)));
    await screenshot('payment-fail');
    return false;
  }

  await sleep(2000);
  const tyBody = await page.textContent('body');
  if (tyBody.includes('Pass') || tyBody.includes('pass') || tyBody.includes('Download')) {
    pass('Thank-you shows passes');
  } else fail('Thank-you shows passes', tyBody.slice(0, 200));
  await screenshot('thankyou');
  return true;
}

// ─── DB VERIFICATION ───
async function verifyDB() {
  console.log('\n═══ DATABASE VERIFICATION ═══');
  try {
    const regs = await dbQuery('registrations', '*', { id: participantRegId });
    if (!regs.length) { fail('Registration in DB', 'Not found'); return; }
    const r = regs[0];
    console.log(`  ${r.registration_number} | ${r.full_name} | ${r.registration_type} | payment:${r.payment_status} | status:${r.registration_status}`);

    const checks = {
      'first_name': r.first_name === 'E2E',
      'middle_name': r.middle_name === 'TEST',
      'last_name': r.last_name === 'PARTICIPANT',
      'full_name': r.full_name === 'E2E TEST PARTICIPANT',
      'phone': r.phone === TEST_PHONE,
      'email': r.email === TEST_EMAIL,
      'registration_type': r.registration_type === 'participant',
      'payment_status': r.payment_status === 'paid',
      'registration_status': r.registration_status === 'confirmed',
    };
    for (const [k, v] of Object.entries(checks)) {
      if (v) pass(`Reg ${k}`);
      else fail(`Reg ${k}`, JSON.stringify(r[k]));
    }
  } catch (e) { fail('Registration DB', e.message); return; }

  // Payments
  try {
    const p = await dbQuery('payments', '*', { registration_id: participantRegId });
    if (p.length) {
      pass('Payment exists');
      const pmt = p[0];
      const pchecks = {
        'status=paid': pmt.status === 'paid',
        'provider=dummy': pmt.provider === 'dummy',
        'amount>0': Number(pmt.amount) > 0,
        'has order_id': !!pmt.order_id,
        'has transaction_id': !!pmt.transaction_id,
      };
      for (const [k, v] of Object.entries(pchecks)) {
        if (v) pass(`Payment ${k}`);
        else fail(`Payment ${k}`, JSON.stringify(pmt[k.split('=')[0]]));
      }
    } else fail('Payment exists', 'No payment');
  } catch (e) { fail('Payment DB', e.message); }

  // Passes
  try {
    const passes = await dbQuery('passes', '*', { registration_id: participantRegId });
    if (passes.length) {
      pass('Passes created');
      const pchecks = {
        'has participant pass': passes.some(p => p.pass_type === 'participant'),
        'status active': passes.every(p => p.status === 'active'),
        'has pass_number': passes.some(p => !!p.pass_number),
        'has secure_qr_token': passes.some(p => !!p.secure_qr_token),
      };
      for (const [k, v] of Object.entries(pchecks)) {
        if (v) pass(`Pass ${k}`);
        else fail(`Pass ${k}`, JSON.stringify(passes));
      }
    } else fail('Passes created', 'No passes');
  } catch (e) { fail('Passes DB', e.message); }

  // Relationship check
  try {
    const pays = await dbQuery('payments', 'registration_id', { registration_id: participantRegId });
    if (pays.length && pays[0].registration_id === participantRegId) pass('Payment linked to registration');
    else fail('Payment linked', 'Mismatch');
  } catch (e) { fail('Relationship', e.message); }
}

// ─── ADMIN MODAL ───
async function testAdminModal() {
  console.log('\n═══ ADMIN MODAL ═══');
  await page.goto(`${BASE_URL}/admin`);
  await sleep(3000);

  // Click Passes tab
  const passesTab = page.locator('text=Entry Passes').first() || page.locator('text=Passes').first();
  if (await passesTab.isVisible()) { await passesTab.click(); await sleep(2000); }

  // Search
  const searchInput = page.locator('input[placeholder*="Search"]').first();
  if (await searchInput.isVisible()) { await searchInput.fill('E2E TEST'); await sleep(2000); }
  await screenshot('admin-search');

  // Click on our participant
  const entry = page.locator('text=E2E TEST PARTICIPANT').first();
  if (await entry.isVisible()) {
    await entry.click();
    await sleep(2000);
    pass('Admin modal opens');
  } else {
    fail('Admin modal', 'Entry not found');
    await screenshot('admin-no-entry');
    return;
  }
  await screenshot('admin-modal');

  // Check for fallbacks
  const modalBody = await page.textContent('body');
  const fallbacks = ['N/A', 'Unknown', 'New Registration', 'Legacy', 'Not tracked', 'Not available'];
  const foundFallbacks = fallbacks.filter(f => modalBody.includes(f));
  if (foundFallbacks.length) {
    fail('Modal shows real data', `Fallbacks: ${foundFallbacks.join(', ')}`);
  } else pass('Modal shows real data');

  // Check specific values
  const mustHave = ['E2E TEST PARTICIPANT', 'paid', 'active'];
  for (const v of mustHave) {
    if (modalBody.includes(v)) pass(`Modal has "${v}"`);
    else fail(`Modal has "${v}"`, 'Not found');
  }
}

// ─── PARTICIPANTS PAGE ───
async function testParticipantsPage() {
  console.log('\n═══ PARTICIPANTS PAGE ═══');
  await page.goto(`${BASE_URL}/admin`);
  await sleep(2000);

  const ptab = page.locator('text=Participants').first();
  if (await ptab.isVisible()) { await ptab.click(); await sleep(2000); }

  const search = page.locator('input[placeholder*="Search"]').first();
  if (await search.isVisible()) { await search.fill('E2E TEST'); await sleep(2000); }

  if (await page.isVisible('text=E2E TEST PARTICIPANT')) pass('Participant in Participants page');
  else fail('Participant in Participants page', 'Not found');
  await screenshot('participants-page');
}

// ─── VISITOR ───
async function testVisitorReg() {
  console.log('\n═══ VISITOR REGISTRATION ═══');
  await page.goto(`${BASE_URL}/entry-pass`);
  await sleep(2000);

  await page.locator('button:has-text("VISITOR ENTRY PASS")').click();
  await sleep(2000);

  // Wait for visitor form to appear - find by placeholder
  const nameInput = page.locator('input[placeholder*="full name"]').first();
  await nameInput.waitFor({ state: 'visible', timeout: 10000 });
  
  await nameInput.fill('E2E VISITOR');

  const phoneInputs = page.locator('input[placeholder="9876543210"]');
  const phoneCount = await phoneInputs.count();
  if (phoneCount > 0) await phoneInputs.nth(phoneCount - 1).fill(TEST_PHONE_VISITOR.replace('+91', ''));

  const emailInput = page.locator('input[type="email"]');
  if (await emailInput.isVisible()) await emailInput.fill(TEST_EMAIL_VISITOR);

  const aadhaarIn = page.locator('input').filter({ has: page.locator('[placeholder*="Aadhaar"]') }).first();
  if (await aadhaarIn.isVisible()) await aadhaarIn.fill('444455556666');

  // Consent
  const cbs = page.locator('input[type="checkbox"]');
  const cc = await cbs.count();
  for (let i = 0; i < cc; i++) {
    const label = await page.evaluate(el => el.closest('label')?.textContent || '', await cbs.nth(i).elementHandle());
    if (label.includes('consent')) { await cbs.nth(i).check(); break; }
  }

  // Select event
  const sel = page.locator('select').first();
  const opts = await sel.locator('option').all();
  if (opts.length > 1) { await sel.selectOption({ index: 1 }); await sleep(1000); }

  // Submit
  await page.locator('button:has-text("Continue to Checkout")').click();
  try {
    await page.waitForURL('**/checkout**', { timeout: 15000 });
    pass('Visitor to checkout');
  } catch {
    fail('Visitor to checkout', await page.textContent('body').then(t => t.slice(0, 200)));
    await screenshot('visitor-fail');
    return null;
  }

  const m = page.url().match(/regId=([^&]+)/);
  if (m) { visitorRegId = m[1]; console.log(`  Visitor Reg ID: ${visitorRegId}`); pass('Visitor Reg ID'); } 
  else { fail('Visitor Reg ID', 'Not in URL'); return null; }

  // Payment
  await page.goto(`${BASE_URL}/payment?regId=${visitorRegId}&amount=199`);
  await sleep(2000);
  const pay = page.locator('button').filter({ hasText: /Pay|Complete|Submit/ }).first();
  if (await pay.isVisible()) {
    await pay.click();
    try { await page.waitForURL('**/thank-you**', { timeout: 20000 }); pass('Visitor payment ok'); }
    catch { fail('Visitor payment', 'No redirect'); await screenshot('visitor-pay-fail'); }
  }
  return visitorRegId;
}

// ─── QR / CHECK-IN ───
async function testQR() {
  console.log('\n═══ QR CHECK-IN ═══');
  try {
    const passes = await dbQuery('passes', 'secure_qr_token, id, pass_number', { registration_id: participantRegId, pass_type: 'participant' });
    if (!passes.length || !passes[0].secure_qr_token) { fail('QR token', 'Not found'); return; }
    const token = passes[0].secure_qr_token;
    console.log(`  Token: ${token}`);
    pass('QR token in DB');

    await page.goto(`${BASE_URL}/verify-pass/${token}`);
    await sleep(3000);
    await screenshot('verify-pass');
    const body = await page.textContent('body');
    if (body.includes('E2E TEST') || body.includes('VALID')) pass('QR verification works');
    else fail('QR verification', body.slice(0, 200));
  } catch (e) { fail('QR test', e.message); }
}

// ─── EMPLOYEE AWARD ───
async function testAward() {
  console.log('\n═══ EMPLOYEE AWARD ═══');
  await page.goto(`${BASE_URL}/employee-award-ceremony-2026`);
  await sleep(3000);

  const inputs = page.locator('input');
  const ic = await inputs.count();
  console.log(`  Found ${ic} input fields`);

  // Fill some fields
  if (ic > 0) await inputs.nth(0).fill('E2E TEST COMPANY');
  if (ic > 1) await inputs.nth(1).fill('E2E ADDRESS');
  if (ic > 2) await inputs.nth(2).fill('E2E COORDINATOR');
  
  // Phone
  const numericInputs = page.locator('input[inputmode="numeric"]');
  if (await numericInputs.count() > 0) await numericInputs.nth(0).fill('9876543210');
  
  // Email
  const emailInput = page.locator('input[type="email"]');
  if (await emailInput.count() > 0) await emailInput.nth(0).fill(`award.${TIMESTAMP}@test.com`);

  // Select award category
  const awardCheck = page.locator('text=Best Employee Award').first();
  if (await awardCheck.isVisible()) {
    await awardCheck.click();
    pass('Award category selected');
  }

  // Fill employee name - use the 7th input (index 6)
  if (ic > 6) await inputs.nth(6).fill('E2E EMPLOYEE');

  // Signature / declaration
  const sigInput = page.locator('input').filter({ hasText: /signature/i }).first();
  const decCheck = page.locator('input[type="checkbox"]').last();
  if (await decCheck.isVisible()) await decCheck.check();

  await screenshot('award-form');

  const subBtn = page.locator('button[type="submit"]');
  if (await subBtn.isVisible()) {
    await subBtn.click();
    await sleep(3000);
    pass('Award form submitted');
  } else fail('Award submit', 'No submit btn');

  // Check DB
  try {
    const awards = await dbQuery('employee_award_registrations', '*', { company_name: 'E2E TEST COMPANY' });
    if (awards.length) { awardRegId = awards[0].id; pass('Award in DB'); console.log(`  Award ID: ${awardRegId}`); }
    else fail('Award in DB', 'Not found');
  } catch (e) { fail('Award DB', e.message); }
}

// ─── SCHEMA AUDIT ───
async function testSchema() {
  console.log('\n═══ SCHEMA AUDIT ═══');
  const tables = ['registrations','payments','passes','guests','events','employee_award_registrations','concert_settings','concert_artists','check_in_logs','contact_messages','user_roles','event_activity_categories','activity_categories','event_managers','public_entry_passes'];
  for (const t of tables) {
    try {
      const { error } = await supabase.from(t).select('count').limit(1);
      if (!error) pass(`Table: ${t}`);
      else fail(`Table: ${t}`, error.message);
    } catch (e) { fail(`Table: ${t}`, e.message); }
  }
}

// ─── STORAGE ───
async function testStorage() {
  console.log('\n═══ STORAGE ═══');
  try {
    const { data: buckets } = await supabase.storage.listBuckets();
    const names = buckets.map(b => b.name);
    console.log(`  Buckets: ${names.join(', ')}`);
    if (names.includes('event-images')) pass('Bucket: event-images');
    else fail('Bucket: event-images', 'Not found');
  } catch (e) { fail('Storage', e.message); }
}

// ─── CLEANUP ───
async function cleanup(server) {
  console.log('\n═══ CLEANUP ═══');
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
    if (awardRegId) await supabase.from('employee_award_registrations').delete().eq('id', awardRegId);
    console.log('  ✅ Test data cleaned');
  } catch (e) { console.log(`  Cleanup: ${e.message}`); }
  if (browser) await browser.close();

}

// ─── MAIN ───
async function main() {
  console.log('══════════════════════════════════════════');
  console.log('  TELENT FEST E2E TEST SUITE');
  console.log(`  ${new Date().toISOString()}`);
  console.log('══════════════════════════════════════════');

  await setup();
  try {
    const adminOk = await testAdminLogin();
    const regId = await testParticipantReg();
    if (regId) {
      await testPayment();
      await verifyDB();
      if (adminOk) {
        await testAdminModal();
        await testParticipantsPage();
      }
      await testQR();
    }
    await testVisitorReg();
    await testAward();
    await testSchema();
    await testStorage();
  } catch (e) {
    fail('Suite error', e.message);
    console.error(e);
  } finally {
    await cleanup();
  }

  console.log('\n══════════════════════════════════════════');
  console.log('  FINAL REPORT');
  console.log('══════════════════════════════════════════');
  console.log(`  PASSED: ${RESULTS.passed.length}`);
  console.log(`  FAILED: ${RESULTS.failed.length}`);
  console.log(`  ERRORS: ${RESULTS.errors.length}`);
  if (RESULTS.failed.length) {
    console.log('\n  FAILURES:');
    RESULTS.failed.forEach(f => console.log(`    ❌ ${f.name}: ${f.msg}`));
  }
  if (RESULTS.errors.length) {
    console.log('\n  ERRORS:');
    const seen = new Set();
    RESULTS.errors.forEach(e => {
      const key = `${e.type}:${(e.msg||'').slice(0,150)}`;
      if (!seen.has(key)) { seen.add(key); console.log(`    ⚠️  ${key}`); }
    });
  }
  const passed = RESULTS.failed.length === 0;
  console.log(`\n  ${passed ? '✅ ALL PASSED' : '❌ SOME FAILED'}`);
  fs.writeFileSync(`e2e-results-${TIMESTAMP}.json`, JSON.stringify({
    timestamp: new Date().toISOString(),
    passed: RESULTS.passed,
    failed: RESULTS.failed,
    errors: RESULTS.errors.slice(0, 100),
    ids: { participantRegId, visitorRegId, awardRegId },
  }, null, 2));
  process.exit(passed ? 0 : 1);
}

main();
