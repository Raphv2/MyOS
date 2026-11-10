import { describe, expect, it } from 'vitest';
import { scanProject } from '../src/apps/project-scan';
import { toWebGL2 } from '../src/apps/shader';
import { languageOf } from '../src/apps/highlight';
import { VirtualFS } from '../src/core/fs';
import { formatClock } from '../src/os/ui';

describe('toWebGL2 (shaders GLSL desktop → WebGL2)', () => {
  it('remplace #version et retire les suffixes f', () => {
    const out = toWebGL2('#version 330 core\nfloat a = 2.5f;\nfloat b = .5f;\nfloat c = 1.0e3f;\nint f = 3;');
    expect(out.startsWith('#version 300 es\nprecision highp float;')).toBe(true);
    expect(out).toContain('float a = 2.5;');
    expect(out).toContain('float b = .5;');
    expect(out).toContain('float c = 1.0e3;');
    expect(out).toContain('int f = 3;');
    expect(out.match(/#version/g)).toHaveLength(1);
  });
});

describe('languageOf', () => {
  it('se base sur la colonne extension puis le nom', () => {
    expect(languageOf('ts', 'a.ts')).toBe('typescript');
    expect(languageOf('glsl', 'x.glsl')).toBe('glsl');
    expect(languageOf('', 'style.scss')).toBe('scss');
    expect(languageOf('xyz', 'notes')).toBe('text');
  });
});

describe('formatClock (barre du haut)', () => {
  it('reprend le format de l’ancien site', () => {
    const d = new Date(2026, 10, 10, 11, 23);
    expect(formatClock(d, false)).toBe('10 nove 2026 11:23');
    expect(formatClock(d, true)).toBe('11:23');
  });
});

describe('scanProject', () => {
  const file = (id: number, name: string, extension: string, folder_id: number) => ({
    id, name, extension, folder_id, size: 0, created_at: null, updated_at: null, type: 'file', path: `img/x/${name}`,
  });
  const fs = new VirtualFS({
    folders: [
      { id: 1, name: 'C:', parent_id: null },
      { id: 2, name: 'Projet', parent_id: 1 },
      { id: 3, name: 'src', parent_id: 2 },
    ],
    files: [
      file(1, 'logo.png', 'png', 2),
      file(2, 'README.md', 'md', 2),
      file(3, 'capture.png', 'png', 2),
      file(4, 'pitch.pdf', 'pdf', 2),
      file(5, 'demo.mp4', 'mp4', 2),
      file(6, 'main.ts', 'ts', 3),
    ],
  });

  it('trouve logo, README, médias et code', () => {
    const p = scanProject(fs, fs.folder(2)!);
    expect(p.logo?.name).toBe('logo.png');
    expect(p.readme?.name).toBe('README.md');
    expect(p.images.map((f) => f.name)).toEqual(['capture.png']);
    expect(p.pdfs).toHaveLength(1);
    expect(p.videos).toHaveLength(1);
    expect(p.codeRoot?.name).toBe('src');
    expect(p.codeCount).toBe(1);
  });
});
