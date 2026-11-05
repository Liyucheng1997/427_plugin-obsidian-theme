import { PaletteColor, DEFAULT_PRESET } from './core/presets';

export type RefractScope = 'off' | 'floating' | 'all';
export type Material = 'glass' | 'solid' | 'crystal';
export type FolderStyle = 'dot' | 'mark' | 'tint' | 'tintbar' | 'bar' | 'chip';

/** 设置结构版本。视觉默认值大改时 +1，老配置里的外观参数会被重置为新默认值（色板和文件夹颜色保留）。 */
export const SETTINGS_VERSION = 2;

export interface FileColorEntry { path: string; color: string }

export interface LiuliSettings {
  version: number;
  preset: string;
  glass: {
    enabled: boolean;
    material: Material;        // glass 液态玻璃 / solid 纯色（苹果简约）/ crystal 白玻璃卡片（liyucheng.me 质感）
    floatingLayout: boolean;   // 侧栏做成内嵌悬浮的玻璃面板（编辑区始终与窗口连成一片）
    wallpaper: boolean;        // 底层环境光
    blur: number;              // 模糊半径 px
    paneAlpha: number;         // 侧栏玻璃不透明度 %
    floatAlpha: number;        // 浮层（菜单、弹窗）不透明度 %
    sheetAlpha: number;        // 正文区底色不透明度 %（压住环境光，越高越素净）
    refract: RefractScope;     // 边缘折射范围
    refractStrength: number;   // 折射位移 px
    bezel: number;             // 折射边缘宽度 px
    chroma: boolean;           // 边缘色散
    pointerLight: boolean;     // 高光跟随鼠标
    motion: boolean;           // 液体弹性动效
    performance: boolean;      // 性能模式：关闭模糊和折射
  };
  folderColor: {
    enabled: boolean;
    style: FolderStyle;        // mark 胶囊标记 / tint 柔和底色 / tintbar 底色+色条 / bar 左侧色条 / chip 彩色玻璃块
    mixLight: number;          // 浅色模式染色强度 %
    mixDark: number;           // 深色模式染色强度 %
    cascade: boolean;          // 子文件夹继承颜色（自动减淡）
    palette: PaletteColor[];
    fileColors: FileColorEntry[];
  };
  noteCount: {
    enabled: boolean;
    showAllNumbers: boolean;   // 展开的文件夹也显示数字
    filterList: string[];      // 扩展名列表；空 = 统计所有文件
    blacklist: boolean;        // true: filterList 为排除列表
    tinted: boolean;           // 计数胶囊跟随文件夹颜色
  };
  fixes: { enabled: boolean };
  migrated: boolean;
  /** Style Settings 的快照（卸载 Style Settings 后由琉璃应用） */
  btFreeze: { classes: string[]; css: string; at: string } | null;
  /** 下次启动时要停用的插件 id（安装脚本写入，处理后清空） */
  retirePlugins: string[];
  /** 自动更新（从 GitHub Releases） */
  update: { auto: boolean; lastCheck: number };
}

export const DEFAULT_SETTINGS: LiuliSettings = {
  version: SETTINGS_VERSION,
  preset: DEFAULT_PRESET,
  glass: {
    enabled: true,
    material: 'crystal',
    floatingLayout: true,
    wallpaper: true,
    blur: 18,
    paneAlpha: 78,
    floatAlpha: 74,
    sheetAlpha: 70,
    refract: 'floating',
    refractStrength: 26,
    bezel: 20,
    chroma: false,
    pointerLight: true,
    motion: true,
    performance: false,
  },
  folderColor: {
    enabled: true,
    style: 'dot',
    mixLight: 42,
    mixDark: 26,
    cascade: false,
    palette: [],
    fileColors: [],
  },
  noteCount: {
    enabled: true,
    showAllNumbers: false,
    filterList: [],
    blacklist: false,
    tinted: false,
  },
  fixes: { enabled: true },
  migrated: false,
  btFreeze: null,
  retirePlugins: [],
  update: { auto: true, lastCheck: 0 },
};

/** 深合并：保证老版本 data.json 缺字段时用默认值补齐 */
export function mergeSettings(saved: any): LiuliSettings {
  const d = structuredClone(DEFAULT_SETTINGS);
  if (!saved) return d;
  if ((saved.version ?? 1) < SETTINGS_VERSION) {
    // 外观默认值改过：丢掉旧的外观参数，保留色板、文件夹颜色、计数规则等数据
    delete saved.glass;
    if (saved.folderColor) { delete saved.folderColor.mixLight; delete saved.folderColor.mixDark; }
    if (saved.noteCount) delete saved.noteCount.tinted;
    saved.version = SETTINGS_VERSION;
  }
  return {
    ...d,
    ...saved,
    glass: { ...d.glass, ...(saved.glass ?? {}) },
    folderColor: { ...d.folderColor, ...(saved.folderColor ?? {}) },
    noteCount: { ...d.noteCount, ...(saved.noteCount ?? {}) },
    fixes: { ...d.fixes, ...(saved.fixes ?? {}) },
    update: { ...d.update, ...(saved.update ?? {}) },
  };
}
