import { Notice, Plugin } from 'obsidian';
import { LiuliSettings, mergeSettings } from './settings';
import { GlassModule } from './modules/glass';
import { FolderColorModule } from './modules/folderColor';
import { NoteCountModule } from './modules/noteCount';
import { ThemeFreezeModule } from './modules/themeFreeze';
import { UpdaterModule } from './modules/updater';
import { importLegacy, retireLegacy } from './core/migrate';
import { LiuliSettingTab } from './settingTab';
import { PRESETS, VAULT_PRESET, DEFAULT_PRESET } from './core/presets';

export default class LiuliPlugin extends Plugin {
  settings!: LiuliSettings;
  glass!: GlassModule;
  folderColor!: FolderColorModule;
  noteCount!: NoteCountModule;
  themeFreeze!: ThemeFreezeModule;
  updater!: UpdaterModule;

  async onload() {
    const saved = await this.loadData();
    const oldVersion = saved?.version ?? 1;
    this.settings = mergeSettings(saved);
    if (saved && oldVersion !== this.settings.version) await this.saveSettings();
    // 新装、或档案已被删除时：按库名自动选档案（社会生活→暖阳珊瑚，读书笔记→书卷苔绿……）
    if (!saved || !PRESETS[this.settings.preset]) {
      this.settings.preset = VAULT_PRESET[this.app.vault.getName()] ?? DEFAULT_PRESET;
      await this.saveSettings();
    }

    if (!this.settings.migrated) {
      const done = await importLegacy(this.app, this.settings);
      this.settings.migrated = true;
      await this.saveSettings();
      if (done.length) new Notice(`琉璃：已导入 ${done.join('、')}。可在设置里一键停用旧插件。`, 8000);
    }

    this.glass = new GlassModule(this);
    this.folderColor = new FolderColorModule(this);
    this.noteCount = new NoteCountModule(this);
    this.themeFreeze = new ThemeFreezeModule(this);
    this.themeFreeze.load();
    this.updater = new UpdaterModule(this);
    this.updater.load();
    this.glass.load();
    this.folderColor.load();
    this.noteCount.load();

    this.addSettingTab(new LiuliSettingTab(this.app, this));
    this.addCommand({
      id: 'toggle-glass',
      name: '开关液态玻璃效果',
      callback: async () => { this.settings.glass.enabled = !this.settings.glass.enabled; await this.applyAll(); },
    });
    this.addCommand({
      id: 'check-update',
      name: '检查更新',
      callback: () => this.updater.check(true),
    });
    this.addCommand({
      id: 'freeze-style-settings',
      name: '冻结 Style Settings 的主题设置并停用它',
      callback: () => this.themeFreeze.freezeStyleSettings(),
    });
    this.addCommand({
      id: 'toggle-performance',
      name: '开关性能模式（关闭模糊和折射）',
      callback: async () => { this.settings.glass.performance = !this.settings.glass.performance; await this.applyAll(); },
    });
  }

  onunload() {
    this.updater?.unload();
    this.themeFreeze?.unload();
    this.glass?.unload();
    this.folderColor?.unload();
    this.noteCount?.unload();
  }

  async saveSettings() { await this.saveData(this.settings); }

  /** data.json 被外部改动（多端同步、或手动改文件）时，Obsidian 会调这个方法：重新读取并立即重绘 */
  async onExternalSettingsChange() {
    this.settings = mergeSettings(await this.loadData());
    this.glass.refresh();
    this.folderColor.render();
    this.noteCount.rebuild();
  }

  /** 保存并让所有模块按新设置重绘 */
  async applyAll() {
    await this.saveSettings();
    this.glass.refresh();
    this.folderColor.render();
    this.noteCount.rebuild();
  }

  async retireLegacy(): Promise<string[]> {
    return retireLegacy(this.app, this.manifest.dir ?? `${this.app.vault.configDir}/plugins/${this.manifest.id}`);
  }
}
