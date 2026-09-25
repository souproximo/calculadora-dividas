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
  aplicarTetoCartao,
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

/* ------------------------------------------------------------------ *
 * Teto de juros do cartão (Lei 14.690/2023, art. 28)
 * ------------------------------------------------------------------ */

const COM_TETO = { tetoCartao: true };

test('aplicarTetoCartao corta os juros no que falta para o teto', () => {
  perto(aplicarTetoCartao(135, 0, 1000), 135);      // longe do teto
  perto(aplicarTetoCartao(135, 900, 1000), 100);    // só cabem 100
  perto(aplicarTetoCartao(135, 1000, 1000), 0);     // já bateu
  perto(aplicarTetoCartao(135, 1200, 1000), 0);     // nunca negativo
});

test('cartão a 13,5% sem pagamento para no dobro e não passa dele', () => {
  const cartao = [{ id: 'a', nome: 'Cartão', saldo: 1000, taxa: 0.135, minimo: 0, cartao: true }];
  perto(saldoDepoisDe(cartao, 0, ['a'], 12, COM_TETO), 2000);
  perto(saldoDepoisDe(cartao, 0, ['a'], 120, COM_TETO), 2000);

  const r = simularQuitacao(cartao, 0, ['a'], 12, COM_TETO);
  assert.deepEqual(r.noTeto, ['a']);
  perto(r.totalJuros, 1000);
});

test('a mesma dívida sem a marca de cartão cresce como antes, sem teto', () => {
  const semMarca = [{ id: 'a', nome: 'Empréstimo', saldo: 1000, taxa: 0.135, minimo: 0 }];
  const esperado = 1000 * Math.pow(1.135, 12);
  perto(saldoDepoisDe(semMarca, 0, ['a'], 12), esperado);
  perto(saldoDepoisDe(semMarca, 0, ['a'], 12, COM_TETO), esperado);
  assert.deepEqual(simularQuitacao(semMarca, 0, ['a'], 12, COM_TETO).noTeto, []);
});

test('sem pedir o teto, a marca de cartão não muda a simulação', () => {
  // O plano de quitação e a comparação entre ordens são feitos sem teto.
  const marcado = [{ id: 'a', nome: 'Cartão', saldo: 5000, taxa: 0.14, minimo: 100, cartao: true }];
  const r = simularQuitacao(marcado, 100, ['a'], 120);
  assert.equal(r.fecha, false);
  assert.ok(r.saldoRestante > 10000);
});

test('cartão com pagamento: os juros somados não passam do saldo informado', () => {
  const cartao = [{ id: 'a', nome: 'Cartão', saldo: 5000, taxa: 0.14, minimo: 100, cartao: true }];
  const r = simularQuitacao(cartao, 100, ['a'], 600, COM_TETO);
  assert.ok(r.totalJuros <= 5000 + 0.01, `juros passaram do teto: ${r.totalJuros}`);
  perto(r.totalJuros, 5000);
  // Um ano pagando R$ 100: chega ao teto e fica em 5.000 + 5.000 − 1.200.
  perto(saldoDepoisDe(cartao, 100, ['a'], 12, COM_TETO), 8800);
});

test('cartão misturado com empréstimo: a ordem de pagamento não muda', () => {
  const semMarca = exemplo();
  const comMarca = exemplo().map((d) => (d.id === 'a' ? { ...d, cartao: true } : d));
  assert.deepEqual(ordemPorJuros(comMarca), ordemPorJuros(semMarca));
  assert.deepEqual(ordemPorSaldo(comMarca), ordemPorSaldo(semMarca));
});

test('com o teto, começar pela menor pode sair mais barato', () => {
  // É por isso que o teto não entra na ordem: quando o cartão vai bater no
  // teto de qualquer jeito, pagar ele antes não economiza juros. A tela
  // mostra essa diferença em vez de mudar a ordem sozinha.
  const dividas = [
    { id: 'a', nome: 'Cartão', saldo: 3000, taxa: 0.135, minimo: 450, cartao: true },
    { id: 'b', nome: 'Cheque especial', saldo: 1200, taxa: 0.08, minimo: 150 },
    { id: 'c', nome: 'Consignado', saldo: 8000, taxa: 0.018, minimo: 380 },
  ];
  const semTeto = compararOrdens(dividas, 1000);
  const comTeto = compararOrdens(dividas, 1000, COM_TETO);
  perto(semTeto.diferencaJuros, 280.26);
  perto(comTeto.diferencaJuros, -165.11);
});

/* ------------------------------------------------------------------ *
 * Casos do plano de validação: não têm cartão no teto, não podem mudar
 * ------------------------------------------------------------------ */

const casoCida = (faturaComoCartao = false) => ([
  { id: 'f', nome: 'Fatura parcelada', saldo: 1878, taxa: 0.089, minimo: 312, cartao: faturaComoCartao },
  { id: 'e', nome: 'Empréstimo', saldo: 4000, taxa: 0.0377, minimo: 310 },
  { id: 'k', nome: 'Carnê', saldo: 712, taxa: 0, minimo: 89 },
]);

test('caso A (Cida) continua dando os mesmos números', () => {
  perto(taxaImplicita(4000, 310, 18) * 100, 3.77, 0.005);

  for (const faturaComoCartao of [false, true]) {
    const dividas = casoCida(faturaComoCartao);
    const r = retrato(dividas, 2600);
    perto(r.totalDevido, 6590);
    perto(r.parcelasNoMes, 711);
    assert.equal(Math.round(r.comprometimentoDaRenda * 100), 27);
    assert.deepEqual(ordemPorJuros(dividas), ['f', 'e', 'k']);
    perto(900 - r.parcelasNoMes, 189);

    for (const opcoes of [{}, COM_TETO]) {
      const c = compararOrdens(dividas, 900, opcoes);
      assert.equal(c.porJuros.meses, 9);
      perto(c.diferencaJuros, 203.56);
      assert.equal(c.diferencaMeses, 1);
      // Marcada como cartão, a fatura acaba no mês 5 com ~R$ 511 de juros,
      // longe do teto de R$ 1.878: o teto nunca é atingido.
      assert.deepEqual(c.porJuros.noTeto, []);
      assert.deepEqual(c.porSaldo.noTeto, []);
    }
  }
});

test('caso B (Zé) continua dando os mesmos números e os três avisos', () => {
  const dividas = [
    { id: 'q', nome: 'Cheque especial', saldo: 4500, taxa: 0.077, minimo: 130 },
    { id: 'e', nome: 'Empréstimo', saldo: 9000, taxa: 0.0575, minimo: 650 },
  ];
  const r = retrato(dividas, 1350);
  perto(r.totalDevido, 13500);
  perto(r.jurosNoMes, 864);
  perto(r.parcelasNoMes, 780);

  // Os três avisos: a parcela não cobre os juros, a sobra fica abaixo do
  // mínimo existencial e, com o valor em branco, a dívida não acaba.
  assert.equal(r.parcelaCobreJuros, false);
  const me = situacaoMinimoExistencial(1350, r.parcelasNoMes);
  perto(me.sobra, 570);
  assert.equal(me.abaixoDoMinimo, true);
  const ordem = ordemPorJuros(dividas);
  assert.equal(simularQuitacao(dividas, r.parcelasNoMes, ordem).fecha, false);

  perto(saldoDepoisDe(dividas, r.parcelasNoMes, ordem, 12), 15333.27);
  perto(saldoDepoisDe(dividas, r.parcelasNoMes, ordem, 12, COM_TETO), 15333.27);
});
