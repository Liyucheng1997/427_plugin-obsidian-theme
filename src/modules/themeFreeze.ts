// 冻结 Style Settings：把它给 Blue Topaz 打开的那些选项“拍个快照”，平时由琉璃应用，
// Style Settings 插件本身保留但禁用；想调 Blue Topaz 选项时再打开它。
//
// Style Settings 的工作方式：每个选项变成 <body> 上的一个 class（例如 folder-icons、show-border-table、
// color-scheme-options-xxx），变量类选项写进 <style id="css-settings-manager">。它停用时会把这些全部移除。
// 所以：先记下 style 内容 → 停用它 → 对比 body class 前后差异，差的就是它加的 → 存进 data.json。
//
// 交接规则：
//   · Style Settings 打开着 → 琉璃让出，不应用快照（以它的实时设置为准）
//   · Style Settings 关着   → 琉璃应用快照
//   · 运行中被打开 / 关掉   → 通过监听它的 <style id="css-settings-manager"> 出现 / 消失自动交接
//   调完选项后用命令「冻结 Style Settings 的主题设置并停用它」更新快照。

import { Notice } from 'obsidian';
import type LiuliPlugin from '../main';

const SS_ID = 'obsidian-style-settings';
const SS_STYLE = 'css-settings-manager';

export class ThemeFreezeModule {
  private styleEl: HTMLStyleElement | null = null;
  private added: string[] = [];
  private mo: MutationObserver | null = null;
  private freezing = false;

  constructor(private plugin: LiuliPlugin) {}

  load() {
    this.plugin.app.workspace.onLayoutReady(() => this.onReady());
  }

  private get pluginsApi(): any { return (this.plugin.app as any).plugins; }
  private get ssEnabled(): boolean { return !!this.pluginsApi?.enabledPlugins?.has(SS_ID); }

  private async onReady() {
    // data.json 里约定要停用的插件（由安装脚本写入），在这里一次性处理；只停用，不删文件
    const pending = this.plugin.settings.retirePlugins ?? [];
    if (pending.length) {
      // 等 Style Settings 把它的 class 和变量都挂上（它也在布局就绪后才应用）
      await new Promise(r => window.setTimeout(r, 2500));
      const done: string[] = [];
      for (const id of pending) {
        if (id === SS_ID) { if (await this.freezeStyleSettings(false)) done.push('Style Settings（已冻结其主题设置）'); }
        else if (this.pluginsApi?.enabledPlugins?.has(id)) {
          await this.pluginsApi.disablePluginAndSave(id);
          done.push(this.pluginsApi.manifests?.[id]?.name ?? id);
        }
      }
      this.plugin.settings.retirePlugins = [];
      await this.plugin.saveSettings();
      if (done.length) new Notice(`琉璃：已停用 ${done.join('、')}（插件仍保留，可随时在设置里重新打开）`, 6000);
    }
    this.apply();
    this.watch();
  }

  /** 监听 Style Settings 在运行中被打开 / 关掉，自动交接 */
  private watch() {
    this.mo = new MutationObserver(() => {
      if (this.freezing) return;
      const live = !!document.getElementById(SS_STYLE);
      if (live && (this.added.length || this.styleEl)) this.clear();
      else if (!live && !this.added.length && !this.styleEl && this.plugin.settings.btFreeze) {
        this.apply();
        new Notice('Style Settings 已关闭，琉璃恢复上次冻结的主题设置。若刚调整过选项，请先打开它，再运行「冻结 Style Settings 的主题设置并停用它」。', 9000);
      }
    });
    this.mo.observe(document.head, { childList: true });
  }

  /** 拍快照并停用 Style Settings。返回是否做了冻结。 */
  async freezeStyleSettings(notify = true): Promise<boolean> {
    if (!this.ssEnabled) {
      if (notify) new Notice('Style Settings 没有启用：先在「第三方插件」里打开它，再冻结');
      return false;
    }
    this.freezing = true;
    try {
      const css = document.getElementById(SS_STYLE)?.textContent ?? '';
      this.clear();
      const before = new Set(Array.from(document.body.classList));
      await this.pluginsApi.disablePluginAndSave(SS_ID);
      const after = new Set(Array.from(document.body.classList));
      const classes = [...before].filter(c => !after.has(c) && c !== SS_STYLE);
      this.plugin.settings.btFreeze = { classes, css, at: new Date().toISOString() };
      await this.plugin.saveSettings();
      this.apply();
      if (notify) new Notice(`已冻结 ${classes.length} 项主题设置，并停用 Style Settings（插件保留）`);
      return true;
    } finally {
      this.freezing = false;
    }
  }

  /** 应用快照（Style Settings 打开时让出） */
  apply() {
    this.clear();
    const snap = this.plugin.settings.btFreeze;
    if (!snap || this.ssEnabled) return;
    this.added = snap.classes.filter(c => !document.body.classList.contains(c));
    this.added.forEach(c => document.body.classList.add(c));
    if (snap.css) {
      this.styleEl = document.createElement('style');
      this.styleEl.id = 'lg-style-settings-freeze';
      this.styleEl.textContent = snap.css;
      // 放在 head 最前面，和原来 Style Settings 一样优先级最低，琉璃的变量仍然压得住
      document.head.prepend(this.styleEl);
    }
  }

  private clear() {
    this.added.forEach(c => document.body.classList.remove(c));
    this.added = [];
    this.styleEl?.remove();
    this.styleEl = null;
  }

  unload() {
    this.mo?.disconnect();
    this.mo = null;
    this.clear();
  }
}
