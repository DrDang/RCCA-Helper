import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = resolve(fileURLToPath(new URL('..', import.meta.url)));
const distDir = join(rootDir, 'dist');
const indexPath = join(distDir, 'index.html');
const outputPath = join(distDir, 'RCCA Helper.html');

const mimeTypes = new Map([
  ['.css', 'text/css'],
  ['.gif', 'image/gif'],
  ['.html', 'text/html'],
  ['.ico', 'image/x-icon'],
  ['.jpeg', 'image/jpeg'],
  ['.jpg', 'image/jpeg'],
  ['.js', 'application/javascript'],
  ['.json', 'application/json'],
  ['.map', 'application/json'],
  ['.mjs', 'application/javascript'],
  ['.png', 'image/png'],
  ['.svg', 'image/svg+xml'],
  ['.webp', 'image/webp'],
  ['.woff', 'font/woff'],
  ['.woff2', 'font/woff2'],
]);

function extensionOf(path) {
  const match = path.match(/\.[^.?#/]+(?=([?#].*)?$)/);
  return match ? match[0].toLowerCase() : '';
}

function readAsset(relativePath, baseDir) {
  const cleanPath = relativePath.split('#')[0].split('?')[0];
  const assetPath = resolve(baseDir, cleanPath);

  if (!assetPath.startsWith(distDir) || !existsSync(assetPath)) {
    throw new Error(`Could not inline asset: ${relativePath}`);
  }

  return {
    buffer: readFileSync(assetPath),
    mime: mimeTypes.get(extensionOf(cleanPath)) ?? 'application/octet-stream',
  };
}

function toDataUrl(relativePath, baseDir) {
  const asset = readAsset(relativePath, baseDir);
  return `data:${asset.mime};base64,${asset.buffer.toString('base64')}`;
}

function inlineCssUrls(css, cssPath) {
  const cssDir = dirname(cssPath);

  return css.replace(/url\((['"]?)(?!data:|https?:|#)([^'")]+)\1\)/g, (_match, _quote, assetPath) => {
    return `url("${toDataUrl(assetPath.trim(), cssDir)}")`;
  });
}

function escapeScript(script) {
  return script.replace(/<\/script/gi, '<\\/script');
}

function escapeStyle(style) {
  return style.replace(/<\/style/gi, '<\\/style');
}

if (!existsSync(indexPath)) {
  throw new Error('dist/index.html was not found. Run the Vite build first.');
}

let html = readFileSync(indexPath, 'utf8');

html = html.replace(
  /<link\s+rel="stylesheet"[^>]*href="([^"]+)"[^>]*>/g,
  (_match, href) => {
    const cssPath = resolve(distDir, href);
    const css = inlineCssUrls(readAsset(href, distDir).buffer.toString('utf8'), cssPath);
    return `<style>\n${escapeStyle(css)}\n</style>`;
  },
);

html = html.replace(
  /<script\s+type="module"[^>]*src="([^"]+)"[^>]*><\/script>/g,
  (_match, src) => {
    const js = readAsset(src, distDir).buffer.toString('utf8');
    return `<script type="module">\n${escapeScript(js)}\n</script>`;
  },
);

html = html.replace(
  '<head>',
  '<head>\n    <!-- Portable build: all app assets are inlined so this file can be opened directly. -->',
);

writeFileSync(outputPath, html, 'utf8');
console.log(`Portable HTML written to ${outputPath}`);
