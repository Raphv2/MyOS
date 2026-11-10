import type { HighlighterCore, LanguageRegistration } from 'shiki/core';
import { nameExtension } from '../core/fs';

type LangModule = { default: LanguageRegistration[] };

/** Langages chargés à la demande (un chunk par langage). */
const LOADERS: Record<string, () => Promise<LangModule>> = {
  typescript: () => import('shiki/langs/typescript.mjs'),
  tsx: () => import('shiki/langs/tsx.mjs'),
  javascript: () => import('shiki/langs/javascript.mjs'),
  jsx: () => import('shiki/langs/jsx.mjs'),
  python: () => import('shiki/langs/python.mjs'),
  php: () => import('shiki/langs/php.mjs'),
  html: () => import('shiki/langs/html.mjs'),
  css: () => import('shiki/langs/css.mjs'),
  scss: () => import('shiki/langs/scss.mjs'),
  sass: () => import('shiki/langs/sass.mjs'),
  less: () => import('shiki/langs/less.mjs'),
  json: () => import('shiki/langs/json.mjs'),
  c: () => import('shiki/langs/c.mjs'),
  cpp: () => import('shiki/langs/cpp.mjs'),
  csharp: () => import('shiki/langs/csharp.mjs'),
  java: () => import('shiki/langs/java.mjs'),
  kotlin: () => import('shiki/langs/kotlin.mjs'),
  go: () => import('shiki/langs/go.mjs'),
  rust: () => import('shiki/langs/rust.mjs'),
  sql: () => import('shiki/langs/sql.mjs'),
  bash: () => import('shiki/langs/bash.mjs'),
  bat: () => import('shiki/langs/bat.mjs'),
  powershell: () => import('shiki/langs/powershell.mjs'),
  yaml: () => import('shiki/langs/yaml.mjs'),
  xml: () => import('shiki/langs/xml.mjs'),
  lua: () => import('shiki/langs/lua.mjs'),
  ruby: () => import('shiki/langs/ruby.mjs'),
  swift: () => import('shiki/langs/swift.mjs'),
  vue: () => import('shiki/langs/vue.mjs'),
  svelte: () => import('shiki/langs/svelte.mjs'),
  dart: () => import('shiki/langs/dart.mjs'),
  toml: () => import('shiki/langs/toml.mjs'),
  ini: () => import('shiki/langs/ini.mjs'),
  markdown: () => import('shiki/langs/markdown.mjs'),
  glsl: () => import('shiki/langs/glsl.mjs'),
};

const BY_EXT: Record<string, string> = {
  ts: 'typescript', tsx: 'tsx', js: 'javascript', mjs: 'javascript', cjs: 'javascript', jsx: 'jsx',
  py: 'python', php: 'php', html: 'html', htm: 'html', css: 'css', scss: 'scss', sass: 'sass', less: 'less',
  json: 'json', c: 'c', h: 'c', cpp: 'cpp', hpp: 'cpp', cc: 'cpp', cs: 'csharp', java: 'java', kt: 'kotlin',
  go: 'go', rs: 'rust', sql: 'sql', sh: 'bash', bash: 'bash', bat: 'bat', ps1: 'powershell', yml: 'yaml',
  yaml: 'yaml', xml: 'xml', lua: 'lua', rb: 'ruby', swift: 'swift', vue: 'vue', svelte: 'svelte', dart: 'dart',
  toml: 'toml', ini: 'ini', md: 'markdown', glsl: 'glsl', frag: 'glsl', vert: 'glsl',
};

/** Nom lisible pour la barre d'état. */
export const LANG_LABEL: Record<string, string> = {
  typescript: 'TypeScript', tsx: 'TypeScript JSX', javascript: 'JavaScript', jsx: 'JavaScript JSX', python: 'Python',
  php: 'PHP', html: 'HTML', css: 'CSS', scss: 'SCSS', sass: 'Sass', less: 'Less', json: 'JSON', c: 'C', cpp: 'C++',
  csharp: 'C#', java: 'Java', kotlin: 'Kotlin', go: 'Go', rust: 'Rust', sql: 'SQL', bash: 'Shell', bat: 'Batch',
  powershell: 'PowerShell', yaml: 'YAML', xml: 'XML', lua: 'Lua', ruby: 'Ruby', swift: 'Swift', vue: 'Vue',
  svelte: 'Svelte', dart: 'Dart', toml: 'TOML', ini: 'INI', markdown: 'Markdown', glsl: 'GLSL', text: 'Texte brut',
};

/** Langage Shiki d'un fichier, d'après sa colonne `extension` puis son nom. */
export function languageOf(ext: string, name: string): string {
  return BY_EXT[ext.toLowerCase()] ?? BY_EXT[nameExtension(name)] ?? 'text';
}

let highlighter: Promise<HighlighterCore> | null = null;

function getHighlighter(): Promise<HighlighterCore> {
  highlighter ??= (async () => {
    const [{ createHighlighterCore }, { createJavaScriptRegexEngine }, theme] = await Promise.all([
      import('shiki/core'),
      import('shiki/engine/javascript'),
      import('shiki/themes/dark-plus.mjs'),
    ]);
    return createHighlighterCore({ themes: [theme.default], langs: [], engine: createJavaScriptRegexEngine() });
  })();
  return highlighter;
}

const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Au-delà, on affiche sans coloration (rester fluide). */
const MAX_HIGHLIGHT = 300_000;

/**
 * Code → HTML coloré (thème VS Code Dark+). Chaque ligne est un `<span class="line">`
 * (les numéros sont ajoutés en CSS). Le contenu est échappé par Shiki.
 */
export async function highlight(code: string, lang: string): Promise<string> {
  const plain = () =>
    `<pre class="shiki dark-plus"><code>${code
      .split('\n')
      .map((l) => `<span class="line">${escapeHtml(l)}</span>`)
      .join('\n')}</code></pre>`;
  const loader = LOADERS[lang];
  if (!loader || code.length > MAX_HIGHLIGHT) return plain();
  try {
    const hl = await getHighlighter();
    if (!hl.getLoadedLanguages().includes(lang)) await hl.loadLanguage((await loader()).default);
    return hl.codeToHtml(code, { lang, theme: 'dark-plus' });
  } catch (err) {
    console.warn('Coloration impossible, affichage brut.', err);
    return plain();
  }
}
