import prodData from '../public/data.json';
import { describe, expect, it } from 'vitest';
import { appKindOf, baseName, resolveUrl, VirtualFS } from '../src/core/fs';
import type { TreeData } from '../src/types';

/** Les vraies données de prod (instantané data.json). */
const prod = prodData as unknown as TreeData;
const fs = new VirtualFS(prod);

describe('VirtualFS (données de prod)', () => {
  it('charge toutes les lignes', () => {
    expect(fs.folders.size).toBe(prod.folders.length);
    expect(fs.files.size).toBe(prod.files.length);
  });

  it('reconstruit les chemins comme l’ancienne barre d’adresse', () => {
    expect(fs.pathOf(fs.folder(11)!)).toBe('C:/Users/Raphaël Gosset/Documents/model_3D');
    expect(fs.pathOf(fs.folder(47)!)).toBe('C:/Users/Raphaël Gosset/Images/assets/MoLeCuLe_app');
  });

  it('le bureau contient les mêmes éléments qu’avant (dossier 8)', () => {
    expect(fs.filesIn(8).map((f) => f.name)).toEqual([
      'model_3D',
      'illustrations',
      'assets',
      'dev',
      'Github.exe',
      'Linkedin.exe',
      'RG_cv.pdf',
    ]);
  });

  it('les raccourcis du bureau pointent vers le bon dossier', () => {
    const shortcut = fs.filesIn(8).find((f) => f.name === 'model_3D')!;
    expect(shortcut.app).toBe('shortcut');
    expect(fs.targetFolder(shortcut)?.id).toBe(11);
  });

  it('isInside détecte les descendants (anti-boucle pour « déplacer »)', () => {
    expect(fs.isInside(47, 6)).toBe(true);
    expect(fs.isInside(6, 47)).toBe(false);
  });

  it('normalise les nombres envoyés en chaînes par PDO', () => {
    const v = new VirtualFS({
      folders: [{ id: '1' as unknown as number, name: 'C:', parent_id: null }],
      files: [{ id: '5' as unknown as number, name: 'a.png', extension: 'png', folder_id: '1' as unknown as number, size: 0, created_at: null, updated_at: null, type: 'file', path: null }],
    });
    expect(v.filesIn(1)[0]?.id).toBe(5);
  });
});

describe('resolveUrl', () => {
  it('utilise la colonne path de prod', () => {
    expect(resolveUrl({ name: 'Blob.blend', extension: 'blend', path: 'domains/raphaelgosset.fr/public_html/img/3d/Blob.glb' })).toBe('/img/3d/Blob.glb');
  });
  it('encode les espaces (« test - Copie.png » cassait l’ancien site)', () => {
    expect(resolveUrl({ name: 'test - Copie.png', extension: 'png', path: 'domains/raphaelgosset.fr/public_html/img/illustrations/test - Copie.png' })).toBe(
      '/img/illustrations/test%20-%20Copie.png',
    );
  });
  it('retombe sur les anciennes conventions si path est vide', () => {
    expect(resolveUrl({ name: 'kernel_log.txt', extension: 'txt', path: null })).toBe('/img/txt/kernel_log.txt');
  });
  it('garde les liens externes', () => {
    expect(resolveUrl({ name: 'Site.exe', extension: 'link', path: 'https://example.com' })).toBe('https://example.com');
  });
});

describe('appKindOf', () => {
  it.each([
    ['RG_cv.pdf', 'pdf', 'pdf'],
    ['Blob.blend', 'blend', 'model3d'],
    ['Github.exe', 'github', 'link'],
    ['model_3D', 'shortcut', 'shortcut'],
    ['demo.mp4', 'mp4', 'video'],
    ['main.ts', 'ts', 'code'],
    ['clouds.frag', 'frag', 'shader'],
    ['README.md', 'md', 'markdown'],
    ['MoLeCuLe', 'project', 'project'],
  ])('%s → %s', (name, extension, kind) => {
    expect(appKindOf({ name, extension })).toBe(kind);
  });

  it('baseName', () => {
    expect(baseName('RG_cv.pdf')).toBe('RG_cv');
    expect(baseName('model_3D')).toBe('model_3D');
  });
});
