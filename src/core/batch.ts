/**
 * 队列式批量执行器
 *
 * v1.0 的问题：slice(0, limit) 直接丢掉剩余项，且无延迟连开标签页，
 * 极易触发搜索引擎人机验证。这里改为：
 * - 全部高危语法入队，按「每批 N 个」推进
 * - 每个标签页之间加随机抖动延迟，批与批之间再额外等待
 * - 支持暂停 / 继续 / 停止，进度实时回显
 */

export interface BatchHooks {
  onStart(total: number): void;
  onProgress(done: number, total: number, current: string): void;
  onFinish(done: number, total: number, reason: 'done' | 'stopped'): void;
}

export interface BatchItem {
  id: string;
  label: string;
  url: string;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => window.setTimeout(resolve, ms));
}

export class BatchRunner {
  private stopped = false;
  private paused = false;
  private running = false;

  get isRunning(): boolean {
    return this.running;
  }

  get isPaused(): boolean {
    return this.paused;
  }

  pause(): void {
    if (this.running) this.paused = true;
  }

  resume(): void {
    this.paused = false;
  }

  stop(): void {
    this.stopped = true;
    this.paused = false;
  }

  async run(items: BatchItem[], batchSize: number, delayMs: number, hooks: BatchHooks): Promise<void> {
    if (this.running || items.length === 0) return;

    this.running = true;
    this.stopped = false;
    this.paused = false;

    const size = Math.max(1, Math.min(20, batchSize));
    let done = 0;
    hooks.onStart(items.length);

    try {
      for (let i = 0; i < items.length; i += 1) {
        if (this.stopped) break;

        const item = items[i];
        await this.runOne(item);
        done += 1;
        hooks.onProgress(done, items.length, item.label);

        const batchEnded = (i + 1) % size === 0;
        const isLast = i === items.length - 1;
        if (!isLast) {
          await sleep(batchEnded ? delayMs * 2 : delayMs + Math.random() * 500);
        }
        while (this.paused && !this.stopped) {
          await sleep(200);
        }
      }
    } finally {
      this.running = false;
      hooks.onFinish(done, items.length, this.stopped ? 'stopped' : 'done');
    }
  }

  /** content script 不能使用 chrome.tabs，交给 background 打开 */
  private runOne(item: BatchItem): Promise<void> {
    return new Promise(resolve => {
      try {
        chrome.runtime.sendMessage({ type: 'openUrls', urls: [item.url] }, () => {
          // 读取 lastError 避免控制台未捕获异常；无论成功失败都继续队列
          void chrome.runtime.lastError;
          resolve();
        });
      } catch {
        resolve();
      }
    });
  }
}
