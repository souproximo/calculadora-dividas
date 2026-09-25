// Testes do formulário em index.html. Rodar com:  node --test
//
// A conta é feita pelo calculadora.js e o formulário nunca é enviado. Se o
// script não carregar, o navegador envia o formulário sozinho, por GET, para
// a mesma página — e o que tiver "name" vai para a URL (/?renda=3000...),
// que chega ao servidor e fica no histórico. Estes testes garantem que isso
// não tem como acontecer.

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const HTML = fs.readFileSync(path.join(RAIZ, 'index.html'), 'utf8')
  .replace(/<!--[\s\S]*?-->/g, '');
const JS = fs.readFileSync(path.join(RAIZ, 'calculadora.js'), 'utf8');

const tags = (nome) => HTML.match(new RegExp(`<${nome}\\b[^>]*>`, 'gi')) ?? [];

test('nenhum campo tem name, nem os do formulário nem os dos modelos de linha', () => {
  const campos = [...tags('input'), ...tags('select'), ...tags('textarea'), ...tags('button')];
  assert.ok(campos.length > 0);
  for (const c of campos) {
    assert.doesNotMatch(c, /\sname\s*=/i, `campo com name: ${c}`);
  }
});

test('o formulário não tem action, method nem onsubmit', () => {
  const forms = tags('form');
  assert.equal(forms.length, 1);
  assert.doesNotMatch(forms[0], /\s(action|method|onsubmit|target)\s*=/i);
  assert.doesNotMatch(HTML, /\sform(action|method|target)\s*=/i, 'botão não pode redirecionar o envio');
});

test('o único botão de enviar nasce desabilitado', () => {
  const botoes = tags('button');
  const enviar = botoes.filter((b) => !/type\s*=\s*"(button|reset)"/i.test(b));
  assert.equal(enviar.length, 1, 'todo botão que não envia precisa de type="button"');
  assert.match(enviar[0], /\sid="fazer-conta"/);
  assert.match(enviar[0], /\sdisabled(\s|>|=)/);
  assert.equal(tags('input').filter((i) => /type\s*=\s*"(submit|image)"/i.test(i)).length, 0);
});

test('o script liga o botão só depois de assumir o envio', () => {
  const assume = JS.indexOf("$('#formulario').addEventListener('submit', calcular)");
  const liga = JS.indexOf("$('#fazer-conta').disabled = false");
  assert.ok(assume >= 0 && liga >= 0);
  assert.ok(assume < liga);
  assert.match(JS, /function calcular\(evento\) \{\s*evento\.preventDefault\(\);/);
});
