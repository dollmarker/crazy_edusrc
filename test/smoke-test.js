/**
 * crazyedusrc 冒烟测试
 * 用 jsdom 把编译产物跑在模拟的搜索结果页 / 选项页上，验证关键行为。
 * 用法: npm test（需先 npm run build）
 */
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const projectDir = process.argv[2] || path.resolve(__dirname, '..');
const read = f => fs.readFileSync(path.join(projectDir, f), 'utf8');

let pass = 0;
let fail = 0;
const results = [];

function check(name, condition, detail = '') {
  if (condition) {
    pass += 1;
    results.push(`  ✓ ${name}`);
  } else {
    fail += 1;
    results.push(`  ✗ ${name}${detail ? ' → ' + detail : ''}`);
  }
}

function makeChrome(store, sent, opened) {
  return {
    storage: {
      local: {
        get: keys => {
          const list = Array.isArray(keys) ? keys : [keys];
          const out = {};
          list.forEach(k => {
            if (store[k] !== undefined) out[k] = store[k];
          });
          return Promise.resolve(out);
        },
        set: obj => {
          Object.assign(store, obj);
          return Promise.resolve();
        }
      },
      onChanged: { addListener() {} }
    },
    runtime: {
      lastError: undefined,
      getManifest: () => ({ version: '2.0.0', homepage_url: 'https://github.com/dollmarker/crazy_edusrc' }),
      onMessage: { addListener() {} },
      sendMessage: (msg, cb) => {
        sent.push(msg);
        if (cb) cb({ ok: true });
      },
      openOptionsPage: () => opened.push('options')
    },
    tabs: { query: () => Promise.resolve([]), sendMessage: () => Promise.resolve() },
    commands: { onCommand: { addListener() {} } }
  };
}

const tick = () => new Promise(r => setTimeout(r, 30));

/** 在模拟页面里加载编译好的内容脚本，返回可用的上下文 */
async function runContentScript(html, url) {
  const dom = new JSDOM(html, { url, runScripts: 'outside-only', pretendToBeVisual: true });
  const { window } = dom;
  const store = {};
  const sent = [];
  const opened = [];

  window.chrome = makeChrome(store, sent, opened);
  window.TextEncoder = TextEncoder;
  window.TextDecoder = TextDecoder;
  window.open = u => {
    opened.push(u);
    return null;
  };

  window.eval(read('dist/content.js'));
  await tick();
  await tick();

  const host = window.document.getElementById('ces-host');
  return { window, store, sent, opened, host, shadow: host && host.shadowRoot };
}

const BING_HTML = `<!DOCTYPE html><html><body>
<div id="b_content">
  <ol id="b_results">
    <li class="b_algo"><h2><a href="https://jw.example.edu.cn/admin/login.do">教务管理系统</a></h2></li>
    <li class="b_algo"><h2><a href="https://oa.example.edu.cn/backup/www.zip">备份下载</a></h2></li>
    <li class="b_algo"><h2><a href="https://lib.example.edu.cn/opac/search">图书馆</a></h2></li>
    <li class="b_algo"><h2><a href="https://www.bing.com/ck/a?u=a1aHR0cHM6Ly9lLmV4YW1wbGUuZWR1LmNuL3g">Bing 跳转</a></h2></li>
  </ol>
  <span class="sb_count">约 12,300 条结果</span>
</div>
<footer><a href="https://www.bing.com/legal">法律声明</a></footer>
</body></html>`;

const GOOGLE_HTML = `<!DOCTYPE html><html><body>
<div id="rcnt"><div id="center_col"><div id="search"><div id="rso">
  <div class="g"><div class="tF2Cxc"><div class="yuRUbf"><a href="https://jw.example.edu.cn/jwglxt/xtgl/login_slogin.html"><h3>教务系统</h3></a></div></div></div>
  <div class="g"><div class="tF2Cxc"><div class="yuRUbf"><a href="https://vpn.example.edu.cn/por/login_psw.csp"><h3>WebVPN</h3></a></div></div></div>
  <div class="g"><div class="tF2Cxc"><div class="yuRUbf"><a href="/url?q=https://nic.example.edu.cn/nacos/index.html&amp;sa=U&amp;ved=2ah">遗留跳转</a></div></div></div>
</div></div></div>
<div id="result-stats">找到约 4,310 条结果（用时 0.31 秒）</div>
</div>
<div id="botstuff"><a href="https://policies.google.com/privacy">隐私权</a></div>
</body></html>`;

const BAIDU_HTML = `<!DOCTYPE html><html><body>
<div id="container"><div id="content_left">
  <div class="result c-container" mu="https://jwc.example.edu.cn/index.htm"><h3><a href="https://www.baidu.com/link?url=abc">教务处</a></h3></div>
  <div class="result c-container" mu="https://pay.example.edu.cn/login"><h3><a href="https://www.baidu.com/link?url=def">缴费平台</a></h3></div>
</div></div>
<span class="hint_PIwZX">百度为您找到相关结果约 8,900 个</span>
</body></html>`;

async function testBing() {
  results.push('\n[1] 内容脚本 · Bing 面板');
  const ctx = await runContentScript(BING_HTML, 'https://www.bing.com/search?q=site%3Aexample.edu.cn');
  const { window, store, opened, shadow } = ctx;

  check('注入的宿主元素存在', !!ctx.host);
  if (!ctx.host) return;
  check('使用 Shadow DOM 隔离', !!shadow);
  check('面板渲染成功 (.ces-root)', !!shadow.querySelector('.ces-root'));
  check('没有向宿主页面注入任何 <style>', window.document.querySelectorAll('style').length === 0);
  check('没有创建/改写宿主页面容器',
    ['#rhs', '#content_right', '#b_context'].every(sel => !window.document.querySelector(sel)));

  check('从 site: 正确提取目标域名',
    shadow.querySelector('.ces-target-value')?.textContent === 'example.edu.cn');

  const dorks = shadow.querySelectorAll('.ces-dork');
  check('语法按钮已渲染', dorks.length > 20, `${dorks.length} 条`);
  check('每条语法都是独立的圆角卡片（有描边样式类）',
    dorks[0].classList.contains('ces-dork') && !!dorks[0].querySelector('.ces-chip'));
  check('风险等级以描边色块呈现', dorks[0].querySelector('.ces-chip').className.includes('is-'));

  const highDork = shadow.querySelector('.ces-dork .ces-dot.is-high')?.closest('.ces-dork');
  highDork.click();
  check('点击语法立即打开搜索页', opened.length === 1, JSON.stringify(opened));
  check('搜索 URL 参数正确', /bing\.com\/search\?q=/.test(opened[0] || ''));
  check('点过的语法被标记为已执行', highDork.classList.contains('is-visited'));
  check('已执行记录写入存储',
    Array.isArray(store['ces.visited'] && store['ces.visited']['example.edu.cn']));

  // URL 提取
  opened.length = 0;
  Array.from(shadow.querySelectorAll('.ces-tab')).find(t => t.textContent.includes('URL')).click();
  shadow.querySelector('[data-act="extract"]').click();
  await tick();
  await tick();

  const items = Array.from(shadow.querySelectorAll('.ces-url'));
  const texts = items.map(el => el.querySelector('.ces-url-text')?.textContent || '');
  check('提取到结果 URL', items.length >= 3, `${items.length} 条`);
  check('解析 Bing /ck/a 跳转链接', texts.some(u => u.includes('e.example.edu.cn')), texts.join(' | '));
  check('过滤搜索引擎自身链接', !texts.some(u => u.includes('bing.com')), texts.join(' | '));
  check('过滤 footer 内链接', !texts.some(u => u.includes('/legal')), texts.join(' | '));
  check('敏感 URL 命中并打标签',
    !!Array.from(items).find(el => (el.textContent || '').includes('/admin/login.do'))?.querySelector('.ces-tag'));
  check('读取到结果总数', (shadow.querySelector('[data-role="url-stats"]')?.textContent || '').includes('12,300'));

  // 测绘
  Array.from(shadow.querySelectorAll('.ces-tab')).find(t => t.textContent.includes('测绘')).click();
  shadow.querySelector('[data-mode="cert"]').click();
  check('切到证书拓线模式',
    shadow.querySelector('[data-mode="cert"]').classList.contains('is-active'));

  opened.length = 0;
  shadow.querySelector('[data-platform="fofa"]').click();
  let decoded = '';
  try {
    decoded = Buffer.from(decodeURIComponent(new URL(opened[0]).searchParams.get('qbase64')), 'base64').toString('utf8');
  } catch (e) {
    decoded = 'decode-error:' + e.message;
  }
  check('Fofa qbase64 证书语法正确', decoded === 'cert="example.edu.cn"', decoded);

  opened.length = 0;
  shadow.querySelector('[data-platform="quake"]').click();
  check('Quake 深链包含 cert 语法',
    decodeURIComponent(opened[0] || '').includes('cert:"example.edu.cn"'));

  opened.length = 0;
  shadow.querySelector('[data-extra="crtname"]').click();
  check('crt.name 查询链接格式正确',
    opened[0] === 'https://crt.name/v1/search?apex=example.edu.cn', opened[0]);

  check('已移除旧的 crt.sh 入口', !shadow.querySelector('[data-extra="crtsh"]'));

  // 收起 / 悬浮球
  shadow.querySelector('[data-act="collapse"]').click();
  const pill = shadow.querySelector('.ces-pill');
  check('收起后出现悬浮球', !!pill);
  pill.click();
  check('点击悬浮球可恢复面板', shadow.querySelector('.ces-root').hidden === false);
}

async function testGoogle() {
  results.push('\n[2] 内容脚本 · Google 提取（含遗留跳转链接）');
  const ctx = await runContentScript(GOOGLE_HTML, 'https://www.google.com/search?q=site%3Aexample.edu.cn');
  const { shadow, opened } = ctx;
  if (!shadow) {
    check('Google 面板挂载', false);
    return;
  }
  check('Google 面板挂载', true);

  Array.from(shadow.querySelectorAll('.ces-tab')).find(t => t.textContent.includes('URL')).click();
  shadow.querySelector('[data-act="extract"]').click();
  await tick();
  await tick();

  const texts = Array.from(shadow.querySelectorAll('.ces-url'))
    .map(el => el.querySelector('.ces-url-text')?.textContent || '');
  check('提取到 Google 结果', texts.length >= 3, `${texts.length} 条: ${texts.join(' | ')}`);
  check('正确还原 /url?q= 遗留跳转',
    texts.some(u => u.includes('nic.example.edu.cn')), texts.join(' | '));
  check('还原后不再把 google.com 当结果',
    !texts.some(u => u.includes('google.com')), texts.join(' | '));
  check('过滤 #botstuff 内的页脚链接',
    !texts.some(u => u.includes('policies.google.com')), texts.join(' | '));
  check('提取到搜索结果总数',
    (shadow.querySelector('[data-role="url-stats"]')?.textContent || '').includes('4,310'));

  // 导出 / 复制按钮不应抛错
  let crashed = false;
  try {
    shadow.querySelector('[data-act="copy-all"]').click();
  } catch (e) {
    crashed = true;
  }
  check('复制全部按钮不抛异常', !crashed);
}

async function testBaidu() {
  results.push('\n[3] 内容脚本 · 百度提取（mu 属性）');
  const ctx = await runContentScript(BAIDU_HTML, 'https://www.baidu.com/s?wd=site%3Aexample.edu.cn');
  const { shadow } = ctx;
  if (!shadow) {
    check('百度面板挂载', false);
    return;
  }
  check('百度面板挂载', true);

  Array.from(shadow.querySelectorAll('.ces-tab')).find(t => t.textContent.includes('URL')).click();
  shadow.querySelector('[data-act="extract"]').click();
  await tick();
  await tick();

  const texts = Array.from(shadow.querySelectorAll('.ces-url'))
    .map(el => el.querySelector('.ces-url-text')?.textContent || '');
  check('从 mu 属性取到真实地址', texts.some(u => u.includes('jwc.example.edu.cn')), texts.join(' | '));
  check('丢弃无用的 /link?url= 跳转链接',
    !texts.some(u => u.includes('baidu.com/link')), texts.join(' | '));

  // 全页扫描兜底：清空结果区后再提取，应该走兜底策略而不是直接 0 条
  shadow.querySelector('[data-act="extract"]').click();
  await tick();
  await tick();
  const again = shadow.querySelectorAll('.ces-url').length;
  check('重复提取结果稳定', again === texts.length, `${again} vs ${texts.length}`);
}

async function testOptionsPage() {
  results.push('\n[4] 选项页 · 设置保存');
  const htmlRaw = read('options.html').replace('<script src="options.js"></script>', '');
  const dom = new JSDOM(htmlRaw, { url: 'chrome-extension://abc/options.html', runScripts: 'outside-only' });
  const { window } = dom;
  const store = {
    'ces.settings': {
      sidebarEnabled: true,
      googleEnabled: true,
      baiduEnabled: true,
      bingEnabled: true,
      openInNewTab: true,
      urlClickAction: 'copy',
      urlBlacklist: [],
      groupByCategory: true,
      assetPanelEnabled: true,
      sensitiveHighlightEnabled: true,
      showVisitedMarks: true,
      batchTabLimit: 5,
      batchDelayMs: 1200,
      theme: 'light',
      followSystemTheme: true
    }
  };
  window.chrome = makeChrome(store, [], []);
  window.eval(read('dist/options.js'));
  await tick();
  await tick();

  const doc = window.document;
  check('开关状态从存储回填', doc.getElementById('swSidebar')?.getAttribute('aria-checked') === 'true');

  doc.getElementById('swGroup').click();
  await tick();
  const saved = store['ces.settings'];
  check('关闭分组后写入存储', saved.groupByCategory === false);
  check('【回归】保存不丢其他设置项', saved.assetPanelEnabled === true
    && saved.sensitiveHighlightEnabled === true
    && saved.batchTabLimit === 5
    && saved.batchDelayMs === 1200
    && saved.showVisitedMarks === true
    && saved.sidebarEnabled === true);

  const limit = doc.getElementById('batchLimit');
  limit.value = '99';
  limit.dispatchEvent(new window.Event('change', { bubbles: true }));
  await tick();
  check('批量上限被钳制在 1-20', store['ces.settings'].batchTabLimit === 20);

  const rows = doc.getElementById('dorkList').querySelectorAll('.dork-row');
  check('语法库列表渲染', rows.length > 50, `${rows.length} 行`);

  rows[0].querySelector('[data-engine="baidu"]').click();
  await tick();
  check('分引擎开关写入语法库',
    Array.isArray(store['ces.dorks']) && store['ces.dorks'].some(d => d.engineSettings.baidu === false));

  doc.getElementById('newName').value = '测试语法';
  doc.getElementById('newTemplate').value = 'site:{target_domain} inurl:test';
  doc.getElementById('addDork').click();
  await tick();
  check('新增自定义语法成功', store['ces.dorks'].some(d => d.name === '测试语法' && d.builtin === false));

  const before = store['ces.dorks'].length;
  doc.getElementById('newName').value = '坏语法';
  doc.getElementById('newTemplate').value = 'inurl:no-placeholder';
  doc.getElementById('addDork').click();
  await tick();
  check('模板缺少占位符时拒绝添加', store['ces.dorks'].length === before);
}

(async () => {
  const suites = [testBing, testGoogle, testBaidu, testOptionsPage];
  for (const suite of suites) {
    try {
      await suite();
    } catch (err) {
      fail += 1;
      results.push(`  ✗ 用例异常: ${err && err.stack}`);
    }
  }

  console.log(results.join('\n'));
  console.log(`\n通过 ${pass} 项，失败 ${fail} 项`);
  process.exit(fail === 0 ? 0 : 1);
})();
