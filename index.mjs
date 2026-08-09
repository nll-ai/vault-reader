// Library exports for programmatic use.
//   import { processVault } from 'vault-reader';
//   const { notes, manifest, byId } = await processVault('./my-vault');
export { processVault, walk, slugify, parseFrontmatter, deriveTitle, stripFrontmatterKeepBody } from './vault.mjs';
export { vaultLivePlugin } from './vite-plugin.mjs';
