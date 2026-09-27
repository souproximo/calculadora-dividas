// Testes da caixa "Antes de seguir esta ordem" e do selo "Em teste".
// Rodar com:  node --test
//
// A caixa vai logo acima da tabela da ordem de pagamento e precisa sair
// também no papel: é o que a pessoa leva ao Procon ou ao credor. O selo fica
// perto do título, só na tela, com o mesmo mailto de assunto fixo do rodapé.

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ler = (arquivo) => fs.readFileSync(path.join(RAIZ, arquivo), 'utf8');

const HTML = ler('index.html').replace(/<!--[\s\S]*?-->/g, '');
const SCRIPT = ler('calculadora.js');
const CSS = ler('calculadora.css');

const CAIXA = [
  'Antes de seguir esta ordem',
  'Esta ordem olha só os juros. Ela não sabe o que acontece se você atrasar uma conta.',
  'Se atrasar pode tirar alguma coisa de você (a moto ou o carro que você usa para trabalhar, a casa, a luz, a água) ou se for pensão, pague essa em dia primeiro, mesmo que os juros sejam menores.',
  'Esta parte da página ainda está sendo conferida por quem atende gente endividada.',
];

const SELO = 'Em teste. Se algo parecer errado, escreva para contato@souproximo.org.';
const MAILTO = 'mailto:contato@souproximo.org?subject=Calculadora%20de%20d%C3%ADvidas';

/** Seletores de todas as regras de impressão com display: none. */
function escondidosNaImpressao() {
  const inicio = CSS.indexOf('@media print');
  assert.ok(inicio >= 0, 'calculadora.css sem @media print');
  const impressao = CSS.slice(inicio).replace(/\/\*[\s\S]*?\*\//g, '');
  const regras = [...impressao.matchAll(/([^{}]+)\{([^}]*)\}/g)];
  return regras
    .filter(([, , corpo]) => /display:\s*none/.test(corpo))
    .flatMap(([, seletores]) => seletores.split(',').map((s) => s.trim()));
}

test('a caixa tem o texto combinado, palavra por palavra, montado com textContent', () => {
  const inicio = SCRIPT.indexOf('function antesDaOrdem()');
  assert.ok(inicio >= 0, 'calculadora.js sem antesDaOrdem()');
  const corpo = SCRIPT.slice(inicio, SCRIPT.indexOf('\n}\n', inicio));
  for (const trecho of CAIXA) {
    assert.ok(corpo.includes(`'${trecho}'`), `falta na caixa: ${trecho}`);
  }
  assert.doesNotMatch(corpo, /innerHTML/);
  assert.match(corpo, /el\('div', 'ressalva antes-da-ordem'\)/, 'a caixa usa o estilo de ressalva, não o de alarme');
});

test('a caixa entra no resultado logo acima da tabela da ordem', () => {
  const ordem = SCRIPT.indexOf('/* ---------- ordem de pagamento ---------- */');
  const plano = SCRIPT.indexOf('/* ---------- plano ---------- */');
  assert.ok(ordem >= 0 && plano > ordem);
  const bloco = SCRIPT.slice(ordem, plano);
  const caixa = bloco.indexOf('saida.append(antesDaOrdem())');
  const tabela = bloco.indexOf('saida.append(tabelaOrdem(');
  assert.ok(caixa >= 0, 'a caixa não é posta no resultado');
  assert.ok(caixa < tabela, 'a caixa precisa vir antes da tabela');
  assert.doesNotMatch(bloco.slice(caixa + 'saida.append(antesDaOrdem())'.length, tabela), /saida\.append\(/, 'nada entre a caixa e a tabela');
});

test('a caixa sai na impressão e não é cortada entre páginas', () => {
  const escondidos = escondidosNaImpressao();
  assert.ok(escondidos.length > 0);
  for (const s of escondidos) {
    assert.doesNotMatch(s, /\.(ressalva|antes-da-ordem)\b/, `a caixa some na impressão por causa de "${s}"`);
    assert.doesNotMatch(s, /^#resultado$/, 'o resultado inteiro some na impressão');
  }
  const impressao = CSS.slice(CSS.indexOf('@media print'));
  assert.match(impressao, /\.ressalva\b[^{]*\{\s*break-inside:\s*avoid/, '.ressalva sem break-inside: avoid');
});

test('o selo "Em teste" aparece na tela, perto do título', () => {
  const titulo = HTML.indexOf('<h1 class="titulo">');
  const tese = HTML.indexOf('<p class="tese">');
  const selo = HTML.indexOf('<p class="em-teste');
  assert.ok(titulo >= 0 && selo > titulo && selo < tese, 'o selo precisa vir logo depois do título');

  const tag = HTML.slice(selo, HTML.indexOf('</p>', selo) + 4);
  const texto = tag.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
  assert.equal(texto, SELO);
  assert.ok(tag.includes(`href="${MAILTO}"`), 'o e-mail do selo precisa ser o mailto de assunto fixo');

  const telaCSS = CSS.slice(0, CSS.indexOf('@media print'));
  assert.doesNotMatch(telaCSS, /\.em-teste\b[^{]*\{[^}]*display:\s*none/, 'o selo está escondido na tela');
});

test('o selo não sai na impressão', () => {
  const tag = HTML.slice(HTML.indexOf('<p class="em-teste'));
  assert.match(tag, /^<p class="[^"]*\bcontato\b/, 'o selo precisa da classe contato');
  assert.ok(escondidosNaImpressao().includes('.contato'), '.contato não está escondido na impressão');
});
