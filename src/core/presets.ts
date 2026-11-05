// 库配色档案（Vault Profile）。
//
// 四个库共用同一套材质（白玻璃卡片，来自 liyucheng.me）和同一套文件夹语义色，只换一个主题色：
//   社会生活 · 暖阳珊瑚   读书笔记 · 书卷苔绿   科研工作 · 深海青   语言学习 · 鸢尾紫
// 四个主题色在 OKLCH 里取同一档明度（L≈0.63）和彩度（C≈0.09–0.12），色相大致每 90° 一个，
// 所以放在一起是一家人，切换库时又一眼能认出来。

export interface Blob { color: string; x: number; y: number; size: number }

export interface Tokens {
  base: string;        // 窗口底色（白玻璃卡片下面那层）与正文纸面
  ink: string;         // 正文字色
  inkMuted: string;    // 次要字色
  accent: string;      // 唯一的主题色：按钮、勾选框、选中、文件图标
  accentInk: string;   // 主题色作为文字时用的深一档（链接、H1）
  link: string;        // 链接色
  headings: [string, string, string, string, string, string];
  highlight: string;   // ==高亮== 背景
  paneTint: string;    // 液态玻璃材质下侧栏的染色
  glassTint: string;   // 液态玻璃材质下浮层的染色
  shadow: string;      // 阴影色
  wallpaper: { bg: string; blobs: Blob[] };
}

export interface PaletteColor { id: string; name: string; value: string }

export interface Preset {
  id: string;
  name: string;
  desc: string;
  /** 'apple'：系统字体、标题 600 字重、字距收紧 */
  typography?: 'apple';
  /** 推荐材质；选档案时会一并切换 */
  material?: 'glass' | 'solid' | 'crystal';
  light: Tokens;
  dark: Tokens;
  folderPalette: PaletteColor[];
}

/** 文件夹语义色（Finder 标签色）：四个库共用，同一个颜色在每个库里意思一样 */
export const FOLDER_TAGS: PaletteColor[] = [
  { id: 'tag-orange', name: '橙 · 待处理', value: '#FF9500' },
  { id: 'tag-blue', name: '蓝 · 知识 / 阅读', value: '#007AFF' },
  { id: 'tag-green', name: '绿 · 产出', value: '#34C759' },
  { id: 'tag-purple', name: '紫 · 工具 / 来源', value: '#AF52DE' },
  { id: 'tag-gray', name: '灰 · 系统', value: '#8E8E93' },
  { id: 'tag-red', name: '红', value: '#FF3B30' },
  { id: 'tag-yellow', name: '黄', value: '#FFCC00' },
];

interface VaultColors {
  accent: string; accentInk: string; base: string; highlight: string;
  darkAccent: string; darkAccentInk: string; darkBase: string;
}

/** 由一个主题色生成整套档案：标题墨色、H1 用主题色深一档，其余全部中性 */
function vault(id: string, name: string, desc: string, c: VaultColors): Preset {
  return {
    id, name, desc,
    material: 'crystal',
    light: {
      base: c.base,
      ink: '#2A2522',
      inkMuted: '#8E8580',
      accent: c.accent,
      accentInk: c.accentInk,
      link: c.accentInk,
      headings: [c.accentInk, '#3D3734', '#4A4440', '#5C5450', '#6E6661', '#8E8580'],
      highlight: c.highlight,
      paneTint: '#F1EEEB',
      glassTint: '#FDFCFB',
      shadow: '#3A3330',
      wallpaper: { bg: c.base, blobs: [] },
    },
    dark: {
      base: c.darkBase,
      ink: '#ECE7E3',
      inkMuted: '#9C948F',
      accent: c.darkAccent,
      accentInk: c.darkAccentInk,
      link: c.darkAccentInk,
      headings: [c.darkAccentInk, '#DDD6D1', '#CFC7C2', '#BDB5B0', '#ABA39E', '#9C948F'],
      highlight: `color-mix(in srgb, ${c.darkAccent} 26%, transparent)`,
      paneTint: '#262324',
      glassTint: '#2A2728',
      shadow: '#000000',
      wallpaper: { bg: c.darkBase, blobs: [] },
    },
    folderPalette: FOLDER_TAGS,
  };
}

/** 社会生活：暖阳珊瑚 —— 人与人之间的温度 */
const coral = vault('coral', '暖阳珊瑚', '社会生活：暖白纸面 + 陶土珊瑚，克制有温度', {
  accent: '#C9705B', accentInk: '#A65642', base: '#FBF9F7', highlight: 'rgba(214, 160, 120, 0.26)',
  darkAccent: '#E08C71', darkAccentInk: '#EFA189', darkBase: '#1C1917',
});

/** 读书笔记：书卷苔绿 —— 纸页、绿植、台灯下的安静 */
const moss = vault('moss', '书卷苔绿', '读书笔记：象牙纸面 + 苔绿，沉静耐读', {
  accent: '#7A9545', accentInk: '#5D7627', base: '#F9FAF7', highlight: 'rgba(194, 215, 158, 0.42)',
  darkAccent: '#95B162', darkAccentInk: '#A9C37B', darkBase: '#191A17',
});

/** 科研工作：深海青 —— 冷静、理性、专注 */
const ocean = vault('ocean', '深海青', '科研工作：冷白纸面 + 深海青，理性专注', {
  accent: '#3595A4', accentInk: '#007785', base: '#F6FAFB', highlight: 'rgba(141, 221, 231, 0.40)',
  darkAccent: '#58B4C4', darkAccentInk: '#72C7D5', darkBase: '#161A1B',
});

/** 语言学习：鸢尾紫 —— 语言与文化的诗意 */
const iris = vault('iris', '鸢尾紫', '语言学习：淡紫纸面 + 鸢尾紫，轻盈有诗意', {
  accent: '#8F7BC6', accentInk: '#715DA4', base: '#F9F9FC', highlight: 'rgba(209, 196, 253, 0.45)',
  darkAccent: '#A996E2', darkAccentInk: '#BCABF1', darkBase: '#1A191C',
});

export const PRESETS: Record<string, Preset> = { coral, moss, ocean, iris };
export const DEFAULT_PRESET = 'coral';

/** 每个库默认用哪套档案（按库文件夹名匹配；新装插件时自动套用） */
export const VAULT_PRESET: Record<string, string> = {
  '社会生活': 'coral',
  '读书笔记': 'moss',
  '科研工作': 'ocean',
  '语言学习': 'iris',
};
