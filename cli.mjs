#!/usr/bin/env node
// vault-reader CLI
// Usage:
//   vault-reader dev [vault-path] [--base /] [--port 5173]
//   vault-reader build [vault-path] [--out dist] [--base /]
//
// If vault-path is omitted, uses the current directory.
import { createServer, build } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdir, writeFile, rm } from 'node:fs/promises';
import { processVault } from './vault.mjs';
import { vaultLivePlugin } from './vite-plugin.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FRONTEND_DIR = resolve(__dirname, 'frontend');

function parseArgs(argv) {
  const [cmd, ...rest] = argv.slice(2);
  const opts = { base: '/', port: 5173, outDir: 'dist' };
  const positional = [];
  for (let i = 0; i < rest.length; i++) {
    if (rest[i] === '--base') opts.base = rest[++i];
    else if (rest[i] === '--port') opts.port = parseInt(rest[++i], 10);
    else if (rest[i] === '--out') opts.outDir = rest[++i];
    else if (rest[i] === '--help' || rest[i] === '-h') opts.help = true;
    else positional.push(rest[i]);
  }
  return { cmd, vaultPath: resolve(positional[0] || '.'), opts };
}

function pwaConfig(base) {
  return VitePWA({
    registerType: 'autoUpdate',
    includeAssets: ['favicon.svg', 'data/manifest.json'],
    manifest: {
      name: 'Vault Reader',
      short_name: 'Vault',
      description: 'Paginated reader for your Obsidian vault',
      display: 'standalone',
      orientation: 'portrait',
      background_color: '#ffffff',
      theme_color: '#ffffff',
      start_url: base,
      scope: base,
      icons: [
        { src: `${base}icon-192.png`, sizes: '192x192', type: 'image/png' },
        { src: `${base}icon-512.png`, sizes: '512x512', type: 'image/png' },
        { src: `${base}icon-512-maskable.png`, sizes: '512x512', type: 'image/png', purpose: 'maskable' }
      ]
    },
    workbox: {
      globPatterns: ['**/*.{js,css,html,ico,svg,png,woff2}'],
      maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
      navigateFallback: `${base}index.html`,
      runtimeCaching: [
        {
          urlPattern: /\/data\/notes\/.+\.json$/,
          handler: 'StaleWhileRevalidate',
          options: { cacheName: 'vault-notes' }
        },
        {
          urlPattern: /\/data\/manifest\.json$/,
          handler: 'StaleWhileRevalidate',
          options: { cacheName: 'vault-manifest' }
        }
      ]
    }
  });
}

async function dev(vaultPath, opts) {
  console.log(`Starting vault-reader (dev) for: ${vaultPath}`);
  const server = await createServer({
    root: FRONTEND_DIR,
    base: opts.base,
    configFile: false,
    server: { host: true, port: opts.port, allowedHosts: true },
    plugins: [
      vaultLivePlugin(vaultPath),
      pwaConfig(opts.base)
    ],
    logLevel: 'info'
  });
  await server.listen();
  server.printUrls();
  server.bindCLIShortcuts?.({ print: true });
}

async function buildCmd(vaultPath, opts) {
  console.log(`Building vault-reader for: ${vaultPath}`);
  const { notes, manifest } = await processVault(vaultPath);

  const dataDir = resolve(FRONTEND_DIR, 'public', 'data');
  await rm(dataDir, { recursive: true, force: true });
  await mkdir(resolve(dataDir, 'notes'), { recursive: true });
  await writeFile(resolve(dataDir, 'manifest.json'), JSON.stringify(manifest));
  for (const n of notes) {
    await writeFile(
      resolve(dataDir, 'notes', `${n.id}.json`),
      JSON.stringify({ id: n.id, title: n.title, markdown: n.markdown })
    );
  }
  const totalLinks = manifest.reduce((a, n) => a + n.links.length, 0);
  console.log(`Processed ${notes.length} notes, ${totalLinks} resolved links.`);

  await build({
    root: FRONTEND_DIR,
    base: opts.base,
    configFile: false,
    build: { outDir: opts.outDir },
    plugins: [pwaConfig(opts.base)],
    logLevel: 'info'
  });
  console.log(`Build complete: ${opts.outDir}`);
}

// --- main ---
const { cmd, vaultPath, opts } = parseArgs(process.argv);

if (!cmd || cmd === '--help' || cmd === '-h' || opts.help) {
  console.log(`
vault-reader - paginated EPUB-style reader for Obsidian vaults

Usage:
  vault-reader dev [vault-path]     Start live dev server
  vault-reader build [vault-path]   Static build for production/PWA

Options:
  --base <path>    Base path (default: /). Use /vault/ for sub-path hosting.
  --port <n>       Dev server port (default: 5173)
  --out <dir>      Build output directory (default: dist)
`);
} else if (cmd === 'dev') {
  await dev(vaultPath, opts);
} else if (cmd === 'build') {
  await buildCmd(vaultPath, opts);
} else {
  console.error(`Unknown command: ${cmd}. Use 'dev' or 'build'.`);
  process.exit(1);
}
