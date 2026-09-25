# Como contribuir

Obrigado por olhar. Esta ferramenta aceita ajuda de qualquer pessoa, sem
precisar concordar com a motivação do projeto — só com as regras abaixo.

Contato: **contato@souproximo.org** · pull requests também funcionam. As
issues ficam desligadas de propósito: é fácil alguém colar a própria dívida
numa página pública.

## As três linhas vermelhas

Qualquer uma destas derruba um pull request, por melhor que esteja o código:

1. **Nada sai do aparelho de quem usa.** Sem `fetch`, sem
   `XMLHttpRequest`, sem `sendBeacon`, sem `<form action>`, sem iframe, sem
   pixel, sem medição de audiência.
2. **Nada fica guardado.** Sem `localStorage`, `sessionStorage`,
   `document.cookie`, IndexedDB, Cache API ou service worker. Sim, isso
   significa que a pessoa perde o que digitou ao recarregar — e é assim de
   propósito. A lista de dívidas de alguém é a informação mais delicada que
   essa pessoa tem, e o aparelho onde ela vai digitar isso é, muitas vezes,
   emprestado.
3. **Nenhuma dependência em tempo de execução.** Sem framework, sem pacote
   carregado de CDN, sem build. O que vai para o ar é o que está no
   repositório. Ferramenta de desenvolvimento pode entrar, desde que o site
   continue funcionando sem ela.

## As sete regras do projeto

Estão em <https://souproximo.org>. Três delas pegam direto neste código:

- **Regra 01 — sem receita.** Sem afiliado, sem patrocínio, sem “parceiro em
  destaque”. Nenhuma empresa privada é recomendada nesta página, nem de graça.
  Citar Serasa, SPC e Boa Vista como *o que existe* é informação; indicar um
  deles seria recomendação, e não entra.
- **Regra 04 — encaminhar ao canal oficial.** Nenhuma mudança pode fazer a
  página parecer uma alternativa ao Procon, à Defensoria ou ao CRAS. A conta
  organiza o problema; quem resolve são eles.
- **Regra 05 — data de verificação.** O README tem a tabela do que envelhece e
  onde está cada coisa. Mexeu num desses pontos, atualize a data nos quatro
  lugares listados lá.

## Onde mexer

- **`calculo.js` é a conta.** Funções puras: entram números, saem números.
  Nenhuma referência a `document`, `window`, rede ou armazenamento entra aqui.
  Toda mudança de fórmula precisa vir com teste.
- **`calculadora.js` é a tela.** Lê campos, chama `calculo.js`, escreve o
  resultado. Nunca monta HTML com `innerHTML` a partir do que a pessoa digitou
  — use `textContent` e os ajudantes que já estão lá.
- **`index.html` e `calculadora.css`** são o conteúdo e a aparência. O CSS
  precisa continuar funcionando no tema claro, no tema escuro e na impressão.
- **`src/worker.js` é o servidor.** Ele corta o `/dividas` do caminho e aplica
  os cabeçalhos de segurança. A política de segurança que sai dali é parte do
  que esta página promete a quem usa: afrouxá-la exige justificativa, e os
  testes de `teste/worker.test.mjs` existem para travar isso.

## Estilo

- Indentação de 2 espaços, aspas duplas no HTML, aspas simples no JavaScript.
- **Nomes em português** para funções, variáveis e classes. Quem provavelmente
  vai manter isso depois pensa em português.
- Comentário explica **o porquê**, não o quê — e aqui o porquê costuma ser uma
  das sete regras ou uma fonte oficial. Cite a regra ou o decreto.
- Valores que vêm da lei ficam em constante nomeada, com a fonte e a data no
  comentário (ver `MINIMO_EXISTENCIAL`).

## A linguagem

O teste é um só: **a pessoa que está com o problema entende a frase de
primeira?** Se precisa reler, reescreve.

Quem usa esta página está no pior momento financeiro da vida dela. Duas coisas
que o texto nunca faz:

- **Culpar.** Nada de “descontrole”, “falta de planejamento”, “educação
  financeira”. A pessoa não está aqui para ser corrigida.
- **Assustar sem saída.** Todo número ruim que a página mostra vem junto com
  para onde ir. O aviso de que a dívida não fecha existe para mandar a pessoa
  ao Procon, não para desesperar.

Palavras que não entram: *beneficiário, público-alvo, vulnerabilidade social,
plataforma, ecossistema, solução digital, empoderamento, stakeholder,
inadimplente*.

## Antes de abrir um pull request

- [ ] `node --test` passa.
- [ ] Se mudei fórmula, escrevi teste para ela.
- [ ] Abri a página num servidor local e usei do começo ao fim.
- [ ] Conferi no log de rede que **nenhuma requisição sai** do domínio.
- [ ] Procurei por `fetch`, `localStorage`, `cookie` e `innerHTML` no diff e
      não tem nenhum.
- [ ] Conferi no tema claro e no tema escuro.
- [ ] Conferi numa largura de celular (360px).
- [ ] Conferi a visualização de impressão.
- [ ] Se mexi em informação que envelhece, atualizei a data de verificação.

## Ideias que combinam com esta ferramenta

Se quiser ajudar e não souber por onde, estas estão em aberto:

- Campo para dívidas que não têm parcela fixa (cartão no rotativo, cheque
  especial), onde a pessoa paga o que dá.
- Gerador da carta de proposta de renegociação, para a pessoa levar impressa ao
  credor ou colar no consumidor.gov.br.
- Conferência de acessibilidade com leitor de tela de verdade.
- Revisão do texto por alguém que atende gente endividada no dia a dia. Essa é
  a mais valiosa de todas e não precisa de uma linha de código.
