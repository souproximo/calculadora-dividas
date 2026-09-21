// Testes do Worker que serve a página em /dividas. Rodar com:  node --test
//
// O binding ASSETS da Cloudflare é simulado aqui com o disco. O que estes
// testes cobrem é o que nós escrevemos: o corte do prefixo /dividas e os
// cabeçalhos de segurança. A entrega do arquivo em si é da Cloudflare.

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import worker from '../src/worker.js';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const TIPOS = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
};

/** Imita o binding ASSETS: procura o arquivo, usa index.html em diretório. */
const ASSETS = {
  async fetch(pedido) {
    const p = decodeURIComponent(new URL(pedido.url).pathname);
    let arquivo = path.join(RAIZ, p);
    if (p.endsWith('/')) arquivo = path.join(arquivo, 'index.html');
    if (!fs.existsSync(arquivo) || fs.statSync(arquivo).isDirectory()) {
      return new Response('não encontrado', { status: 404 });
    }
    return new Response(fs.readFileSync(arquivo), {
      headers: {
        'content-type': TIPOS[path.extname(arquivo)] ?? 'application/octet-stream',
      },
    });
  },
};

const chamar = (url, init) => worker.fetch(new Request(url, init), { ASSETS });

/* ------------------------------------------------------------------ */

test('/dividas sem barra redireciona para /dividas/', async () => {
  const r = await chamar('https://souproximo.org/dividas');
  assert.equal(r.status, 301);
  assert.equal(r.headers.get('location'), 'https://souproximo.org/dividas/');
});

test('/dividas/ serve a página', async () => {
  const r = await chamar('https://souproximo.org/dividas/');
  assert.equal(r.status, 200);
  assert.ok((await r.text()).includes('Calculadora de dívidas'));
});

test('os caminhos relativos resolvem debaixo do prefixo', async () => {
  const casos = [
    ['/dividas/calculadora.css', '--paper'],
    ['/dividas/calculadora.js', 'import'],
    ['/dividas/calculo.js', 'MINIMO_EXISTENCIAL'],
    ['/dividas/favicon.svg', '<svg'],
  ];
  for (const [caminho, trecho] of casos) {
    const r = await chamar('https://souproximo.org' + caminho);
    assert.equal(r.status, 200, `${caminho} devolveu ${r.status}`);
    assert.ok((await r.text()).includes(trecho), `${caminho} veio com outro conteúdo`);
  }
});

test('toda resposta sai com os cabeçalhos de segurança', async () => {
  const r = await chamar('https://souproximo.org/dividas/');
  const csp = r.headers.get('content-security-policy') ?? '';

  assert.ok(csp.startsWith("default-src 'none'"), 'a CSP precisa começar fechada');
  assert.ok(csp.includes("connect-src 'none'"), 'nada pode sair da página');
  assert.ok(csp.includes("form-action 'none'"), 'nenhum formulário pode ser enviado');
  assert.ok(csp.includes("frame-ancestors 'none'"));

  assert.match(r.headers.get('strict-transport-security'), /max-age=\d+/);
  assert.equal(r.headers.get('referrer-policy'), 'no-referrer');
  assert.equal(r.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(r.headers.get('x-frame-options'), 'DENY');
});

test('a página não é cacheada, a fonte é cacheada por um ano', async () => {
  const pagina = await chamar('https://souproximo.org/dividas/');
  assert.equal(pagina.headers.get('cache-control'), 'public, max-age=0, must-revalidate');

  const fonte = await chamar(
    'https://souproximo.org/dividas/fonts/spectral-latin-400-normal.woff2',
  );
  assert.equal(fonte.status, 200);
  assert.equal(fonte.headers.get('cache-control'), 'public, max-age=31536000, immutable');
});

test('caminho que não existe devolve 404', async () => {
  const r = await chamar('https://souproximo.org/dividas/nao-existe');
  assert.equal(r.status, 404);
});

test('só GET e HEAD são aceitos', async () => {
  const r = await chamar('https://souproximo.org/dividas/', { method: 'POST' });
  assert.equal(r.status, 405);
  assert.equal(r.headers.get('allow'), 'GET, HEAD');
});

test('funciona também servida na raiz, sem o prefixo', async () => {
  // É assim que a página roda no `npx wrangler dev`.
  const r = await chamar('http://localhost:8787/');
  assert.equal(r.status, 200);
  assert.ok((await r.text()).includes('Calculadora de dívidas'));
});
