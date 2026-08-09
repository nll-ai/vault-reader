// Shared vault-processing logic used by both the static build (build-vault.mjs)
// and the live dev plugin (vite-plugin-vault.mjs). Pure functions + processVault().
import { readFile } from 'node:fs/promises';
import { readdirSync } from 'node:fs';
import { dirname, basename, extname, relative, join } from 'node:path';

const EXCLUDE_DIRS = new Set([
  '.obsidian', '.git', '.trash', 'node_modules',
  '.opencode', '.agents', 'vault-reader', '.attach', 'dist', 'dev-dist',
  'scratch', '__restapi_test'
]);
const EXCLUDE_NAME_PARTS = ['vault-reader'];
const WIKILINK_RE = /\[\[([^\]\n]+?)\]\]/g;

export function walk(dir) {
  const out = [];
  let entries;
  try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return out; }
  for (const e of entries) {
    if (e.isDirectory()) {
      if (e.name.startsWith('.')) continue;
      if (EXCLUDE_DIRS.has(e.name)) continue;
      if (EXCLUDE_NAME_PARTS.some(p => e.name.includes(p))) continue;
      out.push(...walk(join(dir, e.name)));
    } else if (e.isFile() && extname(e.name).toLowerCase() === '.md') {
      out.push(join(dir, e.name));
    }
  }
  return out;
}

export function slugify(name) {
  return name
    .replace(/\.md$/i, '')
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80) || 'untitled';
}

export function parseFrontmatter(text) {
  if (!text.startsWith('---')) return { fm: {}, body: text };
  const end = text.indexOf('\n---', 3);
  if (end === -1) return { fm: {}, body: text };
  const block = text.slice(3, end);
  const body = text.slice(end + 4).replace(/^\n/, '');
  const fm = {};
  let curKey = null;
  for (const line of block.split('\n')) {
    const m = line.match(/^(\w[\w-]*)\s*:\s*(.*)$/);
    if (m) {
      let val = m[2].trim();
      if (val === '') {
        curKey = m[1];
        fm[m[1]] = [];
      } else {
        if (val.startsWith('[') && val.endsWith(']')) {
          val = val.slice(1, -1).split(',').map(s => s.trim().replace(/^["']|["']$/g, '')).filter(Boolean);
        } else {
          val = val.replace(/^["']|["']$/g, '');
        }
        fm[m[1]] = val;
        curKey = null;
      }
    } else {
      const item = line.match(/^\s+-\s+(.+)$/);
      if (item && curKey) {
        if (!Array.isArray(fm[curKey])) fm[curKey] = [];
        fm[curKey].push(item[1].trim().replace(/^["']|["']$/g, ''));
      }
    }
  }
  return { fm, body };
}

export function extractTags(text, fm) {
  const tags = new Set();
  if (Array.isArray(fm.tags)) fm.tags.forEach(t => tags.add(t.replace(/^#/, '')));
  else if (typeof fm.tags === 'string') fm.tags.split(/\s+/).forEach(t => t && tags.add(t.replace(/^#/, '')));
  for (const m of text.matchAll(/(^|\s)#([a-z][\w/-]*)/gi)) tags.add(m[2].toLowerCase());
  return [...tags];
}

export function extractWikilinks(text) {
  const links = [];
  for (const m of text.matchAll(WIKILINK_RE)) {
    const inner = m[1];
    let target = inner;
    if (inner.includes('|')) target = inner.split('|')[0];
    if (target.includes('#')) target = target.split('#')[0];
    target = target.trim();
    if (target) links.push(target);
  }
  return links;
}

export function deriveTitle(fm, body, filename) {
  const t = fm.title;
  if (typeof t === 'string' && t.trim()) return t.trim();
  if (typeof t === 'number' && !isNaN(t)) return String(t);
  const h1 = body.match(/^#\s+(.+)$/m);
  if (h1) return h1[1].trim();
  return filename.replace(/\.md$/i, '');
}

export function stripFrontmatterKeepBody(text) {
  if (!text.startsWith('---')) return text;
  const end = text.indexOf('\n---', 3);
  if (end === -1) return text;
  return text.slice(end + 4).replace(/^\n/, '');
}

// Scan the vault, resolve wikilinks into a link graph, return everything the
// reader needs: the manifest array, a byId map, and the notes (with markdown).
export async function processVault(root) {
  const files = walk(root).sort();
  const notes = [];
  const byBasename = new Map();

  for (const abs of files) {
    let raw;
    try { raw = await readFile(abs, 'utf8'); } catch { continue; }
    const rel = relative(root, abs);
    const filename = basename(abs);
    const { fm, body } = parseFrontmatter(raw);
    const cleanBody = stripFrontmatterKeepBody(raw);
    const title = deriveTitle(fm, body, filename);
    const id = slugify(filename);
    const folder = dirname(rel) === '.' ? '' : dirname(rel);
    const tags = extractTags(body, fm);
    const rawLinks = extractWikilinks(body);
    const note = {
      id, name: filename.replace(/\.md$/i, ''), title, folder, tags, path: rel,
      rawLinks, markdown: cleanBody
    };
    notes.push(note);
    const bkey = filename.toLowerCase().replace(/\.md$/, '');
    if (!byBasename.has(bkey)) byBasename.set(bkey, note);
  }

  // Deduplicate ids.
  const seenIds = new Set();
  for (const n of notes) {
    let id = n.id, i = 2;
    while (seenIds.has(id)) id = `${n.id}-${i++}`;
    n.id = id;
    seenIds.add(id);
  }

  // Resolve wikilinks + build backlinks.
  const linkMap = new Map();
  for (const n of notes) {
    const resolved = new Set();
    for (const target of n.rawLinks) {
      const key = target.toLowerCase().replace(/\.md$/, '');
      const t = byBasename.get(key);
      if (t) resolved.add(t.id);
    }
    linkMap.set(n.id, resolved);
    delete n.rawLinks;
  }
  const backlinks = new Map();
  for (const n of notes) backlinks.set(n.id, new Set());
  for (const n of notes) {
    for (const targetId of linkMap.get(n.id)) {
      if (backlinks.has(targetId)) backlinks.get(targetId).add(n.id);
    }
  }

  const manifest = notes.map(n => ({
    id: n.id, name: n.name, title: n.title, folder: n.folder, tags: n.tags,
    links: [...linkMap.get(n.id)], backlinks: [...backlinks.get(n.id)]
  }));
  const byId = new Map(notes.map(n => [n.id, n]));
  return { notes, manifest, byId, byBasename };
}
