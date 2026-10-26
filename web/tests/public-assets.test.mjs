import assert from 'node:assert/strict'
import { readFile, stat } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'

const dist = new URL('../dist/', import.meta.url)
const origin = 'https://jobs.example'

test('built HTML and linked manifests reference existing local assets', async () => {
  const html = await readFile(new URL('index.html', dist), 'utf8')
  const manifests = []
  const missing = []
  async function check(reference, base = origin) {
    const url = new URL(reference, base)
    if (url.origin !== origin) return
    const asset = new URL(`.${decodeURIComponent(url.pathname)}`, dist)
    assert.ok(fileURLToPath(asset).startsWith(fileURLToPath(dist)), `Asset escapes build: ${reference}`)
    if (!(await stat(asset).catch(() => null))?.isFile()) missing.push(url.pathname)
    return asset
  }

  for (const [tag] of html.matchAll(/<(?:link|script|img)\b[^>]*>/gi)) {
    const attrs = Object.fromEntries([...tag.matchAll(/([\w-]+)\s*=\s*["']([^"']*)["']/g)].map(([, name, value]) => [name.toLowerCase(), value]))
    const reference = attrs.src ?? attrs.href
    if (!reference || /\b(?:preconnect|dns-prefetch|canonical|alternate)\b/.test(attrs.rel ?? '')) continue
    const asset = await check(reference)
    if (asset && attrs.rel?.split(/\s+/).includes('manifest')) manifests.push({ asset, reference })
  }

  for (const { asset, reference } of manifests) {
    const manifest = JSON.parse(await readFile(asset, 'utf8'))
    const base = new URL(reference, origin)
    for (const image of [...(manifest.icons ?? []), ...(manifest.screenshots ?? []), ...(manifest.shortcuts ?? []).flatMap(shortcut => shortcut.icons ?? [])]) {
      await check(image.src, base)
    }
  }
  assert.deepEqual(missing, [], `Missing built assets: ${missing.join(', ')}`)
  assert.equal(manifests.length, 1, 'Publish exactly one local manifest')
})

test('release metadata and template share images are published', async () => {
  const release = JSON.parse(await readFile(new URL('release.json', dist), 'utf8'))
  assert.equal(release.commit, process.env.VITE_COMMIT_SHA || 'local')
  const html = await readFile(new URL('index.html', dist), 'utf8')
  for (const property of ['og:image', 'twitter:image']) {
    assert.match(html, new RegExp(`(?:property|name)="${property}" content="https://jobs.proappstore.online/og-image.png"`))
  }
  const image = await readFile(new URL('og-image.png', dist))
  assert.equal(image.subarray(1, 4).toString(), 'PNG')
  const manifest = JSON.parse(await readFile(new URL('manifest.webmanifest', dist), 'utf8'))
  assert.ok(manifest.icons.some(icon => icon.purpose.includes('maskable') && icon.sizes === '512x512'))
})
