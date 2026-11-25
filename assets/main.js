(function () {
  'use strict';
  class App {
    constructor() {
      this.state = { clock: '', sound: false, hint: false, failed: false, s: 0 };
      this.props = {};
      this.sc = 0;
      this.canvas = document.getElementById('stage-canvas');
      this.scroller = document.getElementById('scroller');
      this.el = {
        clock: document.getElementById('clock'), status: document.getElementById('status'),
        sound: document.getElementById('sound-btn'), soundLabel: document.getElementById('sound-label'),
        soundOn: document.getElementById('ico-on'), soundOff: document.getElementById('ico-off'),
        hint: document.getElementById('hint'), failed: document.getElementById('failed'),
        rail: document.getElementById('rail'), panels: document.getElementById('panels'), end: document.getElementById('end')
      };
      this.buildDom();
      this.el.sound.addEventListener('click', () => {
        if (!this.ac) { try { const AC = window.AudioContext || window.webkitAudioContext; if (AC) this.ac = new AC(); } catch (e) {} }
        if (this.ac && this.ac.state === 'suspended') this.ac.resume();
        this.setState({ sound: !this.state.sound });
      });
      this.target = 0;
      if (window.Lenis && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        this.lenis = new window.Lenis({ wrapper: this.scroller, content: document.getElementById('track'), lerp: 0.085, wheelMultiplier: 0.9, smoothWheel: true, syncTouch: false });
        this.lenis.on('scroll', (e) => { this.target = e.scroll / Math.max(1, this.scroller.clientHeight); });
      } else {
        this.scroller.addEventListener('scroll', () => { this.target = this.scroller.scrollTop / Math.max(1, this.scroller.clientHeight); }, { passive: true });
      }
      this.scrollTo = (top, smooth) => { if (this.lenis) this.lenis.scrollTo(top, { immediate: !smooth, duration: smooth ? 1.6 : 0 }); else this.scroller.scrollTo({ top, behavior: smooth ? 'smooth' : 'auto' }); };
      document.getElementById('replay-btn').addEventListener('click', () => { this.scrollTo(0, false); this.target = 0; this.sc = 0; if (this.gl) this.gl.reset(); });
      const tick = () => { try { this.setState({ clock: new Date().toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: true }) }); } catch (e) {} };
      tick(); setInterval(tick, 15000);
      this.render();
      try { this.build(); } catch (e) { console.log('[olixstudios]', e); this.setState({ failed: true }); let last = performance.now(); const fb = (n) => { this.frame(n, Math.min(0.05, (n - last) / 1000)); last = n; requestAnimationFrame(fb); }; requestAnimationFrame(fb); }
    }
    setState(o) { Object.assign(this.state, o); if (!this._raf) this._raf = requestAnimationFrame(() => { this._raf = 0; this.render(); }); }
    buildDom() {
      const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
      this.items = this.data();
      this.panelEls = this.items.map((d, i) => {
        const a = document.createElement('article');
        a.className = 'panel'; a.style.left = i % 2 ? '8%' : '56%';
        a.innerHTML = '<div class="kicker">0' + (i + 1) + ' / 07 · ' + esc(d.tag) + '</div><h2>' + esc(d.name) + '</h2><p>' + esc(d.line) + '</p><a class="cta" href="https://' + esc(d.url) + '">' + esc(d.url) + ' →</a>';
        this.el.panels.appendChild(a); return a;
      });
      this.railEls = this.items.map((d, i) => {
        const b = document.createElement('button');
        b.className = 'rail-btn'; b.setAttribute('aria-label', 'Go to ' + d.name);
        b.innerHTML = '<span class="rl">0' + (i + 1) + '</span><span class="rb"></span>';
        b.addEventListener('click', () => this.scrollTo((1 + i + 0.6) * this.scroller.clientHeight, true));
        this.el.rail.appendChild(b); return b;
      });
    }
    frame(now, dt) {
      if (this.lenis) this.lenis.raf(now);
      const t = this.target || 0;
      this.sc += (t - this.sc) * (1 - Math.exp(-dt * 14));
      if (Math.abs(t - this.sc) < 0.0005) this.sc = t;
      if (Math.abs(this.sc - this.state.s) > 0.0003) { this.state.s = this.sc; this.render(); }
    }
    render() {
      const st = this.state, S = st.s, N = 7;
      const sm = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
      const h = new Date().getHours();
      this.el.clock.textContent = st.clock;
      this.el.status.textContent = (h >= 22 || h < 5) ? 'probably building something' : 'probably thinking about building something';
      this.el.sound.setAttribute('aria-pressed', st.sound ? 'true' : 'false');
      this.el.soundLabel.textContent = st.sound ? 'Sound on' : 'Sound off';
      this.el.soundOn.style.display = st.sound ? '' : 'none'; this.el.soundOff.style.display = st.sound ? 'none' : '';
      this.el.hint.style.display = st.hint && S < 0.4 ? '' : 'none';
      this.el.failed.style.display = st.failed ? '' : 'none';
      this.el.rail.style.opacity = S > 0.6 ? 1 : 0;
      const active = S >= 1 && S < 1 + N ? Math.floor(S - 1) : -1;
      this.panelEls.forEach((p, i) => {
        const lt = S - 1 - i; const o = sm(0.3, 0.45, lt) * (1 - sm(0.82, 0.95, lt));
        p.style.opacity = o.toFixed(3); p.style.transform = 'translate(0, calc(-50% + ' + ((1 - o) * 30).toFixed(1) + 'px))';
        p.style.filter = 'blur(' + ((1 - o) * 8).toFixed(1) + 'px)'; p.style.pointerEvents = o > 0.5 ? 'auto' : 'none';
        p.setAttribute('aria-hidden', o > 0.5 ? 'false' : 'true');
      });
      this.railEls.forEach((b, i) => { b.classList.toggle('on', i === active); if (i === active) b.setAttribute('aria-current', 'true'); else b.removeAttribute('aria-current'); });
      const eo = sm(N + 1.25, N + 1.55, S);
      this.el.end.style.opacity = eo.toFixed(3); this.el.end.style.filter = 'blur(' + ((1 - eo) * 8).toFixed(1) + 'px)'; this.el.end.style.pointerEvents = eo > 0.5 ? 'auto' : 'none';
    }
    bloop(v, pitch) {
      if (!this.state.sound || !this.ac) return;
      try {
        const ac = this.ac, t = ac.currentTime, o = ac.createOscillator(), g = ac.createGain();
        o.type = 'sine'; o.frequency.setValueAtTime(1100 * (pitch || 1), t); o.frequency.exponentialRampToValueAtTime(220 * (pitch || 1), t + 0.14);
        g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(Math.max(0.002, v), t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
        o.connect(g); g.connect(ac.destination); o.start(t); o.stop(t + 0.22);
      } catch (e) {}
    }
    build() {
      const T = window.THREE, cv = this.canvas;
      const renderer = new T.WebGLRenderer({ canvas: cv, antialias: false, alpha: false, powerPreference: 'high-performance' });
      let dpr = Math.min(window.devicePixelRatio || 1, 1.25);
      renderer.setPixelRatio(dpr);
      const cam = new T.OrthographicCamera(-1, 1, 1, -1, 0, 1);
      const quad = new T.PlaneGeometry(2, 2);
      const VS = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }';

      const SIM = [
        'precision highp float;',
        'varying vec2 vUv; uniform sampler2D tPrev; uniform vec2 px; uniform float aspect; uniform vec4 I[8]; uniform int nI;',
        'void main(){',
        ' vec4 c = texture2D(tPrev, vUv);',
        ' float s = texture2D(tPrev, vUv + vec2(px.x,0.0)).r + texture2D(tPrev, vUv - vec2(px.x,0.0)).r + texture2D(tPrev, vUv + vec2(0.0,px.y)).r + texture2D(tPrev, vUv - vec2(0.0,px.y)).r;',
        ' float nh = (s * 0.5 - c.g) * 0.985;',
        ' for (int i = 0; i < 8; i++) { if (i >= nI) break; vec2 d = (vUv - I[i].xy) * vec2(aspect, 1.0); nh += I[i].w * smoothstep(I[i].z, 0.0, length(d)); }',
        ' gl_FragColor = vec4(nh, c.r, 0.0, 1.0);',
        '}'
      ].join('\n');

      const COMP = [
        'precision highp float;',
        'varying vec2 vUv;',
        'uniform sampler2D tSim; uniform sampler2D tText; uniform vec2 simPx;',
        'uniform float time, aspect, floorY, manOn, reveal, refr, textA, shapeM, sT;',
        'uniform int shapeId; uniform vec2 shapeC; uniform vec3 bound;',
        'uniform vec2 J[8]; uniform vec3 D[14]; uniform int nD;',
        'float smin(float a, float b, float k){ float h = max(k - abs(a - b), 0.0) / k; return min(a, b) - h * h * k * 0.25; }',
        'float cap(vec2 p, vec2 a, vec2 b, float r){ vec2 pa = p - a, ba = b - a; float h = clamp(dot(pa, ba) / (dot(ba, ba) + 1e-7), 0.0, 1.0); return length(pa - ba * h) - r; }',
        'vec2 rot(vec2 p, float a){ float c = cos(a), s = sin(a); return vec2(c * p.x - s * p.y, s * p.x + c * p.y); }',
        'float box(vec2 p, vec2 b, float r){ vec2 q = abs(p) - b + r; return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r; }',
        'float shapeSdf(vec2 p){',
        ' p -= shapeC; float d = 1e3;',
        ' if (shapeId == 1) {',
        '  vec2 q = rot(p, 0.55 * sin(time * 1.6));',
        '  d = abs(length(q - vec2(-0.06, 0.0)) - 0.034) - 0.011;',
        '  d = smin(d, cap(q, vec2(-0.026, 0.0), vec2(0.092, 0.0), 0.0105), 0.01);',
        '  d = smin(d, cap(q, vec2(0.064, 0.0), vec2(0.064, -0.034), 0.009), 0.008);',
        '  d = smin(d, cap(q, vec2(0.086, 0.0), vec2(0.086, -0.025), 0.009), 0.008);',
        ' } else if (shapeId == 2) {',
        '  vec2 q = p - vec2(-0.055, 0.0); float cs = max(0.16, abs(cos(time * 1.7))); vec2 r = vec2(q.x / cs, q.y);',
        '  d = (length(r) - 0.056) * cs; d = max(d, -(abs(length(r) - 0.037) - 0.0045) * cs);',
        '  for (int i = 0; i < 3; i++) { float fi = float(i); float h = (0.04 + 0.038 * fi) * clamp(sT * 4.0 - 1.0 - fi * 0.3, 0.0, 1.0); vec2 b = vec2(0.035 + 0.034 * fi, -0.11); d = min(d, cap(p, b, b + vec2(0.0, h), 0.011)); }',
        ' } else if (shapeId == 3) {',
        '  vec2 q = p - vec2(0.0, 0.012 * sin(time * 2.0)); float bx = box(q, vec2(0.1, 0.068), 0.02);',
        '  float a = 0.02, bb = 0.027, c = 0.032; vec2 n2 = normalize(vec2(bb, c + a)); vec2 n3 = normalize(vec2(bb, -(c + a)));',
        '  float tri = max(-q.x - a, max(dot(q - vec2(c, 0.0), n2), dot(q - vec2(c, 0.0), n3)));',
        '  d = max(bx, -tri);',
        ' } else if (shapeId == 4) {',
        '  float o = 0.02 * sin(time * 3.2);',
        '  for (int i = 0; i < 2; i++) { float sg = i == 0 ? -1.0 : 1.0; vec2 q = p - vec2(sg * 0.058 + o, -0.098);',
        '   float r = box(q, vec2(0.033, 0.029), 0.008); r = smin(r, box(q - vec2(0.0, 0.048), vec2(0.023, 0.017), 0.006), 0.006);',
        '   r = min(r, cap(q, vec2(0.0, 0.064), vec2(0.0, 0.088), 0.0045)); r = smin(r, cap(q, vec2(-sg * 0.02, 0.0), vec2(-sg * 0.048, 0.006), 0.0075), 0.006);',
        '   r = max(r, -(length(q - vec2(-0.009, 0.05)) - 0.005)); r = max(r, -(length(q - vec2(0.009, 0.05)) - 0.005));',
        '   d = min(d, r); }',
        ' } else if (shapeId == 5) {',
        '  vec2 q = p - vec2(0.1 * sin(time * 1.3), -0.104);',
        '  d = box(q, vec2(0.085, 0.011), 0.009); d = smin(d, cap(q, vec2(0.05, 0.0), vec2(0.118, -0.004), 0.007), 0.008);',
        '  d = smin(d, length(q - vec2(-0.012, 0.015)) - 0.014, 0.01); d = min(d, box(q - vec2(-0.092, 0.022), vec2(0.006, 0.022), 0.003));',
        '  d = min(d, box(q - vec2(-0.092, 0.044), vec2(0.022, 0.0045), 0.002)); d = min(d, box(q - vec2(0.118, -0.008), vec2(0.008, 0.012), 0.003));',
        '  d = min(d, length(q - vec2(-0.056, -0.005)) - 0.021); d = min(d, length(q - vec2(0.058, -0.006)) - 0.019);',
        ' } else if (shapeId == 6) {',
        '  vec2 q = p - vec2(-0.025, 0.0); float ph = box(q, vec2(0.043, 0.08), 0.014); ph = max(ph, -box(q - vec2(0.0, 0.004), vec2(0.032, 0.06), 0.007));',
        '  float pul = 1.0 + 0.1 * sin(time * 4.0); float bub = length(p - vec2(0.065, 0.088)) - 0.026 * pul; bub = smin(bub, cap(p, vec2(0.052, 0.07), vec2(0.03, 0.052), 0.006), 0.01);',
        '  d = min(ph, bub);',
        ' } else if (shapeId == 7) {',
        '  for (int i = 0; i < 18; i++) { float fi = float(i); float a = fi * 2.39996 + time * 0.3 * (mod(fi, 2.0) * 2.0 - 1.0); float r = min(0.025 + 0.0075 * fi, 0.13);',
        '   vec2 c = vec2(cos(a), sin(a) * 0.75) * r; d = smin(d, length(p - c) - (0.0125 - fi * 0.0003), 0.012); }',
        ' }',
        ' return d;',
        '}',
        'float sdf(vec2 p){',
        ' float d = 1e3;',
        ' float db = length(p - bound.xy) - bound.z;',
        ' if (db > 0.05) { d = db; }',
        ' else {',
        ' if (manOn > 0.5) {',
        '  float w = 0.0006 * sin(time * 7.0 + p.y * 90.0);',
        '  d = length(p - J[0]) - 0.021 - w;',
        '  d = smin(d, cap(p, J[1], J[3], 0.0062 + w), 0.008);',
        '  d = smin(d, cap(p, J[2], J[4], 0.0052 + w), 0.006);',
        '  d = smin(d, cap(p, J[2], J[5], 0.0052 + w), 0.006);',
        '  d = smin(d, cap(p, J[3], J[6], 0.0058 + w), 0.009);',
        '  d = smin(d, cap(p, J[3], J[7], 0.0058 + w), 0.009);',
        ' }',
        ' if (shapeM > 0.001) { float ds = shapeSdf(p); d = mix(d, ds, shapeM); }',
        ' }',
        ' for (int i = 0; i < 14; i++) { if (i >= nD) break; d = smin(d, length(p - D[i].xy) - D[i].z, 0.018); }',
        ' return d;',
        '}',
        'vec3 bg(vec2 uv){',
        ' vec3 c = vec3(0.024, 0.04, 0.11);',
        ' vec2 p = vec2(uv.x * aspect, uv.y);',
        ' c += vec3(0.23, 0.36, 0.86) * 0.33 * exp(-length(p - vec2(0.28 * aspect + 0.15 * sin(time * 0.13), 0.78 + 0.08 * cos(time * 0.11))) * 2.8);',
        ' c += vec3(0.49, 0.23, 0.93) * 0.33 * exp(-length(p - vec2(0.76 * aspect + 0.12 * cos(time * 0.09), 0.58 + 0.1 * sin(time * 0.12))) * 2.5);',
        ' c += vec3(0.05, 0.65, 0.91) * 0.12 * exp(-length(p - vec2(0.5 * aspect, floorY)) * 3.0);',
        ' return c;',
        '}',
        'vec3 scene(vec2 uv){',
        ' vec3 c = bg(uv);',
        ' vec4 t = texture2D(tText, uv);',
        ' float vis = 1.0 - smoothstep(reveal - 0.07, reveal, uv.x);',
        ' c = mix(c, t.rgb, t.a * vis * textA);',
        ' vec2 p = vec2(uv.x * aspect, uv.y);',
        ' float d = sdf(p);',
        ' vec3 base = mix(vec3(0.49, 0.83, 0.99), vec3(0.55, 0.36, 0.96), smoothstep(floorY, floorY + 0.28, p.y));',
        ' base = mix(base, vec3(0.91, 0.47, 0.98), 0.18 + 0.18 * sin(time * 0.7 + p.x * 3.0));',
        ' c += base * exp(-max(d, 0.0) * 50.0) * 0.42;',
        ' if (d < 0.004) {',
        '  float e = 0.0012;',
        '  vec2 g = vec2(sdf(p + vec2(e, 0.0)) - sdf(p - vec2(e, 0.0)), sdf(p + vec2(0.0, e)) - sdf(p - vec2(0.0, e)));',
        '  vec2 n2 = g / (length(g) + 1e-6);',
        '  float th = clamp(-d / 0.008, 0.0, 1.0);',
        '  vec3 n = normalize(vec3(n2 * (1.0 - th * 0.85), 0.3 + th));',
        '  vec3 L = normalize(vec3(-0.45, 0.65, 0.6));',
        '  float diff = 0.5 + 0.5 * max(dot(n, L), 0.0);',
        '  float spec = pow(max(dot(reflect(-L, n), vec3(0.0, 0.0, 1.0)), 0.0), 34.0);',
        '  float fres = pow(1.0 - n.z, 2.4);',
        '  vec3 lc = base * diff * 0.9 + spec * vec3(1.0) + fres * vec3(0.75, 0.85, 1.0) * 0.75;',
        '  c = mix(c, lc, smoothstep(0.004, -0.0015, d));',
        ' }',
        ' return c;',
        '}',
        'void main(){',
        ' vec2 uv = vUv;',
        ' float hL = texture2D(tSim, uv - vec2(simPx.x, 0.0)).r, hR = texture2D(tSim, uv + vec2(simPx.x, 0.0)).r;',
        ' float hD = texture2D(tSim, uv - vec2(0.0, simPx.y)).r, hU = texture2D(tSim, uv + vec2(0.0, simPx.y)).r;',
        ' vec2 g = vec2(hR - hL, hU - hD);',
        ' vec2 off = g * refr;',
        ' vec3 col;',
        ' if (uv.y >= floorY) { col = scene(uv + off); }',
        ' else {',
        '  float k = floorY - uv.y;',
        '  vec2 ruv = vec2(uv.x, 2.0 * floorY - uv.y) + off * 2.5 + vec2(0.004 * sin(uv.y * 150.0 + time * 2.2) * min(k * 5.0, 1.0), 0.0);',
        '  col = scene(ruv) * 0.42 * (1.0 - min(k * 1.8, 0.85)) + vec3(0.008, 0.016, 0.06);',
        ' }',
        ' col += vec3(0.45, 0.55, 1.0) * exp(-abs(uv.y - floorY) * 320.0) * 0.5;',
        ' vec3 nn = normalize(vec3(-g * 26.0, 1.0));',
        ' float sp = pow(max(dot(nn, normalize(vec3(-0.35, 0.55, 0.76))), 0.0), 70.0);',
        ' col += sp * vec3(0.65, 0.75, 1.0) * 0.6 * smoothstep(0.0, 0.015, length(g));',
        ' vec2 q = uv - 0.5; col *= 1.0 - dot(q, q) * 0.75;',
        ' gl_FragColor = vec4(col, 1.0);',
        '}'
      ].join('\n');

      const mkRT = (w, h) => new T.WebGLRenderTarget(w, h, { type: T.HalfFloatType, minFilter: T.LinearFilter, magFilter: T.LinearFilter, depthBuffer: false, stencilBuffer: false });
      const I = []; for (let i = 0; i < 8; i++) I.push(new T.Vector4());
      const simMat = new T.ShaderMaterial({ vertexShader: VS, fragmentShader: SIM, uniforms: { tPrev: { value: null }, px: { value: new T.Vector2() }, aspect: { value: 1 }, I: { value: I }, nI: { value: 0 } } });
      const simScene = new T.Scene(); simScene.add(new T.Mesh(quad, simMat));

      const Jv = []; for (let i = 0; i < 8; i++) Jv.push(new T.Vector2());
      const Dv = []; for (let i = 0; i < 14; i++) Dv.push(new T.Vector3());
      const textCanvas = document.createElement('canvas');
      const textTex = new T.CanvasTexture(textCanvas);
      textTex.minFilter = T.LinearFilter;
      const compMat = new T.ShaderMaterial({ vertexShader: VS, fragmentShader: COMP, uniforms: {
        tSim: { value: null }, tText: { value: textTex }, simPx: { value: new T.Vector2() }, time: { value: 0 }, aspect: { value: 1 }, floorY: { value: 0.27 },
        manOn: { value: 0 }, reveal: { value: -0.1 }, refr: { value: 0.11 }, textA: { value: 1 }, shapeM: { value: 0 }, sT: { value: 0 }, shapeId: { value: 0 }, shapeC: { value: new T.Vector2() }, bound: { value: new T.Vector3(0, 0, 10) }, J: { value: Jv }, D: { value: Dv }, nD: { value: 0 } } });
      const compScene = new T.Scene(); compScene.add(new T.Mesh(quad, compMat));

      const W = { w: 1, h: 1, aspect: 1, rtA: null, rtB: null };
      const drawText = () => {
        const w = Math.max(1, Math.round(W.w * dpr)), h = Math.max(1, Math.round(W.h * dpr));
        textCanvas.width = w; textCanvas.height = h;
        const c = textCanvas.getContext('2d'); c.clearRect(0, 0, w, h); c.textAlign = 'center'; c.textBaseline = 'alphabetic';
        const font = 'Editorial serif';
        const grad = (cx, tw) => { const g = c.createLinearGradient(cx - tw / 2, 0, cx + tw / 2, 0); g.addColorStop(0, '#7DD3FC'); g.addColorStop(0.5, '#A78BFA'); g.addColorStop(1, '#F0ABFC'); return g; };
        const cx = w / 2;
        if (font === 'Editorial serif') {
          const big = Math.min(W.w * 0.105, 150) * dpr;
          const yBig = h * 0.31;
          c.font = '300 ' + (big * 0.2) + 'px Geist, sans-serif'; c.fillStyle = '#DDE2FF';
          c.fillText('Welcome to', cx, yBig - big * 0.78);
          c.font = 'italic 400 ' + big + 'px "Instrument Serif", serif';
          const tw = c.measureText('Olix Studios').width; c.fillStyle = grad(cx, tw); c.fillText('Olix Studios', cx, yBig);
          c.font = '400 ' + (big * 0.09) + 'px "Geist Mono", monospace'; c.fillStyle = '#AEB6E0';
          if ('letterSpacing' in c) c.letterSpacing = (big * 0.02) + 'px';
          c.fillText('WHERE NIGHT-TIME PROJECTS COME ALIVE', cx, yBig + big * 0.36);
          if ('letterSpacing' in c) c.letterSpacing = '0px';
        } else {
          const fam = font === 'Syne' ? '800 {s}px Syne, sans-serif' : font === 'Unbounded' ? '700 {s}px Unbounded, sans-serif' : '800 {s}px Sora, sans-serif';
          const fs = Math.min(W.w * (font === 'Unbounded' ? 0.052 : 0.064), 90) * dpr, y0 = h * 0.29;
          c.font = fam.replace('{s}', fs); c.textAlign = 'left';
          const a = 'Welcome to ', b = 'Olix Studios', wa = c.measureText(a).width, wb = c.measureText(b).width, x0 = (w - wa - wb) / 2;
          c.fillStyle = '#EEF1FF'; c.fillText(a, x0, y0);
          c.fillStyle = grad(x0 + wa + wb / 2, wb); c.fillText(b, x0 + wa, y0);
          c.textAlign = 'center'; c.font = '400 ' + (fs * 0.24) + 'px Geist, sans-serif'; c.fillStyle = '#B8C0E8';
          c.fillText('where night-time projects come alive.', cx, y0 + fs * 0.75);
        }
        textTex.needsUpdate = true;
      };
      this.redrawText = drawText;
      const resize = () => {
        const w = cv.clientWidth, h = cv.clientHeight; if (!w || !h) return;
        W.w = w; W.h = h; W.aspect = w / h;
        renderer.setSize(w, h, false);
        const sw = Math.max(64, Math.round(w / 3)), sh = Math.max(64, Math.round(h / 3));
        if (W.rtA) { W.rtA.dispose(); W.rtB.dispose(); }
        W.rtA = mkRT(sw, sh); W.rtB = mkRT(sw, sh);
        simMat.uniforms.px.value.set(1 / sw, 1 / sh);
        compMat.uniforms.simPx.value.set(1 / sw, 1 / sh);
        simMat.uniforms.aspect.value = W.aspect; compMat.uniforms.aspect.value = W.aspect;
        drawText();
      };
      resize();
      let ro = null; if (window.ResizeObserver) { ro = new ResizeObserver(resize); ro.observe(cv); }
      if (document.fonts && document.fonts.load) { Promise.all(['italic 400 80px "Instrument Serif"', '300 20px Geist', '400 20px "Geist Mono"', '800 80px Syne', '700 80px Unbounded', '800 80px Sora'].map((f) => document.fonts.load(f))).then(drawText).catch(() => {}); }

      const FY = 0.27, S = 0.0016;
      const imps = [];
      const impulse = (sx, sy, r, w) => { if (imps.length < 8) imps.push([sx / W.aspect, sy, r, w]); };
      const splashes = [], falling = [];
      const spawnSplash = (x, n, pow) => { for (let i = 0; i < n; i++) { const a = Math.PI * (0.15 + 0.7 * Math.random()); const v = pow * (0.5 + Math.random() * 0.6); splashes.push({ x, y: FY + 0.01, vx: Math.cos(a) * v * 0.6, vy: Math.sin(a) * v, r: 0.005 + Math.random() * 0.005, life: 1.2 }); } };
      const lerp = (a, b, t) => a + (b - a) * t;
      const ease = (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      const P = {
        stand: [[60, 22], [60, 38], [60, 48], [60, 94], [38, 90], [82, 90], [47, 150], [73, 150]],
        aha: [[60, 20], [60, 36], [60, 48], [60, 94], [14, 22], [106, 22], [43, 150], [77, 150]]
      };
      const walkPose = (ph) => {
        const s = Math.sin(ph), c = Math.cos(ph), bob = -2.2 * Math.abs(c);
        return [[60, 22 + bob], [60, 38 + bob], [60, 48 + bob], [60, 94 + bob], [60 + 20 * s, 88 + bob], [60 - 20 * s, 88 + bob], [60 - 17 * s, 150 - Math.max(0, 8 * c)], [60 + 17 * s, 150 - Math.max(0, -8 * c)]];
      };
      const mixPose = (a, b, t) => a.map((p, i) => [lerp(p[0], b[i][0], t), lerp(p[1], b[i][1], t)]);
      const toScene = (pose, bx) => pose.map((p) => [bx + (p[0] - 60) * S, FY + (150 - p[1]) * S]);

      const tl = {};
      const reset = () => {
        Object.assign(tl, { phase: 'drop', t: 0, drop: { x: 0.2 * W.aspect, y: 1.12, vy: 0, r: 0.017, b: 0 }, gT: 0, wT: 0, aT: 0, ph: 0, lastStep: 0, manX: 0.2 * W.aspect, rev: -0.1 });
        splashes.length = 0; falling.length = 0;
        this.setState({ hint: false });
      };
      reset();

      let last = null, lastMove = null; const perf = { n: 0, sum: 0 };
      cv.addEventListener('pointermove', (e) => {
        const r = cv.getBoundingClientRect(); const u = (e.clientX - r.left) / r.width, v = 1 - (e.clientY - r.top) / r.height;
        if (lastMove) { const sp = Math.hypot(u - lastMove[0], v - lastMove[1]); if (sp > 0.002) impulse(u * W.aspect, v, 0.028, Math.min(0.5, sp * 14)); }
        lastMove = [u, v];
      });
      cv.addEventListener('pointerleave', () => { lastMove = null; });
      cv.addEventListener('pointerdown', (e) => {
        const r = cv.getBoundingClientRect(); const u = (e.clientX - r.left) / r.width;
        if (falling.length < 5) falling.push({ x: u * W.aspect, y: 1.08, vy: 0, r: 0.012 + Math.random() * 0.006 });
      });

      this.gl = { renderer, ro, raf: 0, reset };
      const loop = (now) => {
        if (!this.gl) return;
        const dt = last === null ? 0.016 : Math.min(0.05, (now - last) / 1000); last = now;
        if (this.frame) this.frame(now, dt);
        if (dt < 0.045) { perf.n++; perf.sum += dt; }
        if (perf.n === 90) { if (perf.sum / perf.n > 0.021 && dpr > 0.75) { dpr = dpr > 1 ? 1 : 0.75; renderer.setPixelRatio(dpr); resize(); } perf.n = 0; perf.sum = 0; }
        const time = now / 1000;
        tl.t += dt;
        let pose = null; let manOn = 0; const Ds = [];
        const d = tl.drop;
        if (tl.phase === 'drop') {
          d.vy -= 3.3 * dt; d.y += d.vy * dt;
          if (d.y - d.r <= FY && d.vy < 0) {
            const v = -d.vy; impulse(d.x, FY, 0.05, -Math.min(1.4, v * 0.9)); spawnSplash(d.x, d.b < 2 ? 5 : 2, Math.min(1.1, v * 0.45));
            this.bloop(Math.min(0.25, v * 0.12), 1 + d.b * 0.12);
            d.y = FY + d.r; d.vy = v * 0.42; d.b++;
            if (d.b >= 4 || d.vy < 0.25) { tl.phase = 'grow'; tl.gT = 0; }
          }
          Ds.push([d.x, d.y, d.r]);
        }
        if (tl.phase === 'grow') {
          tl.gT += dt; const g = ease(Math.min(1, tl.gT / 1.0));
          const target = toScene(P.stand, tl.manX);
          const base = [tl.manX, FY + 0.012];
          pose = target.map((p, i) => [lerp(base[0], p[0], g), lerp(base[1], p[1], i === 0 ? Math.min(1, g * 1.15) : g)]);
          manOn = 1;
          if (tl.gT < 0.25) Ds.push([base[0], base[1], 0.017 * (1 - tl.gT / 0.25)]);
          if (tl.gT >= 1.15) { tl.phase = 'walk'; tl.wT = 0; }
        }
        if (tl.phase === 'walk') {
          tl.wT += dt; const k = Math.min(1, tl.wT / 2.1);
          tl.manX = lerp(0.2 * W.aspect, 0.5 * W.aspect, ease(k));
          tl.ph += dt * 10.5;
          const amp = Math.min(1, Math.sin(Math.PI * k) * 1.6);
          pose = toScene(mixPose(P.stand, walkPose(tl.ph), amp), tl.manX); manOn = 1;
          if (Math.floor(tl.ph / Math.PI) !== tl.lastStep) { tl.lastStep = Math.floor(tl.ph / Math.PI); const f = pose[tl.lastStep % 2 ? 6 : 7]; impulse(f[0], FY, 0.02, -0.35); }
          if (k >= 1) { tl.phase = 'aha'; tl.aT = 0; }
        }
        if (tl.phase === 'aha' || tl.phase === 'idle') {
          tl.aT += dt; manOn = 1;
          if (tl.phase === 'aha' && tl.aT < dt * 1.5) {
            const head = toScene(P.aha, tl.manX)[0];
            for (let i = 0; i < 11; i++) { const a = Math.PI * (0.12 + 0.76 * (i / 10)); const v = 0.55 + Math.random() * 0.35; splashes.push({ x: head[0], y: head[1] + 0.01, vx: Math.cos(a) * v * 0.55, vy: Math.sin(a) * v, r: 0.005 + Math.random() * 0.006, life: 2.4 }); }
            impulse(tl.manX, FY, 0.07, -1.2); this.bloop(0.22, 0.8);
          }
          const up = ease(Math.min(1, tl.aT / 0.35));
          const relax = tl.aT > 2.4 ? ease(Math.min(1, (tl.aT - 2.4) / 0.8)) : 0;
          let pz = mixPose(mixPose(P.stand, P.aha, up), P.stand, relax * 0.55);
          const br = Math.sin(time * 2.1) * 1.4;
          pz = pz.map((p, i) => i >= 6 ? p : [p[0], p[1] + br * (i <= 3 ? 1 : 0.6)]);
          pose = toScene(pz, tl.manX);
          if (tl.aT > 0.3) {
            const prev = tl.rev; tl.rev = Math.min(1.15, -0.08 + (tl.aT - 0.3) / 1.5);
            if (tl.rev < 1.1 && tl.rev > 0) impulse(tl.rev * W.aspect, 0.72 + Math.sin(tl.aT * 9) * 0.03, 0.035, 0.18);
            if (prev < 1.1 && tl.rev >= 1.1) this.setState({ hint: true });
          }
          if (tl.phase === 'aha' && tl.aT > 3.5) tl.phase = 'idle';
        }
        const sc = this.sc || 0;
        if (sc > 0.04 && tl.phase !== 'idle') { tl.phase = 'idle'; tl.aT = 3.6; tl.manX = 0.5 * W.aspect; tl.rev = 1.2; this.setState({ hint: true }); }
        let shapeM = 0, shapeId = 0, sTloc = 0, textA = 1 - Math.min(1, Math.max(0, (sc - 0.08) / 0.42));
        if (sc >= 1) {
          const N = 7, k = Math.min(N + 0.999, sc - 1), i = Math.floor(k), lt = k - i;
          const C = (j) => (j % 2 ? 0.68 : 0.32) * W.aspect;
          const sm = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
          const prev = i === 0 ? 0.5 * W.aspect : C(i - 1);
          const cur = i < N ? C(i) : 0.5 * W.aspect;
          const mv = sm(0, i < N ? 0.2 : 0.3, lt);
          const mx = prev + (cur - prev) * mv;
          const walking = mv > 0.001 && mv < 0.999;
          const ph = sc * 40;
          let pz;
          if (walking) pz = walkPose(ph);
          else if (i >= N) { const wv = Math.sin(time * 7); pz = P.stand.map((p, j) => j === 5 ? [100 + 6 * wv, 18 + 4 * wv] : p); }
          else pz = P.stand.map((p, j) => j >= 6 ? p : [p[0], p[1] + Math.sin(time * 2.1) * 1.3]);
          pose = toScene(pz, mx); manOn = 1;
          if (walking) { const st = Math.floor(ph / Math.PI); if (st !== tl.lastStep) { tl.lastStep = st; const f = pose[st % 2 ? 6 : 7]; impulse(f[0], FY, 0.02, -0.3); } }
          if (i < N) {
            shapeId = i + 1; sTloc = lt;
            shapeM = sm(0.22, 0.42, lt) * (1 - sm(0.8, 0.96, lt));
            const key = i * 10 + (shapeM > 0.05 ? 1 : 0);
            if (shapeM > 0.05 && tl.lastShapeKey !== key) { impulse(cur, FY, 0.07, -0.9); spawnSplash(cur, 6, 0.8); this.bloop(0.18, 0.7 + i * 0.08); }
            tl.lastShapeKey = key;
            compMat.uniforms.shapeC.value.set(cur, FY + 0.13);
            if (shapeId === 5 && shapeM > 0.5) { const cx = cur + 0.1 * Math.sin(time * 1.3); if (Math.random() < 0.35) { impulse(cx - 0.056, FY, 0.018, -0.12); impulse(cx + 0.058, FY, 0.018, -0.12); } }
            if (shapeId === 4 && shapeM > 0.5 && Math.random() < 0.08) impulse(cur, FY, 0.03, -0.25);
          }
        }
        if (shapeM > 0.001) compMat.uniforms.bound.value.set(compMat.uniforms.shapeC.value.x, compMat.uniforms.shapeC.value.y, 0.21);
        else if (pose) compMat.uniforms.bound.value.set(pose[3][0], FY + 0.12, 0.17);
        else compMat.uniforms.bound.value.set(0, 0, 10);
        compMat.uniforms.shapeM.value = shapeM; compMat.uniforms.shapeId.value = shapeId; compMat.uniforms.sT.value = sTloc; compMat.uniforms.textA.value = textA;
        for (let i = falling.length - 1; i >= 0; i--) {
          const f = falling[i]; f.vy -= 3.3 * dt; f.y += f.vy * dt;
          if (f.y - f.r <= FY) { impulse(f.x, FY, 0.045, -Math.min(1.2, -f.vy * 0.8)); spawnSplash(f.x, 4, Math.min(1, -f.vy * 0.4)); this.bloop(0.15, 0.9 + Math.random() * 0.4); falling.splice(i, 1); continue; }
          Ds.push([f.x, f.y, f.r]);
        }
        for (let i = splashes.length - 1; i >= 0; i--) {
          const s = splashes[i]; s.vy -= 3.3 * dt; s.x += s.vx * dt; s.y += s.vy * dt; s.life -= dt;
          if ((s.y <= FY && s.vy < 0) || s.life <= 0) { if (s.y <= FY + 0.01) impulse(s.x, FY, 0.02, -0.3); splashes.splice(i, 1); continue; }
          Ds.push([s.x, s.y, s.r * Math.min(1, s.life * 2)]);
        }
        const n = Math.min(14, Ds.length);
        for (let i = 0; i < n; i++) Dv[i].set(Ds[i][0], Ds[i][1], Ds[i][2]);
        compMat.uniforms.nD.value = n;
        if (pose) pose.forEach((p, i) => Jv[i].set(p[0], p[1]));
        compMat.uniforms.manOn.value = manOn;
        compMat.uniforms.reveal.value = tl.rev;
        compMat.uniforms.time.value = time;

        for (let s = 0; s < 2; s++) {
          const nI = s === 0 ? imps.length : 0;
          for (let i = 0; i < nI; i++) I[i].set(imps[i][0], imps[i][1], imps[i][2], imps[i][3]);
          simMat.uniforms.nI.value = nI;
          simMat.uniforms.tPrev.value = W.rtA.texture;
          renderer.setRenderTarget(W.rtB); renderer.render(simScene, cam);
          const tmp = W.rtA; W.rtA = W.rtB; W.rtB = tmp;
        }
        imps.length = 0;
        renderer.setRenderTarget(null);
        compMat.uniforms.tSim.value = W.rtA.texture;
        renderer.render(compScene, cam);
        this.gl.raf = requestAnimationFrame(loop);
      };
      this.gl.raf = requestAnimationFrame(loop);
    }
    data() {
      return [
        { name: 'Keyholdr', tag: 'MACOS APP', line: 'A native vault for API keys. One hotkey, Touch ID and a CLI, so keys never sit in a .env file an AI agent can read.', url: 'keyholder.dev' },
        { name: 'Where did the duty go?', tag: 'RESEARCH PAPER', line: 'How India’s gold import duty change reached the price at your local jeweller. Published on SSRN, with an interactive pass-through demo.', url: 'gold.olixstudios.com' },
        { name: 'Chalk', tag: 'VIDEO ENGINE', line: 'Turns study notes into narrated explainer videos. It runs the Written in Chalk YouTube channel.', url: 'chalk.olixstudios.com' },
        { name: 'LLM Sumo', tag: 'HARDWARE', line: 'Two cardboard ESP32 robots, one driven by Claude and one by Gemini, trying to push each other out of a ring.', url: 'robots.olixstudios.com' },
        { name: 'F1 Orchestrator', tag: 'MULTI-AGENT', line: 'A pit crew of AI agents for Formula 1 analysis, each with its own job.', url: 'f1.olixstudios.com' },
        { name: 'Boxi', tag: 'ON-DEVICE AI', line: 'An AI assistant that lives entirely on your Android phone. Gemma 4 on device, no cloud, nothing collected.', url: 'boxi.olixstudios.com' },
        { name: 'The Logbook', tag: 'EVERYTHING ELSE', line: 'Every other experiment, shipped or abandoned: a physics runner game, local transcription, a data.gov.in catalog, Diwali projection mapping and more.', url: 'olixstudios.com/log' }
      ];
    }
  }
  const start = () => {
    if (!window.THREE) { document.getElementById('failed').style.display = ''; return; }
    window.__olix = new App();
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
