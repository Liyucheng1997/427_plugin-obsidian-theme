import { App, Notice, PluginSettingTab, Setting } from 'obsidian';
import type LiuliPlugin from './main';
import { PRESETS } from './core/presets';
import { importLegacy } from './core/migrate';
import type { RefractScope } from './settings';
import { PAPERS } from './core/paper';

export class LiuliSettingTab extends PluginSettingTab {
  constructor(app: App, private plugin: LiuliPlugin) { super(app, plugin); }

  display() {
    const { containerEl: el } = this;
    const p = this.plugin;
    const s = p.settings;
    const g = s.glass;
    const apply = () => p.applyAll();
    el.empty();
    el.addClass('lg-settings');

    // —— 配色 ——
    el.createEl('h2', { text: '配色档案' });
    const swatches = el.createDiv({ cls: 'lg-preset-row' });
    for (const preset of Object.values(PRESETS)) {
      const card = swatches.createDiv({ cls: 'lg-preset-card' + (s.preset === preset.id ? ' is-active' : '') });
      const dots = card.createDiv({ cls: 'lg-preset-dots' });
      [preset.light.accent, preset.light.link, ...preset.light.wallpaper.blobs.slice(0, 3).map(b => b.color)]
        .forEach(c => dots.createSpan({ attr: { style: `background:${c}` } }));
      card.createDiv({ cls: 'lg-preset-name', text: preset.name });
      card.createDiv({ cls: 'lg-preset-desc', text: preset.desc });
      card.onclick = async () => { s.preset = preset.id; if (preset.material) g.material = preset.material; await apply(); this.display(); };
    }

    // —— 阅读底色 ——
    el.createEl('h2', { text: '阅读底色' });
    el.createDiv({ cls: 'setting-item-description', text: '只改笔记正文区的底色，白底看久了费眼时换一个。命令面板里搜“阅读底色”可以随时切换。' });
    const dark = document.body.hasClass('theme-dark');
    const papers = el.createDiv({ cls: 'lg-paper-row' });
    for (const paper of PAPERS) {
      const c = paper[dark ? 'dark' : 'light'];
      const card = papers.createDiv({ cls: 'lg-paper-card' + (s.reading.paper === paper.id ? ' is-active' : '') });
      card.setAttr('style', `--bg:${c.bg};--ink:${c.ink || 'var(--lg-ink)'}`);
      card.createDiv({ cls: 'lg-paper-sample', text: '文' });
      card.createDiv({ cls: 'lg-paper-name', text: paper.name });
      card.onclick = async () => { s.reading.paper = paper.id; await apply(); this.display(); };
    }

    // —— 液态玻璃 ——
    el.createEl('h2', { text: '液态玻璃' });
    new Setting(el).setName('材质').setDesc('液态玻璃：半透明 + 折射；纯色：白底卡片、无毛玻璃（苹果简约）。')
      .addDropdown(d => d.addOptions({ crystal: '白玻璃卡片（liyucheng.me）', glass: '液态玻璃', solid: '纯色' })
        .setValue(g.material).onChange(async v => { g.material = v as any; await apply(); }));
    new Setting(el).setName('启用液态玻璃').setDesc('关掉后只保留配色、文件夹颜色和计数。')
      .addToggle(t => t.setValue(g.enabled).onChange(async v => { g.enabled = v; await apply(); }));
    new Setting(el).setName('侧栏悬浮').setDesc('左右侧栏变成嵌在窗口里的圆角玻璃面板；关掉则贴边，用细线分隔。')
      .addToggle(t => t.setValue(g.floatingLayout).onChange(async v => { g.floatingLayout = v; await apply(); }));
    new Setting(el).setName('环境光').setDesc('窗口角落两团极淡的档案色光晕，透过玻璃隐约可见。')
      .addToggle(t => t.setValue(g.wallpaper).onChange(async v => { g.wallpaper = v; await apply(); }));
    new Setting(el).setName('边缘折射').setDesc('玻璃边缘把背后的内容弯进来，这是“液态”的关键。')
      .addDropdown(d => d.addOptions({ off: '关闭', floating: '浮层（菜单、弹窗、状态栏）', all: '浮层 + 侧栏' })
        .setValue(g.refract).onChange(async v => { g.refract = v as RefractScope; await apply(); }));
    slider(el, '折射强度', '边缘最大位移（像素）', 0, 80, 2, g.refractStrength, v => { g.refractStrength = v; }, apply);
    slider(el, '折射边宽', '边缘弯曲区的宽度（像素）', 6, 40, 1, g.bezel, v => { g.bezel = v; }, apply);
    new Setting(el).setName('边缘色散').setDesc('折射处出现很淡的彩虹边。')
      .addToggle(t => t.setValue(g.chroma).onChange(async v => { g.chroma = v; await apply(); }));
    slider(el, '模糊', '背景模糊半径（像素）', 0, 48, 1, g.blur, v => { g.blur = v; }, apply);
    slider(el, '侧栏不透明度', '越低越通透', 10, 95, 1, g.paneAlpha, v => { g.paneAlpha = v; }, apply);
    slider(el, '浮层不透明度', '菜单、弹窗、命令面板', 20, 95, 1, g.floatAlpha, v => { g.floatAlpha = v; }, apply);
    slider(el, '正文区底色', '越高越素净，环境光越不明显', 0, 100, 1, g.sheetAlpha, v => { g.sheetAlpha = v; }, apply);
    new Setting(el).setName('高光跟随鼠标').setDesc('玻璃边缘的高光随鼠标移动。')
      .addToggle(t => t.setValue(g.pointerLight).onChange(async v => { g.pointerLight = v; await apply(); }));
    new Setting(el).setName('液体动效').setDesc('按钮按下回弹、菜单弹出时轻微放大。')
      .addToggle(t => t.setValue(g.motion).onChange(async v => { g.motion = v; await apply(); }));
    new Setting(el).setName('性能模式').setDesc('关闭模糊和折射，只保留半透明和高光边。电脑卡时打开。')
      .addToggle(t => t.setValue(g.performance).onChange(async v => { g.performance = v; await apply(); }));

    // —— 文件夹颜色 ——
    el.createEl('h2', { text: '文件夹颜色' });
    const fc = s.folderColor;
    new Setting(el).setName('启用文件夹颜色').setDesc('关闭时所有文件夹图标统一用主题色。打开后可在文件列表里右键文件夹 →「设置颜色」单独上色。')
      .addToggle(t => t.setValue(fc.enabled).onChange(async v => { fc.enabled = v; await apply(); }));
    new Setting(el).setName('配色风格')
      .addDropdown(d => d.addOptions({ dot: '彩色文件夹图标（推荐）', mark: '胶囊标记', tint: '柔和底色', tintbar: '底色 + 色条', bar: '左侧色条', chip: '彩色玻璃块' })
        .setValue(fc.style).onChange(async v => { fc.style = v as any; await apply(); }));
    slider(el, '浅色模式染色强度', '', 10, 100, 1, fc.mixLight, v => { fc.mixLight = v; }, apply);
    slider(el, '深色模式染色强度', '', 10, 100, 1, fc.mixDark, v => { fc.mixDark = v; }, apply);
    new Setting(el).setName('子文件夹继承颜色').setDesc('子级用更淡的同色。')
      .addToggle(t => t.setValue(fc.cascade).onChange(async v => { fc.cascade = v; await apply(); }));

    el.createEl('h3', { text: '色板' });
    fc.palette.forEach((c, i) => {
      const used = fc.fileColors.filter(f => f.color === c.id).length;
      new Setting(el).setName(c.name).setDesc(used ? `用在 ${used} 个文件夹` : '未使用')
        .addText(t => t.setValue(c.name).onChange(async v => { c.name = v || c.name; await p.saveSettings(); }))
        .addColorPicker(cp => cp.setValue(c.value).onChange(async v => { c.value = v; await apply(); }))
        .addExtraButton(b => b.setIcon('trash').setTooltip('删除').onClick(async () => {
          fc.palette.splice(i, 1);
          fc.fileColors = fc.fileColors.filter(f => f.color !== c.id);
          await apply(); this.display();
        }));
    });
    const rec = PRESETS[s.preset]?.folderPalette ?? [];
    if (rec.length) {
      new Setting(el).setName('换成当前档案的推荐色板')
        .setDesc('按顺序替换色板里的颜色值和名字，已经设置好颜色的文件夹会跟着换色，不用重新指定。')
        .addButton(b => b.setButtonText('替换').onClick(async () => {
          rec.forEach((r, i) => {
            if (fc.palette[i]) { fc.palette[i].value = r.value; fc.palette[i].name = r.name; }
            else fc.palette.push({ ...r });
          });
          await apply(); this.display();
        }));
    }
    new Setting(el).addButton(b => b.setButtonText('添加颜色').onClick(async () => {
      fc.palette.push({ id: `c-${Date.now().toString(36)}`, name: '新颜色', value: '#C8B6A6' });
      await p.saveSettings(); this.display();
    }));

    // —— 笔记计数 ——
    el.createEl('h2', { text: '笔记计数' });
    const nc = s.noteCount;
    new Setting(el).setName('启用笔记计数')
      .addToggle(t => t.setValue(nc.enabled).onChange(async v => { nc.enabled = v; await apply(); }));
    new Setting(el).setName('展开时也显示数字').setDesc('关闭时，含子文件夹的文件夹展开后数字淡出。')
      .addToggle(t => t.setValue(nc.showAllNumbers).onChange(async v => { nc.showAllNumbers = v; await apply(); }));
    new Setting(el).setName('计数胶囊跟随文件夹颜色')
      .addToggle(t => t.setValue(nc.tinted).onChange(async v => { nc.tinted = v; await apply(); }));
    new Setting(el).setName('按扩展名过滤').setDesc('逗号分隔，例如 md, canvas。留空 = 统计所有文件。')
      .addText(t => t.setValue(nc.filterList.join(', ')).onChange(async v => {
        nc.filterList = v.split(/[,，\s]+/).map(x => x.trim().replace(/^\./, '').toLowerCase()).filter(Boolean);
        await apply();
      }));
    new Setting(el).setName('把上面的列表当作排除列表')
      .addToggle(t => t.setValue(nc.blacklist).onChange(async v => { nc.blacklist = v; await apply(); }));

    // —— 更新 ——
    el.createEl('h2', { text: '更新' });
    new Setting(el).setName(`当前版本 ${p.manifest.version}`)
      .setDesc('从 GitHub Releases 下载新版本，下载完点通知里的“立即生效”即可，不用重启。')
      .addButton(b => b.setButtonText('立即检查').onClick(() => p.updater.check(true)));
    new Setting(el).setName('自动检查更新').setDesc('启动后每 6 小时最多检查一次。')
      .addToggle(t => t.setValue(s.update.auto).onChange(async v => { s.update.auto = v; await p.saveSettings(); }));

    // —— 兼容与迁移 ——
    el.createEl('h2', { text: '兼容与迁移' });
    new Setting(el).setName('界面修正').setDesc('原 icons_adjust 片段：收紧文件树缩进。')
      .addToggle(t => t.setValue(s.fixes.enabled).onChange(async v => { s.fixes.enabled = v; await apply(); }));
    new Setting(el).setName('重新导入旧插件配置').setDesc('从 File Color 和 Note Count 的 data.json 读取，会覆盖这里的色板。')
      .addButton(b => b.setButtonText('导入').onClick(async () => {
        const done = await importLegacy(this.app, s);
        await apply(); this.display();
        new Notice(done.length ? `已导入：${done.join('、')}` : '没有找到旧插件的配置');
      }));
    const fz = s.btFreeze;
    new Setting(el).setName('冻结 Style Settings')
      .setDesc(fz ? `已冻结 ${fz.classes.length} 项 Blue Topaz 设置（${fz.at.slice(0, 10)}），由琉璃应用。要调 Blue Topaz 选项：先在第三方插件里打开 Style Settings，调完再点“重新冻结”。`
        : '把 Style Settings 当前给 Blue Topaz 打开的选项拍快照，由琉璃接管，然后停用它（插件保留）。调选项时先打开它，调完再点这里。')
      .addButton(b => b.setButtonText(fz ? '重新冻结' : '冻结并停用').onClick(async () => { await p.themeFreeze.freezeStyleSettings(); this.display(); }));
    new Setting(el).setName('停用旧插件和片段').setDesc('停用 File Color、Note Count 以及 file-color-*、icons_adjust 片段；会先备份配置。')
      .addButton(b => b.setButtonText('一键停用').setWarning().onClick(async () => {
        const done = await p.retireLegacy();
        new Notice(done.length ? `已停用：${done.join('、')}` : '没有需要停用的旧插件或片段');
      }));
  }
}

function slider(el: HTMLElement, name: string, desc: string, min: number, max: number, step: number,
  value: number, set: (v: number) => void, apply: () => Promise<void>) {
  new Setting(el).setName(name).setDesc(desc).addSlider(sl => sl
    .setLimits(min, max, step).setValue(value).setDynamicTooltip()
    .onChange(async v => { set(v); await apply(); }));
}
