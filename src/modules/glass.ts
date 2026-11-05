// 液态玻璃外观：body 类名开关 + 档案变量 + 折射引擎 + 鼠标高光

import type LiuliPlugin from '../main';
import { buildProfileCss } from '../core/profile';
import { PRESETS, DEFAULT_PRESET } from '../core/presets';
import { RefractionEngine } from './refraction';

// 浮在内容上方的元素：最能体现折射
const FLOATING = ['.menu', '.suggestion-container', '.modal', '.prompt', '.popover.hover-popover', '.notice'];
// 大面积的框架玻璃
const PANES = ['.workspace-split.mod-sidedock:not(.is-sidedock-collapsed)'];

const BODY_CLASSES = ['lg-on', 'lg-vars', 'lg-glass', 'lg-solid', 'lg-crystal', 'lg-apple-type', 'lg-float', 'lg-wall', 'lg-perf', 'lg-motion', 'lg-pointer', 'lg-fixes', 'lg-count', 'lg-count-tint'];

export class GlassModule {
  private varsEl: HTMLStyleElement | null = null;
  private engine: RefractionEngine | null = null;
  private raf = 0;
  private onPointer = (e: PointerEvent) => {
    if (this.raf) return;
    this.raf = requestAnimationFrame(() => {
      this.raf = 0;
      const r = document.documentElement.style;
      r.setProperty('--lg-mx', `${e.clientX}px`);
      r.setProperty('--lg-my', `${e.clientY}px`);
    });
  };

  constructor(private plugin: LiuliPlugin) {}

  load() {
    this.varsEl = document.head.createEl('style', { attr: { id: 'lg-profile-vars' } });
    this.plugin.registerDomEvent(document, 'pointermove', this.onPointer, { passive: true });
    this.plugin.registerEvent(this.plugin.app.workspace.on('css-change', () => this.refresh()));
    // 明暗切换会改饱和度，需要重建滤镜（css-change 已覆盖）
    this.plugin.registerEvent(this.plugin.app.workspace.on('layout-change', () => this.engine?.scan(document.body)));
    this.refresh();
  }

  refresh() {
    const s = this.plugin.settings;
    const g = s.glass;
    const preset = PRESETS[s.preset] ?? PRESETS[DEFAULT_PRESET];
    if (this.varsEl) this.varsEl.textContent = buildProfileCss(preset, s);

    const b = document.body;
    const on = (c: string, v: boolean) => b.toggleClass(c, v);
    on('lg-on', true);
    on('lg-vars', true);
    const solid = g.material === 'solid';
    const crystal = g.material === 'crystal';
    on('lg-glass', g.enabled);
    on('lg-solid', g.enabled && solid);
    on('lg-crystal', g.enabled && crystal);
    on('lg-apple-type', preset.typography === 'apple');
    on('lg-float', g.enabled && !solid && !crystal && g.floatingLayout);
    on('lg-wall', g.enabled && !solid && !crystal && g.wallpaper);
    on('lg-perf', g.enabled && g.performance);
    on('lg-motion', g.enabled && g.motion);
    on('lg-pointer', g.enabled && g.pointerLight);
    on('lg-fixes', s.fixes.enabled);
    on('lg-count', s.noteCount.enabled);
    on('lg-count-tint', s.noteCount.enabled && s.noteCount.tinted);

    const wantRefract = g.enabled && !solid && !crystal && !g.performance && g.refract !== 'off';
    if (!wantRefract) { this.engine?.destroy(); this.engine = null; return; }
    if (!this.engine) {
      this.engine = new RefractionEngine(
        () => this.refractSelector(),
        () => {
          const gg = this.plugin.settings.glass;
          return { strength: gg.refractStrength, bezel: gg.bezel, chroma: gg.chroma, blur: gg.blur, saturate: document.body.hasClass('theme-dark') ? 1.5 : 1.75 };
        },
      );
    } else this.engine.refresh();
  }

  private refractSelector(): string {
    const g = this.plugin.settings.glass;
    if (!g.enabled || g.refract === 'off') return '';
    const list = g.refract === 'all' && g.floatingLayout ? [...FLOATING, ...PANES] : FLOATING;
    return list.join(', ');
  }

  unload() {
    this.engine?.destroy();
    this.engine = null;
    cancelAnimationFrame(this.raf);
    this.varsEl?.remove();
    BODY_CLASSES.forEach(c => document.body.removeClass(c));
    document.documentElement.style.removeProperty('--lg-mx');
    document.documentElement.style.removeProperty('--lg-my');
  }
}
