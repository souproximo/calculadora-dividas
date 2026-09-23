// calculadora.js — a tela.
//
// Este arquivo só lê campos, chama as funções de calculo.js e escreve o
// resultado. Ele não envia nada para lugar nenhum e não guarda nada: não há
// fetch, não há XMLHttpRequest, não há localStorage, sessionStorage, cookie
// nem IndexedDB neste código. É a regra 02 do projeto, e é conferível aqui
// mesmo, lendo o arquivo.

import {
  lerValor,
  lerTaxaPorcento,
  emReais,
  emPorcentoAoMes,
  emMeses,
  taxaAoAno,
  taxaImplicita,
  retrato,
  ordemPorJuros,
  ordemPorSaldo,
  simularQuitacao,
  saldoDepoisDe,
  situacaoMinimoExistencial,
  MINIMO_EXISTENCIAL,
} from './calculo.js';

/* ------------------------------------------------------------------ *
 * Atalhos
 * ------------------------------------------------------------------ */

const $ = (sel, raiz = document) => raiz.querySelector(sel);
const $$ = (sel, raiz = document) => [...raiz.querySelectorAll(sel)];

/** Cria um elemento já com classe e texto. Nunca usamos innerHTML com
 *  coisa digitada pela pessoa. */
function el(tag, classe, texto) {
  const e = document.createElement(tag);
  if (classe) e.className = classe;
  if (texto != null) e.textContent = texto;
  return e;
}

const lista = $('#lista-dividas');
const modelo = $('#modelo-divida');
const secaoResultado = $('#resultado');
const corpoResultado = $('#resultado-corpo');

let proximoId = 0;

/* ------------------------------------------------------------------ *
 * Linhas de dívida
 * ------------------------------------------------------------------ */

function adicionarDivida(valores = null) {
  const no = modelo.content.firstElementChild.cloneNode(true);
  no.dataset.id = 'd' + proximoId++;

  // Rótulos e ids únicos, para que cada <label> aponte para o seu campo.
  $$('.campo label', no).forEach((rotulo, i) => {
    const campo = rotulo.parentElement.querySelector('input');
    if (!campo) return;
    const id = `${no.dataset.id}-c${i}`;
    campo.id = id;
    rotulo.setAttribute('for', id);
  });

  $('.f-remover', no).addEventListener('click', () => {
    no.remove();
    if (lista.children.length === 0) adicionarDivida();
    renumerar();
  });

  const painelJuros = $('.descobrir-juros', no);
  $('.f-nao-sei', no).addEventListener('click', () => {
    painelJuros.hidden = !painelJuros.hidden;
    if (!painelJuros.hidden) $('.f-n-parcelas', no).focus();
  });
  $('.f-fechar-juros', no).addEventListener('click', () => {
    painelJuros.hidden = true;
  });
  $('.f-calcular-juros', no).addEventListener('click', () => descobrirJuros(no));

  if (valores) {
    $('.f-nome', no).value = valores.nome ?? '';
    $('.f-saldo', no).value = valores.saldo ?? '';
    $('.f-parcela', no).value = valores.parcela ?? '';
    $('.f-juros', no).value = valores.juros ?? '';
  }

  lista.append(no);
  renumerar();
  return no;
}

function renumerar() {
  $$('.divida', lista).forEach((no, i) => {
    $('.divida-n', no).textContent = `Dívida ${i + 1}`;
    $('.f-remover', no).hidden = lista.children.length === 1;
  });
}

/** Calcula os juros embutidos a partir de saldo, parcela e nº de parcelas. */
function descobrirJuros(no) {
  const resposta = $('.resposta-juros', no);
  const saldo = lerValor($('.f-saldo', no).value);
  const parcela = lerValor($('.f-parcela', no).value);
  const n = lerValor($('.f-n-parcelas', no).value);

  const falha = (msg) => {
    resposta.className = 'resposta-juros ruim';
    resposta.textContent = msg;
  };

  if (!Number.isFinite(saldo) || saldo <= 0) {
    return falha('Preencha antes quanto ainda falta pagar.');
  }
  if (!Number.isFinite(parcela) || parcela <= 0) {
    return falha('Preencha antes o valor da parcela por mês.');
  }
  if (!Number.isFinite(n) || n < 1) {
    return falha('Escreva quantas parcelas ainda faltam.');
  }

  const taxa = taxaImplicita(saldo, parcela, Math.round(n));

  if (Number.isNaN(taxa)) {
    return falha('Com esses números não dá para chegar a uma taxa. Confira o saldo e a parcela.');
  }
  if (taxa === 0) {
    $('.f-juros', no).value = '0';
    resposta.className = 'resposta-juros';
    resposta.textContent =
      'Somando as parcelas que faltam, o total não passa do saldo: nesta dívida não há juros correndo. Escrevemos 0 no campo.';
    return;
  }

  $('.f-juros', no).value = (taxa * 100).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  resposta.className = 'resposta-juros';
  resposta.textContent =
    `São cerca de ${emPorcentoAoMes(taxa)} — o mesmo que ` +
    `${(taxaAoAno(taxa) * 100).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}% ao ano. ` +
    `Escrevemos no campo dos juros.`;
}

/* ------------------------------------------------------------------ *
 * Leitura do formulário
 * ------------------------------------------------------------------ */

function lerFormulario() {
  const dividas = [];
  const erros = [];

  $$('.divida', lista).forEach((no, i) => {
    const caixaErro = $('.erro-divida', no);
    caixaErro.hidden = true;
    caixaErro.textContent = '';

    const nomeDigitado = $('.f-nome', no).value.trim();
    const saldo = lerValor($('.f-saldo', no).value);
    const parcela = lerValor($('.f-parcela', no).value);
    const taxa = lerTaxaPorcento($('.f-juros', no).value);

    const vazia =
      nomeDigitado === '' &&
      $('.f-saldo', no).value.trim() === '' &&
      $('.f-parcela', no).value.trim() === '' &&
      $('.f-juros', no).value.trim() === '';
    if (vazia) return; // linha em branco é ignorada, não é erro

    const faltando = [];
    if (!Number.isFinite(saldo) || saldo <= 0) faltando.push('quanto ainda falta pagar');
    if (!Number.isFinite(parcela) || parcela < 0) faltando.push('a parcela por mês');
    if (!Number.isFinite(taxa) || taxa < 0) faltando.push('os juros ao mês');

    if (faltando.length) {
      const msg = `Falta preencher: ${faltando.join(', ')}.`;
      caixaErro.textContent = msg;
      caixaErro.hidden = false;
      erros.push(`Dívida ${i + 1}: ${msg}`);
      return;
    }

    if (taxa > 1) {
      const msg =
        'Juros acima de 100% ao mês são muito raros. Confira se você não escreveu a taxa do ano no lugar da do mês.';
      caixaErro.textContent = msg;
      caixaErro.hidden = false;
      erros.push(`Dívida ${i + 1}: ${msg}`);
      return;
    }

    dividas.push({
      id: no.dataset.id,
      nome: nomeDigitado || `Dívida ${i + 1}`,
      saldo,
      taxa,
      minimo: parcela,
    });
  });

  return {
    dividas,
    erros,
    renda: lerValor($('#renda').value),
    disponivel: lerValor($('#disponivel').value),
  };
}

/* ------------------------------------------------------------------ *
 * Escrita do resultado
 * ------------------------------------------------------------------ */

function bloco(tipo, titulo, ...paragrafos) {
  const caixa = el('div', tipo === 'aviso' ? 'aviso' : 'nota-boa');
  caixa.append(el('span', 'label', titulo));
  for (const p of paragrafos) {
    caixa.append(p instanceof Node ? p : el('p', null, p));
  }
  return caixa;
}

function itemPlacar(rotulo, valor, nota) {
  const item = el('div', 'placar-item');
  item.append(el('span', 'label', rotulo));
  item.append(el('div', 'placar-valor', valor));
  if (nota) item.append(el('div', 'placar-nota', nota));
  return item;
}

function mostrarErros(erros) {
  corpoResultado.replaceChildren();
  corpoResultado.append(el('h2', null, 'Faltam alguns números'));
  const caixa = bloco('aviso', 'Confira o formulário');
  const ul = el('ul');
  for (const e of erros) ul.append(el('li', null, e));
  caixa.append(ul);
  corpoResultado.append(caixa);
  secaoResultado.hidden = false;
  secaoResultado.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function calcular(evento) {
  evento.preventDefault();

  const { dividas, erros, renda, disponivel: digitado } = lerFormulario();

  if (erros.length) return mostrarErros(erros);

  if (dividas.length === 0) {
    return mostrarErros(['Escreva pelo menos uma dívida para a conta ter o que somar.']);
  }

  const r = retrato(dividas, renda);
  const disponivel =
    Number.isFinite(digitado) && digitado > 0 ? digitado : r.parcelasNoMes;

  const ordemJuros = ordemPorJuros(dividas);
  const porJuros = simularQuitacao(dividas, disponivel, ordemJuros);
  const porSaldo = simularQuitacao(dividas, disponivel, ordemPorSaldo(dividas));
  const me = situacaoMinimoExistencial(renda, r.parcelasNoMes);

  const saida = document.createDocumentFragment();
  saida.append(el('h2', null, 'O retrato da sua dívida hoje'));

  /* ---------- placar ---------- */

  const placar = el('div', 'placar');
  placar.append(itemPlacar('Você deve, ao todo', emReais(r.totalDevido),
    dividas.length === 1 ? 'em 1 dívida' : `em ${dividas.length} dívidas`));
  placar.append(itemPlacar('Parcelas por mês', emReais(r.parcelasNoMes),
    'somando todas as dívidas'));
  placar.append(itemPlacar('Juros por mês', emReais(r.jurosNoMes),
    `média de ${emPorcentoAoMes(r.taxaMediaPonderada, false)} ao mês sobre o total`));
  if (Number.isFinite(r.comprometimentoDaRenda)) {
    placar.append(itemPlacar(
      'Da sua renda',
      (r.comprometimentoDaRenda * 100).toLocaleString('pt-BR', { maximumFractionDigits: 0 }) + '%',
      `sobram ${emReais(r.sobraNoMes)} por mês`,
    ));
  }
  saida.append(placar);

  /* ---------- avisos ---------- */

  if (!r.parcelaCobreJuros) {
    saida.append(bloco(
      'aviso',
      'A dívida está crescendo mesmo com você pagando',
      `Os juros somam ${emReais(r.jurosNoMes)} por mês e as parcelas somam ${emReais(r.parcelasNoMes)}. ` +
      'Como a parcela não cobre nem os juros, o saldo aumenta todo mês, mesmo pagando em dia. ' +
      'Não é falta de esforço seu: é a conta que não fecha.',
      'Um caso assim não se resolve apertando mais o orçamento. Procure o Procon ou a Defensoria Pública — a Lei 14.181/2021 existe exatamente para isso, e permite renegociar todas as dívidas de uma vez.',
    ));
  }

  if (me.avaliado && me.abaixoDoMinimo) {
    saida.append(bloco(
      'aviso',
      'O que sobra fica abaixo do mínimo existencial',
      `Tirando as parcelas, sobram ${emReais(me.sobra)} por mês para viver. ` +
      `A lei brasileira chama de mínimo existencial o valor que precisa sobrar depois de pagar as dívidas, e hoje esse valor é de ${emReais(MINIMO_EXISTENCIAL)} por mês.`,
      'Isso não é um diagnóstico — quem reconhece o superendividamento é o Procon, a Defensoria ou a Justiça. Mas é um sinal forte de que a renegociação não devia ser feita sozinha. Leve este retrato a um desses canais.',
      notaRodape('Decreto 11.150/2022, com a redação do Decreto 11.567/2023. O Supremo julgou o tema em 23/04/2026 e determinou que o valor seja revisto todo ano, além de garantir a mesma proteção ao crédito consignado. Conferido em 21/09/2026.'),
    ));
  }

  if (!porJuros.viavel) {
    saida.append(bloco(
      'aviso',
      'O valor separado não cobre as parcelas',
      `As parcelas somam ${emReais(r.parcelasNoMes)} por mês e você informou ${emReais(disponivel)}. ` +
      `Faltam ${emReais(porJuros.faltaPorMes)} todo mês.`,
      'Nesse caso não adianta escolher ordem de pagamento: nenhuma ordem faz o dinheiro dar conta. O caminho é renegociar o valor das parcelas, e isso se faz no Procon, na Defensoria ou direto com quem você deve, por escrito.',
    ));
  }

  /* ---------- ordem de pagamento ---------- */

  if (porJuros.viavel) {
    const varias = dividas.length > 1;

    saida.append(el('h3', null,
      varias ? 'A ordem que faz você pagar menos' : 'Dívida por dívida'));

    if (varias) {
      saida.append(el('p', null,
        'A regra é simples e sempre a mesma: pague a parcela combinada de todas as dívidas e jogue todo o dinheiro que sobrar na dívida de juros mais altos. ' +
        'Quando ela acabar, o que sobrava vai inteiro para a próxima da lista.',
      ));
    }

    saida.append(tabelaOrdem(dividas, ordemJuros, porJuros, varias));

    if (varias) {
      const legenda = el('p', 'legenda-tabela');
      legenda.textContent =
        '“Cresce por mês” é quanto de juros aquela dívida gera sozinha em um mês, se nada for pago nela. ' +
        'É esse número, não o tamanho da dívida, que diz qual sai da frente primeiro.';
      saida.append(legenda);
    }

    /* ---------- plano ---------- */

    const primeira = dividas.find((d) => d.id === ordemJuros[0]);
    const sobra = disponivel - r.parcelasNoMes;

    if (porJuros.fecha) {
      const paragrafos = [];
      paragrafos.push(
        `Separando ${emReais(disponivel)} por mês e seguindo essa ordem, as dívidas acabam em ` +
        `${emMeses(porJuros.meses)}, com ${emReais(porJuros.totalJuros)} pagos em juros no caminho.`,
      );
      if (sobra > 0.01 && dividas.length > 1) {
        paragrafos.push(
          `Na prática: pague as parcelas de sempre e mande os ${emReais(sobra)} que sobram para “${primeira.nome}”, ` +
          'todo mês, até essa dívida zerar.',
        );
      }
      saida.append(bloco('boa', 'O plano em uma frase', ...paragrafos));
    } else {
      // Projetar cinquenta anos devolveria um número astronômico, que não
      // ajuda ninguém a entender nada. Um ano já conta a história.
      const em12 = saldoDepoisDe(dividas, disponivel, ordemJuros, 12);
      const paragrafos = [
        `Pagando ${emReais(disponivel)} todo mês, a dívida não diminui: ela cresce. ` +
        `Hoje ela está em ${emReais(r.totalDevido)}; daqui a um ano, mantidas as mesmas condições, estaria perto de ${emReais(em12)}.`,
        'Isso não é conta errada nem falta de esforço seu — é uma dívida que não tem como ser paga desse jeito, e reconhecer isso é o começo da saída.',
      ];
      // O encaminhamento ao Procon já apareceu no aviso de cima quando a
      // parcela não cobre nem os juros. Não repetimos.
      if (r.parcelaCobreJuros) {
        paragrafos.push(
          'Um caso assim se resolve renegociando, não apertando mais o orçamento. Procure o Procon ou a Defensoria Pública, que podem chamar de uma vez todo mundo a quem você deve, ou fale direto com quem você deve, por escrito, guardando o número do protocolo.',
        );
      }
      saida.append(bloco('aviso', 'Com esse valor por mês, a dívida não acaba', ...paragrafos));
    }

    /* ---------- comparação entre as duas ordens ---------- */

    if (dividas.length > 1 && sobra > 0.01 && porJuros.fecha && porSaldo.fecha) {
      const difJuros = porSaldo.totalJuros - porJuros.totalJuros;
      const difMeses = porSaldo.meses - porJuros.meses;
      const corpoComp = [];

      if (difJuros > 1) {
        corpoComp.push(
          `Muita gente prefere começar pela dívida menor, para ver uma conta sumir logo. Com os seus números, essa escolha custaria ` +
          `${emReais(difJuros)} a mais em juros` +
          (difMeses > 0 ? ` e ${emMeses(difMeses)} a mais de pagamento.` : '.'),
        );
        corpoComp.push(
          'As duas ordens funcionam. A diferença acima é o preço de quitar a menor primeiro — e ver uma dívida acabar ajuda a não desistir no meio, o que também vale alguma coisa. A escolha é sua; a conta está aí.',
        );
      } else {
        corpoComp.push(
          'Com os seus números, começar pela dívida de juros mais altos ou pela dívida menor dá praticamente no mesmo. ' +
          'Nesse caso, escolha a que você acha que vai conseguir sustentar até o fim.',
        );
      }
      saida.append(bloco('boa', 'E se eu preferir quitar a menor primeiro?', ...corpoComp));
    }
  }

  /* ---------- ressalvas ---------- */

  const ressalva = el('div', 'ressalva');
  ressalva.append(el('span', 'label', 'O que esta conta não sabe'));
  ressalva.append(el('p', null,
    'A conta parte do princípio de que os juros continuam os mesmos, que você consegue pagar todo mês sem falhar e que não entram dívidas novas. ' +
    'Na vida real, multa por atraso, tarifa, seguro embutido e mudança de taxa mexem no resultado.',
  ));
  ressalva.append(el('p', null,
    'Ela também não sabe o que você deve fora de banco e financeira: carnê de loja, conta de luz, aluguel, escola, plano de saúde. Se essas ficaram de fora, o retrato está menor do que a realidade.',
  ));
  ressalva.append(el('p', null,
    'Use este resultado como o retrato que você leva para o Procon, para a Defensoria ou para a conversa com quem você deve. Ele não substitui nenhum dos três.',
  ));
  saida.append(ressalva);

  corpoResultado.replaceChildren(saida);
  secaoResultado.hidden = false;
  secaoResultado.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function notaRodape(texto) {
  const p = el('p', 'fina', texto);
  return p;
}

function tabelaOrdem(dividas, ordem, simulacao, comOrdem = true) {
  const rolagem = el('div', 'tabela-rolagem');
  const tabela = el('table');

  const thead = el('thead');
  const linhaTitulo = el('tr');
  const titulos = [
    comOrdem ? 'Ordem e dívida' : 'Dívida',
    'Falta pagar', 'Juros ao mês', 'Cresce por mês', 'Acaba em',
  ];
  for (const t of titulos) linhaTitulo.append(el('th', null, t));
  thead.append(linhaTitulo);
  tabela.append(thead);

  const tbody = el('tbody');
  ordem.forEach((id, i) => {
    const d = dividas.find((x) => x.id === id);
    const tr = el('tr');

    const tdNome = el('td');
    if (comOrdem) tdNome.append(el('span', 'ordem-n', `${i + 1}º`));
    tdNome.append(document.createTextNode((comOrdem ? ' ' : '') + d.nome));
    tr.append(tdNome);

    tr.append(el('td', null, emReais(d.saldo)));
    tr.append(el('td', null, emPorcentoAoMes(d.taxa, false)));
    tr.append(el('td', null, emReais(d.saldo * d.taxa)));

    const mes = simulacao.quitacao[d.id];
    tr.append(el('td', null,
      simulacao.fecha && mes ? `mês ${mes}` : (mes ? `mês ${mes}` : 'não fecha')));

    tbody.append(tr);
  });
  tabela.append(tbody);

  rolagem.append(tabela);

  const caixa = el('div');
  caixa.append(rolagem);
  // Em tela estreita a tabela não cabe inteira e rola para o lado. O aviso
  // só aparece no celular, por CSS.
  caixa.append(el('p', 'dica-rolagem', 'Arraste a tabela para o lado para ver o resto das colunas.'));
  return caixa;
}

/* ------------------------------------------------------------------ *
 * Ligações da tela
 * ------------------------------------------------------------------ */

$('#formulario').addEventListener('submit', calcular);

$('#adicionar').addEventListener('click', () => {
  const no = adicionarDivida();
  $('.f-nome', no).focus();
});

$('#limpar').addEventListener('click', () => {
  lista.replaceChildren();
  $('#renda').value = '';
  $('#disponivel').value = '';
  corpoResultado.replaceChildren();
  secaoResultado.hidden = true;
  adicionarDivida();
});

$('#exemplo').addEventListener('click', () => {
  lista.replaceChildren();
  adicionarDivida({ nome: 'Cartão de crédito', saldo: '3.000', parcela: '450', juros: '13,5' });
  adicionarDivida({ nome: 'Cheque especial', saldo: '1.200', parcela: '150', juros: '8' });
  adicionarDivida({ nome: 'Consignado', saldo: '8.000', parcela: '380', juros: '1,8' });
  $('#renda').value = '3.000';
  $('#disponivel').value = '1.200';
});

$('#imprimir').addEventListener('click', () => window.print());

adicionarDivida();
