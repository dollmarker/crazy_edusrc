/**
 * 内联 SVG 图标集
 *
 * v1.0 的教训：往搜索结果页注入 Font Awesome 需要额外 100KB CSS + 3 个字体文件，
 * 还得开 web_accessible_resources；而它没注入，导致所有 <i class="fas ..."> 都是空白。
 * 这里统一用内联 SVG，跟随 currentColor，主题切换自动变色。
 */

const LINE: Record<string, string> = {
  logo: '<circle cx="8" cy="8" r="5.6"/><circle cx="8" cy="8" r="2.3"/><circle cx="8" cy="8" r="0.6" fill="currentColor" stroke="none"/>',
  search: '<circle cx="7" cy="7" r="4.4"/><path d="M10.4 10.4L14 14"/>',
  close: '<path d="M4.2 4.2l7.6 7.6M11.8 4.2l-7.6 7.6"/>',
  collapse: '<path d="M6 3.5L10.5 8 6 12.5"/>',
  expand: '<path d="M10 3.5L5.5 8 10 12.5"/>',
  sliders: '<path d="M2.5 4.5h11M2.5 8h11M2.5 11.5h11"/><circle cx="6" cy="4.5" r="1.5" fill="currentColor" stroke="none"/><circle cx="10.5" cy="8" r="1.5" fill="currentColor" stroke="none"/><circle cx="5" cy="11.5" r="1.5" fill="currentColor" stroke="none"/>',
  globe: '<circle cx="8" cy="8" r="5.8"/><path d="M2.4 8h11.2"/><ellipse cx="8" cy="8" rx="2.5" ry="5.8"/>',
  copy: '<rect x="5.6" y="5.6" width="7.8" height="7.8" rx="1.6"/><path d="M10.4 3.4A1.4 1.4 0 0 0 9 2H3.6A1.6 1.6 0 0 0 2 3.6V9a1.4 1.4 0 0 0 1.4 1.4"/>',
  check: '<path d="M3.2 8.6l3.1 3L12.8 4.6"/>',
  external: '<path d="M9.2 3h3.8v3.8M13 3l-5.4 5.4"/><path d="M11.8 9.6V12a1.4 1.4 0 0 1-1.4 1.4H4A1.4 1.4 0 0 1 2.6 12V5.6A1.4 1.4 0 0 1 4 4.2h2.4"/>',
  download: '<path d="M8 2.4v7.4m0 0L5.2 7m2.8 2.8L10.8 7"/><path d="M2.8 11.6V13a1 1 0 0 0 1 1h8.4a1 1 0 0 0 1-1v-1.4"/>',
  upload: '<path d="M8 10.6V3.2m0 0L5.2 6m2.8-2.8L10.8 6"/><path d="M2.8 11.6V13a1 1 0 0 0 1 1h8.4a1 1 0 0 0 1-1v-1.4"/>',
  link: '<path d="M6.6 9.4l2.8-2.8"/><path d="M9.4 6.2l1.2-1.2a2.5 2.5 0 0 0-3.5-3.5L5.9 2.7"/><path d="M6.6 9.8l-1.2 1.2a2.5 2.5 0 0 0 3.5 3.5l1.2-1.2"/>',
  trash: '<path d="M2.8 4.4h10.4M6.2 4.4V2.8h3.6v1.6"/><path d="M4.4 4.4l.7 8.3a1 1 0 0 0 1 .9h3.8a1 1 0 0 0 1-.9l.7-8.3"/>',
  plus: '<path d="M8 3.4v9.2M3.4 8h9.2"/>',
  alert: '<path d="M8 2.4l6 10.6H2z"/><path d="M8 6.4v3.2"/><circle cx="8" cy="11.3" r="0.7" fill="currentColor" stroke="none"/>',
  refresh: '<path d="M13.2 8a5.2 5.2 0 1 1-1.7-3.9"/><path d="M13.2 2.6v3.2H10"/>',
  chevronDown: '<path d="M4.2 6.4L8 10.2l3.8-3.8"/>',
  shield: '<path d="M8 2l5 1.8v4.3c0 3-2.1 5.4-5 6.1-2.9-.7-5-3.1-5-6.1V3.8z"/>',
  info: '<circle cx="8" cy="8" r="5.8"/><path d="M8 7.3v3.9"/><circle cx="8" cy="5.1" r="0.75" fill="currentColor" stroke="none"/>',
  filter: '<path d="M2.6 4.2h10.8L9.1 9v4.6l-2.2-1.2V9z"/>',
  target: '<circle cx="8" cy="8" r="5.6"/><circle cx="8" cy="8" r="2.3"/>',
  bolt: '<path d="M8.9 1.4L3.4 9.1h3.5l-.8 5.5 5.7-7.9H8.2z"/>',
  play: '<path d="M5.2 3.4L12 8l-6.8 4.6z"/>',
  pause: '<rect x="4.4" y="3.4" width="2.6" height="9.2" rx="0.8"/><rect x="9" y="3.4" width="2.6" height="9.2" rx="0.8"/>',
  stop: '<rect x="4.4" y="4.4" width="7.2" height="7.2" rx="1.2"/>',
  radar: '<circle cx="8" cy="8" r="5.6"/><path d="M8 8l3.6-3.6"/><path d="M11.4 3.8A5 5 0 0 1 11.6 8"/>',
  moon: '<path d="M13.4 9.6A5.6 5.6 0 0 1 6.4 2.6a5.7 5.7 0 1 0 7 7z"/>',
  sun: '<circle cx="8" cy="8" r="3.2"/><path d="M8 1.4v1.6M8 13v1.6M1.4 8h1.6M13 8h1.6M3.4 3.4l1.1 1.1M11.5 11.5l1.1 1.1M12.6 3.4l-1.1 1.1M4.5 11.5l-1.1 1.1"/>',
  github: '<path d="M8 .6a7.4 7.4 0 0 0-2.34 14.42c.37.07.5-.16.5-.35v-1.3c-2.06.45-2.5-.99-2.5-.99-.33-.86-.82-1.09-.82-1.09-.67-.46.05-.45.05-.45.74.05 1.13.76 1.13.76.66 1.13 1.73.8 2.15.61.07-.48.26-.8.47-.99-1.65-.19-3.38-.82-3.38-3.66 0-.81.29-1.47.76-1.99-.08-.19-.33-.94.07-1.96 0 0 .62-.2 2.04.76a7.1 7.1 0 0 1 3.72 0c1.42-.96 2.04-.76 2.04-.76.4 1.02.15 1.77.07 1.96.47.52.76 1.18.76 1.99 0 2.85-1.74 3.47-3.39 3.65.27.23.5.68.5 1.37v2.03c0 .19.13.42.51.35A7.4 7.4 0 0 0 8 .6z"/>'
};

/** 需要以实心填充渲染的图标 */
const SOLID = new Set(['bolt', 'play', 'pause', 'stop', 'github']);

export type IconName = keyof typeof LINE;

export function icon(name: IconName, size = 16): string {
  const inner = LINE[name] || '';
  if (SOLID.has(name)) {
    return `<svg width="${size}" height="${size}" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">${inner}</svg>`;
  }
  return `<svg width="${size}" height="${size}" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`;
}
