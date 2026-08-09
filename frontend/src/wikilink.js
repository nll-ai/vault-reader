// markdown-it plugin: renders Obsidian [[wikilinks]] as clickable anchors.
//   [[Target]]            -> <a class="wikilink" data-target="target">Target</a>
//   [[Target|Alias]]      -> <a class="wikilink" data-target="target">Alias</a>
//   [[Target#Heading]]    -> <a class="wikilink" data-target="target">Heading</a>
//   [[Target#Heading|A]]  -> <a class="wikilink" data-target="target">A</a>
//
// Resolution (whether the target exists) happens at render time using the
// manifest, so broken links get a distinct style.

function slugBasename(name) {
  return name.toLowerCase().replace(/\.md$/, '').trim();
}

export function wikilinkPlugin(md, opts = {}) {
  const resolve = opts.resolve || (() => true); // resolve(targetBasename) -> id|null

  md.inline.ruler.before('emphasis', 'obsidian_wikilink', (state, silent) => {
    const src = state.src.slice(state.pos);
    if (!src.startsWith('[[')) return false;
    const end = src.indexOf(']]');
    if (end === -1) return false;
    const inner = src.slice(2, end);
    if (inner.includes('\n')) return false;

    if (!silent) {
      let target = inner, alias = null, heading = null;
      if (inner.includes('|')) { [target, alias] = inner.split('|'); }
      if (target.includes('#')) {
        const [t, h] = target.split('#');
        target = t; heading = h || null;
      }
      target = target.trim();
      const label = alias || heading || target;
      const targetId = resolve(slugBasename(target));

      const token = state.push('html_inline', '', 0);
      const cls = targetId ? 'wikilink' : 'wikilink wikilink-broken';
      const href = targetId ? `#/note/${targetId}` : '#';
      const safeTarget = md.utils.escapeHtml(targetId || target);
      token.content = `<a class="${cls}" data-target="${safeTarget}" href="${href}">${md.utils.escapeHtml(label)}</a>`;
    }
    state.pos += end + 2;
    return true;
  });
}
