// 笔记计数（替代 File Explorer Note Count）
// 启动时建一次索引，之后按 create / delete / rename 增量更新；渲染同样是按 data-path 生成 CSS，
// 数字放在 ::after 里，外观是右侧的玻璃胶囊。

import { TAbstractFile, TFile, TFolder, debounce } from 'obsidian';
import type LiuliPlugin from '../main';
import { cssStr } from './util';

export class NoteCountModule {
  private styleEl: HTMLStyleElement | null = null;
  private counts = new Map<string, number>();
  private hasSub = new Set<string>();
  private ready = false;

  constructor(private plugin: LiuliPlugin) {}

  load() {
    this.styleEl = document.head.createEl('style', { attr: { id: 'lg-note-count' } });
    const p = this.plugin;
    const rebuild = debounce(() => this.rebuild(), 300, true);
    p.app.workspace.onLayoutReady(() => { this.ready = true; this.rebuild(); });
    p.registerEvent(p.app.vault.on('create', f => { if (this.ready) this.bump(f, +1, rebuild); }));
    p.registerEvent(p.app.vault.on('delete', f => { if (this.ready) this.bump(f, -1, rebuild); }));
    p.registerEvent(p.app.vault.on('rename', () => { if (this.ready) rebuild(); }));
  }

  unload() {
    this.styleEl?.remove();
    this.styleEl = null;
  }

  private counted(f: TFile): boolean {
    const s = this.plugin.settings.noteCount;
    if (!s.filterList.length) return true;
    const hit = s.filterList.includes(f.extension.toLowerCase());
    return s.blacklist ? !hit : hit;
  }

  /** 全量统计 */
  rebuild() {
    this.counts.clear();
    this.hasSub.clear();
    const walk = (folder: TFolder): number => {
      let n = 0;
      for (const c of folder.children) {
        if (c instanceof TFolder) { this.hasSub.add(folder.path); n += walk(c); }
        else if (c instanceof TFile && this.counted(c)) n++;
      }
      this.counts.set(folder.path, n);
      return n;
    };
    walk(this.plugin.app.vault.getRoot());
    this.render();
  }

  /** 增量：新建/删除单个文件时只改它的祖先文件夹 */
  private bump(f: TAbstractFile, delta: number, fallback: () => void) {
    if (!(f instanceof TFile)) { fallback(); return; }
    if (!this.counted(f)) return;
    let parent = f.parent;
    while (parent) {
      this.counts.set(parent.path, Math.max(0, (this.counts.get(parent.path) ?? 0) + delta));
      parent = parent.parent;
    }
    this.renderSoon();
  }

  private renderSoon = debounce(() => this.render(), 150, true);

  render() {
    if (!this.styleEl) return;
    const s = this.plugin.settings.noteCount;
    if (!s.enabled) { this.styleEl.textContent = ''; return; }
    const rules: string[] = [];
    const hideWhenOpen: string[] = [];
    this.counts.forEach((n, path) => {
      if (path === '/' || !path) return;
      const sel = `.nav-folder-title[data-path=${cssStr(path)}]`;
      rules.push(`body.lg-on ${sel}::after { content: "${n}"; }`);
      if (!s.showAllNumbers && this.hasSub.has(path)) hideWhenOpen.push(`.nav-folder:not(.is-collapsed) > ${sel}::after`);
    });
    if (hideWhenOpen.length) rules.push(`body.lg-on :is(${hideWhenOpen.join(', ')}) { opacity: 0; transform: scale(.8); }`);
    this.styleEl.textContent = rules.join('\n');
  }
}
