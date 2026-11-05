// 文件夹颜色（替代 File Color 插件）
// 不改 DOM：根据 data-path 生成 CSS 规则。文件树虚拟滚动、Obsidian 升级改结构都不怕，只要 data-path 还在。

import { App, Menu, TAbstractFile, TFolder, Modal, Setting } from 'obsidian';
import type LiuliPlugin from '../main';
import { cssStr } from './util';
import type { FolderStyle } from '../settings';

// 三种文件夹配色风格，都只用 --lg-fc（颜色）和 --lg-fc-mix（强度）两个变量
const BASE = `  --lg-fc-strength: calc(var(--lg-fc-mix) * var(--lg-fc-mix-scale, 1));
  border: none !important;
  border-radius: 8px !important;
  color: var(--lg-ink) !important;`;
const STYLES: Record<FolderStyle, { normal: string; hover: string; before?: string; dot?: string }> = {
  // 彩色文件夹图标（推荐，设置里的 id 仍叫 dot）：行本身完全不染色，只把名字前的文件夹图标（由 40-explorer.css 统一画）染成标签色。
  // 文件没有文件夹图标，被单独上色的文件仍是一颗 8px 圆点。
  dot: {
    normal: `${BASE}
  background: transparent !important;
  box-shadow: none !important;
  font-weight: 400 !important;`,
    hover: `  background: var(--lg-hover-bg) !important;`,
    dot: `  content: "" !important;
  display: inline-block !important;
  position: relative !important;
  top: -1px !important;
  width: 8px !important;
  height: 8px !important;
  margin: 0 9px 0 1px !important;
  border-radius: 50% !important;
  background: var(--lg-fc) !important;
  -webkit-mask-image: none !important;
  mask-image: none !important;
  filter: none !important;
  opacity: 1 !important;
  vertical-align: middle;`,
  },
  // 胶囊标记：行内只有一层极淡的同色底，颜色主要由左侧一颗内缩的小胶囊承担（类似 Finder 标签）
  mark: {
    normal: `${BASE}
  position: relative;
  background: color-mix(in srgb, var(--lg-fc) var(--lg-fc-strength), transparent) !important;
  box-shadow: none !important;
  margin: 1px 4px 1px 0 !important;
  font-weight: 500 !important;`,
    hover: `  background: color-mix(in srgb, var(--lg-fc) calc(var(--lg-fc-strength) + 8%), transparent) !important;`,
    before: `  content: "";
  position: absolute;
  left: 5px;
  top: 50%;
  width: 3px;
  height: 15px;
  transform: translateY(-50%);
  border-radius: 3px;
  background: var(--lg-fc);
  pointer-events: none;`,
  },
  // 柔和底色：只有一层很淡的颜色，没有描边和高光，安静
  tint: {
    normal: `${BASE}
  background: color-mix(in srgb, var(--lg-fc) var(--lg-fc-strength), transparent) !important;
  box-shadow: none !important;
  margin: 1px 4px 1px 0 !important;
  font-weight: 500 !important;`,
    hover: `  background: color-mix(in srgb, var(--lg-fc) calc(var(--lg-fc-strength) + 12%), transparent) !important;`,
  },
  // 底色 + 色条：淡底色负责“成块”，左边 3px 原色负责“认得出”，浅色色板也看得清
  tintbar: {
    normal: `${BASE}
  background: color-mix(in srgb, var(--lg-fc) var(--lg-fc-strength), transparent) !important;
  box-shadow: inset 3px 0 0 var(--lg-fc) !important;
  margin: 1px 4px 1px 0 !important;
  font-weight: 500 !important;`,
    hover: `  background: color-mix(in srgb, var(--lg-fc) calc(var(--lg-fc-strength) + 10%), transparent) !important;`,
  },
  // 左侧色条：背景透明，只在左边留一道 3px 的颜色，最克制
  bar: {
    normal: `${BASE}
  background: transparent !important;
  box-shadow: inset 3px 0 0 color-mix(in srgb, var(--lg-fc) 85%, var(--lg-ink) 15%) !important;
  margin: 1px 4px 1px 0 !important;
  font-weight: 500 !important;`,
    hover: `  background: color-mix(in srgb, var(--lg-fc) calc(var(--lg-fc-strength) * .5), transparent) !important;`,
  },
  // 彩色玻璃块：上沿高光 + 同色细描边（第一版的效果）
  chip: {
    normal: `${BASE}
  background: color-mix(in srgb, var(--lg-fc) var(--lg-fc-strength), transparent) !important;
  box-shadow: inset 0 1px 0 var(--lg-rim-hi), inset 0 0 0 1px color-mix(in srgb, var(--lg-fc) 70%, transparent) !important;
  margin: 3px 6px 3px 2px !important;
  font-weight: 600 !important;`,
    hover: `  background: color-mix(in srgb, var(--lg-fc) calc(var(--lg-fc-strength) + 14%), transparent) !important;`,
  },
};

export class FolderColorModule {
  private styleEl: HTMLStyleElement | null = null;

  constructor(private plugin: LiuliPlugin) {}

  load() {
    this.styleEl = document.head.createEl('style', { attr: { id: 'lg-folder-colors' } });
    this.render();
    const p = this.plugin;
    p.registerEvent(p.app.workspace.on('file-menu', (menu: Menu, file: TAbstractFile) => this.addMenu(menu, file)));
    p.registerEvent(p.app.vault.on('rename', (file, oldPath) => this.onRename(file, oldPath)));
    p.registerEvent(p.app.vault.on('delete', file => this.onDelete(file)));
  }

  unload() {
    this.styleEl?.remove();
    this.styleEl = null;
  }

  render() {
    if (!this.styleEl) return;
    const s = this.plugin.settings.folderColor;
    if (!s.enabled) { this.styleEl.textContent = ''; return; }
    const pal = new Map(s.palette.map(c => [c.id, c.value]));
    const varRules: string[] = [];
    const subRules: string[] = [];
    const titles: string[] = [];
    for (const fc of s.fileColors) {
      const color = pal.get(fc.color);
      if (!color) continue;
      const p = cssStr(fc.path);
      const sel = `.nav-folder-title[data-path=${p}], .nav-file-title[data-path=${p}]`;
      titles.push(sel);
      varRules.push(`${sel} { --lg-fc: ${color}; }`);
      if (s.cascade) {
        const sub = `.nav-folder-title[data-path^=${cssStr(fc.path + '/')}], .nav-file-title[data-path^=${cssStr(fc.path + '/')}]`;
        subRules.push(`${sub} { --lg-fc: ${color}; --lg-fc-mix-scale: .45; }`);
        titles.push(sub);
      }
    }
    // 共享样式 + 每个路径的颜色变量（cascade 的子级规则写在前面，本级的 --lg-fc 后写优先）
    const list = titles.join(',\n');
    const st = STYLES[s.style] ?? STYLES.tint;
    this.styleEl.textContent = titles.length
      ? `body.lg-on .nav-files-container :is(${list}) {\n${st.normal}\n}\n` +
        `body.lg-on .nav-files-container :is(${list}):hover {\n${st.hover}\n}\n` +
        (st.before ? `body.lg-on .nav-files-container :is(${list})::before {\n${st.before}\n}\n` : '') +
        (st.dot
          ? `body.lg-on .nav-files-container :is(${list}) .nav-file-title-content::before {\n${st.dot}\n}\n` +
            `body.lg-on .nav-files-container :is(${list}) .nav-folder-title-content::before { background: var(--lg-fc) !important; opacity: .9 !important; }\n`
          : '') +
        `body.lg-on .nav-files-container :is(${list}) :is(.nav-folder-title-content, .nav-file-title-content, .tree-item-inner) { color: var(--lg-ink) !important; }\n` +
        subRules.join('\n') + '\n' + varRules.join('\n')
      : '';
  }

  // —— 右键菜单 ——
  private addMenu(menu: Menu, file: TAbstractFile) {
    const s = this.plugin.settings.folderColor;
    if (!s.enabled) return;
    const current = s.fileColors.find(f => f.path === file.path);
    menu.addItem(item => {
      item.setTitle('设置颜色').setIcon('palette').setSection('action');
      const sub = (item as any).setSubmenu?.() as Menu | undefined;
      if (!sub) { item.onClick(() => new ColorPickerModal(this.plugin.app, this, file).open()); return; }
      for (const c of s.palette) {
        sub.addItem(si => {
          si.setTitle(c.name).setChecked(current?.color === c.id).onClick(() => this.setColor(file.path, c.id));
          // 在菜单项前面画一个颜色圆点
          const dom = (si as any).dom as HTMLElement | undefined;
          dom?.querySelector('.menu-item-icon')?.replaceChildren(createDiv({ cls: 'lg-swatch', attr: { style: `--c:${c.value}` } }));
        });
      }
      sub.addSeparator();
      sub.addItem(si => si.setTitle('清除颜色').setIcon('eraser').onClick(() => this.setColor(file.path, null)));
    });
  }

  async setColor(path: string, colorId: string | null) {
    const s = this.plugin.settings.folderColor;
    s.fileColors = s.fileColors.filter(f => f.path !== path);
    if (colorId) s.fileColors.push({ path, color: colorId });
    await this.plugin.saveSettings();
    this.render();
  }

  private async onRename(file: TAbstractFile, oldPath: string) {
    const s = this.plugin.settings.folderColor;
    let changed = false;
    for (const fc of s.fileColors) {
      if (fc.path === oldPath) { fc.path = file.path; changed = true; }
      else if (file instanceof TFolder && fc.path.startsWith(oldPath + '/')) {
        fc.path = file.path + fc.path.slice(oldPath.length); changed = true;
      }
    }
    if (changed) { await this.plugin.saveSettings(); this.render(); }
  }

  private async onDelete(file: TAbstractFile) {
    const s = this.plugin.settings.folderColor;
    const before = s.fileColors.length;
    s.fileColors = s.fileColors.filter(fc => fc.path !== file.path && !fc.path.startsWith(file.path + '/'));
    if (s.fileColors.length !== before) { await this.plugin.saveSettings(); this.render(); }
  }
}

/** 旧版 Obsidian 没有子菜单时的退路：弹窗选色 */
class ColorPickerModal extends Modal {
  constructor(app: App, private mod: FolderColorModule, private file: TAbstractFile) { super(app); }
  onOpen() {
    this.titleEl.setText(`设置颜色：${this.file.name}`);
    const wrap = this.contentEl.createDiv({ cls: 'lg-swatch-grid' });
    const pal = (this.mod as any).plugin.settings.folderColor.palette as { id: string; name: string; value: string }[];
    for (const c of pal) {
      const b = wrap.createEl('button', { cls: 'lg-swatch-btn', attr: { style: `--c:${c.value}`, 'aria-label': c.name } });
      b.createSpan({ text: c.name });
      b.onclick = () => { this.mod.setColor(this.file.path, c.id); this.close(); };
    }
    new Setting(this.contentEl).addButton(b => b.setButtonText('清除颜色').onClick(() => { this.mod.setColor(this.file.path, null); this.close(); }));
  }
  onClose() { this.contentEl.empty(); }
}
