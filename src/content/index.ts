/**
 * 内容脚本入口
 *
 * 相比 v1.0 的关键改动：
 * - 不再对 document 做 subtree MutationObserver（那是页面卡顿的主因），
 *   改用 1 秒一次的 href 字符串比较 + popstate，几乎零开销
 * - 不再向宿主页面注入任何 CSS，也不再改写 #rhs / #content_right / #b_content
 * - 面板挂在独立宿主 + Shadow DOM 上，与页面样式完全隔离
 */

import { Panel } from '../core/panel';
import { currentTarget, detectEngine } from '../core/engine';
import { appState } from '../services/state';
import type { Engine, RuntimeMessage } from '../types';

declare global {
  interface Window {
    __crazyedusrcMounted?: boolean;
  }
}

let panel: Panel | null = null;
let engine: Engine | null = null;
let lastHref = location.href;
/** 用户主动点过关闭的地址：在同一个地址上不再自动展开 */
let dismissedHref: string | null = null;

function isEngineEnabled(target: Engine): boolean {
  const s = appState.settings;
  if (!s.sidebarEnabled) return false;
  if (target === 'google') return s.googleEnabled;
  if (target === 'baidu') return s.baiduEnabled;
  return s.bingEnabled;
}

function mount(target: string): void {
  if (!engine) return;
  panel = new Panel({
    engine,
    target,
    onOpenOptions: () => {
      chrome.runtime.sendMessage({ type: 'openOptions' } satisfies RuntimeMessage);
    },
    onRequestClose: () => {
      // 记住这个地址，避免被自动挂载反复弹出来
      dismissedHref = location.href;
      unmount();
    }
  });
  panel.mount();
}

function unmount(): void {
  panel?.destroy();
  panel = null;
}

/** 按当前 URL 与设置同步面板状态 */
function sync(): void {
  if (!engine) return;

  if (!isEngineEnabled(engine)) {
    if (panel) unmount();
    return;
  }

  const target = currentTarget(engine);
  if (panel) {
    panel.setTarget(target);
    return;
  }
  if (!appState.settings.autoMount) return;
  if (!target) return;
  if (dismissedHref === location.href) return;
  mount(target);
}

/** 快捷键 / popup 触发时按需挂载（忽略「已关闭」标记） */
function ensurePanel(): Panel | null {
  if (!engine || !isEngineEnabled(engine)) return null;
  if (!panel) mount(currentTarget(engine));
  return panel;
}

function handleCommand(command: string): void {
  switch (command) {
    case 'toggle-panel': {
      const instance = ensurePanel();
      instance?.toggleCollapse();
      break;
    }
    case 'run-high-risk':
      ensurePanel()?.triggerHighRisk();
      break;
    case 'extract-urls':
      ensurePanel()?.triggerExtract();
      break;
    default:
      break;
  }
}

function listenRuntimeMessages(): void {
  if (!chrome.runtime?.onMessage) return;
  chrome.runtime.onMessage.addListener((message: RuntimeMessage, _sender, sendResponse) => {
    if (message?.type === 'runCommand' && message.command) {
      handleCommand(message.command);
      sendResponse({ ok: true });
    }
    return false;
  });
}

/** 轻量导航监听：1 秒比较一次 href，避免全局 MutationObserver 的开销 */
function watchNavigation(): void {
  window.addEventListener('popstate', () => {
    dismissedHref = null;
    sync();
  }, { passive: true });
  window.setInterval(() => {
    if (location.href === lastHref) return;
    lastHref = location.href;
    dismissedHref = null;
    sync();
  }, 1000);
}

async function bootstrap(): Promise<void> {
  if (window.__crazyedusrcMounted) return;

  const detected = detectEngine();
  if (!detected) return;
  engine = detected;
  window.__crazyedusrcMounted = true;

  await appState.hydrate();

  sync();
  watchNavigation();
  listenRuntimeMessages();
  appState.subscribe(() => sync());

  window.addEventListener('beforeunload', () => unmount(), { once: true });
}

void bootstrap();
