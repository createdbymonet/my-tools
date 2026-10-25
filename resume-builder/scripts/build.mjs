import { readFile, writeFile, rm, readdir } from 'node:fs/promises'
import { resolve, dirname, relative, isAbsolute } from 'node:path'
import { fileURLToPath } from 'node:url'
import { build, createServer } from 'vite'

const root = fileURLToPath(new URL('../', import.meta.url))
const output = resolve(root, 'dist')
const escapeHtml = (value) =>
  value.replace(
    /[&<>"']/g,
    (char) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      })[char],
  )

// A regular Vite multi-page build compiles the SFCs and CSS. Render the same
// Vue pages at build time, then embed the compiled CSS. No browser module
// loading, web server, single-file plugin, or Vue runtime is needed by exports.
await build({ root })
const server = await createServer({
  root,
  mode: 'production',
  appType: 'custom',
  server: { middlewareMode: true, watch: null, hmr: false, ws: false },
})

try {
  const { renderDocument } = await server.ssrLoadModule('/src/entry-server.ts')
  for (const kind of ['resume', 'cover-letter']) {
    const path = resolve(output, `${kind}.html`)
    let html = await readFile(path, 'utf8')
    const rendered = await renderDocument(kind)
    html = html.replace('<!--document-outlet-->', () => rendered.html)
    html = html.replace(
      /<title>.*?<\/title>/s,
      () => `<title>${escapeHtml(rendered.title)}</title>`,
    )

    const styles = [...html.matchAll(/<link\b[^>]*rel="stylesheet"[^>]*>/g)]
    for (const [tag] of styles) {
      const href = tag.match(/href="([^"]+)"/)?.[1]
      if (!href) throw new Error(`Missing stylesheet href in ${kind}.html`)
      const cssPath = resolve(dirname(path), href)
      const fromOutput = relative(output, cssPath)
      if (fromOutput.startsWith('..') || isAbsolute(fromOutput))
        throw new Error(`Stylesheet outside dist: ${href}`)
      const css = await readFile(cssPath, 'utf8')
      // Fail rather than silently emitting a standalone file with broken assets.
      if (/url\s*\(\s*(?!["']?data:)/i.test(css) || /<\/style/i.test(css)) {
        throw new Error('External CSS assets need embedding before export.')
      }
      html = html.replace(tag, () => `<style>${css}</style>`)
    }
    html = html
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, '')
      .replace(/<link\b[^>]*rel="modulepreload"[^>]*>/g, '')
    // The only production interaction is native browser printing.
    html = html.replace(
      '</body>',
      `<script>document.querySelector('[data-print-button]').addEventListener('click',function(){window.print()})</script>\n</body>`,
    )
    if (html.includes('<!--document-outlet-->') || /(?:src|href)="\.?\/?assets\//.test(html)) {
      throw new Error(`Incomplete standalone export: ${kind}.html`)
    }
    await writeFile(path, html)
    console.log(`Standalone HTML: dist/${kind}.html`)
  }

  // Only build-created assets inside the checked dist directory are removed.
  const assets = resolve(output, 'assets')
  if (dirname(assets) !== output) throw new Error('Unexpected build assets directory')
  await rm(assets, { recursive: true, force: true })
  const files = await readdir(output)
  if (files.length !== 2) throw new Error(`Unexpected export files: ${files.join(', ')}`)
} finally {
  await server.close()
}
