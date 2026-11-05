// 把构建产物复制到库的插件目录（不动 data.json）。
// 用法：node scripts/deploy.mjs [库名 ...]    不带参数 = 四个库全部
import fs from 'node:fs';
import path from 'node:path';

const ROOT = 'D:/Obsidian/Yucheng的知识体系';
const ID = JSON.parse(fs.readFileSync('manifest.json', 'utf8')).id;
const vaults = process.argv.slice(2).length ? process.argv.slice(2) : ['社会生活', '读书笔记', '科研工作', '语言学习'];

for (const v of vaults) {
  const dir = path.join(ROOT, v, '.obsidian', 'plugins', ID);
  fs.mkdirSync(dir, { recursive: true });
  for (const f of ['main.js', 'manifest.json', 'styles.css']) fs.copyFileSync(f, path.join(dir, f));
  console.log(`→ ${v}: ${dir}`);
}
