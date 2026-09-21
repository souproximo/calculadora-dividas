# Calculadora de dívidas

Primeira ferramenta do **[Sou Próximo](https://souproximo.org)**.

Quem está endividado quase nunca sabe o tamanho do próprio problema: as dívidas
estão espalhadas em faturas, carnês e aplicativos diferentes, e ninguém senta e
soma. Todos os canais que existem — Procon, Defensoria, Desenrola, o próprio
credor — pressupõem que a pessoa já saiba o que deve e quanto pode pagar.

Esta página faz três coisas, e só três:

1. **Ensina a levantar a lista** de dívidas no Registrato do Banco Central, que
   é gratuito e sai na hora.
2. **Soma o que a pessoa deve** e mostra quanto essa dívida cresce por mês.
3. **Mostra em que ordem pagar** para gastar menos juros, e quanto custa
   escolher outra ordem.

No ar em <https://souproximo.org/dividas>.

## O que ela não faz

Não negocia, não recomenda empréstimo, banco, aplicativo nem empresa de “limpa
nome”, não dá orientação jurídica e não fala com nenhum servidor. Ela é
**descritiva, nunca prescritiva**: mostra o retrato e manda a pessoa para quem
tem poder de resolver — Procon, Defensoria Pública, consumidor.gov.br, CRAS e o
canal do próprio credor. Isso é a regra 04 do projeto.

## Privacidade: a conta roda no aparelho da pessoa

Este repositório existe para que essa frase possa ser conferida em vez de
acreditada (regra 03). O que dá para verificar lendo o código:

- **Não há `fetch`, `XMLHttpRequest`, `navigator.sendBeacon` nem `<form action>`**
  em lugar nenhum. Nada do que é digitado sai do navegador.
- **Não há `localStorage`, `sessionStorage`, `document.cookie` nem IndexedDB.**
  Recarregar a página apaga tudo. É de propósito: a lista de dívidas de alguém
  é a informação mais delicada que essa pessoa tem, e um aparelho emprestado ou
  compartilhado é a regra, não a exceção, em quase todo lugar onde esta
  ferramenta vai ser usada.
- **Nenhuma requisição externa.** Sem Google Fonts, sem CDN, sem medição de
  audiência. As fontes estão em `fonts/`, servidas pelo próprio domínio.
- O `_headers` traz uma política `default-src 'none'` que faz o navegador
  bloquear qualquer chamada externa **mesmo que alguém adicione uma sem querer
  no futuro**.

Conferir na prática: abra o log de rede do navegador (F12 > Network), recarregue
e use a página inteira. Só devem aparecer os arquivos deste repositório.

Quem quiser guardar o resultado usa o botão de imprimir, que salva em PDF no
próprio aparelho.

## Os arquivos

```
index.html          a página
calculadora.css     estilo, com as fontes e a versão de impressão
calculadora.js      a tela: lê campos, chama a conta, escreve o resultado
calculo.js          a conta: funções puras, sem tela e sem rede
teste/              testes da conta
_headers            cabeçalhos HTTP do Cloudflare Pages
publicacao/         o Worker que serve esta página em souproximo.org/dividas
fonts/              10 arquivos .woff2 + as duas licenças SIL OFL
```

A separação entre `calculo.js` e `calculadora.js` é o ponto central do desenho:
**toda a matemática fica num arquivo que não conhece o navegador**, e por isso
pode ser testada e conferida linha a linha por quem nunca viu o resto.

## Rodar na sua máquina

Precisa de um servidor local — o `index.html` usa módulos JavaScript, que o
navegador recusa quando abertos direto do disco (`file://`).

```sh
python3 -m http.server 8000
# abrir http://localhost:8000
```

## Os testes

Sem dependência nenhuma: usa o test runner que já vem no Node 18+.

```sh
node --test
```

Os testes cobrem a leitura de números escritos como brasileiro escreve
(`1.234,56`), o cálculo da taxa implícita, a simulação mês a mês conferida
contra a tabela Price, e as três situações que a ferramenta precisa reconhecer:
parcela que não cobre nem os juros, dinheiro que não cobre nem as parcelas, e
dívida que não fecha nunca.

## O que envelhece aqui (regra 05)

Toda informação desta página tem data de verificação, e alguém precisa
reconferir. A lista completa do que muda:

| O quê | Onde está | Como conferir |
|---|---|---|
| Valor do **mínimo existencial** (hoje R$ 600) | `calculo.js` → `MINIMO_EXISTENCIAL` | Decreto 11.150/2022 com a redação do Decreto 11.567/2023. O STF determinou em 23/04/2026 revisão anual pelo Conselho Monetário Nacional — então **espera-se que mude** |
| Passo a passo do **Registrato** | `index.html` → seção Passo 1 | <https://www.bcb.gov.br/meubc> — o serviço já mudou de lugar uma vez |
| Nível exigido da **conta gov.br** | `index.html` → Passo 1 | <https://www.gov.br/governodigital/pt-br/conta-gov-br> |
| Nomes dos **relatórios** do Meu BC | `index.html` → Passo 1 | a própria tela do Meu BC |
| **Canais oficiais** citados | `index.html` → seção “Onde pedir ajuda” | Procon, Defensoria, consumidor.gov.br, CRAS |
| **Data de verificação** | `index.html` (selo do cabeçalho, nota do rodapé), `calculo.js` (`MINIMO_EXISTENCIAL_CONFERIDO_EM`) e o aviso do mínimo existencial em `calculadora.js` | mudar os quatro juntos |

Campanhas de renegociação com desconto (tipo Desenrola) **não são citadas nesta
página de propósito**: abrem e fecham com prazo curto, e informação de prazo
vencido é pior do que informação nenhuma. Quem precisa disso é mandado ao canal
do credor e ao Procon, que sabem o que está valendo hoje.

## Custo de manutenção declarado

Toda peça do Sou Próximo nasce dizendo quanto trabalho vai dar para manter.

**Esta: cerca de 30 minutos a cada seis meses**, mais uma revisão fora de hora
quando o valor do mínimo existencial mudar (o que agora acontece todo ano, por
decisão do STF) ou quando o Banco Central mexer no Registrato.

A conta em si não envelhece — juro composto é juro composto. O que envelhece é
o guia e o número da lei. É por isso que o guia é curto e manda para a fonte
oficial em vez de copiar a tela dela.

## Publicação

Projeto próprio no **Cloudflare Pages**, ligado direto a este repositório:

| Campo | Valor |
|---|---|
| Framework preset | None |
| Build command | *(vazio)* |
| Build output directory | `/` |

O endereço público é `souproximo.org/dividas`, servido pelo Worker em
`publicacao/worker-dividas.js` — as instruções de instalação estão dentro do
próprio arquivo. O visitante nunca vê o endereço `.pages.dev`.

Todos os caminhos de arquivo na página são **relativos** (`./calculadora.css`),
justamente para a página funcionar tanto na raiz de um domínio quanto dentro de
`/dividas/`.

## Como contribuir

Ver [CONTRIBUTING.md](CONTRIBUTING.md). Em resumo: nenhuma dependência nova,
nenhuma requisição externa, nenhum armazenamento, e o texto precisa ser
entendido de primeira por quem está com o problema.

## Licença

- **Código**: [MIT](LICENSE).
- **Texto da página**: [CC BY 4.0](LICENSE).
- **Fontes**: SIL Open Font License 1.1 — arquivos em `fonts/`.
- **O nome “Sou Próximo” e a marca gráfica não estão licenciados.**
