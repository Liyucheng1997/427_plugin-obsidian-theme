// 一键发布：升版本号 → 构建 → 部署到本机四个库 → git 提交并推送 → 发布 GitHub Release（附三个文件）
// 其他设备上的琉璃会在启动后自动从 Release 拉到新版本。
//
// 用法：
//   npm run release                         # 补丁版本 +1（0.2.0 → 0.2.1）
//   npm run release -- minor                # 次版本 +1（0.2.1 → 0.3.0）
//   npm run release -- 1.0.0                # 指定版本
//   npm run release -- minor -m "提交说明" --notes "发布说明"
import fs from 'node:fs';
import { execSync } from 'node:child_process';

const args = process.argv.slice(2);
const flag = name => { const i = args.indexOf(name); return i >= 0 ? args.splice(i, 2)[1] : undefined; };
const message = flag('-m');
const notesArg = flag('--notes');
const bump = args[0] ?? 'patch';

const run = (cmd, opts = {}) => execSync(cmd, { stdio: 'inherit', ...opts });
const out = cmd => execSync(cmd, { encoding: 'utf8' }).trim();
const readJson = f => JSON.parse(fs.readFileSync(f, 'utf8'));
const writeJson = (f, o) => fs.writeFileSync(f, JSON.stringify(o, null, 2) + '\n');

// 1. 版本号
const manifest = readJson('manifest.json');
const [ma, mi, pa] = manifest.version.split('.').map(Number);
const next = /^\d+\.\d+\.\d+$/.test(bump) ? bump
  : bump === 'major' ? `${ma + 1}.0.0`
  : bump === 'minor' ? `${ma}.${mi + 1}.0`
  : `${ma}.${mi}.${pa + 1}`;
if (out(`git tag --list ${next}`)) throw new Error(`版本 ${next} 已经发布过了`);
manifest.version = next;
writeJson('manifest.json', manifest);
const pkg = readJson('package.json'); pkg.version = next; writeJson('package.json', pkg);
const versions = fs.existsSync('versions.json') ? readJson('versions.json') : {};
versions[next] = manifest.minAppVersion; writeJson('versions.json', versions);
console.log(`\n▶ 版本 ${next}`);

// 2. 构建 + 部署到本机四个库
run('npm run build');
run('node scripts/deploy.mjs');

// 3. 提交并推送
const lastTag = out('git describe --tags --abbrev=0 2>nul || echo').split('\n').pop();
run('git add -A');
run(`git commit -q -F -`, { input: message ?? `发布 ${next}`, stdio: ['pipe', 'inherit', 'inherit'] });
run('git push -q');

// 4. 发布 Release（tag 由 gh 在当前提交上创建）
const notes = notesArg ?? (lastTag
  ? out(`git log ${lastTag}..HEAD --pretty=format:"- %s"`)
  : `琉璃 Liquid Glass ${next}`);
fs.writeFileSync('.release-notes.tmp', notes);
try {
  run(`gh release create ${next} main.js manifest.json styles.css --title "琉璃 Liquid Glass ${next}" --notes-file .release-notes.tmp --target ${out('git rev-parse HEAD')}`);
} finally {
  fs.rmSync('.release-notes.tmp', { force: true });
}
run('git fetch -q --tags');
console.log(`\n✓ 已发布 ${next}：本机四个库已更新，其他设备启动琉璃后会自动拉取。`);
