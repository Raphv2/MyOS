import { fetchText } from '../core/api';
import { h } from '../core/dom';
import type { FsFile } from '../core/fs';
import { fileIcon } from '../core/icons';
import type { Os } from '../os/context';
import { codeBlock } from './code';

const DEFAULT_VERT = `layout(location = 0) in vec3 aPos;
void main() { gl_Position = vec4(aPos, 1.0); }`;

const HEADER = '#version 300 es\nprecision highp float;\nprecision highp int;\n';

/**
 * Adapte un shader GLSL « desktop » (330 core, suffixes `1.0f`) au GLSL ES 3.00 de WebGL2.
 * Les shaders déjà en GLSL ES passent tels quels.
 */
export function toWebGL2(src: string): string {
  const body = src
    .replace(/^\s*#version[^\n]*\n?/m, '')
    .replace(/^\s*precision\s+\w+\s+(float|int)\s*;\s*$/gm, '')
    .replace(/((?:\d+\.\d*|\.\d+)(?:[eE][+-]?\d+)?)[fF]\b/g, '$1');
  return HEADER + body;
}

function compile(gl: WebGL2RenderingContext, type: number, src: string, label: string): WebGLShader {
  const sh = gl.createShader(type);
  if (!sh) throw new Error('Impossible de créer le shader');
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(sh) ?? '';
    gl.deleteShader(sh);
    throw new Error(`${label} :\n${log}`);
  }
  return sh;
}

/** URLs du fragment et du vertex shader à partir du fichier ouvert. */
function shaderUrls(url: string): { frag: string; vert: string | null } {
  if (/\.vert$/i.test(url)) return { vert: url, frag: url.replace(/\.vert$/i, '.frag') };
  if (/\.frag$/i.test(url)) return { frag: url, vert: url.replace(/\.frag$/i, '.vert') };
  return { frag: url, vert: null };
}

export async function open(os: Os, file: FsFile): Promise<void> {
  const { win, created } = os.wm.open({ key: `file:${file.id}`, title: file.name, icon: fileIcon(file) });
  if (!created) return;
  const { signal } = win;

  const canvas = h('canvas', { class: 'shader-canvas' });
  const errorBox = h('pre', { class: 'app-error shader-error' });
  const renderPane = h('div', { class: 'app-pane shader-render' }, canvas, errorBox);
  const code = codeBlock();
  const codeTabs = h('div', { class: 'shader-code-tabs' });
  const codePane = h('div', { class: 'app-pane shader-code', attrs: { hidden: true } }, codeTabs, code.el);
  const tabRender = h('button', { class: 'app-tab is-active', text: 'Rendu', attrs: { type: 'button' } });
  const tabCode = h('button', { class: 'app-tab', text: 'Code', attrs: { type: 'button' } });
  win.body.append(h('div', { class: 'content app-tabs-layout' }, h('div', { class: 'app-tabs' }, tabRender, tabCode), renderPane, codePane));

  const select = (codeMode: boolean) => {
    tabRender.classList.toggle('is-active', !codeMode);
    tabCode.classList.toggle('is-active', codeMode);
    renderPane.hidden = codeMode;
    codePane.hidden = !codeMode;
  };
  tabRender.addEventListener('click', () => select(false), { signal });
  tabCode.addEventListener('click', () => select(true), { signal });

  const urls = shaderUrls(file.url ?? '');
  let fragSrc = '';
  let vertSrc = DEFAULT_VERT;
  let vertName = 'défaut';
  try {
    fragSrc = await fetchText(urls.frag);
  } catch {
    errorBox.textContent = 'Fragment shader introuvable.';
    return;
  }
  if (urls.vert) {
    try {
      vertSrc = await fetchText(urls.vert);
      vertName = urls.vert.split('/').pop() ?? 'vertex';
    } catch {
      /* pas de .vert : quad plein écran par défaut */
    }
  }

  // Onglet Code : un sous-onglet par fichier (.frag / .vert).
  const sources: Array<[string, string]> = [[urls.frag.split('/').pop() ?? 'fragment', fragSrc]];
  if (vertName !== 'défaut') sources.push([vertName, vertSrc]);
  sources.forEach(([name, src], i) => {
    const b = h('button', { class: `app-subtab${i === 0 ? ' is-active' : ''}`, text: decodeURIComponent(name), attrs: { type: 'button' } });
    b.addEventListener('click', () => {
      codeTabs.querySelectorAll('.app-subtab').forEach((x) => x.classList.toggle('is-active', x === b));
      void code.show(src, 'glsl');
    }, { signal });
    codeTabs.appendChild(b);
  });
  void code.show(fragSrc, 'glsl');

  const gl = canvas.getContext('webgl2', { antialias: false, preserveDrawingBuffer: false });
  if (!gl) {
    errorBox.textContent = 'WebGL2 non disponible sur ce navigateur.';
    select(true);
    return;
  }

  let program: WebGLProgram;
  try {
    const vs = compile(gl, gl.VERTEX_SHADER, toWebGL2(vertSrc), 'Vertex shader');
    const fs = compile(gl, gl.FRAGMENT_SHADER, toWebGL2(fragSrc), 'Fragment shader');
    program = gl.createProgram()!;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.bindAttribLocation(program, 0, 'aPos');
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program) ?? 'Link error');
  } catch (err) {
    errorBox.textContent = err instanceof Error ? err.message : String(err);
    return;
  }

  const quad = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, quad);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 0, 1, -1, 0, -1, 1, 0, -1, 1, 0, 1, -1, 0, 1, 1, 0]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
  gl.useProgram(program);

  const loc = (...names: string[]) => names.map((n) => gl.getUniformLocation(program, n)).find((l) => l !== null) ?? null;
  const uTime = loc('time', 'u_time', 'iTime');
  const uRes = loc('resolution', 'u_resolution', 'iResolution');
  const uMouse = loc('mouse', 'u_mouse', 'iMouse');
  const activeUniforms = Array.from({ length: gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS) as number }, (_, i) =>
    gl.getActiveUniform(program, i),
  );
  const resIsVec3 = activeUniforms.some((u) => u && /^(resolution|u_resolution|iResolution)$/.test(u.name) && u.type === gl.FLOAT_VEC3);
  const uCamPos = loc('cameraPosition');
  const uFront = loc('cameraFront');
  const uRight = loc('cameraRight');
  const uUp = loc('cameraUp');

  // Caméra orientable à la souris (utile pour clouds.frag).
  let yaw = 0;
  let pitch = 0.25;
  let mouse: [number, number] = [0, 0];
  canvas.addEventListener('pointermove', (e) => {
    const r = canvas.getBoundingClientRect();
    mouse = [e.clientX - r.left, r.height - (e.clientY - r.top)];
    if (e.buttons & 1) {
      yaw += e.movementX * 0.005;
      pitch = Math.max(-1.2, Math.min(1.2, pitch - e.movementY * 0.005));
    }
  }, { signal });

  const start = performance.now();
  let raf = 0;
  const frame = () => {
    raf = requestAnimationFrame(frame);
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const w = Math.max(1, Math.floor(canvas.clientWidth * dpr));
    const hgt = Math.max(1, Math.floor(canvas.clientHeight * dpr));
    if (canvas.width !== w || canvas.height !== hgt) {
      canvas.width = w;
      canvas.height = hgt;
    }
    gl.viewport(0, 0, w, hgt);
    const t = (performance.now() - start) / 1000;
    if (uTime) gl.uniform1f(uTime, t);
    if (uRes) {
      if (resIsVec3) gl.uniform3f(uRes, w, hgt, 1);
      else gl.uniform2f(uRes, w, hgt);
    }
    if (uMouse) gl.uniform2f(uMouse, mouse[0] * dpr, mouse[1] * dpr);
    const front: [number, number, number] = [Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch)];
    const right: [number, number, number] = [Math.cos(yaw), 0, -Math.sin(yaw)];
    const up: [number, number, number] = [
      front[1] * right[2] - front[2] * right[1],
      front[2] * right[0] - front[0] * right[2],
      front[0] * right[1] - front[1] * right[0],
    ];
    if (uCamPos) gl.uniform3f(uCamPos, 0, 0, 0);
    if (uFront) gl.uniform3f(uFront, ...front);
    if (uRight) gl.uniform3f(uRight, ...right);
    if (uUp) gl.uniform3f(uUp, ...up);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  };
  frame();

  win.onDispose(() => {
    cancelAnimationFrame(raf);
    gl.getExtension('WEBGL_lose_context')?.loseContext();
  });
}
