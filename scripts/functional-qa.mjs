import puppeteer from 'puppeteer-core';

const URL = 'http://localhost:5173/';
const results = [];
const errors = [];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function record(id, name, pass, detail) {
  results.push({ id, name, pass, detail });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${id} ${name}  ${detail}`);
}

const browser = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: 'new',
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--force-device-scale-factor=1'],
});

async function newPage(width, height, mobile = false) {
  const page = await browser.newPage();
  await page.setViewport({ width, height, deviceScaleFactor: 1, isMobile: mobile, hasTouch: mobile });
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(`[${width}x${height}] console: ${m.text()}`);
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
  await sleep(1000);
}

const stats = (page) =>
  page.evaluate(() => [...document.querySelectorAll('.stats-num')].map((n) => Number(n.textContent)));

const storageEvents = (page) =>
  page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('ll_session') || 'null');
    if (!s) return null;
    const d = JSON.parse(localStorage.getItem(`ll_data_${s.userId}`) || 'null');
    return d ? d.events : null;
  });

async function treePoint(page, title) {
  return page.evaluate((t) => {
    for (const g of document.querySelectorAll('.tree')) {
      const label = g.querySelector('.tree-label text');
      if (!label || !label.textContent.includes(t)) continue;
      const r = g.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      if (cx > 30 && cx < innerWidth - 30 && cy > 90 && cy < innerHeight - 120) return { x: cx, y: cy };
    }
    return null;
  }, title);
}

async function clickTree(page, title) {
  const pt = await treePoint(page, title);
  if (!pt) throw new Error(`tree not visible: ${title}`);
  await page.mouse.click(pt.x, pt.y);
  await sleep(950);
}

const deselect = async (page) => {
  const closed = await page.evaluate(() => {
    const btn = document.querySelector('.panel-head .icon-btn');
    if (btn) { btn.click(); return true; }
    return false;
  });
  if (!closed) await page.mouse.click(1000, 180);
  await sleep(1100);
};

const goldenIn = (page, title) =>
  page.evaluate((t) => {
    for (const g of document.querySelectorAll('.tree')) {
      const label = g.querySelector('.tree-label text');
      if (label && label.textContent.includes(t)) return g.querySelectorAll('.leaf-golden').length;
    }
    return -1;
  }, title);

const panelTitle = (page) => page.evaluate(() => document.querySelector('.panel-title')?.textContent ?? null);

/* ---------- desktop ---------- */
const d = await newPage(1440, 900);
await enter(d);
const baseStats = await stats(d);

/* T1 不同树木详情 */
try {
  await clickTree(d, '生命之树');
  const t1 = await panelTitle(d);
  const ev1 = await d.evaluate(() => [...document.querySelectorAll('.event-item .event-title')].map((n) => n.textContent));
  await deselect(d);
  await clickTree(d, '环游世界');
  const t2 = await panelTitle(d);
  const ev2 = await d.evaluate(() => [...document.querySelectorAll('.event-item .event-title')].map((n) => n.textContent));
  const store = await storageEvents(d);
  const lifeId = await d.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('ll_session'));
    const data = JSON.parse(localStorage.getItem(`ll_data_${s.userId}`));
    return data.trees.find((t) => t.title === '生命之树').id;
  });
  const dreamId = await d.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('ll_session'));
    const data = JSON.parse(localStorage.getItem(`ll_data_${s.userId}`));
    return data.trees.find((t) => t.title === '环游世界').id;
  });
  const ok1 = t1 === '生命之树' && t2 === '环游世界';
  const ok2 =
    JSON.stringify(ev1.sort()) === JSON.stringify(store.filter((e) => e.treeId === lifeId).map((e) => e.title).sort()) &&
    JSON.stringify(ev2.sort()) === JSON.stringify(store.filter((e) => e.treeId === dreamId).map((e) => e.title).sort());
  record('T1', '点击不同树木打开对应详情', ok1 && ok2, `面板标题 ${t1} → ${t2}；事件列表与存储一致=${ok2}`);
} catch (e) {
  record('T1', '点击不同树木打开对应详情', false, e.message);
}

/* T2 添加事件（完整表单） */
let addedId = null;
try {
  const before = await stats(d);
  await d.click('.fab-main');
  await sleep(450);
  await d.evaluate(() => {
    const set = (el, v) => {
      const proto = el.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
      Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, v);
      el.dispatchEvent(new Event('input', { bubbles: true }));
    };
    const form = document.querySelector('.modal-card form');
    set(form.querySelectorAll('input')[0], '功能测试事件');
    set(form.querySelector('textarea'), '由功能测试脚本写入');
  });
  await d.evaluate(() => {
    const form = document.querySelector('.modal-card form');
    const date = form.querySelector('input[type="date"]');
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    setter.call(date, '2026-12-01');
    date.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await d.evaluate(() => {
    [...document.querySelectorAll('.modal-card button')].find((b) => b.textContent === '添加事件').click();
  });
  await sleep(700);
  const after = await stats(d);
  const store = await storageEvents(d);
  const ev = store.find((e) => e.title === '功能测试事件');
  addedId = ev?.id ?? null;
  const inPanel = await d.evaluate(() => [...document.querySelectorAll('.event-item .event-title')].some((n) => n.textContent === '功能测试事件'));
  record(
    'T2',
    '添加成长事件',
    !!ev && ev.note === '由功能测试脚本写入' && ev.dueDate === '2026-12-01' && after[1] === before[1] + 1 && inPanel,
    `存储已写入=${!!ev}，备注/日期正确=${ev?.note === '由功能测试脚本写入' && ev?.dueDate === '2026-12-01'}，统计 ${before[1]}→${after[1]}，面板可见=${inPanel}`,
  );
} catch (e) {
  record('T2', '添加成长事件', false, e.message);
}

/* T3 编辑 + 删除 + 撤销 */
try {
  await d.evaluate((id) => {
    const row = [...document.querySelectorAll('.event-item')].find((r) => r.querySelector('.event-title').textContent === '功能测试事件');
    row.querySelector('.event-edit').click();
  }, addedId);
  await sleep(450);
  const modalTitle = await d.evaluate(() => document.querySelector('.modal-title')?.textContent);
  const prefilled = await d.evaluate(() => document.querySelector('.modal-card form input')?.value);
  await d.evaluate(() => {
    const set = (el, v) => {
      const proto = el.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
      Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, v);
      el.dispatchEvent(new Event('input', { bubbles: true }));
    };
    const form = document.querySelector('.modal-card form');
    set(form.querySelectorAll('input')[0], '功能测试事件·已编辑');
    set(form.querySelector('textarea'), '编辑后的备注');
  });
  await d.evaluate(() => {
    [...document.querySelectorAll('.modal-card button')].find((b) => b.textContent === '保存修改').click();
  });
  await sleep(700);
  const store1 = await storageEvents(d);
  const edited = store1.find((e) => e.id === addedId);
  const rowText = await d.evaluate(() => [...document.querySelectorAll('.event-item .event-title')].some((n) => n.textContent === '功能测试事件·已编辑'));
  const editOk = modalTitle === '编辑成长事件' && prefilled === '功能测试事件' && edited?.title === '功能测试事件·已编辑' && edited?.note === '编辑后的备注' && rowText;

  await d.evaluate(() => {
    const row = [...document.querySelectorAll('.event-item')].find((r) => r.querySelector('.event-title').textContent === '功能测试事件·已编辑');
    row.querySelector('.event-del').click();
  });
  await sleep(500);
  const gonePanel = await d.evaluate(() => ![...document.querySelectorAll('.event-item .event-title')].some((n) => n.textContent === '功能测试事件·已编辑'));
  const goneStore = !(await storageEvents(d)).some((e) => e.id === addedId);
  const undoBtn = await d.evaluate(() => {
    const b = document.querySelector('.toast-action');
    if (b) { b.click(); return true; }
    return false;
  });
  await sleep(700);
  const backStore = (await storageEvents(d)).some((e) => e.id === addedId);
  await d.evaluate(() => {
    const row = [...document.querySelectorAll('.event-item')].find((r) => r.querySelector('.event-title').textContent === '功能测试事件·已编辑');
    row.querySelector('.event-del').click();
  });
  await sleep(500);
  const finalGone = !(await storageEvents(d)).some((e) => e.id === addedId);
  record(
    'T3',
    '编辑 / 删除 / 撤销事件',
    editOk && gonePanel && goneStore && undoBtn && backStore && finalGone,
    `编辑弹窗=${modalTitle}，预填=${prefilled}，存储与面板同步=${editOk}；删除面板/存储=${gonePanel}/${goneStore}；撤销恢复=${backStore}；再删除=${finalGone}`,
  );
} catch (e) {
  record('T3', '编辑 / 删除 / 撤销事件', false, e.message);
}

/* T4 完成事件 → 叶片变黄（可重复切换） */
try {
  await deselect(d);
  await clickTree(d, '生命之树');
  const g0 = await goldenIn(d, '生命之树');
  const s0 = await stats(d);
  await d.evaluate(() => {
    const check = [...document.querySelectorAll('.event-panel .leaf-check')].find((c) => !c.classList.contains('leaf-check-on'));
    check.click();
  });
  await sleep(1100);
  const g1 = await goldenIn(d, '生命之树');
  const s1 = await stats(d);
  await d.evaluate(() => {
    const check = [...document.querySelectorAll('.event-panel .leaf-check')].find((c) => c.classList.contains('leaf-check-on'));
    check.click();
  });
  await sleep(1100);
  const g2 = await goldenIn(d, '生命之树');
  const s2 = await stats(d);
  record(
    'T4',
    '完成事件叶片变黄 / 取消还原',
    g1 > g0 && s1[2] === s0[2] + 1 && g2 === g0 && s2[2] === s0[2],
    `金叶 ${g0}→${g1}→${g2}；已完成统计 ${s0[2]}→${s1[2]}→${s2[2]}`,
  );
} catch (e) {
  record('T4', '完成事件叶片变黄 / 取消还原', false, e.message);
}

/* T5 刷新持久化 + T6 统计联动 */
try {
  await d.evaluate(() => {
    const input = document.querySelector('.panel-quickadd .input');
    Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(input, '持久化验证事件');
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await d.click('.panel-quickadd .btn');
  await sleep(600);
  await d.evaluate(() => {
    const row = [...document.querySelectorAll('.event-item')].find((r) => r.querySelector('.event-title').textContent === '持久化验证事件');
    row.querySelector('.leaf-check').click();
  });
  await sleep(900);
  const beforeReload = await stats(d);
  const goldBefore = await goldenIn(d, '生命之树');
  await d.reload({ waitUntil: 'networkidle0' });
  await d.waitForSelector('.scene-svg .tree', { timeout: 15000 });
  await sleep(1000);
  const sessionAlive = await d.evaluate(() => !!localStorage.getItem('ll_session') && !!document.querySelector('.stats-card'));
  await clickTree(d, '生命之树');
  const rowState = await d.evaluate(() => {
    const row = [...document.querySelectorAll('.event-item')].find((r) => r.querySelector('.event-title').textContent === '持久化验证事件');
    return row ? { done: row.classList.contains('event-done'), check: row.querySelector('.leaf-check').classList.contains('leaf-check-on') } : null;
  });
  const afterReload = await stats(d);
  const goldAfter = await goldenIn(d, '生命之树');
  const store = await storageEvents(d);
  const persisted = store.some((e) => e.title === '持久化验证事件' && e.completedAt);
  record(
    'T5',
    '刷新后数据保留',
    sessionAlive && !!rowState?.done && !!rowState?.check && persisted && goldAfter === goldBefore,
    `会话保持=${sessionAlive}；事件仍存在且完成态=${!!rowState?.done}；存储完成态=${persisted}；金叶 ${goldBefore}→${goldAfter}`,
  );
  record(
    'T6',
    '统计随事件变化',
    afterReload[1] === beforeReload[1] && afterReload[2] === beforeReload[2] && beforeReload[1] === baseStats[1] + 1 && beforeReload[2] === baseStats[2] + 1,
    `基线 [${baseStats}]；添加+完成后期望 ${baseStats[1] + 1}/${baseStats[2] + 1}，实测 ${beforeReload[1]}/${beforeReload[2]}；刷新前后一致 [${afterReload}]`,
  );
  /* 清理测试数据，恢复演示森林原状 */
  await d.evaluate(() => {
    const row = [...document.querySelectorAll('.event-item')].find((r) => r.querySelector('.event-title').textContent === '持久化验证事件');
    row.querySelector('.event-del').click();
  });
  await sleep(500);
} catch (e) {
  record('T5', '刷新后数据保留', false, e.message);
  record('T6', '统计随事件变化', false, e.message);
}

/* T7 移动端 390×844 */
const m = await newPage(390, 844, true);
try {
  await enter(m);
  const layout = await m.evaluate(() => {
    const rect = (s) => {
      const el = document.querySelector(s);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { l: r.left, t: r.top, r: r.right, b: r.bottom };
    };
    const hit = (a, b) => a && b && a.l < b.r && b.l < a.r && a.t < b.b && b.t < a.b;
    const hint = rect('.hint-pill');
    const fab = rect('.fab-stack');
    const journal = rect('.journal-btn');
    return {
      overflowX: document.documentElement.scrollWidth > innerWidth,
      hintFab: hit(hint, fab),
      hintJournal: hit(hint, journal),
      hintLines: document.querySelector('.hint-pill').getBoundingClientRect().height,
      treeVisible: [...document.querySelectorAll('.tree')].some((g) => {
        const r = g.getBoundingClientRect();
        const cx = r.left + r.width / 2;
        return cx > 20 && cx < innerWidth - 20;
      }),
    };
  });
  await m.click('.stats-toggle');
  await sleep(450);
  const statsOpen = await m.evaluate(() => {
    const c = document.querySelector('.stats-card');
    return getComputedStyle(c).display !== 'none' && c.getBoundingClientRect().height > 100;
  });
  await m.click('.stats-toggle');
  await sleep(350);
  const pt = await treePoint(m, '生命之树');
  await m.mouse.click(pt.x, pt.y);
  await sleep(950);
  const sheet = await m.evaluate(() => {
    const p = document.querySelector('.event-panel');
    const fab = document.querySelector('.fab-stack');
    const pr = p.getBoundingClientRect();
    const fr = fab.getBoundingClientRect();
    const quick = document.querySelector('.panel-quickadd .btn').getBoundingClientRect();
    const edit = document.querySelector('.event-edit');
    return {
      panelH: pr.height,
      fabAbove: fr.bottom <= pr.top + 2,
      quickH: quick.height,
      editVisible: getComputedStyle(edit).opacity === '1',
      title: document.querySelector('.panel-title').textContent,
    };
  });
  const g0 = await goldenIn(m, '生命之树');
  await m.evaluate(() => {
    const check = [...document.querySelectorAll('.event-panel .leaf-check')].find((c) => !c.classList.contains('leaf-check-on'));
    check.click();
  });
  await sleep(1000);
  const g1 = await goldenIn(m, '生命之树');
  await m.evaluate(() => {
    const check = [...document.querySelectorAll('.event-panel .leaf-check')].find((c) => c.classList.contains('leaf-check-on'));
    check.click();
  });
  await sleep(800);
  const pass =
    !layout.overflowX && !layout.hintFab && !layout.hintJournal && layout.hintLines < 40 && layout.treeVisible &&
    statsOpen && sheet.panelH > 300 && sheet.panelH < 500 && sheet.fabAbove && sheet.quickH < 50 && sheet.editVisible && g1 > g0;
  record(
    'T7',
    '移动端 390×844 布局与交互',
    pass,
    `横向溢出=${layout.overflowX}；提示与按钮重叠=${layout.hintFab}/${layout.hintJournal}；提示高度=${Math.round(layout.hintLines)}；首屏有树=${layout.treeVisible}；统计展开=${statsOpen}；抽屉高=${Math.round(sheet.panelH)}；fab 抬升=${sheet.fabAbove}；快速添加按钮高=${Math.round(sheet.quickH)}；编辑按钮可见=${sheet.editVisible}；金叶 ${g0}→${g1}`,
  );
} catch (e) {
  record('T7', '移动端 390×844 布局与交互', false, e.message);
}

record('T8', '控制台 / 运行时错误', errors.length === 0, errors.length ? errors.join(' | ') : '0 错误');

console.log('\nSUMMARY ' + JSON.stringify({ passed: results.filter((r) => r.pass).length, total: results.length, errors }, null, 2));
await browser.close();
process.exit(results.every((r) => r.pass) ? 0 : 1);