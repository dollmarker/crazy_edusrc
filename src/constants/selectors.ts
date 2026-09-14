/**
 * 搜索结果选择器（多候选，改版时只需在这里补充）
 *
 * 重要：excluded 里只放"确定不是搜索结果"的容器。
 * 早期版本曾照搬 v1.0 的 .o3j99 / .bj9MHd 等模糊选择器，它们可能是结果的祖先节点，
 * 会把整页结果一刀切掉（这正是"提取 URL 没用"的元凶之一）。
 */

export const RESULT_SELECTORS: Record<string, string[]> = {
  // 注意：Google 的遗留结果是相对路径 /url?q=<真实地址>，
  // 这类 <a> 不能用 href^="http" 匹配，必须用 a[href] 再交给 normalizeUrl 还原。
  google: [
    '.yuRUbf > a[href]',
    '.tF2Cxc a[href]',
    'div[data-snf] > a[href]',
    '[data-header-feature] a[href]',
    '#rso a[href^="http"]',
    '#rso a[href^="/url?"]',
    '#search a h3'
  ],
  baidu: [
    'div[mu]',
    '#content_left .result a[href]',
    '#content_left .c-container a[href]',
    '#content_left h3 a',
    '#content_left a[href^="http"]'
  ],
  bing: [
    '.b_algo h2 a[href]',
    'li.b_algo a[href^="http"]',
    '.b_title a[href]',
    '#b_results .b_algo a[href]',
    '#b_results a[href^="http"]'
  ]
};

/** 结果区容器（兜底扫描用） */
export const RESULT_CONTAINERS: Record<string, string[]> = {
  google: ['#search', '#rso', '#center_col'],
  baidu: ['#content_left'],
  bing: ['#b_results']
};

/** 这些容器里的链接一定不是搜索结果 */
export const EXCLUDED_SELECTORS: Record<string, string[]> = {
  google: [
    'footer',
    '#footcnt',
    '#botstuff',
    '[role="navigation"]',
    '.hacking-sidebar',
    '#ces-host'
  ],
  baidu: [
    'footer',
    '#bottom_layer',
    '.page-ft',
    '.c-tools',
    '.c-tip-con',
    '.c-recommend',
    '#ces-host'
  ],
  bing: [
    'footer',
    '.b_footer',
    '#b_context',
    '.b_ad',
    '.b_pag',
    '#ces-host'
  ]
};

/** 结果总数区域 */
export const STATS_SELECTORS: Record<string, string[]> = {
  google: ['#result-stats'],
  baidu: ['.hint_PIwZX', '.nums_text', '#tsn_inner'],
  bing: ['.sb_count', '#b_tween .sb_count']
};
