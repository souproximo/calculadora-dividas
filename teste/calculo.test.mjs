// Testes da conta. Rodar com:  node --test
// Não precisa instalar nada: usa o test runner que já vem no Node 18+.

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  lerValor,
  lerTaxaPorcento,
  emMeses,
  jurosDoMes,
  taxaAoAno,
  taxaImplicita,
  retrato,
  ordemPorJuros,
  ordemPorSaldo,
  simularQuitacao,
  saldoDepoisDe,
  compararOrdens,
  situacaoMinimoExistencial,
  MINIMO_EXISTENCIAL,
} from '../calculo.js';

const perto = (a, b, tolerancia = 0.01) =>
  assert.ok(Math.abs(a - b) <= tolerancia, `esperava ~${b}, veio ${a}`);

/* ------------------------------------------------------------------ */

test('lerValor entende como brasileiro escreve dinheiro', () => {
  perto(lerValor('1.234,56'), 1234.56);
  perto(lerValor('1234,56'), 1234.56);
  perto(lerValor('1234.56'), 1234.56);
  perto(lerValor('R$ 1.234,56'), 1234.56);
  perto(lerValor(' 1.234 '), 1234);
  perto(lerValor('1.234.567,89'), 1234567.89);
  perto(lerValor('250'), 250);
  perto(lerValor(87.5), 87.5);
});

test('lerValor devolve NaN no que não é número', () => {
  for (const entrada of ['', '   ', 'não sei', null, undefined, '-']) {
    assert.ok(Number.isNaN(lerValor(entrada)), `deveria ser NaN: ${entrada}`);
  }
});

test('lerTaxaPorcento divide por cem', () => {
  perto(lerTaxaPorcento('7,5'), 0.075, 1e-9);
  perto(lerTaxaPorcento('12,99%'), 0.1299, 1e-9);
});

test('emMeses escreve em anos e meses', () => {
  assert.equal(emMeses(1), '1 mês');
  assert.equal(emMeses(7), '7 meses');
  assert.equal(emMeses(12), '1 ano');
  assert.equal(emMeses(13), '1 ano e 1 mês');
  assert.equal(emMeses(30), '2 anos e 6 meses');
});

/* ------------------------------------------------------------------ */

test('jurosDoMes é saldo vezes taxa', () => {
  perto(jurosDoMes(1000, 0.0799), 79.9);
});

test('taxaAoAno compõe doze meses', () => {
  perto(taxaAoAno(0.01), 0.126825, 1e-6);
  // 14% ao mês passa de 380% ao ano — o número que assusta no cartão.
  assert.ok(taxaAoAno(0.14) > 3.8);
});

/* ------------------------------------------------------------------ */

test('taxaImplicita acha a taxa que reproduz o saldo', () => {
  const saldo = 1000, parcela = 100, n = 12;
  const i = taxaImplicita(saldo, parcela, n);
  assert.ok(i > 0 && i < 1, `taxa fora do esperado: ${i}`);

  // Refazendo o valor presente com a taxa encontrada, tem que dar o saldo.
  const vp = parcela * (1 - Math.pow(1 + i, -n)) / i;
  perto(vp, saldo, 0.01);
});

test('taxaImplicita devolve zero quando não há juros embutidos', () => {
  assert.equal(taxaImplicita(1200, 100, 12), 0);
  assert.equal(taxaImplicita(1200, 90, 12), 0); // pagando menos que o saldo
});

test('taxaImplicita recusa números sem sentido', () => {
  assert.ok(Number.isNaN(taxaImplicita(0, 100, 12)));
  assert.ok(Number.isNaN(taxaImplicita(1000, 0, 12)));
  assert.ok(Number.isNaN(taxaImplicita(1000, 100, 0)));
});

/* ------------------------------------------------------------------ */

const exemplo = () => ([
  { id: 'a', nome: 'Cartão',     saldo: 3000, taxa: 0.14,  minimo: 450 },
  { id: 'b', nome: 'Consignado', saldo: 8000, taxa: 0.018, minimo: 380 },
  { id: 'c', nome: 'Cheque especial', saldo: 1200, taxa: 0.08, minimo: 150 },
]);

test('retrato soma o quadro geral', () => {
  const r = retrato(exemplo(), 3000);
  perto(r.totalDevido, 12200);
  perto(r.parcelasNoMes, 980);
  perto(r.jurosNoMes, 3000 * 0.14 + 8000 * 0.018 + 1200 * 0.08); // 420 + 144 + 96
  perto(r.comprometimentoDaRenda, 980 / 3000, 1e-9);
  perto(r.sobraNoMes, 2020);
  assert.equal(r.parcelaCobreJuros, true);
});

test('retrato avisa quando a parcela nem cobre os juros', () => {
  const r = retrato([{ id: 'x', nome: 'Rotativo', saldo: 5000, taxa: 0.14, minimo: 300 }], 2000);
  assert.equal(r.parcelaCobreJuros, false); // juros 700 > parcela 300
});

test('ordem por juros começa pela taxa mais alta', () => {
  assert.deepEqual(ordemPorJuros(exemplo()), ['a', 'c', 'b']);
});

test('ordem por saldo começa pela dívida menor', () => {
  assert.deepEqual(ordemPorSaldo(exemplo()), ['c', 'a', 'b']);
});

/* ------------------------------------------------------------------ */

test('sem juros, a dívida acaba no número exato de parcelas', () => {
  const dividas = [{ id: 'a', nome: 'Carnê', saldo: 1000, taxa: 0, minimo: 100 }];
  const r = simularQuitacao(dividas, 100, ['a']);
  assert.equal(r.viavel, true);
  assert.equal(r.fecha, true);
  assert.equal(r.meses, 10);
  perto(r.totalJuros, 0);
  perto(r.totalPago, 1000);
});

test('a simulação bate com a tabela Price', () => {
  // Financiamento clássico: R$ 10.000 a 2% ao mês em 24 parcelas.
  const i = 0.02, n = 24, saldo = 10000;
  const parcela = saldo * i / (1 - Math.pow(1 + i, -n));

  const r = simularQuitacao(
    [{ id: 'a', nome: 'Financiamento', saldo, taxa: i, minimo: parcela }],
    parcela,
    ['a'],
  );

  assert.equal(r.fecha, true);
  assert.equal(r.meses, n);                       // nem um mês a mais
  perto(r.totalJuros, parcela * n - saldo, 0.05); // juros = pago − emprestado
  perto(r.totalPago, parcela * n, 0.05);
});

test('pagar mais por mês encurta o prazo e barateia os juros', () => {
  const base = simularQuitacao(exemplo(), 980, ordemPorJuros(exemplo()));
  const folgado = simularQuitacao(exemplo(), 1500, ordemPorJuros(exemplo()));

  assert.ok(folgado.meses < base.meses);
  assert.ok(folgado.totalJuros < base.totalJuros);
});

test('a ordem por juros nunca custa mais que a ordem por saldo', () => {
  const c = compararOrdens(exemplo(), 1500);
  assert.equal(c.porJuros.fecha, true);
  assert.equal(c.porSaldo.fecha, true);
  assert.ok(
    c.diferencaJuros >= -0.01,
    `pagar primeiro o juro mais alto saiu mais caro, o que não pode: ${c.diferencaJuros}`,
  );
});

test('a comparação some quando não há sobra para direcionar', () => {
  // Com o dinheiro justo para as parcelas, não há o que priorizar:
  // as duas ordens dão o mesmo resultado.
  const c = compararOrdens(exemplo(), 980);
  perto(c.diferencaJuros, 0, 0.01);
  assert.equal(c.diferencaMeses, 0);
});

test('avisa quando o dinheiro não cobre nem as parcelas', () => {
  const r = simularQuitacao(exemplo(), 700, ordemPorJuros(exemplo()));
  assert.equal(r.viavel, false);
  perto(r.faltaPorMes, 280); // 980 − 700
});

test('avisa quando a dívida não fecha nunca', () => {
  // Parcela de R$ 100 numa dívida de R$ 5.000 a 14% ao mês: os juros são
  // R$ 700 por mês. O saldo só cresce.
  const r = simularQuitacao(
    [{ id: 'a', nome: 'Rotativo', saldo: 5000, taxa: 0.14, minimo: 100 }],
    100,
    ['a'],
    120,
  );
  assert.equal(r.viavel, true);
  assert.equal(r.fecha, false);
  assert.equal(r.meses, 120);
  assert.ok(r.saldoRestante > 5000);
});

test('saldoDepoisDe projeta a dívida a prazo fixo', () => {
  const dividas = [{ id: 'a', nome: 'Rotativo', saldo: 5000, taxa: 0.14, minimo: 100 }];

  // Pagando R$ 100 numa dívida que gera R$ 700 de juros, em 12 meses o saldo
  // mais que dobra — mas continua sendo um número que cabe numa frase.
  const em12 = saldoDepoisDe(dividas, 100, ['a'], 12);
  assert.ok(em12 > 10000 && em12 < 30000, `projeção fora do esperado: ${em12}`);

  // Quando a dívida acaba antes do prazo, o saldo projetado é zero.
  const quitada = [{ id: 'b', nome: 'Carnê', saldo: 500, taxa: 0, minimo: 100 }];
  assert.equal(saldoDepoisDe(quitada, 100, ['b'], 12), 0);
});

/* ------------------------------------------------------------------ */

test('mínimo existencial: compara a sobra com o valor da lei', () => {
  const abaixo = situacaoMinimoExistencial(2000, 1600);
  assert.equal(abaixo.avaliado, true);
  perto(abaixo.sobra, 400);
  assert.equal(abaixo.abaixoDoMinimo, true);
  assert.equal(abaixo.minimo, MINIMO_EXISTENCIAL);

  const acima = situacaoMinimoExistencial(3000, 980);
  assert.equal(acima.abaixoDoMinimo, false);
  perto(acima.comprometimento, 980 / 3000, 1e-9);
});

test('mínimo existencial não é avaliado sem renda informada', () => {
  assert.equal(situacaoMinimoExistencial(NaN, 500).avaliado, false);
  assert.equal(situacaoMinimoExistencial(0, 500).avaliado, false);
});
