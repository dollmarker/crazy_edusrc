/**
 * 把 HTML 里 data-icon 占位符替换成内联 SVG
 * 用法：<span data-icon="logo" data-size="18"></span>
 *      <button data-icon="sliders" data-size="14" data-label="设置"></button>
 */

import { icon, type IconName } from './icons';

export function applyIcons(root: ParentNode = document): void {
  root.querySelectorAll<HTMLElement>('[data-icon]').forEach(el => {
    const name = el.getAttribute('data-icon') as IconName;
    if (!name) return;
    const size = Number(el.getAttribute('data-size') || 16);
    const label = el.getAttribute('data-label');
    el.innerHTML = icon(name, size) + (label ? `<span>${label}</span>` : '');
    el.removeAttribute('data-icon');
  });
}
