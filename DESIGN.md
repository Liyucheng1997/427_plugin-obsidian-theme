# 琉璃（Liquid Glass）—— 四库统一主题插件设计方案

> 目标：用一个自己的插件，取代现在分散在各库里的 **File Color 插件 + File Explorer Note Count 插件 + 4 个 CSS 片段**，并在其上加一层苹果“液态玻璃”外观；四个库的配色与风格类型保持现状，靠颜色区分库。

---

## 1. 现状调研

库根目录：`D:\Obsidian\Yucheng的知识体系\`，四个库全部用 **Blue Topaz（2024051401）** + Style Settings，区别在 Blue Topaz 的配色方案和文件夹配色风格。

| 库 | Blue Topaz 配色方案 | 主色 / 背景 | 明暗 | 字号 | 文件夹配色（File Color） | 启用的片段 | 计数显示全部 |
|---|---|---|---|---|---|---|---|
| 读书笔记 | `autumn-topaz` 秋日 | 橄榄绿 `#70a600`，琥珀 `#fab102`，深 `#2f4858`；底 `#fafaf3`/`#bbddcd` | 浅色 | 19 | **鲜艳色** 8 色（`#fe4365` `#26bcd5` `#8239ff`…） | `file-color-contrast`（38% 混色 + 3px 左边条） | 否 |
| 科研工作 | `chocolate-topaz` 可可 | 巧克力棕 `#74412d`，`#c2907a`，深 `#4b1e0e`；底 `#faf4eb`/`#f7e6ce` | 浅色 | 19 | **鲜艳色** 9 色（含 DarkRed `#ff4d00`） | `file-color-contrast`；Ubuntu 上另用 `ubuntu-muted-folder-colors` 去饱和 | 是 |
| 语言学习 | `pink-topaz` 樱粉 | 粉 `#f394cb`（hsl 325 80% 77%），强调 `#cc437c`；底 `#fffaf0`/`#ffebeb` | 浅色 | 18 | **马卡龙浅色** 8 色（Blush/Peach/Butter/Sage…） | `file-color-pastel-blocks`（46% 混色 + 4px 边条 + 内描边） | 是 |
| 社会生活 | `topaz-nord` 北境 | 冰蓝 `#81a1c1`（hsl 210 34% 63%），底 `#2E3440` | 未写入（Obsidian 默认深色） | 21 | **莫兰迪** 8 色（Rose/Sage/Powder Blue…） | `file-color-pastel-blocks`（60% 混色 + 深色字 `#0f172a`） | 否 |

四个库共用的 `icons_adjust.css`：
- 折叠箭头 `margin-left:-20px`、条目文字 `margin-left:0`（文件树缩进收紧）；
- 修 Obsidian 1.14 的 ribbon 顶角（`.mod-left` → `.mod-primary` 改名）；
- 左侧栏顶部标签栏背景跟 ribbon 同色。

两个插件的实现方式：
- **File Color 1.1.0**：`data.json` 存 `palette[{id,name,value}]` + `fileColors[{path,color}]` + `cascadeColors` / `colorBackground`；在文件树条目上加 `.file-color-file .file-color-type-background` 类和 `--file-color-color` 变量，样式完全靠 CSS。四库都是“背景模式、不级联”。
- **Note Count 1.2.x**：监听 vault 的 `create/delete/rename`，算出每个文件夹下的笔记数，写到 `.nav-folder-title[data-count]`，用 `::after { content: attr(data-count) }` 显示；`showAllNumbers=false` 时展开的文件夹隐藏数字。

**结论**：四个库的“类型”其实是三个变量的组合 —— *Blue Topaz 配色方案* × *文件夹色板（鲜艳 / 马卡龙 / 莫兰迪）* × *文件夹色块风格（对比 / 粉彩块）*。新插件就把这三个变量做成每个库的 **Vault Profile（库档案）**。

---

## 2. 总体思路：在 Blue Topaz 之上加一层“玻璃”，而不是重写主题

两条路线：

| | A. 叠加层（推荐先做） | B. 独立主题引擎 |
|---|---|---|
| 做法 | Blue Topaz 保留，插件把背景变量换成半透明，再叠玻璃材质 | 切回默认主题，插件自带四套配色的完整 CSS |
| 配色继承 | **自动**：运行时读 Blue Topaz 已算好的变量 | 需把四套配色快照进插件 |
| 工作量 | 小，1–2 周可用 | 大，要重做标题色、彩虹标签、表格等 |
| 风险 | 要压过 Blue Topaz 的 `!important` | 失去 Blue Topaz 的细节 |

**建议：先走 A，同时把四套配色“快照”成预设存进插件**，以后想甩掉 Blue Topaz 时直接切到 B，不用再调研一遍。

Blue Topaz 本身给背景图功能留了钩子变量 `--background-primary-bg-4-bt` 等，把它们设为透明色就能让玻璃透出底下的壁纸，不必和主题硬拼。

---

## 3. 液态玻璃视觉系统

### 3.1 四层结构（参照苹果 Liquid Glass：玻璃只用于“导航层”，内容区保证可读）

```
L0 环境壁纸   全窗口底层：用库主色生成的柔和网格渐变（mesh gradient），可选缓慢流动
L1 框架玻璃   ribbon、左右侧栏、标签栏、状态栏：强模糊 + 主色淡染
L2 内容纸面   编辑器/阅读区：高不透明度（88–94%），只留一点通透，保证长时间阅读不累
L3 浮层玻璃   命令面板、弹窗、右键菜单、悬浮预览、通知：模糊 + 高光边 + 可选折射
L4 控件       按钮、标签页、计数胶囊、开关：胶囊形，按下有“液体”回弹
```

### 3.2 设计变量（插件注入到 `body.lg-on`，由库档案计算得出）

```css
body.lg-on {
  /* 来自库档案 */
  --lg-tint:        var(--interactive-accent);   /* 库主色，运行时从 Blue Topaz 读 */
  --lg-tint-2:      …;                            /* 次色：autumn=琥珀、chocolate=焦糖… */
  --lg-base:        …;                            /* 原 background-primary */

  /* 材质 */
  --lg-blur:        28px;
  --lg-saturate:    170%;
  --lg-chrome-alpha: 58%;   /* L1 透明度 */
  --lg-sheet-alpha:  92%;   /* L2 透明度 */
  --lg-float-alpha:  66%;   /* L3 透明度 */
  --lg-radius-l:    18px;   /* 面板 */
  --lg-radius-m:    12px;   /* 卡片/菜单 */
  --lg-radius-pill: 999px;  /* 控件 */

  /* 高光与阴影：浅色/深色各一套 */
  --lg-rim:   inset 0 1px 0 rgb(255 255 255 / .65), inset 0 -1px 0 rgb(255 255 255 / .12);
  --lg-edge:  1px solid rgb(255 255 255 / .38);
  --lg-drop:  0 10px 30px rgb(0 0 0 / .10), 0 2px 6px rgb(0 0 0 / .06);
}
body.lg-on.theme-dark {
  --lg-rim:  inset 0 1px 0 rgb(255 255 255 / .16), inset 0 -1px 0 rgb(255 255 255 / .04);
  --lg-edge: 1px solid rgb(255 255 255 / .10);
  --lg-drop: 0 12px 36px rgb(0 0 0 / .45);
}

.lg-glass {
  background: color-mix(in srgb, var(--lg-base) var(--lg-chrome-alpha), color-mix(in srgb, var(--lg-tint) 8%, transparent));
  backdrop-filter: blur(var(--lg-blur)) saturate(var(--lg-saturate));
  border: var(--lg-edge);
  box-shadow: var(--lg-rim), var(--lg-drop);
}
```

### 3.3 “液态”的三个细节
1. **高光边**：上沿亮、下沿暗的 inset 阴影 + 渐变描边（`mask` 做 1px 渐变边框），这是玻璃感的关键，比单纯 blur 重要。
2. **折射（可选，默认只开在 L3/L4）**：注入一个 SVG `feTurbulence + feDisplacementMap` 滤镜，用 `backdrop-filter: url(#lg-refract) blur(…)`。Obsidian 是 Chromium 内核，支持；但大面积开会卡，所以只给命令面板、菜单、胶囊按钮这类小面积元素。
3. **液体动效**：按钮按下 `scale(.96)` + 弹簧曲线 `cubic-bezier(.34,1.56,.64,1)`；标签页切换时选中胶囊滑动过去；全部尊重 `prefers-reduced-motion`。

### 3.4 可读性与性能护栏
- 正文区永远 ≥ 88% 不透明；文字下不叠两层玻璃（玻璃里不再嵌玻璃）。
- 设置里给“性能模式”：关掉 blur，只保留半透明色 + 高光边，观感 80% 不变。
- 跟随系统“减少透明度”。

---

## 4. 四个库的玻璃变体（保留区分度）

每个库档案 = 主色调 + 壁纸 + 文件夹色板 + 色块风格。玻璃材质一致，**颜色和“性格”不同**：

| 库 | 档案名 | 壁纸（L0） | 玻璃染色 | 文件夹色块风格 | 性格 |
|---|---|---|---|---|---|
| 读书笔记 | 秋日 Autumn | 米白底 + 橄榄绿/琥珀两团柔光 | 绿 8% | **鲜艳玻璃**：38% 染色 + 3px 亮色边条 | 明快、有书页暖意 |
| 科研工作 | 可可 Cocoa | 奶咖底 + 焦糖/可可柔光 | 棕 6%，饱和度偏低 | **鲜艳玻璃**；Linux 上自动切“去饱和” | 沉稳、学术 |
| 语言学习 | 樱粉 Sakura | 象牙白 + 樱粉/桃色柔光 | 粉 10% | **粉彩玻璃**：46% 染色 + 内描边 | 轻盈、活泼（保留标题动画） |
| 社会生活 | 北境 Nord | 深蓝灰底 + 冰蓝/雾紫柔光（深色玻璃） | 冰蓝 8% | **莫兰迪玻璃**：60% 染色 + 深色字 | 冷静、克制 |

Ubuntu 去饱和片段不再需要单独维护：插件用 `Platform.isLinux` 自动给档案加 `muted` 修饰。

---

## 5. 插件架构

```
liquid-glass/                    (插件 id 暂定 yucheng-liquid-glass)
├─ manifest.json
├─ src/
│  ├─ main.ts                    加载设置 → 迁移 → 按开关启停各模块
│  ├─ settings.ts                设置结构 + 设置页（四个分页）
│  ├─ core/
│  │  ├─ profile.ts              库档案：读取 Blue Topaz 运行时变量 / 预设，算出 --lg-* 变量
│  │  ├─ presets.ts              四套档案快照（autumn/cocoa/sakura/nord + 三套色板）
│  │  ├─ styleManager.ts         注入/更新 <style id="lg-vars">、body 类名
│  │  └─ migrate.ts              从旧插件 data.json 导入，停用旧插件和片段（先备份）
│  ├─ modules/
│  │  ├─ glass/                  四层玻璃 CSS + SVG 折射滤镜
│  │  ├─ folderColor/            文件夹颜色（替代 File Color）
│  │  ├─ noteCount/              笔记计数（替代 Note Count）
│  │  └─ fixes/                  icons_adjust 里的缩进修正 + 1.14 ribbon 修复
│  └─ styles/*.css               构建时合并成 styles.css
├─ scripts/deploy.mjs            构建产物一键复制到四个库的 .obsidian/plugins/<id>/（不覆盖 data.json）
└─ esbuild.config.mjs
```

每个模块实现同一个接口，设置里能单独开关：

```ts
interface Module {
  id: 'glass' | 'folderColor' | 'noteCount' | 'fixes';
  load(): void;      // 注册事件、注入样式
  unload(): void;    // 全部清理，关掉后界面恢复原样
  refresh(): void;   // 设置变化或主题切换（css-change 事件）时重算
}
```

### 5.1 文件夹颜色模块（替代 File Color）
- **数据格式沿用** File Color 的 `palette` + `fileColors`，首次启动直接读 `.obsidian/plugins/obsidian-file-color/data.json` 导入，现有颜色零重配。
- 右键菜单“设置颜色”：色板以玻璃色卡展示，可新增/改名/改色。
- 监听 `rename`/`delete` 自动更新路径（File Color 的痛点之一）。
- 渲染：仍在条目上设 `--file-color-color`（兼容），外加 `data-lg-color-style="vivid|pastel|morandi"`，由 CSS 决定混色比例、边条宽度、字色。原来三个片段的参数变成设置项：染色强度 %、边条宽度、圆角、字色（自动/深色/主题色）。
- 新能力（可选）：级联到子文件夹时自动减淡一级；文件夹颜色同步给计数胶囊。

### 5.2 笔记计数模块（替代 Note Count）
- 语义与原插件一致：递归统计 `.md`（可配扩展名过滤、黑/白名单、显示根目录、`showAllNumbers`），首次启动导入原 `data.json`。
- 实现改进：启动时一次性建索引 `Map<folderPath, count>`，之后按 `create/delete/rename` 增量加减，150ms 防抖后只更新受影响的祖先文件夹，大库不卡。
- 外观：右侧玻璃胶囊 `padding 1px 7px; border-radius 999px; font-variant-numeric: tabular-nums;`，淡染所在文件夹的颜色；展开时淡出（`showAllNumbers=false`）。
- 定位文件树条目：优先用文件管理器视图的 `fileItems[path].selfEl`（非公开 API），失败退回 `[data-path]` 选择器 + `MutationObserver`。这块是 Obsidian 升级时最可能坏的地方，单独封装成一个 `explorerAdapter.ts`。

### 5.3 修复模块
把 `icons_adjust.css` 收进来，并在 adapter 里同时兼容 `.mod-left/.mod-primary` 新旧类名。玻璃模式下 ribbon 和侧栏标签栏都是 L1 玻璃，原来“顶角秃一块”的问题自然消失。

### 5.4 设置页（本身也做成苹果风）
四个分页：**外观**（档案选择、自动读取主题 / 用快照、玻璃强度滑块、性能模式、折射开关、壁纸开关）· **文件夹颜色**（色板编辑、色块风格、已着色文件夹列表）· **笔记计数** · **兼容与迁移**（导入旧配置、一键停用旧插件和片段、还原）。顶部放一个实时预览小卡片。

---

## 6. 迁移与上线步骤

1. **科研工作先试**（插件最多、最容易暴露冲突）：装上插件 → 自动导入 File Color / Note Count 配置 → 弹通知“检测到旧插件，一键停用？” → 备份 `appearance.json`、`community-plugins.json` 后停用 File Color、Note Count 和 `file-color-*`、`icons_adjust` 片段。
2. 观察一周（MacBook、Ubuntu、Windows 三端），修 Blue Topaz 冲突。
3. `npm run deploy` 推到其余三个库，每库首次启动自动套对应档案。
4. 可选阶段二：独立主题模式，脱离 Blue Topaz。

设置存在各库自己的 `data.json` 里，四个库天然各用各的档案；插件代码四库共享一份。

---

## 7. 风险

| 风险 | 对策 |
|---|---|
| Obsidian 升级改文件树 DOM（1.14 已经改过一次） | 文件树操作集中在 `explorerAdapter.ts`，双路径定位 + 版本检测 |
| Blue Topaz 的 `!important` 与高特异性选择器 | 所有覆盖用 `body.lg-on.theme-*` 起头（特异性更高），优先改它的钩子变量而不是覆盖规则 |
| `backdrop-filter` 大面积性能 | 只在 L1/L3 用；性能模式；不嵌套玻璃 |
| 浅色马卡龙/莫兰迪色块在玻璃上对比度不足 | 字色自动按 WCAG 对比度选深/浅 |
| 其他插件（Excalidraw、Drawio、Dataview）的视图背景 | 这些视图强制 L2 不透明纸面 |

---

## 7.5 第一版实现记录（社会生活库，2026-11-05）

**配色：暖阳珊瑚**（`src/core/presets.ts` 的 `coral`）。社会生活讲的是人、关系、日常，所以用暖色做主：
珊瑚橙 `#E8735A` 做主色（按钮、选中、标题 H1），海青 `#23867D` 做链接和 H3，形成冷暖对比；
壁纸是杏桃、薄荷、丁香、奶油黄几团柔光。深色版同色相降明度。原来的北境 Nord 留作备选档案。
文件夹仍用你原来的莫兰迪色板（已从 File Color 导入）。

**液态玻璃的做法**（`src/modules/refraction.ts`）：
- 每个浮层元素按尺寸实时生成一张位移贴图（圆角矩形距离场 → 凸透镜斜率），R/G 存位移，B 存“边缘系数”；
- SVG 滤镜两层合成：中心是重度模糊的磨砂，边缘一圈是几乎不模糊、被弯折的清透玻璃，再加三通道错位的色散；
- 滤镜挂在 `backdrop-filter: url(#…)` 上。Chromium 的两个坑：`url()` 和 `blur()` 写在一起会整条失效；SVG 坐标按设备像素算（要乘 devicePixelRatio）；
- 边缘高光是一条渐变描边（mask 镂空），上沿亮下沿暗，开了“高光跟随鼠标”时鼠标附近更亮。

**已替换**：File Color、File Explorer Note Count 两个插件，`file-color-pastel-blocks`、`icons_adjust` 两个片段（已停用，配置备份在插件目录 `backup-*.json`）。

## 7.6 定稿（2026-11-05）：白玻璃卡片 + 四库主题色

几轮试错后的结论：多色壁纸、彩色整块文件夹、彩虹配色都显“花”；最后定为 **liyucheng.me 的质感**（材质 `crystal`）：
`#fbfbfd` 一类的近白纸面 + 半透明白玻璃卡片（内白边 1px + 外灰边 1px + 顶部内高光 + 负扩散大柔影），
侧栏 / 正文 / 右栏三张卡片同材质、同 18px 圆角、同 10px 间距。

四个库只换一个主题色（OKLCH 同明度 L≈0.63、同彩度，色相约每 90° 一个）：

| 库 | 档案 | 主题色 / 文字色 |
|---|---|---|
| 社会生活 | 暖阳珊瑚 `coral` | `#C9705B` / `#A65642` |
| 读书笔记 | 书卷苔绿 `moss` | `#7A9545` / `#5D7627` |
| 科研工作 | 深海青 `ocean` | `#3595A4` / `#007785` |
| 语言学习 | 鸢尾紫 `iris` | `#8F7BC6` / `#715DA4` |

文件夹：所有文件夹图标统一用主题色（单色，安静）。多色标签默认关闭；需要时可打开，四个库语义一致——橙 待处理 · 蓝 知识/阅读 · 绿 产出 · 紫 工具/来源 · 灰 系统；行本身不染色，计数是灰色数字。
安装与重配：`python scripts/install-vaults.py`（可重复执行，会先备份）；之后只更新代码用 `npm run deploy`（四库一起）。

## 8. 待你拍板

1. 路线：先做 **A 叠加在 Blue Topaz 上**（推荐），还是一步到位做独立主题？
2. 旧插件和片段：插件首次运行时**自动停用（先备份）**，还是只提示、你手动停？
3. 插件名：暂定「琉璃 Liquid Glass」，id `yucheng-liquid-glass`。
