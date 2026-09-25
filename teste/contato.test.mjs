// Testes da linha de contato. Rodar com:  node --test
//
// O contato é só mailto: quem envia é o programa de e-mail da pessoa, não a
// página. O mailto pode levar um assunto fixo, mas nunca body= — nada do que
// a pessoa digitou nem do resultado pode ir junto. E as linhas de contato não
// saem na impressão: o que se imprime é o documento da pessoa, não do projeto.

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ler = (arquivo) => fs.readFileSync(path.join(RAIZ, arquivo), 'utf8');

const HTML = ler('index.html');
const SCRIPT = ler('calculadora.js');
const CSS = ler('calculadora.css');

const mailtos = (texto) => texto.match(/mailto:[^"'`\s>]*/g) ?? [];

test('o rodapé e o resultado têm o mailto do contato', () => {
  assert.ok(HTML.includes('mailto:contato@souproximo.org'), 'index.html sem mailto:contato@souproximo.org');
  assert.ok(SCRIPT.includes('mailto:contato@souproximo.org'), 'calculadora.js sem mailto:contato@souproximo.org');
});

test('nenhum mailto leva corpo de mensagem', () => {
  for (const [arquivo, texto] of [['index.html', HTML], ['calculadora.js', SCRIPT]]) {
    for (const m of mailtos(texto)) {
      assert.doesNotMatch(m, /[?&]body=/i, `${arquivo}: ${m}`);
    }
  }
});

test('as linhas de contato não saem na impressão', () => {
  const inicio = CSS.indexOf('@media print');
  assert.ok(inicio >= 0, 'calculadora.css sem @media print');
  const impressao = CSS.slice(inicio);
  assert.match(impressao, /\.contato\b[^{]*\{\s*display:\s*none/, '.contato não está escondido na impressão');
});
