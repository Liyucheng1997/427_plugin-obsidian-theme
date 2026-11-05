// 把档案 + 设置翻译成 CSS 变量。主题（Blue Topaz / 默认主题）读的变量也一并覆盖，
// 这样标题、链接、按钮等颜色都跟着档案走。

import { hexToRgb, rgbToHsl, rgbTriple } from './color';
import { Preset, Tokens } from './presets';
import { LiuliSettings } from '../settings';
import { paperById } from './paper';

function wallpaper(t: Tokens): string {
  const layers = t.wallpaper.blobs.map(b =>
    `radial-gradient(${b.size}vmax ${b.size}vmax at ${b.x}% ${b.y}%, ${b.color} 0%, transparent 70%)`);
  return [...layers, t.wallpaper.bg].join(', ');
}

const APPLE_FONT = `-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'SF Pro Display', 'PingFang SC', 'Helvetica Neue', 'Microsoft YaHei', 'Noto Sans SC', sans-serif`;

function block(p: Preset, t: Tokens, s: LiuliSettings, dark: boolean): string {
  const g = s.glass;
  const solid = g.material === 'solid';
  const [h, sat, l] = rgbToHsl(hexToRgb(t.accent));
  const shadow = rgbTriple(t.shadow);
  const ink = rgbTriple(t.ink);
  // 高光克制：浅色模式上沿一道细白线，深色模式更弱
  const rimHi = dark ? 'rgba(255,255,255,.10)' : 'rgba(255,255,255,.75)';
  const rimLo = dark ? 'rgba(255,255,255,.04)' : 'rgba(255,255,255,.20)';
  const hair = dark ? 'rgba(255,255,255,.07)' : `rgba(${ink},.07)`;
  const v: Record<string, string> = {
    // —— 琉璃自己的变量 ——
    '--lg-base': t.base,
    '--lg-ink': t.ink,
    '--lg-ink-rgb': ink,
    '--lg-ink-muted': t.inkMuted,
    '--lg-accent': t.accent,
    '--lg-accent-ink': t.accentInk,
    '--lg-link': t.link,
    '--lg-tint': t.glassTint,
    '--lg-shadow-rgb': shadow,
    '--lg-wallpaper': wallpaper(t),
    '--lg-blur': `${g.blur}px`,
    '--lg-sat': dark ? '140%' : '160%',
    '--lg-bg': t.wallpaper.bg,
    '--lg-pane-bg': solid ? t.paneTint : `color-mix(in srgb, ${t.paneTint} ${g.paneAlpha}%, transparent)`,
    '--lg-float-bg': solid ? t.glassTint : `color-mix(in srgb, ${t.glassTint} ${g.floatAlpha}%, transparent)`,
    '--lg-float-solid': solid ? t.glassTint : `color-mix(in srgb, ${t.glassTint} ${Math.min(97, g.floatAlpha + 20)}%, transparent)`,
    '--lg-sheet-bg': solid ? t.base : `color-mix(in srgb, ${t.base} ${g.sheetAlpha}%, transparent)`,
    '--lg-chip-bg': solid ? (dark ? '#3A3A3C' : '#FFFFFF') : (dark ? 'rgba(255,255,255,.07)' : 'rgba(255,255,255,.70)'),
    '--lg-fill': dark ? '#2C2C2E' : '#E8E8ED',
    '--lg-hover-bg': solid ? (dark ? 'rgba(255,255,255,.06)' : 'rgba(0,0,0,.04)') : `rgba(${ink},${dark ? .06 : .045})`,
    '--lg-active-bg': solid
      ? (dark ? `color-mix(in srgb, ${t.accent} 16%, transparent)` : `color-mix(in srgb, ${t.accent} 9%, #FFFFFF)`)
      : `color-mix(in srgb, ${t.accent} ${dark ? 18 : 12}%, transparent)`,
    '--lg-active-ink': solid ? t.accent : t.ink,
    '--lg-hair': solid ? (dark ? 'rgba(255,255,255,.1)' : 'rgba(0,0,0,.08)') : hair,
    '--lg-rim-hi': solid ? 'transparent' : rimHi,
    '--lg-rim-lo': solid ? 'transparent' : rimLo,
    '--lg-inset': solid ? 'inset 0 0 0 0 transparent' : `inset 0 1px 0 ${rimHi}, inset 0 0 0 1px ${hair}`,
    '--lg-drop': solid
      ? (dark ? '0 0 0 1px rgba(255,255,255,.06)' : '0 1px 2px rgba(0,0,0,.04), 0 4px 16px rgba(0,0,0,.04)')
      : dark
        ? `0 1px 2px rgba(0,0,0,.30), 0 12px 32px -12px rgba(0,0,0,.55)`
        : `0 1px 2px rgba(${shadow},.05), 0 10px 30px -14px rgba(${shadow},.22)`,
    '--lg-pop': solid
      ? (dark ? '0 10px 38px rgba(0,0,0,.6), 0 0 0 .5px rgba(255,255,255,.12)' : '0 10px 38px rgba(0,0,0,.14), 0 0 0 .5px rgba(0,0,0,.08)')
      : `inset 0 1px 0 ${rimHi}, inset 0 0 0 1px ${hair}, 0 1px 2px rgba(${shadow},.05), 0 10px 30px -14px rgba(${shadow},.22)`,
    '--lg-fc-mix': `${dark ? s.folderColor.mixDark : s.folderColor.mixLight}%`,

    // —— 覆盖 Obsidian / Blue Topaz 的颜色变量 ——
    '--accent-h': `${h}`,
    '--accent-s': `${sat}%`,
    '--accent-l': `${l}%`,
    '--interactive-accent': t.accent,
    '--interactive-accent-hover': t.accentInk,
    '--interactive-accent-rgb': rgbTriple(t.accent),
    '--text-accent': t.accentInk,
    '--text-accent-hover': t.accent,
    '--text-normal': t.ink,
    '--text-muted': t.inkMuted,
    '--text-faint': t.inkMuted,
    '--text-folder-file': t.ink,
    '--folder-title': t.ink,
    '--inline-title-color': t.ink,
    '--link-color': t.link,
    '--link-color-hover': t.accent,
    '--link-unresolved-color': t.inkMuted,
    '--unresolved-link': t.inkMuted,
    '--text-folder-file-icon': t.accent,
    '--link-external-color': t.link,
    '--internal-link-color': t.link,
    '--internal-link-color-hover': t.accent,
    '--external-link-color': t.link,
    '--link-decoration-color': `color-mix(in srgb, ${t.link} 35%, transparent)`,
    '--link-unresolved-decoration-color': t.inkMuted,
    '--list-marker-color': t.inkMuted,
    '--list-ol-number-color': t.inkMuted,
    '--list-ol-block-color': t.inkMuted,
    '--list-ol-hover': t.accentInk,
    '--list-ul-disc-color': t.inkMuted,
    '--list-ul-block-color': t.inkMuted,
    '--list-ul-hover': t.accentInk,
    '--activeline-background': `rgba(${ink},${dark ? .04 : .025})`,
    '--background-blockquote': `rgba(${ink},${dark ? .05 : .03})`,
    '--blockquote-border-color': `color-mix(in srgb, ${t.accent} 60%, transparent)`,
    '--background-code': `rgba(${ink},${dark ? .06 : .04})`,
    '--text-color-code': t.accentInk,
    '--code-normal': t.ink,
    '--text-selection': `color-mix(in srgb, ${t.accent} 22%, transparent)`,
    '--text-highlight-bg': t.highlight,
    '--mark-highlight-strong-em': t.highlight,
    '--checkbox-color': t.accent,
    '--checkbox-color-hover': t.accentInk,
    '--tag-color': t.accentInk,
    '--tag-background': `color-mix(in srgb, ${t.accent} 10%, transparent)`,
    '--tag-background-hover': `color-mix(in srgb, ${t.accent} 16%, transparent)`,
    '--tag-text': t.accentInk,
    '--search-result-file-title-color': t.accentInk,
    '--strong-em-highlight-color': t.accentInk,
    '--accent-strong': t.ink,
    '--accent-em': t.ink,
  };
  if (g.material === 'crystal') {
    // liyucheng.me 的玻璃卡片配方
    Object.assign(v, dark ? {
      '--lg-card-bg': 'rgba(44,44,46,.55)',
      '--lg-card-edge': 'rgba(255,255,255,.08)',
      '--lg-card-outline': 'rgba(0,0,0,.55)',
      '--lg-card-shadow': '0 10px 34px -14px rgba(0,0,0,.6), inset 0 1px 0 rgba(255,255,255,.06)',
      '--lg-sheet-bg': 'rgba(28,28,30,.86)',
      '--lg-sheet-shadow': '0 30px 80px -40px rgba(0,0,0,.7), inset 0 1px 0 rgba(255,255,255,.05)',
      '--lg-float-bg': 'rgba(44,44,46,.82)',
      '--lg-float-solid': 'rgba(36,36,38,.92)',
      '--lg-pop': '0 24px 60px -24px rgba(0,0,0,.7), inset 0 1px 0 rgba(255,255,255,.06)',
      '--lg-chip-bg': 'rgba(255,255,255,.10)',
      '--lg-chip-shadow': '0 4px 18px rgba(0,0,0,.3)',
      '--lg-hover-bg': 'rgba(255,255,255,.06)',
      '--lg-active-bg': 'rgba(255,255,255,.12)',
      '--lg-active-ink': t.ink,
      '--lg-hair': 'rgba(255,255,255,.08)',
      '--lg-dim': 'rgba(0,0,0,.35)',
    } : {
      '--lg-card-bg': 'rgba(255,255,255,.55)',
      '--lg-card-edge': 'rgba(255,255,255,.65)',
      '--lg-card-outline': 'rgba(0,0,0,.10)',
      '--lg-card-shadow': '0 10px 34px -14px rgba(0,0,0,.12), inset 0 1px 0 rgba(255,255,255,.55)',
      '--lg-sheet-bg': 'rgba(255,255,255,.86)',
      '--lg-sheet-shadow': '0 30px 80px -40px rgba(0,0,0,.22), inset 0 1px 0 rgba(255,255,255,.7)',
      '--lg-float-bg': 'rgba(255,255,255,.80)',
      '--lg-float-solid': 'rgba(255,255,255,.90)',
      '--lg-pop': '0 24px 60px -24px rgba(0,0,0,.28), inset 0 1px 0 rgba(255,255,255,.7)',
      '--lg-chip-bg': 'rgba(255,255,255,.72)',
      '--lg-chip-shadow': '0 4px 18px rgba(0,0,0,.05)',
      '--lg-hover-bg': 'rgba(0,0,0,.035)',
      '--lg-active-bg': 'rgba(255,255,255,.92)',
      '--lg-active-ink': t.ink,
      '--lg-hair': 'rgba(0,0,0,.08)',
      '--lg-dim': 'rgba(120,120,128,.18)',
    });
  }
  if (p.typography === 'apple') {
    v['--font-interface-theme'] = APPLE_FONT;
    v['--font-text-theme'] = APPLE_FONT;
    v['--lg-font'] = APPLE_FONT;
    v['--inline-title-weight'] = '600';
    v['--bold-weight'] = '600';
    for (let i = 1; i <= 6; i++) v[`--h${i}-weight`] = '600';
  }
  // 标题层级收敛：正文是主角。H1 才用主题色；H2 只比正文大一档、字重 600
  Object.assign(v, {
    '--h1-size': '1.5em', '--h2-size': '1.22em', '--h3-size': '1.1em',
    '--h4-size': '1.03em', '--h5-size': '1em', '--h6-size': '.95em',
    '--h1-weight': '700', '--h2-weight': '600', '--h3-weight': '600',
    '--h4-weight': '600', '--h5-weight': '600', '--h6-weight': '600',
    '--lg-danger': dark ? '#FF453A' : '#E0443E',
  });
  const paper = paperById(s.reading.paper)[dark ? 'dark' : 'light'];
  v['--lg-paper'] = paper.bg;
  v['--lg-paper-ink'] = paper.ink || t.ink;
  t.headings.forEach((c, i) => {
    v[`--h${i + 1}-color`] = c;
    v[`--print-h${i + 1}-color`] = c;
  });
  return Object.entries(v).map(([k, val]) => `  ${k}: ${val};`).join('\n');
}

export function buildProfileCss(p: Preset, s: LiuliSettings): string {
  // body.lg-on.lg-vars.theme-x 的特异性高于 Blue Topaz 的 body.color-scheme-xx.theme-x
  return [
    `body.lg-on.lg-vars.theme-light {\n${block(p, p.light, s, false)}\n}`,
    `body.lg-on.lg-vars.theme-dark {\n${block(p, p.dark, s, true)}\n}`,
  ].join('\n');
}
