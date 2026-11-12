"use client";

import Image from "next/image";
import { useEffect, useRef, type ReactNode } from "react";

import type { CatalogPhoto } from "@/lib/catalog/queries";

/**
 * A light you can hold (cement design, owner-approved 12 November 2026).
 *
 * The product page's first photo is dim until the light is brought to it.
 * The photo's own fine detail is read as relief, so stitching, embossing and
 * weave catch the light on one side and fall into shade on the other, and
 * that changes as the light moves. Nothing is added to the photo: it is the
 * owner's picture, lit.
 *
 *   Mouse     the light follows the cursor
 *   Touch     a tap places it; press and hold picks it up, and the page then
 *             stays put while it is dragged (a quick swipe still scrolls)
 *   Keyboard  the arrow keys carry it
 *   Idle      left alone, it wanders slowly
 *
 * Decoration with a fallback at every step. The plain photo is always in the
 * page and is what shows until the lit one is ready, without WebGL (where a
 * soft pool of light is drawn in CSS instead), and if the photo cannot be
 * read. Under reduced motion the light never moves by itself. It draws only
 * while it is on screen and the tab is visible.
 */

const FRAGMENT = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform sampler2D tPhoto;
uniform vec2 uRes;      // canvas px
uniform vec4 uCrop;     // photo uv = uCrop.xy + st * uCrop.zw
uniform vec2 uTexel;    // one photo pixel, in uv
uniform vec2 uLight;    // where the light is, 0..1 across the stage, y down
uniform float uHold;    // 0 = resting, 1 = the light is being held
uniform float uAspect;  // stage width / height
// Warm white only: the bone of the palette. Colour comes from the photo.
const vec3 WARM = vec3(1.0, 0.985, 0.955);
float luma(vec2 uv) { return dot(texture2D(tPhoto, uv).rgb, vec3(0.2126, 0.7152, 0.0722)); }
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
void main() {
  vec2 st = vec2(gl_FragCoord.x / uRes.x, 1.0 - gl_FragCoord.y / uRes.y);
  vec2 uv = uCrop.xy + st * uCrop.zw;
  vec3 photo = texture2D(tPhoto, uv).rgb;
  vec2 a = uTexel * 1.5, b = uTexel * 4.5;
  float gx = (luma(uv + vec2(a.x, 0.0)) - luma(uv - vec2(a.x, 0.0))) + 0.7 * (luma(uv + vec2(b.x, 0.0)) - luma(uv - vec2(b.x, 0.0)));
  float gy = (luma(uv + vec2(0.0, a.y)) - luma(uv - vec2(0.0, a.y))) + 0.7 * (luma(uv + vec2(0.0, b.y)) - luma(uv - vec2(0.0, b.y)));
  vec3 n = normalize(vec3(-gx * 4.4, -gy * 4.4, 1.0));
  vec2 dl = vec2((uLight.x - st.x) * uAspect, uLight.y - st.y);
  float dist = length(dl);
  vec3 l = normalize(vec3(dl, 0.22));
  float radius = mix(0.36, 0.31, uHold);
  float pool = exp(-dist * dist / (2.0 * radius * radius));
  float relief = dot(n, l) - l.z;                      // zero on flat cloth
  float lit = pool * max(0.0, 1.0 + relief * 2.0);
  float ambient = mix(0.5, 0.14, uHold);
  float power = mix(0.7, 1.16, uHold);
  vec3 col = photo * (ambient + power * lit * WARM);
  vec3 h = normalize(l + vec3(0.0, 0.0, 1.0));
  col += WARM * pow(max(dot(n, h), 0.0), 48.0) * pool * luma(uv) * 0.1 * (0.4 + 0.6 * uHold);
  col += (hash(gl_FragCoord.xy) - 0.5) / 255.0 * 1.4;
  gl_FragColor = vec4(col, 1.0);
}`;

const VERTEX = "attribute vec2 a; void main(){ gl_Position = vec4(a, 0.0, 1.0); }";
const UNIFORMS = ["tPhoto", "uRes", "uCrop", "uTexel", "uLight", "uHold", "uAspect"] as const;

const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));

export function LitPhoto({
  photo,
  title,
  hint,
}: {
  /** The photo to light: the chosen variant's first. Undefined: none yet. */
  photo: CatalogPhoto | undefined;
  title: string;
  /** The owner's words on how to move the light, rendered on the server. */
  hint: ReactNode;
}) {
  const stageRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const photoRef = useRef<HTMLImageElement>(null);
  const focusX = photo?.focal.x ?? 0.5;
  const focusY = photo?.focal.y ?? 0.5;

  useEffect(() => {
    const stage = stageRef.current;
    const canvas = canvasRef.current;
    const img = photoRef.current;
    if (!stage || !canvas || !img) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    const L = {
      x: 0.5, y: 0.42, tx: 0.5, ty: 0.42,
      hold: 0, holdTo: 0, last: -1e9,
      w: 0, h: 0, visible: false, raf: 0, then: 0, odd: false,
    };
    let gl: WebGLRenderingContext | null = null;
    const U: Partial<Record<(typeof UNIFORMS)[number], WebGLUniformLocation | null>> = {};
    let texture: WebGLTexture | null = null;
    let ready = false;
    let disposed = false;

    function setup(): WebGLRenderingContext | null {
      const g = canvas!.getContext("webgl", { antialias: false, alpha: false });
      if (!g) return null;
      const shader = (type: number, source: string) => {
        const s = g.createShader(type);
        if (!s) throw new Error("shader");
        g.shaderSource(s, source);
        g.compileShader(s);
        if (!g.getShaderParameter(s, g.COMPILE_STATUS)) throw new Error(g.getShaderInfoLog(s) ?? "shader");
        return s;
      };
      const program = g.createProgram();
      if (!program) throw new Error("program");
      g.attachShader(program, shader(g.VERTEX_SHADER, VERTEX));
      g.attachShader(program, shader(g.FRAGMENT_SHADER, FRAGMENT));
      g.bindAttribLocation(program, 0, "a");
      g.linkProgram(program);
      if (!g.getProgramParameter(program, g.LINK_STATUS)) throw new Error(g.getProgramInfoLog(program) ?? "link");
      g.useProgram(program);
      g.bindBuffer(g.ARRAY_BUFFER, g.createBuffer());
      // One triangle that covers the whole canvas.
      g.bufferData(g.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), g.STATIC_DRAW);
      g.enableVertexAttribArray(0);
      g.vertexAttribPointer(0, 2, g.FLOAT, false, 0, 0);
      for (const name of UNIFORMS) U[name] = g.getUniformLocation(program, name);
      g.uniform1i(U.tPhoto ?? null, 0);
      return g;
    }

    function fallback() {
      gl = null;
      ready = false;
      stage!.removeAttribute("data-live");
      stage!.setAttribute("data-nogl", "");
    }

    function upload() {
      if (!gl || !img!.naturalWidth) return;
      try {
        if (texture) gl.deleteTexture(texture);
        texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);
        // Throws if the picture cannot be read (another site's, unshared).
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img!);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.uniform2f(U.uTexel ?? null, 1 / img!.naturalWidth, 1 / img!.naturalHeight);
        ready = true;
        stage!.setAttribute("data-live", "");
      } catch {
        fallback();
      }
      resize();
    }

    function resize() {
      const r = stage!.getBoundingClientRect();
      if (!r.width || !r.height) return;
      L.w = r.width;
      L.h = r.height;
      if (gl && ready) {
        // Sharp, but never more pixels than a phone can shade smoothly.
        const dpr = Math.min(window.devicePixelRatio || 1, 2, Math.sqrt(1.6e6 / (L.w * L.h)));
        canvas!.width = Math.round(L.w * dpr);
        canvas!.height = Math.round(L.h * dpr);
        gl.viewport(0, 0, canvas!.width, canvas!.height);
        gl.uniform2f(U.uRes ?? null, canvas!.width, canvas!.height);
        gl.uniform1f(U.uAspect ?? null, L.w / L.h);
        // The same crop as object-fit: cover at the photo's focal point.
        const stageRatio = L.w / L.h;
        const photoRatio = img!.naturalWidth / img!.naturalHeight;
        if (stageRatio > photoRatio) {
          gl.uniform4f(U.uCrop ?? null, 0, (1 - photoRatio / stageRatio) * focusY, 1, photoRatio / stageRatio);
        } else {
          gl.uniform4f(U.uCrop ?? null, (1 - stageRatio / photoRatio) * focusX, 0, stageRatio / photoRatio, 1);
        }
      }
      kick();
    }

    function draw() {
      stage!.style.setProperty("--lx", `${(L.x * 100).toFixed(2)}%`);
      stage!.style.setProperty("--ly", `${(L.y * 100).toFixed(2)}%`);
      if (!(gl && ready)) return;
      gl.uniform2f(U.uLight ?? null, L.x, L.y);
      gl.uniform1f(U.uHold ?? null, L.hold);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }

    function frame(now: number) {
      L.raf = 0;
      if (disposed) return;
      const dt = Math.min(64, L.then ? now - L.then : 16);
      L.then = now;
      const resting = now - L.last > 2600 && !L.holdTo;
      if (resting && !reduce.matches) {
        // Left alone, the light wanders slowly.
        L.tx = 0.5 + 0.27 * Math.sin(now / 5200);
        L.ty = 0.44 + 0.2 * Math.sin(now / 7100 + 1.3);
      }
      const k = 1 - Math.exp(-dt / (resting ? 1300 : 85));
      L.x += (L.tx - L.x) * k;
      L.y += (L.ty - L.y) * k;
      L.hold += (L.holdTo - L.hold) * (1 - Math.exp(-dt / 260));
      const settled =
        Math.abs(L.tx - L.x) < 0.0005 &&
        Math.abs(L.ty - L.y) < 0.0005 &&
        Math.abs(L.holdTo - L.hold) < 0.002;
      L.odd = !L.odd;
      if (!(resting && L.odd)) draw(); // wandering needs only every other frame
      if (L.visible && !document.hidden && !(settled && (reduce.matches || L.holdTo))) kick();
      else L.then = 0;
    }
    function kick() {
      if (!L.raf && L.visible && !disposed) L.raf = requestAnimationFrame(frame);
    }

    // Where the light goes for a pointer at client x, y. Under a finger it
    // sits a little above, so the finger does not cover it.
    function aim(x: number, y: number, lift: number) {
      const r = stage!.getBoundingClientRect();
      L.tx = clamp((x - r.left) / r.width, 0.02, 0.98);
      L.ty = clamp((y - r.top - lift) / r.height, 0.03, 0.97);
      L.last = performance.now();
      kick();
    }
    const grab = () => {
      L.holdTo = 1;
      stage.setAttribute("data-used", "");
      kick();
    };
    const drop = () => {
      L.holdTo = 0;
      L.last = performance.now();
      kick();
    };

    // Mouse: the light simply follows.
    const onPointerMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      if (!L.holdTo) grab();
      aim(e.clientX, e.clientY, 0);
    };
    const onPointerLeave = (e: PointerEvent) => {
      if (e.pointerType === "mouse") drop();
    };

    // Touch: a tap places the light; press and hold picks it up, and then the
    // page stays put while it is dragged.
    let timer = 0;
    let start: { x: number; y: number; at: number } | null = null;
    let held = false;
    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      const t = e.touches[0];
      const began = { x: t.clientX, y: t.clientY, at: performance.now() };
      start = began;
      held = false;
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        held = true;
        grab();
        aim(began.x, began.y, 70);
      }, 170);
    };
    const onTouchMove = (e: TouchEvent) => {
      const t = e.touches[0];
      if (!t) return;
      if (held) {
        if (e.cancelable) e.preventDefault();
        aim(t.clientX, t.clientY, 70);
      } else if (start && Math.hypot(t.clientX - start.x, t.clientY - start.y) > 8) {
        // A swipe, not a hold: let the page scroll.
        window.clearTimeout(timer);
        start = null;
      }
    };
    const onTouchEnd = () => {
      window.clearTimeout(timer);
      if (held) drop();
      else if (start && performance.now() - start.at < 320) {
        aim(start.x, start.y, 0);
        stage.setAttribute("data-used", "");
      }
      held = false;
      start = null;
    };
    const onContextMenu = (e: Event) => e.preventDefault();

    // Keys: the arrows carry the light.
    const onKeyDown = (e: KeyboardEvent) => {
      const step = (
        { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] } as Record<
          string,
          [number, number] | undefined
        >
      )[e.key];
      if (!step) return;
      e.preventDefault();
      L.tx = clamp(L.tx + step[0] * 0.05, 0.02, 0.98);
      L.ty = clamp(L.ty + step[1] * 0.05, 0.03, 0.97);
      L.last = performance.now();
      grab();
    };

    const onLost = (e: Event) => {
      e.preventDefault();
      fallback();
    };
    const onLoad = () => upload();

    stage.addEventListener("pointermove", onPointerMove);
    stage.addEventListener("pointerleave", onPointerLeave);
    stage.addEventListener("touchstart", onTouchStart, { passive: true });
    stage.addEventListener("touchmove", onTouchMove, { passive: false });
    stage.addEventListener("touchend", onTouchEnd);
    stage.addEventListener("touchcancel", onTouchEnd);
    stage.addEventListener("contextmenu", onContextMenu);
    stage.addEventListener("keydown", onKeyDown);
    stage.addEventListener("blur", drop);
    canvas.addEventListener("webglcontextlost", onLost);
    // A wider screen can bring a larger copy of the photo: light that one.
    img.addEventListener("load", onLoad);
    window.addEventListener("resize", resize);
    document.addEventListener("visibilitychange", kick);
    reduce.addEventListener("change", kick);

    const onScreen = new IntersectionObserver((entries) => {
      L.visible = entries[0]?.isIntersecting ?? false;
      if (L.visible) kick();
    });
    onScreen.observe(stage);

    try {
      gl = setup();
    } catch (error) {
      console.error("[bad-era] the product light could not start; showing the plain photo", error);
      gl = null;
    }
    if (!gl) stage.setAttribute("data-nogl", "");
    else stage.removeAttribute("data-nogl");

    if (img.complete && img.naturalWidth) {
      (img.decode ? img.decode().catch(() => {}) : Promise.resolve()).then(() => {
        if (!disposed) upload();
      });
    }
    resize();

    return () => {
      disposed = true;
      window.clearTimeout(timer);
      if (L.raf) cancelAnimationFrame(L.raf);
      onScreen.disconnect();
      stage.removeEventListener("pointermove", onPointerMove);
      stage.removeEventListener("pointerleave", onPointerLeave);
      stage.removeEventListener("touchstart", onTouchStart);
      stage.removeEventListener("touchmove", onTouchMove);
      stage.removeEventListener("touchend", onTouchEnd);
      stage.removeEventListener("touchcancel", onTouchEnd);
      stage.removeEventListener("contextmenu", onContextMenu);
      stage.removeEventListener("keydown", onKeyDown);
      stage.removeEventListener("blur", drop);
      canvas.removeEventListener("webglcontextlost", onLost);
      img.removeEventListener("load", onLoad);
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", kick);
      reduce.removeEventListener("change", kick);
      stage.removeAttribute("data-live");
    };
  }, [focusX, focusY]);

  if (!photo) {
    // No photo yet: the stage is there, unlit, until the owner adds one.
    return (
      <section className="lit" data-tone="dark" aria-label={`${title}: no photo yet`}>
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[radial-gradient(120%_100%_at_50%_0%,#141312_0%,#0a0a0a_60%,#050505_100%)]"
        >
          <span className="label absolute bottom-4 right-5 text-ink-disabled/70">{title}</span>
        </div>
      </section>
    );
  }

  return (
    <section
      ref={stageRef}
      className="lit"
      data-tone="dark"
      tabIndex={0}
      role="group"
      aria-label={`${photo.alt || title}. Use the arrow keys to move the light.`}
    >
      <div className="absolute inset-0">
        <Image
          ref={photoRef}
          src={photo.url}
          alt=""
          fill
          priority
          sizes="(min-width: 1024px) 53vw, 100vw"
          className="lit-photo object-cover"
          style={{ objectPosition: `${focusX * 100}% ${focusY * 100}%` }}
        />
        <canvas ref={canvasRef} aria-hidden="true" />
        <div className="lit-dim" aria-hidden="true" />
      </div>
      {hint}
    </section>
  );
}
