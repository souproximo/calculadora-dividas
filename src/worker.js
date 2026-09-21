// O Worker que serve esta calculadora em https://souproximo.org/dividas
//
// Por que existe um script aqui, se a página é só arquivo estático:
//
// 1. A ferramenta mora num caminho (`/dividas`) e não num domínio próprio,
//    porque o endereço canônico é o que carrega a credibilidade do projeto.
//    Mas os arquivos no repositório são `/index.html`, `/calculadora.css` e
//    assim por diante. Este script tira o `/dividas` do começo do caminho
//    antes de procurar o arquivo.
//
// 2. Os cabeçalhos de segurança são aplicados aqui, em código, e não num
//    arquivo `_headers`. A documentação da Cloudflare não garante que o
//    `_headers` valha para resposta que passou por script de Worker, e a
//    política de segurança desta página é parte do que ela promete a quem
//    usa. Promessa central não fica dependendo de comportamento não
//    documentado.
//
// Se o caminho não começar com /dividas — por exemplo rodando localmente com
// `npx wrangler dev` — o script serve na raiz, sem tirar nada. Assim a mesma
// página funciona montada e solta.

const PREFIXO = '/dividas';

/**
 * Cabeçalhos aplicados a toda resposta.
 *
 * A política de segurança começa em `default-src 'none'`: o navegador recusa
 * qualquer requisição que não seja para este mesmo domínio. É o que sustenta,
 * do lado do servidor, a frase "nada do que você digitar sai do seu aparelho"
 * — mesmo que um dia alguém acrescente sem querer uma chamada externa ao
 * código, o navegador bloqueia.
 */
const SEGURANCA = {
  'Content-Security-Policy': [
    "default-src 'none'",
    "script-src 'self'",
    "style-src 'self'",
    "font-src 'self'",
    "img-src 'self'",
    "connect-src 'none'",
    "base-uri 'none'",
    "form-action 'none'",
    "frame-ancestors 'none'",
    'upgrade-insecure-requests',
  ].join('; '),
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
  'Referrer-Policy': 'no-referrer',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Permissions-Policy':
    'accelerometer=(), camera=(), geolocation=(), gyroscope=(), ' +
    'magnetometer=(), microphone=(), payment=(), usb=(), interest-cohort=()',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Resource-Policy': 'same-origin',
};

/** As fontes têm nome fixo e nunca mudam de conteúdo: cache de um ano. */
const CACHE_FONTES = 'public, max-age=31536000, immutable';
/** O resto é pequeno e pode mudar a qualquer revisão: sempre reconferir. */
const CACHE_PAGINA = 'public, max-age=0, must-revalidate';

export default {
  async fetch(pedido, ambiente) {
    const url = new URL(pedido.url);

    // Esta página só é lida. Nada aqui recebe formulário.
    if (pedido.method !== 'GET' && pedido.method !== 'HEAD') {
      return new Response('Método não permitido.', {
        status: 405,
        headers: { allow: 'GET, HEAD', 'content-type': 'text/plain; charset=utf-8' },
      });
    }

    // Sem a barra final, o navegador procuraria /calculadora.css na raiz do
    // domínio em vez de /dividas/calculadora.css.
    if (url.pathname === PREFIXO) {
      url.pathname = PREFIXO + '/';
      return Response.redirect(url.toString(), 301);
    }

    const montado = url.pathname.startsWith(PREFIXO + '/');
    const caminho = montado ? url.pathname.slice(PREFIXO.length) : url.pathname;

    const interno = new URL(caminho + url.search, url.origin);
    const resposta = await ambiente.ASSETS.fetch(new Request(interno, pedido));

    // Copiamos para poder mexer nos cabeçalhos: a resposta original é imutável.
    const saida = new Response(resposta.body, resposta);
    for (const [nome, valor] of Object.entries(SEGURANCA)) {
      saida.headers.set(nome, valor);
    }
    saida.headers.set(
      'Cache-Control',
      caminho.startsWith('/fonts/') ? CACHE_FONTES : CACHE_PAGINA,
    );

    return saida;
  },
};
