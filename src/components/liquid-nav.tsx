"use client";

/**
 * Liquid navbar — adapted from Nimbus UI "Waterline" by guglielmogiannattasio.it.
 * A glass pill; the active "drop" stretches toward the picked item, splits into droplets on long jumps and merges
 * back with a ripple; the cursor lifts a meniscus; each icon plays a small scene on tap.
 * Site changes: next/link navigation, water tinted with the brand colour (light/dark follow the site theme),
 * RTL-aware arrow keys, "no active item" state (pages outside the nav), no sound.
 * Water = tiny WebGL shader (paused off-screen); without WebGL a CSS drop.
 */

import * as React from "react";
import Link from "next/link";

export type NimbusFx = "plane" | "drop" | "spin" | "glow" | "wave" | "pop" | "none";
/** href → link; otherwise a button running onClick. badge = small count on the icon (e.g. cart items). */
export type LiquidNavItem = { label: string; href?: string; onClick?: () => void; icon?: React.ReactNode; fx?: NimbusFx; badge?: number };
type RGB = [number, number, number];
type Props = {
  items: LiquidNavItem[];
  /** index of the current page's item, -1 for none */
  active: number;
  onPick?: (i: number) => void;
  /** water colour (0–1 RGB) on light and dark backgrounds */
  accent?: { light: RGB; dark: RGB };
  label: string;
  /** icons only at every width (the label stays for screen readers and as a tooltip) */
  compact?: boolean;
  className?: string;
};

const PAD = 14; // canvas bleed around the pill, for shadows and ripples
const BRAND = { light: [0.698, 0.239, 0.541] as RGB, dark: [0.867, 0.482, 0.733] as RGB }; // #b23d8a / #dd7bbb

const STYLES = `
.nimbus-nav{--n-tint:color-mix(in oklab,var(--background) 55%,transparent);--n-fg:var(--foreground);--n-fg-soft:color-mix(in oklab,var(--foreground) 62%,transparent);--n-rim:rgba(255,255,255,.7);
  position:relative;pointer-events:auto;display:inline-flex;align-items:center;gap:2px;padding:5px;border-radius:999px;isolation:isolate;max-width:100%;
  -webkit-font-smoothing:antialiased;user-select:none;-webkit-tap-highlight-color:transparent}
.dark .nimbus-nav{--n-rim:rgba(255,255,255,.22)}
.nimbus-glass{position:absolute;inset:0;border-radius:inherit;z-index:-2;overflow:hidden;background:var(--n-tint);
  -webkit-backdrop-filter:blur(10px) saturate(1.2);backdrop-filter:blur(10px) saturate(1.2);
  box-shadow:inset 0 1px 1px var(--n-rim),inset 0 0 0 1px color-mix(in oklab,var(--foreground) 10%,transparent),0 10px 28px -14px rgb(var(--n-acc) / .55),0 2px 6px rgba(0,0,0,.06)}
.nimbus-water{position:absolute;left:${-PAD}px;top:${-PAD}px;z-index:-1;pointer-events:none}
.nimbus-nav[data-gl="off"] .nimbus-water{display:none}
.nimbus-drop{display:none;position:absolute;top:5px;bottom:5px;left:0;border-radius:999px;z-index:-1;pointer-events:none;will-change:transform,width;
  background:radial-gradient(120% 140% at 30% 0%,rgba(255,255,255,.7),rgba(255,255,255,0) 55%),rgb(var(--n-acc) / .22);
  box-shadow:inset 0 1px 1px rgba(255,255,255,.9),inset 0 -2px 6px rgb(var(--n-acc) / .3),inset 0 0 0 1px rgba(255,255,255,.5),0 6px 16px -6px rgb(var(--n-acc) / .5)}
.nimbus-nav[data-gl="off"] .nimbus-drop{display:block}
.nimbus-nav[data-none="true"] .nimbus-drop{opacity:0}
.nimbus-item{position:relative;z-index:1;display:inline-flex;align-items:center;gap:8px;height:38px;padding:0 14px;border:0;border-radius:999px;background:none;color:var(--n-fg-soft);
  font-weight:500;font-size:14px;line-height:1;white-space:nowrap;text-decoration:none;cursor:pointer;transition:color .25s}
.nimbus-item:hover,.nimbus-item[aria-current="page"]{color:var(--n-fg)}
.nimbus-item:focus-visible{outline:2px solid rgb(var(--n-acc));outline-offset:2px}
.nv-ico{position:relative;display:inline-flex;flex:none}
.nv-ico svg{width:18px;height:18px;transition:transform .45s cubic-bezier(.3,1.6,.5,1)}
.nimbus-item[aria-current="page"] .nv-ico svg{transform:translateY(-1px) scale(1.08)}
.nv-ico[data-fx="pop"] svg{animation:nvPop .5s cubic-bezier(.3,1.6,.5,1) both}
@keyframes nvPop{0%{transform:scale(.72)}60%{transform:scale(1.2)}100%{transform:translateY(-1px) scale(1.08)}}
.nv-ico[data-fx="plane"] svg{animation:nvPlane 1.15s cubic-bezier(.55,0,.3,1) both}
@keyframes nvPlane{0%{transform:none}12%{transform:translate(-3px,2px) rotate(7deg)}42%{transform:translate(64px,-26px) rotate(-24deg) scale(.9);opacity:0}43%{transform:translate(-60px,16px) rotate(-12deg) scale(.9);opacity:0}58%{opacity:1}80%{transform:translate(3px,-1px) rotate(2deg)}100%{transform:translateY(-1px) scale(1.08)}}
.nv-ico[data-fx="drop"] svg{animation:nvDrop .95s cubic-bezier(.4,0,.3,1) both;transform-origin:50% 100%}
@keyframes nvDrop{0%{transform:translateY(-1px)}26%{transform:translateY(-13px) scale(.88,1.12)}46%{transform:translateY(3px) scale(1.3,.68)}62%{transform:translateY(-3px) scale(.92,1.08)}80%{transform:translateY(0) scale(1.04,.97)}100%{transform:translateY(-1px) scale(1.08)}}
.nv-ico[data-fx="drop"]::before,.nv-ico[data-fx="drop"]::after{content:"";position:absolute;bottom:0;left:50%;width:4px;height:4px;margin-left:-2px;border-radius:50%;background:currentColor;opacity:0;pointer-events:none}
.nv-ico[data-fx="drop"]::before{animation:nvSplashL .95s ease-out both}
.nv-ico[data-fx="drop"]::after{animation:nvSplashR .95s ease-out both}
@keyframes nvSplashL{0%,44%{opacity:0;transform:none}50%{opacity:.9;transform:translate(-5px,-6px)}75%,100%{opacity:0;transform:translate(-11px,1px) scale(.4)}}
@keyframes nvSplashR{0%,44%{opacity:0;transform:none}50%{opacity:.9;transform:translate(5px,-7px)}75%,100%{opacity:0;transform:translate(12px,1px) scale(.4)}}
.nv-ico[data-fx="spin"] svg{animation:nvSpin 1s cubic-bezier(.2,.75,.25,1) both}
@keyframes nvSpin{0%{transform:perspective(80px) rotateY(0)}100%{transform:perspective(80px) rotateY(360deg) translateY(-1px) scale(1.08)}}
.nv-ico[data-fx="glow"] svg{animation:nvHop .8s cubic-bezier(.3,1.4,.5,1) both;transform-origin:50% 100%}
@keyframes nvHop{0%{transform:none}30%{transform:translateY(-5px) scale(1.04,.96)}55%{transform:translateY(0) scale(1.12,.88)}75%{transform:translateY(-2px) scale(.98,1.04)}100%{transform:translateY(-1px) scale(1.08)}}
.nv-ico[data-fx="wave"] svg{animation:nvWave .9s ease-in-out both;transform-origin:50% 92%}
@keyframes nvWave{0%{transform:none}20%{transform:rotate(-15deg)}40%{transform:rotate(12deg)}60%{transform:rotate(-8deg)}80%{transform:rotate(4deg)}100%{transform:translateY(-1px) scale(1.08)}}
@media (max-width:1023px){.nimbus-item{padding:0 12px}.nimbus-label{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}}
.nimbus-nav[data-compact] .nimbus-item{padding:0 11px}
.nimbus-nav[data-compact] .nimbus-label{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
.nv-badge{position:absolute;top:-9px;inset-inline-end:-13px;min-width:16px;height:16px;padding:0 4px;box-shadow:0 0 0 2px var(--background);border-radius:999px;background:var(--n-fg);color:var(--background);font-size:10px;font-weight:600;line-height:16px;text-align:center}
@media (prefers-reduced-motion:reduce){.nv-ico svg,.nv-ico::before,.nv-ico::after{animation:none!important;transition:none}}
`;

const VERT = `attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}`;
// uAcc = brand colour; replaces the original's blue in the drop's rim, body tint and shadow
const FRAG = `precision highp float;
uniform vec2 uRes;uniform float uDpr;uniform float uTime;uniform vec4 uPill;
uniform vec4 uBlob[6];uniform float uSy[6];uniform vec4 uRip[6];uniform vec3 uMouse;uniform float uDark;uniform float uAmb;uniform vec3 uAcc;
float sdRB(vec2 p,vec2 b,float r){vec2 q=abs(p)-b+r;return length(max(q,0.))+min(max(q.x,q.y),0.)-r;}
float sdCap(vec2 p,vec4 B,float sy){p-=B.xy;p.y/=sy;p.x=max(abs(p.x)-B.z,0.);return(length(p)-B.w)*min(1.,sy);}
float smin(float a,float b,float k){float h=clamp(.5+.5*(b-a)/k,0.,1.);return mix(b,a,h)-k*h*(1.-h);}
float dropD(vec2 p){float d=1e4;for(int i=0;i<6;i++){if(uBlob[i].w>.5){d=smin(d,sdCap(p,uBlob[i],uSy[i]),13.);}}return d;}
float pillD(vec2 p){vec2 h=uPill.zw*.5;return sdRB(p-uPill.xy-h,h,h.y);}
float lens(float d,float w){float t=clamp(-d/w,0.,1.);return sqrt(1.-(1.-t)*(1.-t));}
float waves(vec2 p){float w=0.;
 for(int i=0;i<6;i++){vec4 R=uRip[i];if(R.w>0.){float x=length(p-R.xy)-R.z*240.;w+=R.w*exp(-R.z*1.7)*sin(x*.3)*exp(-x*x/700.);}}
 vec2 m=p-uMouse.xy;w+=uMouse.z*3.6*exp(-dot(m,m)/1000.);
 w+=uAmb*(sin(p.x*.05+uTime*1.2)*.45+sin(p.x*.13-uTime*.85+p.y*.2)*.25);return w;}
float H(vec2 p){float dp=pillD(p);return lens(dp,uPill.w*.36)*2.4+lens(dropD(p),11.)*7.5+waves(p)*smoothstep(0.,7.,-dp);}
float caus(vec2 p,float t){vec2 q=p;float c=0.;for(int i=0;i<3;i++){q+=vec2(sin(q.y*1.1+t),cos(q.x*1.3-t*.7))*.6;c+=1./(1.+16.*abs(sin(q.x)*sin(q.y)));}return c/3.;}
void main(){
 vec2 p=vec2(gl_FragCoord.x,uRes.y*uDpr-gl_FragCoord.y)/uDpr;
 float dp=pillD(p);float dd=dropD(p);
 float h0=H(p);vec3 n=normalize(vec3(h0-H(p+vec2(1.,0.)),h0-H(p+vec2(0.,1.)),1.));
 vec3 V=vec3(0.,0.,1.);
 float spec=pow(max(dot(reflect(-normalize(vec3(-.45,-.8,.85)),n),V),0.),70.);
 float spec2=pow(max(dot(reflect(-normalize(vec3(.6,.75,.7)),n),V),0.),22.)*.3;
 float fres=clamp((1.-n.z)*4.,0.,1.);
 vec3 irid=.5+.5*cos(6.2831*(vec3(0.,.33,.67)+fres*.85+p.x*.0028+uTime*.035));
 float pm=smoothstep(1.,-1.,dp);float dm=smoothstep(1.,-1.,dd)*smoothstep(1.,-2.,dp);
 float sh=smoothstep(9.,-9.,dropD(p-vec2(0.,5.)))*(1.-dm)*pm*(.11+.07*uDark);
 vec3 c=uAcc*.35*sh;float a=sh;
 float pa=clamp(pm*(fres*.5+spec*.9+spec2),0.,1.);
 c=mix(vec3(1.),irid,.35*fres)*pa+c*(1.-pa);a=pa+a*(1.-pa);
 float th=lens(dd,11.);
 float cs=caus((p+n.xy*th*18.)*.085,uTime*.9);
 vec3 tint=mix(vec3(1.),uAcc,mix(.22,.5,uDark));
 float rim=dm*(1.-smoothstep(0.,8.,-dd));
 float cres=dm*smoothstep(.12,.55,dot(n.xy,normalize(vec2(.55,.85))))*smoothstep(0.,3.,-dd);
 float body=.5+.5*clamp(-n.y*3.,-1.,1.);
 float da=dm*(.26+.14*body)*(1.-.35*uDark);vec3 dc=mix(tint,vec3(1.),body*.6);
 float la=rim*.3;vec3 lc=uAcc;dc=lc*la+dc*da*(1.-la);da=la+da*(1.-la);
 la=clamp(cres*.7+smoothstep(.6,1.,cs)*.28*th*dm,0.,1.);dc=vec3(1.)*la+dc*(1.-la);da=la+da*(1.-la);
 la=clamp(dm*(spec*1.2+spec2*.5),0.,1.);dc=vec3(1.)*la+dc*(1.-la);da=la+da*(1.-la);
 la=dm*smoothstep(-2.,0.,dd)*.4;dc=mix(vec3(1.),irid,.25)*la+dc*(1.-la);da=la+da*(1.-la);
 c=dc+c*(1.-da);a=da+a*(1.-da);
 gl_FragColor=vec4(c,a);
}`;

type Body = { x: number; v: number };
type Sat = { x: number; y: number; vx: number; vy: number; r: number; k: number };
type Rip = { x: number; y: number; age: number; amp: number };
type GLC = { gl: WebGLRenderingContext; u: Record<string, WebGLUniformLocation | null> };

const makeState = () => ({
  a: { x: 0, v: 0 } as Body, b: { x: 0, v: 0 } as Body, sy: { s: 1, v: 0 }, lead: 0 as 0 | 1, lagFrom: 0,
  sats: [] as Sat[], rips: [] as Rip[], t: { x: 0, cy: 0, q: 0, r: 19 }, q: 0, mouse: { x: 0, y: 0, s: 0, on: false },
  moving: false, split: false, ready: false, none: true, w: 0, h: 0, visible: true, reduce: false, raf: 0, last: 0, time: 0,
  dark: 0, acc: BRAND.light, glc: null as GLC | null,
});

function initGL(canvas: HTMLCanvasElement): GLC | null {
  const gl = canvas.getContext("webgl", { premultipliedAlpha: true, alpha: true, antialias: false });
  if (!gl) return null;
  const sh = (type: number, src: string) => { const s = gl.createShader(type)!; gl.shaderSource(s, src); gl.compileShader(s); return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null; };
  const vs = sh(gl.VERTEX_SHADER, VERT), fs = sh(gl.FRAGMENT_SHADER, FRAG);
  if (!vs || !fs) return null;
  const p = gl.createProgram()!;
  gl.attachShader(p, vs); gl.attachShader(p, fs); gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) return null;
  gl.useProgram(p);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(p, "a");
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const u: GLC["u"] = {};
  for (const n of ["uRes", "uDpr", "uTime", "uPill", "uBlob", "uSy", "uRip", "uMouse", "uDark", "uAmb", "uAcc"]) u[n] = gl.getUniformLocation(p, n);
  return { gl, u };
}

/** site theme = class "dark" on <html> */
const subscribeTheme = (cb: () => void) => { const mo = new MutationObserver(cb); mo.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] }); return () => mo.disconnect(); };
const noSub = () => () => {};
const supportsRefraction = () => /Chrome\/|Chromium\/|Edg\//.test(navigator.userAgent) && !!CSS.supports?.("backdrop-filter", "url(#a)");

export function LiquidNav({ items, active, onPick, accent = BRAND, label, compact, className }: Props) {
  const filterId = `nimbus-refract-${React.useId().replace(/:/g, "")}`;
  const navRef = React.useRef<HTMLElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const dropRef = React.useRef<HTMLSpanElement>(null);
  const itemRefs = React.useRef<(HTMLElement | null)[]>([]);
  const iconRefs = React.useRef<(HTMLSpanElement | null)[]>([]);
  const st = React.useRef(makeState());
  const refract = React.useSyncExternalStore(noSub, supportsRefraction, () => false);
  const [fx, setFx] = React.useState({ i: -1, n: 0 });
  const dark = React.useSyncExternalStore(subscribeTheme, () => document.documentElement.classList.contains("dark"), () => false);

  const draw = React.useCallback(() => {
    const s = st.current, T = s.t;
    const sep = Math.abs(s.a.x - s.b.x);
    const thin = Math.min(sep / (2 * (s.q + T.r) || 1), 1);
    const r = T.r * (1 - 0.3 * thin);
    if (s.glc) {
      const { gl: g, u } = s.glc;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      g.viewport(0, 0, g.drawingBufferWidth, g.drawingBufferHeight);
      g.uniform2f(u.uRes, s.w + PAD * 2, s.h + PAD * 2);
      g.uniform1f(u.uDpr, dpr);
      g.uniform1f(u.uTime, s.time);
      g.uniform4f(u.uPill, PAD, PAD, s.w, s.h);
      const blobs = new Float32Array(24), sy = new Float32Array(6).fill(1);
      if (!s.none) {
        const head = s.lead === 0 ? s.a : s.b, tail = s.lead === 0 ? s.b : s.a;
        blobs.set([head.x, T.cy, s.q * (1 - 0.25 * thin), T.r * (1 - 0.12 * thin), tail.x, T.cy, s.q * (1 - 0.8 * thin), T.r * (1 - 0.5 * thin)], 0);
        sy[0] = sy[1] = s.sy.s;
        s.sats.slice(0, 4).forEach((d, i) => blobs.set([d.x, d.y, 0, d.r], 8 + i * 4));
      }
      g.uniform4fv(u.uBlob, blobs);
      g.uniform1fv(u.uSy, sy);
      const rips = new Float32Array(24);
      s.rips.slice(-6).forEach((p, i) => rips.set([p.x, p.y, p.age, p.amp], i * 4));
      g.uniform4fv(u.uRip, rips);
      g.uniform3f(u.uMouse, s.mouse.x, s.mouse.y, s.mouse.s);
      g.uniform1f(u.uDark, s.dark);
      g.uniform3f(u.uAcc, ...s.acc);
      g.uniform1f(u.uAmb, s.reduce ? 0 : 1);
      g.clearColor(0, 0, 0, 0);
      g.clear(g.COLOR_BUFFER_BIT);
      g.drawArrays(g.TRIANGLES, 0, 3);
    } else if (dropRef.current) {
      dropRef.current.style.width = `${sep + 2 * (s.q + r)}px`;
      dropRef.current.style.transform = `translateX(${Math.min(s.a.x, s.b.x) - s.q - r - PAD}px) scaleY(${s.sy.s})`;
    }
  }, []);

  const step = React.useCallback((dt: number, now: number) => {
    const s = st.current, T = s.t;
    s.time += dt;
    s.q += (T.q - s.q) * Math.min(1, dt * 12);
    const bodies = [s.a, s.b];
    let still = true;
    if (s.reduce) {
      s.a.x = s.b.x = T.x; s.a.v = s.b.v = 0; s.sy.s = 1; s.sats = [];
    } else {
      bodies.forEach((B, i) => {
        const lead = i === s.lead, k = lead ? 210 : 72, c = lead ? 25 : 13, f = !lead && now < s.lagFrom ? 0.08 : 1;
        B.v += (k * (T.x - B.x) - c * B.v) * dt * f;
        B.x += B.v * dt;
        const lo = PAD + 5 + s.q + T.r - 3, hi = PAD + s.w - 5 - s.q - T.r + 3;
        if (B.x < lo || B.x > hi) { s.sy.v -= Math.min(Math.abs(B.v), 900) * 0.0016; B.x = Math.max(lo, Math.min(hi, B.x)); B.v *= -0.25; }
        if (Math.abs(T.x - B.x) > 0.3 || Math.abs(B.v) > 3) still = false;
      });
      const L = bodies[s.lead];
      const syT = 1 - 0.2 * Math.min(Math.abs(L.v) / 1500, 1);
      s.sy.v += (280 * (syT - s.sy.s) - 9 * s.sy.v) * dt;
      s.sy.s += s.sy.v * dt;
      if (Math.abs(s.sy.s - 1) > 0.002 || Math.abs(s.sy.v) > 0.02) still = false;
      const sep = Math.abs(s.a.x - s.b.x);
      const r = T.r * (1 - 0.3 * Math.min(sep / (2 * (T.q + T.r) || 1), 1));
      if (!s.split && s.moving && sep - 2 * T.q - 2 * r > -6) { // the neck breaks: droplets between head and tail
        s.split = true;
        const lo = bodies[1 - s.lead], hi = bodies[s.lead];
        [0.3, 0.5, 0.72].forEach((t, j) => s.sats.push({
          x: lo.x + (hi.x - lo.x) * t + (Math.random() - 0.5) * 6, y: T.cy + (Math.random() - 0.5) * 10,
          vx: (lo.v + hi.v) * 0.45, vy: (Math.random() - 0.5) * 60, r: 5 + Math.random() * 3 - j * 0.5, k: 70 + Math.random() * 90,
        }));
      }
      s.sats = s.sats.filter((d) => {
        d.vx += (d.k * (T.x - d.x) - 9 * d.vx) * dt;
        d.vy += (90 * (T.cy - d.y) - 7 * d.vy) * dt;
        d.x = Math.max(PAD + 8 + d.r, Math.min(PAD + s.w - 8 - d.r, d.x + d.vx * dt));
        d.y = Math.max(T.cy - T.r + d.r, Math.min(T.cy + T.r - d.r, d.y + d.vy * dt));
        if (Math.abs(T.x - d.x) < T.q + T.r * 0.5) d.r -= dt * 26;
        return d.r > 0.6;
      });
      if (s.sats.length) still = false;
    }
    if (s.moving && still) { s.moving = false; s.rips.push({ x: T.x, y: T.cy, age: 0, amp: s.split ? 1.2 : 0.7 }); }
    s.rips.forEach((p) => (p.age += dt));
    s.rips = s.rips.filter((p) => p.age < 2.4);
    s.mouse.s += ((s.mouse.on ? 1 : 0) - s.mouse.s) * Math.min(1, dt * 7);
  }, []);

  const loop = React.useCallback(() => {
    const s = st.current;
    if (s.raf) return;
    s.last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min((now - s.last) / 1000, 1 / 30);
      s.last = now;
      step(dt, now);
      draw();
      const busy = s.moving || s.rips.length || s.sats.length || s.mouse.s > 0.01;
      s.raf = s.visible && (!s.reduce || busy) ? requestAnimationFrame(tick) : 0; // ambient water only while visible
    };
    s.raf = requestAnimationFrame(tick);
  }, [draw, step]);

  const measure = React.useCallback(() => {
    const nav = navRef.current, s = st.current, T = s.t;
    if (!nav) return;
    s.w = nav.offsetWidth; s.h = nav.offsetHeight;
    const el = active >= 0 ? itemRefs.current[active] : null;
    s.none = !el;
    if (el) {
      T.r = el.offsetHeight / 2;
      T.q = Math.max(0, el.offsetWidth / 2 - T.r);
      T.cy = PAD + el.offsetTop + el.offsetHeight / 2;
      const nx = PAD + el.offsetLeft + el.offsetWidth / 2;
      if (!s.ready) { s.a.x = s.b.x = nx; s.q = T.q; s.ready = true; }
      else if (Math.abs(nx - T.x) > 0.5) {
        s.lead = Math.abs(nx - s.a.x) <= Math.abs(nx - s.b.x) ? 0 : 1;
        s.lagFrom = performance.now() + 70; s.moving = true; s.split = false;
      }
      T.x = nx;
    } else s.ready = false; // next active item appears in place instead of flowing in from the old spot
    const cv = canvasRef.current;
    if (cv) {
      const dpr = Math.min(window.devicePixelRatio || 1, 2), W = s.w + PAD * 2, Hh = s.h + PAD * 2;
      if (cv.width !== Math.round(W * dpr) || cv.height !== Math.round(Hh * dpr)) {
        cv.width = Math.round(W * dpr); cv.height = Math.round(Hh * dpr); cv.style.width = `${W}px`; cv.style.height = `${Hh}px`;
      }
    }
    loop();
  }, [active, loop]);

  React.useEffect(() => { const s = st.current; s.dark = dark ? 1 : 0; s.acc = dark ? accent.dark : accent.light; loop(); }, [dark, accent, loop]);

  React.useEffect(() => {
    const s = st.current, cv = canvasRef.current;
    s.reduce = !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    s.glc = cv ? initGL(cv) : null;
    const glOff = () => { if (navRef.current) navRef.current.dataset.gl = "off"; }; // CSS drop takes over
    if (!s.glc) glOff();
    const lost = (e: Event) => { e.preventDefault(); s.glc = null; glOff(); };
    cv?.addEventListener("webglcontextlost", lost);
    const io = new IntersectionObserver(([e]) => { s.visible = e.isIntersecting; if (s.visible) loop(); });
    if (navRef.current) io.observe(navRef.current);
    const vis = () => { s.visible = document.visibilityState === "visible"; if (s.visible) loop(); };
    document.addEventListener("visibilitychange", vis);
    return () => { cv?.removeEventListener("webglcontextlost", lost); io.disconnect(); document.removeEventListener("visibilitychange", vis); cancelAnimationFrame(s.raf); s.raf = 0; };
  }, [loop]);

  React.useLayoutEffect(() => { measure(); }, [measure, items.length]);
  const measureRef = React.useRef(measure);
  React.useEffect(() => { measureRef.current = measure; }, [measure]);
  React.useEffect(() => {
    let lastW = -1;
    const ro = new ResizeObserver(() => {
      const w = navRef.current?.offsetWidth ?? 0;
      if (w !== lastW) { lastW = w; st.current.ready = false; measureRef.current(); }
    });
    if (navRef.current) ro.observe(navRef.current);
    return () => ro.disconnect();
  }, []);

  const local = (x: number, y: number) => { const r = navRef.current!.getBoundingClientRect(); return { x: x - r.left + PAD, y: y - r.top + PAD }; };
  const ripple = (x: number, y: number, amp: number) => { if (st.current.reduce) return; st.current.rips.push({ x, y, age: 0, amp }); loop(); };
  const select = (i: number) => {
    const kind = items[i]?.fx ?? (items[i]?.icon ? "pop" : "none");
    setFx((f) => ({ i, n: f.n + 1 }));
    const el = iconRefs.current[i];
    if (el) {
      const b = el.getBoundingClientRect(), c = local(b.left + b.width / 2, b.top + b.height / 2);
      if (kind === "drop") setTimeout(() => ripple(c.x, st.current.t.cy, 1.4), 430);
      if (kind === "plane") ripple(c.x, c.y, 0.6);
    }
    if (i !== active) onPick?.(i);
  };
  // arrows move by visual direction (RTL: left = next)
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    const rtl = getComputedStyle(navRef.current!).direction === "rtl";
    const from = Math.max(0, itemRefs.current.findIndex((x) => x === document.activeElement));
    const n = (from + ((e.key === "ArrowRight") !== rtl ? 1 : -1) + items.length) % items.length;
    e.preventDefault();
    itemRefs.current[n]?.focus();
  };
  const onMove = (e: React.PointerEvent) => {
    if (e.pointerType !== "mouse") return;
    const p = local(e.clientX, e.clientY), s = st.current;
    s.mouse.x = p.x; s.mouse.y = p.y; s.mouse.on = true;
    loop();
  };
  const acc = (dark ? accent.dark : accent.light).map((v) => Math.round(v * 255)).join(" ");

  return (
    <nav ref={navRef} aria-label={label} className={["nimbus-nav", className].filter(Boolean).join(" ")} data-compact={compact || undefined} data-none={active < 0}
      style={{ "--n-acc": acc } as React.CSSProperties}
      onKeyDown={onKeyDown} onPointerMove={onMove} onPointerLeave={() => { st.current.mouse.on = false; loop(); }}
      onPointerDown={(e) => { const p = local(e.clientX, e.clientY); ripple(p.x, p.y, 0.8); }}>
      <style dangerouslySetInnerHTML={{ __html: STYLES }} />
      <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true">
        <filter id={filterId} x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency="0.006 0.02" numOctaves="2" seed="7" result="noise" />
          <feGaussianBlur in="noise" stdDeviation="2" result="soft" />
          <feDisplacementMap in="SourceGraphic" in2="soft" scale="60" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </svg>
      <span className="nimbus-glass" aria-hidden="true" style={refract ? { backdropFilter: `url(#${filterId}) blur(2px) saturate(1.2)`, WebkitBackdropFilter: `url(#${filterId}) blur(2px) saturate(1.2)` } : undefined} />
      <canvas className="nimbus-water" ref={canvasRef} aria-hidden="true" />
      <span className="nimbus-drop" ref={dropRef} aria-hidden="true" />
      {items.map((it, i) => {
        const kind = it.fx ?? "pop", playing = fx.i === i && kind !== "none";
        const props = {
          ref: (el: HTMLElement | null) => { itemRefs.current[i] = el; },
          className: "nimbus-item", title: compact ? it.label : undefined,
          "aria-current": i === active ? ("page" as const) : undefined,
          onClick: () => { select(i); it.onClick?.(); },
        };
        const content = <>
          {it.icon && <span className="nv-ico" key={playing ? fx.n : 0} data-fx={playing ? kind : undefined} ref={(el) => { iconRefs.current[i] = el; }}>{it.icon}{!!it.badge && <span className="nv-badge" aria-hidden="true">{it.badge}</span>}</span>}
          <span className="nimbus-label">{it.label}</span>
        </>;
        return (
          it.href ? <Link key={i} href={it.href} {...props}>{content}</Link> : <button key={i} type="button" {...props}>{content}</button>
        );
      })}
    </nav>
  );
}
