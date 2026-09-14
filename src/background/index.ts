/**
 * Service Worker
 *
 * 职责收敛为三件事：初始化存储、代开标签页、转发快捷键。
 * 不做任何与页面 DOM 相关的逻辑。
 */

import { BUILTIN_DORKS } from '../constants/dorks';
import { DEFAULT_SETTINGS, STORAGE_KEYS } from '../constants/defaults';
import { mergeDorkLibrary } from '../services/dorkLibrary';
import { storage } from '../services/storage';
import type { Dork, RuntimeMessage } from '../types';

chrome.runtime.onInstalled.addListener(details => {
  if (details.reason === 'install') {
    void storage.setMany({
      [STORAGE_KEYS.settings]: DEFAULT_SETTINGS,
      [STORAGE_KEYS.dorks]: BUILTIN_DORKS,
      [STORAGE_KEYS.installedAt]: Date.now()
    });
    void chrome.tabs.create({ url: 'options.html' });
    return;
  }

  // 升级：只合并语法库，绝不覆盖用户设置
  void (async () => {
    const data = await storage.getMany([STORAGE_KEYS.dorks]);
    const merged = mergeDorkLibrary(data[STORAGE_KEYS.dorks] as Dork[] | undefined);
    await storage.set(STORAGE_KEYS.dorks, merged);
  })();
});

chrome.runtime.onMessage.addListener((message: RuntimeMessage, _sender, sendResponse) => {
  if (!message || typeof message.type !== 'string') return false;

  if (message.type === 'openOptions') {
    void chrome.runtime.openOptionsPage();
    sendResponse({ ok: true });
    return true;
  }

  if (message.type === 'openUrls' && Array.isArray(message.urls)) {
    const urls = message.urls.filter(
      (url): url is string => typeof url === 'string' && /^https?:\/\//i.test(url)
    );

    void (async () => {
      let opened = 0;
      for (const url of urls) {
        try {
          await chrome.tabs.create({ url, active: false });
          opened += 1;
        } catch (err) {
          console.warn('[crazyedusrc] 打开标签页失败', url, err);
        }
      }
      sendResponse({ ok: true, opened });
    })();

    return true;
  }

  return false;
});

/** 快捷键转发到当前标签页的内容脚本 */
chrome.commands?.onCommand.addListener(command => {
  void (async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id) return;
      await chrome.tabs.sendMessage(tab.id, { type: 'runCommand', command } satisfies RuntimeMessage);
    } catch {
      // 非搜索页 / 内容脚本未注入，静默忽略
    }
  })();
});
