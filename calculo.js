// calculo.js — a conta, separada da tela.
//
// Nada aqui toca o documento, a rede ou qualquer armazenamento. São só funções
// que recebem número e devolvem número, para que possam ser testadas sozinhas
// (ver teste/calculo.test.mjs) e conferidas por quem quiser.
//
// Convenções deste arquivo:
//   - taxa      = juros ao mês em decimal (0,075 = 7,5% ao mês)
//   - saldo     = quanto falta pagar hoje, em reais
//   - minimo    = a parcela mensal que já está combinada com o credor
//   - dinheiro  = sempre em reais, nunca em centavos

/** Tolerância de arredondamento: meio centavo. */
const CENTAVO = 0.005;

/* ------------------------------------------------------------------ *
 * Entrada e saída de números
 * ------------------------------------------------------------------ */

/**
 * Lê um valor digitado por gente de verdade e devolve um número.
 * Aceita "1.234,56", "1234,56", "1234.56", "R$ 1.234,56" e " 1 234,56 ".
 * Devolve NaN quando não dá para entender.
 */
export function lerValor(texto) {
  if (typeof texto === 'number') return Number.isFinite(texto) ? texto : NaN;
  if (texto == null) return NaN;

  let s = String(texto).trim();
  if (s === '') return NaN;

  // Tira tudo que não for dígito, vírgula, ponto ou sinal de menos.
  s = s.replace(/[^\d,.-]/g, '');
  if (s === '' || s === '-') return NaN;

  const temVirgula = s.includes(',');
  const temPonto = s.includes('.');

  if (temVirgula && temPonto) {
    // O separador decimal é o último que aparece.
    const decimal = s.lastIndexOf(',') > s.lastIndexOf('.') ? ',' : '.';
    const milhar = decimal === ',' ? '.' : ',';
    s = s.split(milhar).join('');
    s = s.replace(decimal, '.');
  } else if (temVirgula) {
    s = s.replace(',', '.');
  } else if (temPonto) {
    // Um ponto só pode ser decimal ("1234.56") ou de milhar ("1.234").
    // Se sobram exatamente 3 dígitos depois do último ponto e há mais de um
    // ponto, ou o número não tem decimal plausível, tratamos como milhar.
    const partes = s.split('.');
    const ultima = partes[partes.length - 1];
    if (partes.length > 2 || ultima.length === 3) {
      s = partes.join('');
    }
  }

  const n = Number(s);
  return Number.isFinite(n) ? n : NaN;
}

/**
 * Lê uma taxa digitada em porcento ao mês e devolve decimal.
 * "7,5" -> 0.075 · "7,5%" -> 0.075
 */
export function lerTaxaPorcento(texto) {
  const n = lerValor(texto);
  return Number.isFinite(n) ? n / 100 : NaN;
}

const MOEDA = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** Formata reais: 1234.5 -> "R$ 1.234,50" */
export function emReais(n) {
  if (!Number.isFinite(n)) return '—';
  return MOEDA.format(n);
}

/** Formata taxa decimal como porcento ao mês: 0.075 -> "7,50% ao mês" */
export function emPorcentoAoMes(taxa, comSufixo = true) {
  if (!Number.isFinite(taxa)) return '—';
  const texto = (taxa * 100).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }) + '%';
  return comSufixo ? texto + ' ao mês' : texto;
}

/** Escreve uma quantidade de meses em anos e meses. */
export function emMeses(meses) {
  if (!Number.isFinite(meses)) return '—';
  const m = Math.round(meses);
  if (m < 1) return 'menos de 1 mês';
  if (m === 1) return '1 mês';
  if (m < 12) return `${m} meses`;
  const anos = Math.floor(m / 12);
  const resto = m % 12;
  const parteAnos = anos === 1 ? '1 ano' : `${anos} anos`;
  if (resto === 0) return parteAnos;
  const parteMeses = resto === 1 ? '1 mês' : `${resto} meses`;
  return `${parteAnos} e ${parteMeses}`;
}

/* ------------------------------------------------------------------ *
 * Juros
 * ------------------------------------------------------------------ */

/** Quanto esta dívida cresce no mês, se nada for pago. */
export function jurosDoMes(saldo, taxa) {
  if (!Number.isFinite(saldo) || !Number.isFinite(taxa)) return NaN;
  return saldo * taxa;
}

/** Converte juros ao mês em juros ao ano (composto). */
export function taxaAoAno(taxaAoMes) {
  if (!Number.isFinite(taxaAoMes)) return NaN;
  return Math.pow(1 + taxaAoMes, 12) - 1;
}

/**
 * Descobre a taxa de juros ao mês de um parcelamento quando a pessoa só sabe
 * o saldo, o valor da parcela e quantas parcelas faltam.
 *
 * Resolve, por bisseção:   saldo = parcela · (1 − (1+i)^−n) / i
 *
 * Devolve 0 quando parcela × n ≤ saldo (não há juros embutidos) e NaN quando
 * os números não fazem sentido.
 */
export function taxaImplicita(saldo, parcela, nParcelas) {
  if (![saldo, parcela, nParcelas].every(Number.isFinite)) return NaN;
  if (saldo <= 0 || parcela <= 0 || nParcelas < 1) return NaN;

  const totalPago = parcela * nParcelas;
  if (totalPago <= saldo + CENTAVO) return 0;

  const valorPresente = (i) =>
    i === 0 ? parcela * nParcelas
            : parcela * (1 - Math.pow(1 + i, -nParcelas)) / i;

  let baixo = 0;        // valorPresente(0) = totalPago > saldo
  let alto = 5;         // 500% ao mês; acima disso o valor presente é ínfimo
  if (valorPresente(alto) > saldo) return NaN; // fora do alcance

  for (let k = 0; k < 200; k++) {
    const meio = (baixo + alto) / 2;
    if (valorPresente(meio) > saldo) baixo = meio;
    else alto = meio;
  }
  return (baixo + alto) / 2;
}

/* ------------------------------------------------------------------ *
 * Retrato das dívidas
 * ------------------------------------------------------------------ */

/**
 * Soma o quadro geral.
 * dividas: [{ id, nome, saldo, taxa, minimo }]
 */
export function retrato(dividas, rendaMensal = NaN) {
  const total = dividas.reduce((s, d) => s + d.saldo, 0);
  const parcelas = dividas.reduce((s, d) => s + d.minimo, 0);
  const jurosMes = dividas.reduce((s, d) => s + jurosDoMes(d.saldo, d.taxa), 0);

  const comprometimento = Number.isFinite(rendaMensal) && rendaMensal > 0
    ? parcelas / rendaMensal
    : NaN;

  const sobra = Number.isFinite(rendaMensal) ? rendaMensal - parcelas : NaN;

  // Quanto da parcela do mês só paga juros: se as parcelas somadas não cobrem
  // nem os juros, a dívida cresce mesmo com a pessoa pagando em dia.
  const parcelaCobreJuros = parcelas > jurosMes;

  return {
    totalDevido: total,
    parcelasNoMes: parcelas,
    jurosNoMes: jurosMes,
    taxaMediaPonderada: total > 0 ? jurosMes / total : 0,
    comprometimentoDaRenda: comprometimento,
    sobraNoMes: sobra,
    parcelaCobreJuros,
  };
}

/* ------------------------------------------------------------------ *
 * Ordem de pagamento
 * ------------------------------------------------------------------ */

/**
 * Ordem que faz pagar menos juros no total: da maior taxa para a menor.
 * Empate desfeito pelo menor saldo, que sai da frente mais rápido.
 */
export function ordemPorJuros(dividas) {
  return [...dividas]
    .sort((a, b) => (b.taxa - a.taxa) || (a.saldo - b.saldo))
    .map((d) => d.id);
}

/**
 * Ordem que faz sumir mais depressa a primeira dívida: do menor saldo para o
 * maior. Costuma custar mais juros no total, e ainda assim é a que muita gente
 * sustenta até o fim — ver quitar cada conta é o que mantém o plano de pé.
 */
export function ordemPorSaldo(dividas) {
  return [...dividas]
    .sort((a, b) => (a.saldo - b.saldo) || (b.taxa - a.taxa))
    .map((d) => d.id);
}

/* ------------------------------------------------------------------ *
 * Simulação de quitação
 * ------------------------------------------------------------------ */

/**
 * Passa mês a mês: aplica juros, paga o mínimo de cada dívida e joga o que
 * sobrar na primeira dívida da ordem escolhida.
 *
 * dividas   [{ id, nome, saldo, taxa, minimo }]
 * disponivel  quanto a pessoa consegue destinar por mês, no total
 * ordem       array de ids, prioridade para a sobra
 *
 * Devolve { viavel, fecha, meses, totalJuros, totalPago, quitacao }
 *   viavel = false quando o dinheiro não cobre nem as parcelas combinadas
 *   fecha  = false quando nem em 50 anos as dívidas chegam a zero
 */
export function simularQuitacao(dividas, disponivel, ordem, limiteMeses = 600) {
  const minimos = dividas.reduce((s, d) => s + d.minimo, 0);

  if (!Number.isFinite(disponivel) || disponivel + CENTAVO < minimos) {
    return {
      viavel: false,
      fecha: false,
      meses: NaN,
      totalJuros: NaN,
      totalPago: NaN,
      quitacao: {},
      faltaPorMes: minimos - (Number.isFinite(disponivel) ? disponivel : 0),
    };
  }

  const estado = dividas.map((d) => ({ ...d }));
  const quitacao = Object.create(null);
  let totalJuros = 0;
  let totalPago = 0;
  let mes = 0;

  const aindaDeve = () => estado.some((d) => d.saldo > CENTAVO);

  while (aindaDeve()) {
    mes++;
    if (mes > limiteMeses) {
      return {
        viavel: true,
        fecha: false,
        meses: limiteMeses,
        totalJuros,
        totalPago,
        quitacao,
        saldoRestante: estado.reduce((s, d) => s + Math.max(d.saldo, 0), 0),
      };
    }

    // 1. os juros do mês entram no saldo
    for (const d of estado) {
      if (d.saldo <= CENTAVO) continue;
      const j = d.saldo * d.taxa;
      d.saldo += j;
      totalJuros += j;
    }

    // 2. cada dívida recebe a parcela combinada
    let caixa = disponivel;
    for (const d of estado) {
      if (d.saldo <= CENTAVO || caixa <= CENTAVO) continue;
      const pago = Math.min(d.minimo, d.saldo, caixa);
      d.saldo -= pago;
      caixa -= pago;
      totalPago += pago;
      if (d.saldo <= CENTAVO) { d.saldo = 0; quitacao[d.id] ??= mes; }
    }

    // 3. o que sobrou vai para a primeira da ordem que ainda estiver de pé
    for (const id of ordem) {
      if (caixa <= CENTAVO) break;
      const d = estado.find((x) => x.id === id);
      if (!d || d.saldo <= CENTAVO) continue;
      const pago = Math.min(d.saldo, caixa);
      d.saldo -= pago;
      caixa -= pago;
      totalPago += pago;
      if (d.saldo <= CENTAVO) { d.saldo = 0; quitacao[d.id] ??= mes; }
    }
  }

  return { viavel: true, fecha: true, meses: mes, totalJuros, totalPago, quitacao };
}

/**
 * Quanto ainda se deveria, ao todo, depois de N meses pagando desse jeito.
 * Serve para dizer "daqui a um ano a dívida estaria em tanto" em vez de
 * projetar cinquenta anos e cuspir um número que não diz nada a ninguém.
 */
export function saldoDepoisDe(dividas, disponivel, ordem, meses) {
  const r = simularQuitacao(dividas, disponivel, ordem, meses);
  if (!r.viavel) return NaN;
  return r.fecha ? 0 : r.saldoRestante;
}

/**
 * Roda as duas ordens e devolve a diferença entre elas.
 */
export function compararOrdens(dividas, disponivel) {
  const porJuros = simularQuitacao(dividas, disponivel, ordemPorJuros(dividas));
  const porSaldo = simularQuitacao(dividas, disponivel, ordemPorSaldo(dividas));

  const diferencaJuros =
    porJuros.fecha && porSaldo.fecha ? porSaldo.totalJuros - porJuros.totalJuros : NaN;
  const diferencaMeses =
    porJuros.fecha && porSaldo.fecha ? porSaldo.meses - porJuros.meses : NaN;

  return { porJuros, porSaldo, diferencaJuros, diferencaMeses };
}

/* ------------------------------------------------------------------ *
 * Mínimo existencial
 * ------------------------------------------------------------------ */

/**
 * Valor do mínimo existencial fixado pelo Decreto 11.567/2023, que alterou o
 * Decreto 11.150/2022. Conferido em 21/09/2026.
 *
 * O Supremo julgou o tema em 23/04/2026 (ADPFs 1005, 1006 e 1097): manteve o
 * valor, determinou revisão anual pelo Conselho Monetário Nacional e derrubou
 * a exclusão do crédito consignado da proteção.
 *
 * ATENÇÃO A QUEM MANTÉM ESTE CÓDIGO: este número muda. Ao atualizar, mude
 * também a data de verificação que aparece na tela.
 */
export const MINIMO_EXISTENCIAL = 600;
export const MINIMO_EXISTENCIAL_CONFERIDO_EM = '2026-09-21';

/**
 * Compara o que sobra da renda depois das parcelas com o mínimo existencial.
 * É um retrato, não um diagnóstico jurídico: quem decide se alguém está
 * superendividado é a Justiça, o Procon ou a Defensoria.
 */
export function situacaoMinimoExistencial(rendaMensal, parcelasNoMes) {
  if (!Number.isFinite(rendaMensal) || rendaMensal <= 0) {
    return { avaliado: false };
  }
  const sobra = rendaMensal - parcelasNoMes;
  return {
    avaliado: true,
    sobra,
    minimo: MINIMO_EXISTENCIAL,
    abaixoDoMinimo: sobra < MINIMO_EXISTENCIAL,
    comprometimento: parcelasNoMes / rendaMensal,
  };
}
