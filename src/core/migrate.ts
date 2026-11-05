// 从旧插件导入配置，并（按需）停用旧插件和 CSS 片段

import { App, normalizePath } from 'obsidian';
import type { LiuliSettings } from '../settings';
import { PRESETS } from './presets';

export const OLD_PLUGINS = ['obsidian-file-color', 'file-explorer-note-count'];
export const OLD_SNIPPETS = ['file-color-pastel-blocks', 'file-color-contrast', 'icons_adjust', 'ubuntu-muted-folder-colors'];

async function readJson(app: App, path: string): Promise<any | null> {
  try {
    const p = normalizePath(path);
    if (!(await app.vault.adapter.exists(p))) return null;
    return JSON.parse(await app.vault.adapter.read(p));
  } catch { return null; }
}

/** 返回导入了哪些东西，用于提示 */
export async function importLegacy(app: App, s: LiuliSettings): Promise<string[]> {
  const dir = app.vault.configDir;
  const done: string[] = [];
  const fc = await readJson(app, `${dir}/plugins/obsidian-file-color/data.json`);
  if (fc?.palette?.length) {
    s.folderColor.palette = fc.palette.map((c: any) => ({ id: c.id, name: c.name, value: c.value }));
    s.folderColor.fileColors = (fc.fileColors ?? []).map((f: any) => ({ path: f.path, color: f.color }));
    s.folderColor.cascade = !!fc.cascadeColors;
    done.push(`文件夹颜色 ${s.folderColor.fileColors.length} 项`);
  }
  const nc = await readJson(app, `${dir}/plugins/file-explorer-note-count/data.json`);
  if (nc) {
    s.noteCount.showAllNumbers = !!nc.showAllNumbers;
    s.noteCount.filterList = Array.isArray(nc.filterList) ? nc.filterList : [];
    s.noteCount.blacklist = !!nc.blacklist;
    done.push('笔记计数设置');
  }
  if (!s.folderColor.palette.length) s.folderColor.palette = structuredClone(PRESETS[s.preset]?.folderPalette ?? PRESETS.coral.folderPalette);
  return done;
}

/** 停用旧插件和片段（先把两份配置备份到插件目录） */
export async function retireLegacy(app: App, pluginDir: string): Promise<string[]> {
  const a = app as any;
  const dir = app.vault.configDir;
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  for (const f of ['community-plugins.json', 'appearance.json']) {
    const src = normalizePath(`${dir}/${f}`);
    if (await app.vault.adapter.exists(src)) {
      await app.vault.adapter.write(normalizePath(`${pluginDir}/backup-${stamp}-${f}`), await app.vault.adapter.read(src));
    }
  }
  const done: string[] = [];
  for (const id of OLD_PLUGINS) {
    if (a.plugins?.enabledPlugins?.has(id)) { await a.plugins.disablePluginAndSave(id); done.push(id); }
  }
  const enabled: Set<string> | undefined = a.customCss?.enabledSnippets;
  for (const sn of OLD_SNIPPETS) {
    if (enabled?.has(sn)) { a.customCss.setCssEnabledStatus(sn, false); done.push(`${sn}.css`); }
  }
  return done;
}
