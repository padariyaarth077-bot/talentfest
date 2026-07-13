const { chromium } = require('playwright');
const BASE = 'http://127.0.0.1:5173';
const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL || '';
const ADMIN_PASS = process.env.E2E_ADMIN_PASS || '';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  page.on('console', msg => console.log(`[${msg.type()}] ${msg.text()}`));
  page.on('pageerror', err => console.log(`[PAGE_ERROR] ${err.message}`));
  page.on('response', r => { if (r.status() >= 400) console.log(`[${r.status()}] ${r.url().slice(0,150)}`); });

  // Check import.meta.env on entry-pass page
  await page.goto(BASE + '/entry-pass');
  await page.waitForTimeout(3000);
  
  // Check VITE env vars via a module script injection
  await page.evaluate(function() {
    var s = document.createElement('script');
    s.type = 'module';
    s.textContent = 'window.__VITE_ENV__ = import.meta.env; document.body.setAttribute("data-vite-checked","true"); window.__VITE_URL__ = import.meta.env.VITE_SUPABASE_URL; window.__VITE_KEY__ = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "").slice(0,20);';
    document.head.appendChild(s);
  });
  // Check VITE env vars differently
  const viteCheck = await page.evaluate(function() {
    var s = document.createElement('script');
    s.type = 'module';
    s.textContent = 'window.__VITE_ENV__ = import.meta.env; document.body.setAttribute("data-vite-checked","true")';
    document.head.appendChild(s);
    return 'injected';
  });
  await page.waitForTimeout(1000);
  const envFromModule = await page.evaluate(function() {
    var w = window;
    if (w.__VITE_ENV__) {
      return { url: w.__VITE_ENV__.VITE_SUPABASE_URL, key: (w.__VITE_ENV__.VITE_SUPABASE_PUBLISHABLE_KEY || '').slice(0,20) };
    }
    return { error: 'no __VITE_ENV__', attr: document.body.getAttribute('data-vite-checked') };
  });
  console.log('VITE_ENV:', JSON.stringify(envFromModule));

  const bodyText = await page.textContent('body');
  console.log('BODY (first 500):', bodyText.slice(0, 500));

  const selectOptions = await page.evaluate(function() {
    var sel = document.querySelector('select');
    if (!sel) return 'NO SELECT';
    return Array.from(sel.options).map(function(o) { return o.value + ':' + o.text; }).join(' | ');
  });
  console.log('SELECT:', selectOptions);

  // Try admin login
  await page.goto(BASE + '/admin/login');
  await page.waitForTimeout(2000);
  
  // Fill and submit
  await page.fill('input[type="email"]', ADMIN_EMAIL);
  await page.fill('input[type="password"]', ADMIN_PASS);
  await page.click('button[type="submit"]');
  await page.waitForTimeout(5000);
  
  console.log('URL after submit:', page.url());
  const postLoginBody = await page.textContent('body');
  console.log('Post-login body (first 400):', postLoginBody.slice(0, 400));

  await browser.close();
})();
