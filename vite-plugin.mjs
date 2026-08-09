// Vite dev plugin: serves vault content LIVE from disk so edits in Obsidian
// appear in the reader immediately (auto page-reload). Production builds use
// the static files from build-vault.mjs instead; this plugin is dev-only.
import { watch } from 'node:fs';
import { basename } from 'node:path';
import { processVault } from './vault.mjs';

export function vaultLivePlugin(vaultRoot) {
  let state = null;
  let pending = null;

  async function refresh() {
    state = await processVault(vaultRoot);
  }

  return {
    name: 'vault-live',
    configureServer(server) {
      // Initial load.
      refresh().then(() => {
        console.log(`  [vault-live] ${state.manifest.length} notes loaded from ${vaultRoot}`);
      });

      // Serve manifest + notes from memory, bypassing static public/ files.
      // Matching is suffix-based so it works regardless of Vite's base path.
      server.middlewares.use(async (req, res, next) => {
        const url = req.url || '';
        if (url.endsWith('/data/manifest.json') || url.includes('/data/manifest.json?')) {
          if (!state) await refresh();
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(state.manifest));
          return;
        }
        const m = url.match(/\/data\/notes\/([^?]+)\.json/);
        if (m) {
          if (!state) await refresh();
          const id = decodeURIComponent(m[1]);
          const note = state.byId.get(id);
          if (note) {
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ id: note.id, title: note.title, markdown: note.markdown }));
            return;
          }
          res.statusCode = 404;
          res.end('{}');
          return;
        }
        next();
      });

      // Watch the vault for .md changes and auto-reload the reader.
      // macOS fs.watch recursive uses FSEvents (efficient).
      let debounce;
      try {
        watch(vaultRoot, { recursive: true }, (event, filename) => {
          if (!filename || !filename.toLowerCase().endsWith('.md')) return;
          // Ignore changes inside excluded/tooling dirs.
          if (filename.includes('vault-reader/') || filename.startsWith('.')) return;
          clearTimeout(debounce);
          debounce = setTimeout(async () => {
            try {
              await refresh();
              const name = basename(filename);
              console.log(`  [vault-live] reloaded after change: ${name}`);
              server.ws.send({ type: 'full-reload' });
            } catch (e) {
              console.error('  [vault-live] reload failed:', e.message);
            }
          }, 400);
        });
      } catch (e) {
        console.warn('  [vault-live] fs.watch failed, live reload disabled:', e.message);
      }
    }
  };
}
