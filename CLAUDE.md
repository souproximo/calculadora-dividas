# Instruções para o Claude Code

Leia antes de propor qualquer mudança. O [CONTRIBUTING.md](CONTRIBUTING.md)
tem a versão longa; isto aqui é o que não pode passar batido.

## O que é este repositório

A **calculadora de dívidas** do [Sou Próximo](https://souproximo.org), no ar em
`souproximo.org/dividas`. Ela ensina a levantar a lista de dívidas no
Registrato do Banco Central, soma o que a pessoa deve e mostra em que ordem
pagar.

**Quem usa esta página está no pior momento financeiro da vida dela.** Essa
frase decide quase tudo abaixo.

## As três linhas vermelhas

Qualquer uma derruba a mudança, por melhor que esteja o código:

1. **Nada sai do aparelho de quem usa.** Sem `fetch`, `XMLHttpRequest`,
   `sendBeacon`, `<form action>`, iframe, pixel ou medição de audiência.
2. **Nada fica guardado.** Sem `localStorage`, `sessionStorage`,
   `document.cookie`, IndexedDB, Cache API ou service worker. Sim, a pessoa
   perde o que digitou ao recarregar — **é de propósito**. A lista de dívidas
   de alguém é a informação mais delicada que essa pessoa tem, e o aparelho
   onde ela digita isso é, muitas vezes, emprestado. Não "melhore a
   experiência" salvando rascunho.
3. **Nenhuma dependência em tempo de execução.** Sem framework, sem pacote de
   CDN, sem build. O que está no repositório é o que vai para o ar.

Se a mudança pedida esbarra numa delas, diga isso em vez de contornar.

## Onde mexer

| Arquivo | O que é | Regra |
|---|---|---|
| `calculo.js` | a conta, em funções puras | nenhuma referência a `document`, `window`, rede ou armazenamento entra aqui. Mudou fórmula, escreveu teste |
| `calculadora.js` | a tela | nunca monte HTML com `innerHTML` a partir do que a pessoa digitou — use `textContent` e os ajudantes que já existem |
| `src/worker.js` | o servidor | corta o `/dividas` do caminho e aplica os cabeçalhos de segurança. Afrouxar a CSP exige justificativa |
| `index.html` / `calculadora.css` | conteúdo e aparência | precisa funcionar no tema claro, no escuro e na impressão |

## Testes

```sh
node --test
```

45 testes, sem instalar nada. Rode antes de entregar. Mexeu em fórmula ou em
cabeçalho, escreva teste junto — é o que impede a próxima mudança de desfazer
esta sem ninguém perceber.

## O texto

Teste único: **a pessoa que está com o problema entende de primeira?** Se
precisa reler, reescreve.

Duas coisas que o texto nunca faz:

- **Culpar.** Nada de "descontrole", "falta de planejamento", "educação
  financeira". A pessoa não está aqui para ser corrigida.
- **Assustar sem saída.** Todo número ruim vem junto com para onde ir. O aviso
  de que a dívida não fecha existe para mandar a pessoa ao Procon, não para
  desesperar. Foi por isso que a projeção é de **um ano** e não de cinquenta:
  cinquenta devolvia um número astronômico que não ajuda ninguém.

Palavras que não entram: *beneficiário, público-alvo, vulnerabilidade social,
plataforma, ecossistema, solução digital, empoderamento, stakeholder,
inadimplente*.

**Nenhuma empresa privada é recomendada nesta página, nem de graça.** Citar
Serasa, SPC e Boa Vista como *o que existe* é informação; indicar um deles
seria recomendação, e não entra. Nada de empréstimo, banco, aplicativo ou
"limpa nome".

**A página é descritiva, nunca prescritiva.** Ela mostra o retrato e encaminha
a Procon, Defensoria, consumidor.gov.br, CRAS e ao canal do credor. Não
negocia, não aconselha juridicamente, não diz o que a pessoa deve contratar.

## O que envelhece (tem data de verificação)

| O quê | Onde | Observação |
|---|---|---|
| Mínimo existencial, hoje R$ 600 | `calculo.js` → `MINIMO_EXISTENCIAL` | o STF determinou revisão anual em 23/04/2026, então **espera-se que mude** |
| Passo a passo do Registrato | `index.html`, seção Passo 1 | o serviço já mudou de lugar uma vez |
| Nível exigido da conta gov.br | `index.html`, Passo 1 | |
| Canais oficiais citados | `index.html`, "Onde pedir ajuda" | |
| Limite de juros do cartão (juros até 100% do valor original) | `calculo.js` → `TETO_CARTAO_CONFERIDO_EM`; aviso em `calculadora.js` | Lei 14.690/2023, art. 28, e Resolução CMN 5.112/2023. Data própria, conferida em 25/09/2026: mudar a constante e o aviso sai junto |
| A data em si | selo do cabeçalho, nota do rodapé, `MINIMO_EXISTENCIAL_CONFERIDO_EM` (o aviso do mínimo existencial lê dela) | `node ferramentas/conferido.mjs hoje` troca todos juntos — **só depois de conferir as linhas acima**; `teste/conferido.test.mjs` falha se divergirem |

Campanhas de renegociação com prazo curto (tipo Desenrola) ficaram de fora de
propósito: informação de prazo vencido é pior que informação nenhuma.

## Como conferir antes de entregar

```sh
node --test
python3 -m http.server 8000     # a página usa módulos; file:// não funciona
```

- Log de rede: **nenhuma requisição sai do domínio**.
- Procure no diff por `fetch`, `localStorage`, `cookie` e `innerHTML`.
- Tema claro, tema escuro, largura de 360px e a visualização de impressão.

## Publicação — não existe homologação

`git push` na `main` publica em `souproximo.org/dividas` em menos de um
minuto. Não há ambiente de teste. Commite pensando nisso.

**Não crie branch.** Enquanto só uma pessoa mexe no código, tudo é feito
direto na `main`. Isso muda quando entrar mais alguém contribuindo — até lá,
nada de branch nova, nem para mudança grande.

O `.assetsignore` decide o que vai para o ar: **arquivo novo é publicado por
padrão**. Criou algo que não é parte da página, liste lá.

## O que não está neste repositório

As decisões de posicionamento e de estratégia do projeto vivem fora daqui, num
espaço de documentos que você não enxerga. Se a mudança mexe em **o que** a
ferramenta promete, em quais canais são citados, ou em ampliar o escopo — é
decisão do Leandro. Implemente o que foi pedido e pergunte antes de ampliar.
