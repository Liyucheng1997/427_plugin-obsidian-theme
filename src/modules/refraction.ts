// 液态玻璃的“折射”：按元素尺寸实时生成位移贴图（displacement map），
// 包成 SVG <filter>，通过 CSS 变量 --lg-backdrop 交给 backdrop-filter 使用。
//
// 原理：把玻璃想成边缘向下弯的凸透镜。离边缘 bezel 像素以内，背景沿法线方向被“拉”向内侧，
// 越靠边位移越大（凸面的斜率越陡）；中间平坦区域不位移。R 通道 = x 位移，G 通道 = y 位移，128 = 不动。
// 开启色散时 R/G/B 三个通道用略微不同的位移量，边缘会出现一圈很淡的彩虹。
//
// 两个 Chromium 的坑（Obsidian 1.15 / Chrome 132 实测）：
// 1. backdrop-filter 里 url() 和 blur() 写在一起，整条滤镜失效 → 模糊、饱和度都放进 SVG 滤镜里做；
// 2. backdrop-filter 引用的 SVG 滤镜坐标按“设备像素”算，不按 CSS 像素 → 所有尺寸乘 devicePixelRatio。

const SVG_NS = 'http://www.w3.org/2000/svg';

export interface RefractOptions {
  strength: number;  // 最大位移 px
  bezel: number;     // 边缘弯曲区宽度 px
  chroma: boolean;
  blur: number;      // 模糊半径 px
  saturate: number;  // 饱和度倍数
}

interface FilterEntry { id: string; node: SVGFilterElement; used: number }

export class RefractionEngine {
  private svg: SVGSVGElement;
  private defs: SVGDefsElement;
  private cache = new Map<string, FilterEntry>();
  private attached = new Map<HTMLElement, string>();
  private ro: ResizeObserver;
  private mo: MutationObserver;
  private seq = 0;
  private pending = new Set<HTMLElement>();
  private raf = 0;
  private dpr = window.devicePixelRatio;
  private onResize = () => {
    if (window.devicePixelRatio === this.dpr) return;
    this.dpr = window.devicePixelRatio;
    this.attached.forEach((_, el) => this.queue(el));
  };

  constructor(private selector: () => string, private opts: () => RefractOptions) {
    this.svg = document.createElementNS(SVG_NS, 'svg');
    this.svg.setAttribute('aria-hidden', 'true');
    this.svg.setAttribute('class', 'lg-svg-defs');
    this.svg.setAttribute('width', '0');
    this.svg.setAttribute('height', '0');
    this.svg.style.cssText = 'position:absolute;width:0;height:0;pointer-events:none;';
    this.defs = document.createElementNS(SVG_NS, 'defs');
    this.svg.appendChild(this.defs);
    document.body.appendChild(this.svg);

    this.ro = new ResizeObserver(entries => {
      for (const e of entries) this.queue(e.target as HTMLElement);
    });
    // 菜单、弹窗、悬浮预览、提示都是直接挂在 body 下的，所以只看 body 的直接子节点 + 通知容器
    this.mo = new MutationObserver(muts => {
      for (const m of muts) {
        m.addedNodes.forEach(n => {
          if (!(n instanceof HTMLElement)) return;
          // 弹窗容器先挂到 body，里面的 .prompt / .modal 稍后才填进去，所以多扫两次
          this.scan(n);
          requestAnimationFrame(() => n.isConnected && this.scan(n));
          window.setTimeout(() => n.isConnected && this.scan(n), 120);
        });
        m.removedNodes.forEach(n => { if (n instanceof HTMLElement) this.forgetTree(n); });
      }
    });
    this.mo.observe(document.body, { childList: true });
    // 窗口拖到另一块缩放比例不同的屏幕上时，devicePixelRatio 会变
    window.addEventListener('resize', this.onResize);
    const nc = document.body.querySelector('.notice-container');
    if (nc) this.mo.observe(nc, { childList: true });
    this.scan(document.body);
  }

  /** 设置变化后重建全部滤镜 */
  refresh() {
    this.cache.forEach(e => e.node.remove());
    this.cache.clear();
    for (const el of [...this.attached.keys()]) {
      if (!el.matches(this.selector())) this.detach(el);
    }
    this.scan(document.body);
    this.attached.forEach((_, el) => this.queue(el));
  }

  scan(root: HTMLElement) {
    const sel = this.selector();
    if (!sel) return;
    if (root.matches(sel)) this.attach(root);
    root.querySelectorAll<HTMLElement>(sel).forEach(el => this.attach(el));
  }

  private attach(el: HTMLElement) {
    if (this.attached.has(el)) return;
    this.attached.set(el, '');
    this.ro.observe(el);
    this.queue(el);
  }

  private detach(el: HTMLElement) {
    this.ro.unobserve(el);
    el.style.removeProperty('--lg-backdrop');
    this.attached.delete(el);
  }

  private forgetTree(root: HTMLElement) {
    for (const el of [...this.attached.keys()]) {
      if (el === root || root.contains(el)) this.detach(el);
    }
  }

  private queue(el: HTMLElement) {
    this.pending.add(el);
    if (!this.raf) this.raf = requestAnimationFrame(() => this.flush());
  }

  private flush() {
    this.raf = 0;
    const els = [...this.pending];
    this.pending.clear();
    for (const el of els) {
      if (!el.isConnected) { this.detach(el); continue; }
      // 用布局尺寸（不受弹出动画的 transform 缩放影响）
      const w = el.offsetWidth, h = el.offsetHeight;
      if (w < 8 || h < 8) continue;
      const cs = getComputedStyle(el);
      let radius = parseFloat(cs.borderTopLeftRadius) || 0;
      radius = Math.min(radius, w / 2, h / 2);
      const id = this.filterFor(w, h, radius);
      if (this.attached.get(el) !== id) {
        el.style.setProperty('--lg-backdrop', `url(#${id})`);
        this.attached.set(el, id);
      }
    }
    this.gc();
  }

  private filterFor(w: number, h: number, radius: number): string {
    const o = this.opts();
    const dpr = window.devicePixelRatio || 1;
    const key = `${w}x${h}r${Math.round(radius)}@${dpr}`;
    const hit = this.cache.get(key);
    if (hit) { hit.used = performance.now(); return hit.id; }

    const id = `lg-refract-${++this.seq}`;
    // 位移量不超过元素短边的 40%，否则小胶囊会被扭得认不出来
    const bezel = Math.max(4, Math.min(o.bezel, w / 2 - 1, h / 2 - 1));
    const strength = Math.min(o.strength, Math.min(w, h) * 0.4);
    const map = makeMap(w, h, radius, bezel);
    const W = Math.round(w * dpr), H = Math.round(h * dpr);
    const f = document.createElementNS(SVG_NS, 'filter');
    f.setAttribute('id', id);
    f.setAttribute('x', '0');
    f.setAttribute('y', '0');
    f.setAttribute('width', String(W));
    f.setAttribute('height', String(H));
    f.setAttribute('filterUnits', 'userSpaceOnUse');
    f.setAttribute('primitiveUnits', 'userSpaceOnUse');
    f.setAttribute('color-interpolation-filters', 'sRGB');
    const s = strength * 2 * dpr; // feDisplacementMap 的位移 = scale × (通道值 − 0.5)，最大是 scale/2
    // 两层合成：中间是重度模糊的“磨砂”，边缘一圈是几乎不模糊、被透镜弯折的“清透玻璃”。
    // 贴图的 B 通道是边缘系数（外沿 1 → 内沿 0），转成 alpha 当遮罩，把清透层只留在边缘。
    const soft = o.blur * dpr;            // 和 CSS blur(r) 一致：stdDeviation = r
    const sharp = Math.max(0.4, 0.8 * dpr); // 边缘只做一点点柔化，避免锯齿
    const bend = (src: string, out: string) => o.chroma
      ? `<feDisplacementMap in="${src}" in2="map" scale="${s}" xChannelSelector="R" yChannelSelector="G" result="dr"/>
         <feColorMatrix in="dr" type="matrix" values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" result="cr"/>
         <feDisplacementMap in="${src}" in2="map" scale="${s * 0.95}" xChannelSelector="R" yChannelSelector="G" result="dg"/>
         <feColorMatrix in="dg" type="matrix" values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0" result="cg"/>
         <feDisplacementMap in="${src}" in2="map" scale="${s * 0.9}" xChannelSelector="R" yChannelSelector="G" result="db"/>
         <feColorMatrix in="db" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0" result="cb"/>
         <feBlend in="cr" in2="cg" mode="screen" result="crg"/>
         <feBlend in="crg" in2="cb" mode="screen" result="${out}"/>`
      : `<feDisplacementMap in="${src}" in2="map" scale="${s}" xChannelSelector="R" yChannelSelector="G" result="${out}"/>`;
    f.innerHTML = `
      <feImage href="${map}" x="0" y="0" width="${W}" height="${H}" preserveAspectRatio="none" result="map"/>
      <feGaussianBlur in="SourceGraphic" stdDeviation="${soft}" edgeMode="duplicate" result="soft"/>
      <feGaussianBlur in="SourceGraphic" stdDeviation="${sharp}" edgeMode="duplicate" result="sharp"/>
      ${bend('sharp', 'bent')}
      <feColorMatrix in="map" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 1 0 0" result="rimMask"/>
      <feComposite in="bent" in2="rimMask" operator="in" result="rim"/>
      <feComposite in="rim" in2="soft" operator="over"/>
      <feColorMatrix type="saturate" values="${o.saturate}"/>`;
    this.defs.appendChild(f);
    this.cache.set(key, { id, node: f, used: performance.now() });
    return id;
  }

  /** 只保留最近用过的 48 个滤镜 */
  private gc() {
    if (this.cache.size <= 48) return;
    const live = new Set(this.attached.values());
    const entries = [...this.cache.entries()].filter(([, e]) => !live.has(e.id)).sort((a, b) => a[1].used - b[1].used);
    for (const [k, e] of entries.slice(0, this.cache.size - 48)) { e.node.remove(); this.cache.delete(k); }
  }

  destroy() {
    cancelAnimationFrame(this.raf);
    this.mo.disconnect();
    this.ro.disconnect();
    window.removeEventListener('resize', this.onResize);
    this.attached.forEach((_, el) => el.style.removeProperty('--lg-backdrop'));
    this.attached.clear();
    this.svg.remove();
  }
}

/** 生成圆角矩形的位移贴图，返回 PNG dataURL。大元素降采样，滤镜里会被拉伸回原尺寸。 */
function makeMap(w: number, h: number, radius: number, bezel: number): string {
  const k = w * h > 250_000 ? Math.sqrt(250_000 / (w * h)) : 1;
  const cw = Math.max(2, Math.round(w * k)), ch = Math.max(2, Math.round(h * k));
  const r = radius * k, bz = bezel * k;
  const c = document.createElement('canvas');
  c.width = cw; c.height = ch;
  const ctx = c.getContext('2d')!;
  const img = ctx.createImageData(cw, ch);
  const d = img.data;
  const hw = cw / 2, hh = ch / 2;
  for (let y = 0; y < ch; y++) {
    const py = y + 0.5 - hh;
    for (let x = 0; x < cw; x++) {
      const px = x + 0.5 - hw;
      // 圆角矩形的有向距离场（SDF），dist = 到边缘的距离（内部为正）
      const qx = Math.abs(px) - (hw - r), qy = Math.abs(py) - (hh - r);
      const ox = Math.max(qx, 0), oy = Math.max(qy, 0);
      const outside = Math.hypot(ox, oy);
      const dist = r - (outside + Math.min(Math.max(qx, qy), 0));
      let dx = 0, dy = 0;
      // 清透边缘的遮罩：外沿 1，向内 1.3×bezel 处平滑过渡到 0（磨砂）
      const u = Math.min(1, Math.max(0, dist / (bz * 1.3)));
      const edge = 1 - u * u * (3 - 2 * u);
      if (dist >= 0 && dist < bz) {
        // 外法线方向
        let nx: number, ny: number;
        if (qx > 0 && qy > 0) { nx = ox / (outside || 1); ny = oy / (outside || 1); }
        else if (qx > qy) { nx = 1; ny = 0; }
        else { nx = 0; ny = 1; }
        nx *= Math.sign(px) || 1; ny *= Math.sign(py) || 1;
        // 凸面轮廓：t=0 在弯曲区内沿，t=1 在最外沿；位移 ∝ 斜率，越靠边越陡
        const t = 1 - dist / bz;
        const m = Math.pow(t, 1.6);
        dx = -nx * m; dy = -ny * m; // 向内侧取样 → 边缘像被放大、弯进来
      }
      const i = (y * cw + x) * 4;
      d[i] = 128 + dx * 127;
      d[i + 1] = 128 + dy * 127;
      d[i + 2] = Math.round(edge * 255);
      d[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return c.toDataURL('image/png');
}
