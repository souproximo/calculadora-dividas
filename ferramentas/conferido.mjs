// Atualiza a data de verificação da página em todos os lugares de uma vez.
//
//   node ferramentas/conferido.mjs              mostra a data de cada lugar
//   node ferramentas/conferido.mjs hoje         troca para a data de hoje
//   node ferramentas/conferido.mjs 2026-10-01   troca para a data dada
//
// A data diz a quem usa a página que alguém conferiu as informações. Rode só
// DEPOIS de conferir o que está na tabela "O que envelhece" do CLAUDE.md
// (mínimo existencial, passo a passo do Registrato, nível da conta gov.br,
// canais de ajuda). Trocar a data sem conferir é dizer uma coisa que não é
// verdade para quem está confiando nela.
//
// O limite de juros do cartão (TETO_CARTAO_CONFERIDO_EM) tem data própria e
// não é tocado aqui.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho',
  'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

// Cada lugar: arquivo, padrão que acha a data e como escrevê-la.
// O padrão tem de casar exatamente uma vez.
export const LUGARES = [
  {
    nome: 'selo do cabeçalho',
    arquivo: 'index.html',
    padrao: /<span class="selo">(\d{2}) · (\d{2}) · (\d{4})<\/span>/,
    ler: (m) => `${m[3]}-${m[2]}-${m[1]}`,
    escrever: ({ dia, mes, ano }) => `<span class="selo">${dia} · ${mes} · ${ano}</span>`,
  },
  {
    nome: 'nota do rodapé',
    arquivo: 'index.html',
    padrao: /Informações conferidas em (\d{1,2})º? de (\p{L}+) de (\d{4})\./u,
    ler: (m) => `${m[3]}-${String(MESES.indexOf(m[2]) + 1).padStart(2, '0')}-${m[1].padStart(2, '0')}`,
    escrever: ({ dia, mes, ano }) =>
      `Informações conferidas em ${Number(dia) === 1 ? '1º' : Number(dia)} de ${MESES[Number(mes) - 1]} de ${ano}.`,
  },
  {
    nome: 'MINIMO_EXISTENCIAL_CONFERIDO_EM (aviso na tela)',
    arquivo: 'calculo.js',
    padrao: /export const MINIMO_EXISTENCIAL_CONFERIDO_EM = '(\d{4})-(\d{2})-(\d{2})';/,
    ler: (m) => `${m[1]}-${m[2]}-${m[3]}`,
    escrever: ({ dia, mes, ano }) => `export const MINIMO_EXISTENCIAL_CONFERIDO_EM = '${ano}-${mes}-${dia}';`,
  },
  {
    nome: 'comentário do mínimo existencial',
    arquivo: 'calculo.js',
    padrao: /Decreto 11\.150\/2022\. Conferido em (\d{2})\/(\d{2})\/(\d{4})\./,
    ler: (m) => `${m[3]}-${m[2]}-${m[1]}`,
    escrever: ({ dia, mes, ano }) => `Decreto 11.150/2022. Conferido em ${dia}/${mes}/${ano}.`,
  },
];

function conteudo(arquivo) {
  return fs.readFileSync(path.join(RAIZ, arquivo), 'utf8');
}

function achar(texto, lugar) {
  const global = new RegExp(lugar.padrao.source, lugar.padrao.flags + 'g');
  const achados = [...texto.matchAll(global)];
  if (achados.length !== 1) {
    throw new Error(`${lugar.arquivo}, ${lugar.nome}: esperava achar a data 1 vez, achei ${achados.length}.`);
  }
  return achados[0];
}

/** A data de cada lugar, como 'AAAA-MM-DD'. */
export function datasAtuais() {
  return LUGARES.map((lugar) => ({
    nome: lugar.nome,
    arquivo: lugar.arquivo,
    data: lugar.ler(achar(conteudo(lugar.arquivo), lugar)),
  }));
}

function validar(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  const d = m && new Date(`${iso}T12:00:00Z`);
  if (!m || Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== iso) {
    throw new Error(`Data inválida: "${iso}". Use AAAA-MM-DD, por exemplo 2026-10-01.`);
  }
  return { ano: m[1], mes: m[2], dia: m[3] };
}

function hoje() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function trocarData(iso) {
  const partes = validar(iso);
  const textos = {};
  for (const lugar of LUGARES) {
    textos[lugar.arquivo] ??= conteudo(lugar.arquivo);
    achar(textos[lugar.arquivo], lugar); // falha antes de escrever qualquer coisa
    textos[lugar.arquivo] = textos[lugar.arquivo].replace(lugar.padrao, lugar.escrever(partes));
  }
  for (const [arquivo, texto] of Object.entries(textos)) {
    fs.writeFileSync(path.join(RAIZ, arquivo), texto);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    const pedido = process.argv[2];
    if (pedido) trocarData(pedido === 'hoje' ? hoje() : pedido);
    for (const { nome, arquivo, data } of datasAtuais()) {
      console.log(`${data}  ${arquivo} — ${nome}`);
    }
    if (pedido) console.log('\nConfira com `git diff` e rode `node --test` antes de publicar.');
  } catch (erro) {
    console.error(erro.message);
    process.exit(1);
  }
}
