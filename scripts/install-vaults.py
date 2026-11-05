# 把琉璃装进四个库并写好各库配置（一次性迁移脚本，可重复执行）
#  - 复制 main.js / manifest.json / styles.css
#  - 写 data.json：档案、白玻璃材质、主题色文件夹图标（多色标签默认关闭，颜色仍按用途写好）、沿用旧 Note Count 的计数规则
#  - 启用本插件，停用 File Color / Note Count 和旧的 CSS 片段（改之前先备份到插件目录）
import json, shutil, time
from pathlib import Path

ROOT = Path(r'D:/Obsidian/Yucheng的知识体系')
ID = 'liuli-liquid-glass'
SRC = Path(__file__).resolve().parent.parent
OLD_PLUGINS = {'obsidian-file-color', 'file-explorer-note-count'}
OLD_SNIPPETS = {'file-color-pastel-blocks', 'file-color-contrast', 'icons_adjust', 'ubuntu-muted-folder-colors'}

TAGS = [
    {'id': 'tag-orange', 'name': '橙 · 待处理', 'value': '#FF9500'},
    {'id': 'tag-blue', 'name': '蓝 · 知识 / 阅读', 'value': '#007AFF'},
    {'id': 'tag-green', 'name': '绿 · 产出', 'value': '#34C759'},
    {'id': 'tag-purple', 'name': '紫 · 工具 / 来源', 'value': '#AF52DE'},
    {'id': 'tag-gray', 'name': '灰 · 系统', 'value': '#8E8E93'},
    {'id': 'tag-red', 'name': '红', 'value': '#FF3B30'},
    {'id': 'tag-yellow', 'name': '黄', 'value': '#FFCC00'},
]
O, B, G, P, S = 'tag-orange', 'tag-blue', 'tag-green', 'tag-purple', 'tag-gray'

VAULTS = {
    '社会生活': ('coral', {
        '00_闪念收集箱': O, '02_永久知识卡片盒': B, '03_模板文件库': S, '04_图片附件库': S,
        '05_笔记数据库索引': S, '06_Claude Skills技能库': P, '07_视频脚本库': G, '08_我的流程图': G}),
    '读书笔记': ('moss', {
        '00_闪念收集箱': O, '01_书籍电影分类': B, '02_永久知识卡片盒': B, '03_模板文件库': S, '04_图片附件库': S,
        '05_输出文章': G, '06_笔记数据库检索': S, '07_Kindle笔记同步': P, '08_我的流程图': G,
        '09_古籍阅读': B, '10_Excalidraw': G}),
    '科研工作': ('ocean', {
        '00_闪念收集箱': O, '01_论文书籍分类': B, '02_永久知识卡片盒': B, '03_输出文件库': G,
        '04_LiteratureNotes': B, '05_Excalidraw': G, '06_笔记数据库检索': S, '07_Canvas画板': G,
        '08_Claude Skills库': P, '09_Drawio流程图': G, '10_AI每日论文': P, '图片附件库': S, '模板文件库': S,
        'ZtTemplates': S}),
    '语言学习': ('iris', {
        '00_闪念收集箱': O, '01_语言分类': B, '02_永久知识卡片盒': B, '03_模板文件库': S, '04_图片附件库': S,
        '05_笔记数据库检索': S, '06_Canvas画布库': G, '07_Clippings': P}),
}

GLASS = {
    'enabled': True, 'material': 'crystal', 'floatingLayout': True, 'wallpaper': True, 'blur': 18,
    'paneAlpha': 78, 'floatAlpha': 74, 'sheetAlpha': 70, 'refract': 'floating', 'refractStrength': 26,
    'bezel': 20, 'chroma': False, 'pointerLight': True, 'motion': True, 'performance': False,
}


def read_json(p, default):
    try:
        return json.loads(p.read_text(encoding='utf8'))
    except Exception:
        return default


stamp = time.strftime('%Y%m%d-%H%M%S')
for vault, (preset, colors) in VAULTS.items():
    cfg = ROOT / vault / '.obsidian'
    pdir = cfg / 'plugins' / ID
    pdir.mkdir(parents=True, exist_ok=True)
    for f in ('main.js', 'manifest.json', 'styles.css'):
        shutil.copy2(SRC / f, pdir / f)

    # 备份
    for f in ('community-plugins.json', 'appearance.json', f'plugins/{ID}/data.json'):
        src = cfg / f
        if src.exists():
            shutil.copy2(src, pdir / f'backup-{stamp}-{Path(f).name}')

    old_nc = read_json(cfg / 'plugins/file-explorer-note-count/data.json', {})
    data = read_json(pdir / 'data.json', {})
    data.update({
        'version': 2,
        'preset': preset,
        'glass': {**GLASS, **{k: v for k, v in data.get('glass', {}).items() if k not in ('material',)}, 'material': 'crystal'},
        'folderColor': {
            'enabled': False, 'style': 'dot', 'mixLight': 42, 'mixDark': 26, 'cascade': False,
            'palette': TAGS,
            'fileColors': [{'path': k, 'color': v} for k, v in colors.items() if (ROOT / vault / k).is_dir()],
        },
        'noteCount': {
            'enabled': True,
            'showAllNumbers': bool(data.get('noteCount', {}).get('showAllNumbers', old_nc.get('showAllNumbers', False))),
            'filterList': data.get('noteCount', {}).get('filterList', old_nc.get('filterList', [])),
            'blacklist': bool(data.get('noteCount', {}).get('blacklist', old_nc.get('blacklist', False))),
            'tinted': False,
        },
        'fixes': {'enabled': True},
        'migrated': True,
    })
    (pdir / 'data.json').write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding='utf8')

    cp = cfg / 'community-plugins.json'
    plugins = [p for p in read_json(cp, []) if p not in OLD_PLUGINS]
    if ID not in plugins:
        plugins.append(ID)
    cp.write_text(json.dumps(plugins, indent=2), encoding='utf8')

    ap = cfg / 'appearance.json'
    app = read_json(ap, {})
    app['enabledCssSnippets'] = [s for s in app.get('enabledCssSnippets', []) if s not in OLD_SNIPPETS]
    ap.write_text(json.dumps(app, ensure_ascii=False, indent=2), encoding='utf8')

    print(f'{vault}: preset={preset}, {len(data["folderColor"]["fileColors"])} folders, plugins={len(plugins)}, snippets={app["enabledCssSnippets"]}')
