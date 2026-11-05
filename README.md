# 琉璃 Liquid Glass

我自己四个 Obsidian 库（社会生活 / 读书笔记 / 科研工作 / 语言学习）共用的外观插件：
**白玻璃卡片的质感 + 每个库一个主题色**，同时内置了文件夹颜色和笔记计数，替代 File Color、File Explorer Note Count 两个插件和几段 CSS 片段。

## 功能

- **白玻璃卡片材质**（来自 [liyucheng.me](https://liyucheng.me) 的质感）：近白纸面，侧栏、正文、右栏三张半透明白玻璃卡片，内白外灰双层细边、顶部内高光、负扩散大柔影。另有「液态玻璃」（边缘折射）和「纯色」两种材质可切换。
- **四个库四个主题色**：OKLCH 里同明度、同彩度，色相约每 90° 一个。
  | 库 | 档案 | 主题色 |
  |---|---|---|
  | 社会生活 | 暖阳珊瑚 | `#C9705B` |
  | 读书笔记 | 书卷苔绿 | `#7A9545` |
  | 科研工作 | 深海青 | `#3595A4` |
  | 语言学习 | 鸢尾紫 | `#8F7BC6` |
- **文件夹颜色**：右键文件夹 →「设置颜色」。默认是名字前一颗 Finder 标签色圆点，四个库语义一致：橙 待处理 · 蓝 知识/阅读 · 绿 产出 · 紫 工具/来源 · 灰 系统。另有柔和底色、底色+色条等风格。
- **笔记计数**：文件夹右侧的灰色数字，增量更新。
- **冻结 Style Settings**：把 Style Settings 给 Blue Topaz 打开的选项拍快照，由琉璃应用，Style Settings 平时可以禁用；需要调选项时再打开，调完运行「冻结 Style Settings 的主题设置并停用它」。

## 开发

```bash
npm install
npm run build      # 类型检查 + 打包 main.js / styles.css
npm run deploy     # 构建并复制到四个库的 .obsidian/plugins/liuli-liquid-glass/
python scripts/install-vaults.py   # 首次安装 / 重配四个库（会先备份）
```

源码在 `src/`，样式按文件拆在 `styles/`，构建时合并成 `styles.css`。设计过程和取舍见 [DESIGN.md](DESIGN.md)。

## 手动安装

从 Releases 下载 `main.js`、`manifest.json`、`styles.css`，放进库的 `.obsidian/plugins/liuli-liquid-glass/`，在「第三方插件」里启用。
