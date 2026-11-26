import puppeteer from 'puppeteer-core';
import { mkdirSync } from 'node:fs';

const OUT = '/tmp/ll-shots';
mkdirSync(OUT, { recursive: true });
const URL = 'http://localhost:5173/';
const errors = [];

const browser = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: 'new',
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--force-device-scale-factor=1'],
});

async function newPage(width, height, mobile = false) {
  const page = await browser.newPage();
  await page.setViewport({ width, height, deviceScaleFactor: 1, isMobile: mobile, hasTouch: mobile });
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(`[${width}x${height}] ${m.text()}`);
  });
  page.on('pageerror', (e) => errors.push(`[${width}x${height}] pageerror: ${e.message}`));
  return page;
}

async function enter(page) {
  await page.goto(URL, { waitUntil: 'networkidle0', timeout: 30000 });
  await page.waitForSelector('.scene-svg, .auth-page', { timeout: 15000 });
  if (await page.$('.auth-page')) {
    await page.click('.btn-gold');
    await page.waitForSelector('.scene-svg .tree', { timeout: 15000 });
  }
  await page.waitForSelector('.scene-svg .tree', { timeout: 15000 });
  await new Promise((r) => setTimeout(r, 1200));
}

const shot = (page, name) => page.screenshot({ path: `${OUT}/${name}.png` });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* desktop */
const d = await newPage(1440, 900);
await enter(d);
await shot(d, '01-desktop-home');
await d.click('.tree');
await sleep(1000);
await shot(d, '02-desktop-tree');
const toggled = await d.evaluate(() => {
  const checks = [...document.querySelectorAll('.event-panel .leaf-check')];
  const pending = checks.find((c) => !c.classList.contains('leaf-check-on'));
  if (pending) { pending.click(); return true; }
  return false;
});
await sleep(900);
await shot(d, '03-desktop-complete');
const rowsBefore = await d.evaluate(() => document.querySelectorAll('.event-item').length);
await d.evaluate(() => {
  const input = document.querySelector('.panel-quickadd .input');
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  setter.call(input, 'QA 快速添加');
  input.dispatchEvent(new Event('input', { bubbles: true }));
});
await d.click('.panel-quickadd .btn');
await sleep(700);
const rowsAfterAdd = await d.evaluate(() => document.querySelectorAll('.event-item').length);
await d.evaluate(() => {
  const dels = document.querySelectorAll('.event-del');
  dels[dels.length - 1].click();
});
await sleep(500);
const rowsAfterDel = await d.evaluate(() => document.querySelectorAll('.event-item').length);
const undoClicked = await d.evaluate(() => {
  const b = document.querySelector('.toast-action');
  if (b) { b.click(); return true; }
  return false;
});
await sleep(700);
const rowsAfterUndo = await d.evaluate(() => document.querySelectorAll('.event-item').length);
await shot(d, '03b-desktop-quickadd');
await d.evaluate(() => {
  const svg = document.querySelector('.scene-svg');
  const r = svg.getBoundingClientRect();
  svg.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: r.right - 120, clientY: r.bottom - 90, pointerId: 7, pointerType: 'mouse', buttons: 1 }));
  svg.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, clientX: r.right - 120, clientY: r.bottom - 90, pointerId: 7, pointerType: 'mouse', buttons: 0 }));
});
await sleep(900);
await d.click('.journal-btn');
await sleep(500);
await shot(d, '04-desktop-journal');
await d.evaluate(() => {
  const input = document.querySelector('.journal-tools input');
  if (input) {
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    setter.call(input, '跑');
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }
});
await sleep(400);
const journalRows = await d.evaluate(() => document.querySelectorAll('.journal-row').length);
await shot(d, '05-desktop-journal-search');
await d.evaluate(() => document.querySelector('.modal-card .icon-btn')?.click());
await sleep(400);
await d.click('.fab-main');
await sleep(500);
await shot(d, '06-desktop-eventform');
await d.evaluate(() => document.querySelector('.modal-card .icon-btn')?.click());
await sleep(300);
await d.click('.fab-plant');
await sleep(500);
await shot(d, '07-desktop-plant');
await d.evaluate(() => document.querySelector('.modal-card .icon-btn')?.click());
await sleep(300);
const desktopState = await d.evaluate(() => ({
  vb: document.querySelector('.scene-svg').getAttribute('viewBox'),
  golden: document.querySelectorAll('.leaf-golden').length,
  stats: document.querySelector('.stats-card')?.innerText.replace(/\n/g, ' '),
}));

/* mobile */
const m = await newPage(390, 844, true);
await enter(m);
await shot(m, '08-mobile-home');
await m.click('.stats-toggle');
await sleep(500);
await shot(m, '09-mobile-stats');
await m.click('.stats-toggle');
await sleep(300);
const treePoint = await m.evaluate(() => {
  const vw = innerWidth, vh = innerHeight;
  for (const t of document.querySelectorAll('.tree')) {
    const r = t.getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    if (cx > 20 && cx < vw - 20 && cy > 80 && cy < vh - 160) return { x: cx, y: cy };
  }
  return null;
});
if (!treePoint) throw new Error('no visible tree on mobile');
await m.mouse.click(treePoint.x, treePoint.y);
await sleep(1000);
await shot(m, '10-mobile-tree');
const mobileState = await m.evaluate(() => ({
  vb: document.querySelector('.scene-svg').getAttribute('viewBox'),
  panel: !!document.querySelector('.event-panel'),
  fabVisible: getComputedStyle(document.querySelector('.fab-stack')).bottom,
}));

console.log(JSON.stringify({ toggled, journalRows, rowsBefore, rowsAfterAdd, rowsAfterDel, undoClicked, rowsAfterUndo, desktopState, mobileState, errors }, null, 2));
await browser.close();