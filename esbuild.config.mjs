import esbuild from 'esbuild';
import fs from 'node:fs';

const prod = process.argv[2] === 'production';
const watch = process.argv[2] === 'watch';

// 把 styles/ 下的 CSS 按文件名顺序合并成 styles.css
function buildCss() {
  const files = fs.readdirSync('styles').filter(f => f.endsWith('.css')).sort();
  const css = files.map(f => `/* ==== ${f} ==== */\n` + fs.readFileSync(`styles/${f}`, 'utf8')).join('\n');
  fs.writeFileSync('styles.css', css);
}

const ctx = await esbuild.context({
  entryPoints: ['src/main.ts'],
  bundle: true,
  external: ['obsidian', 'electron', '@codemirror/*', '@lezer/*'],
  format: 'cjs',
  target: 'es2020',
  logLevel: 'info',
  sourcemap: prod ? false : 'inline',
  treeShaking: true,
  outfile: 'main.js',
  plugins: [{ name: 'css', setup(b) { b.onEnd(buildCss); } }],
});

if (watch) await ctx.watch();
else { await ctx.rebuild(); await ctx.dispose(); }
