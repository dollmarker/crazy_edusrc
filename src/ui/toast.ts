/**
 * 面板内轻提示（替代 v1.0 的原生 alert，避免阻塞宿主页面）
 */

export type ToastKind = 'ok' | 'warn' | 'err' | 'info';

/** 最多同时显示 3 条，多余的排队 */
export function createToaster(container: HTMLElement) {
  const queue: Array<() => void> = [];
  const active: HTMLElement[] = [];

  const flush = () => {
    while (active.length < 3 && queue.length > 0) {
      const job = queue.shift();
      if (job) job();
    }
  };

  return (message: string, kind: ToastKind = 'info', duration = 2200) => {
    const el = document.createElement('div');
    el.className = `ces-toast is-${kind}`;
    el.textContent = message;

    const show = () => {
      container.appendChild(el);
      active.push(el);
      window.setTimeout(() => {
        el.classList.add('is-out');
        window.setTimeout(() => {
          el.remove();
          const idx = active.indexOf(el);
          if (idx >= 0) active.splice(idx, 1);
          flush();
        }, 220);
      }, duration);
    };

    if (active.length < 3) show();
    else queue.push(show);
  };
}
