// 自动更新：启动后去 GitHub Releases 查最新版本，比本地新就下载 main.js / styles.css / manifest.json
// 到自己的插件目录，然后提示“立即生效”（重新加载本插件，不用重启 Obsidian）。
// 用 Obsidian 的 requestUrl 发请求，没有跨域问题，也不需要装 BRAT 之类的插件。

import { Notice, requestUrl } from 'obsidian';
import type LiuliPlugin from '../main';

export const REPO = 'Liyucheng1997/427_plugin-obsidian-theme';
const FILES = ['main.js', 'styles.css', 'manifest.json'] as const; // manifest 最后写，写完才算更新完成
const INTERVAL = 6 * 60 * 60 * 1000; // 自动检查间隔：6 小时

/** 比较 a.b.c 版本号：a > b 返回正数 */
export function cmpVersion(a: string, b: string): number {
  const pa = a.replace(/^v/, '').split('.').map(n => parseInt(n, 10) || 0);
  const pb = b.replace(/^v/, '').split('.').map(n => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (d) return d;
  }
  return 0;
}

export class UpdaterModule {
  private timer = 0;
  private busy = false;

  constructor(private plugin: LiuliPlugin) {}

  load() {
    // 启动 15 秒后再查，不拖慢 Obsidian 启动
    this.plugin.app.workspace.onLayoutReady(() => {
      this.timer = window.setTimeout(() => this.maybeAutoCheck(), 15_000);
    });
  }

  unload() { window.clearTimeout(this.timer); }

  private async maybeAutoCheck() {
    const u = this.plugin.settings.update;
    if (!u.auto || Date.now() - (u.lastCheck ?? 0) < INTERVAL) return;
    await this.check(false);
  }

  /** manual=true 时，没有新版本也会提示 */
  async check(manual: boolean): Promise<void> {
    if (this.busy) return;
    this.busy = true;
    const current = this.plugin.manifest.version;
    try {
      const res = await requestUrl({
        url: `https://api.github.com/repos/${REPO}/releases/latest`,
        headers: { Accept: 'application/vnd.github+json' },
      });
      this.plugin.settings.update.lastCheck = Date.now();
      await this.plugin.saveSettings();
      const rel = res.json;
      const latest = String(rel.tag_name ?? '').replace(/^v/, '');
      if (!latest || cmpVersion(latest, current) <= 0) {
        if (manual) new Notice(`琉璃已是最新版本（${current}）`);
        return;
      }
      const assets: Record<string, string> = {};
      for (const a of rel.assets ?? []) assets[a.name] = a.browser_download_url;
      if (!FILES.every(f => assets[f])) {
        if (manual) new Notice(`发现 ${latest}，但发布里缺少文件，暂不更新`);
        return;
      }
      await this.install(latest, assets);
    } catch (e) {
      console.warn('[琉璃] 检查更新失败', e);
      if (manual) new Notice('琉璃：检查更新失败（网络或 GitHub 暂时不可用）');
    } finally {
      this.busy = false;
    }
  }

  private async install(version: string, assets: Record<string, string>) {
    const adapter = this.plugin.app.vault.adapter;
    const dir = this.plugin.manifest.dir ?? `${this.plugin.app.vault.configDir}/plugins/${this.plugin.manifest.id}`;
    // 先全部下载到内存并校验，确认无误再写盘，避免只更新一半
    const got: Record<string, string> = {};
    for (const f of FILES) {
      const r = await requestUrl({ url: assets[f] });
      got[f] = r.text;
    }
    const m = JSON.parse(got['manifest.json']);
    if (m.id !== this.plugin.manifest.id || cmpVersion(m.version, version) !== 0 || got['main.js'].length < 1000) {
      throw new Error('下载的文件校验失败');
    }
    for (const f of FILES) await adapter.write(`${dir}/${f}`, got[f]);

    const frag = createFragment(el => {
      el.appendText(`琉璃已更新到 ${version}。`);
      const a = el.createEl('a', { text: '立即生效', href: '#' });
      a.style.marginLeft = '6px';
      a.onclick = ev => { ev.preventDefault(); this.reloadSelf(); };
    });
    new Notice(frag, 0);
  }

  /** 重新加载本插件（读入新代码），不用重启 Obsidian */
  private async reloadSelf() {
    const plugins = (this.plugin.app as any).plugins;
    const id = this.plugin.manifest.id;
    await plugins.disablePlugin(id);
    await plugins.enablePlugin(id);
    new Notice('琉璃新版本已生效');
  }
}
