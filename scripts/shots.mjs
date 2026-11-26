import puppeteer from 'puppeteer-core';
import { mkdirSync } from 'node:fs';

const out = process.argv[2] || '/tmp/ll-shots';
mkdirSync(out, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const URL = 'http://localhost:5173/';

const browser = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: 'new',
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--force-device-scale-factor=1'],
});

async function enter(page) {
  await page.goto(URL, { waitUntil: 'networkidle0', timeout: 30000 });
  await page.waitForSelector('.scene-svg, .auth-page', { timeout: 15000 });
  if (await page.$('.auth-page')) {
    await page.click('.btn-gold');
    await page.waitForSelector('.scene-svg .tree', { timeout: 15000 });
  }
  await page.waitForSelector('.scene-svg .tree', { timeout: 15000 });
  await sleep(1600);
}

async function clickTree(page, title) {
  const pt = await page.evaluate((t) => {
    for (const g of document.querySelectorAll('.tree')) {
      const label = g.querySelector('.tree-label text');
      if (!label || !label.textContent.includes(t)) continue;
      const r = g.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height * 0.3;
      if (cx > 30 && cx < innerWidth - 30 && cy > 90 && cy < innerHeight - 120) return { x: cx, y: cy };
    }
    return null;
  }, title);
  if (!pt) throw new Error('tree not visible: ' + title);
  await page.mouse.click(pt.x, pt.y);
  await sleep(1200);
}

const d = await browser.newPage();
await d.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
await enter(d);
await d.screenshot({ path: `${out}/desktop-home.png` });
await clickTree(d, '生命之树');
await d.screenshot({ path: `${out}/desktop-tree.png` });

const m = await browser.newPage();
await m.setViewport({ width: 390, height: 844, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
await enter(m);
await m.screenshot({ path: `${out}/mobile-home.png` });
await clickTree(m, '生命之树');
await m.screenshot({ path: `${out}/mobile-tree.png` });

await browser.close();
console.log('saved to ' + out);