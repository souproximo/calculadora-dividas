/**
 * Worker da Cloudflare que serve esta calculadora em
 * https://souproximo.org/dividas — sem redirecionar o visitante para outro
 * endereço.
 *
 * Por que isto existe: o site souproximo.org e esta calculadora são dois
 * projetos separados no Cloudflare Pages, e o Pages não sabe montar um projeto
 * dentro de um caminho do outro. Este Worker faz a ponte: ele fica na rota
 * souproximo.org/dividas* e busca o conteúdo no projeto da calculadora,
 * devolvendo a resposta como se fosse do próprio domínio.
 *
 * Como instalar (painel da Cloudflare):
 *   1. Workers & Pages > Create > Worker. Nome: `dividas`.
 *   2. Colar este arquivo inteiro, publicar.
 *   3. Settings > Variables > adicionar a variável de ambiente
 *      ORIGEM = calculadora-dividas.pages.dev   (o endereço do projeto Pages)
 *   4. Settings > Domains & Routes > Add route:
 *        Route: souproximo.org/dividas*
 *        Zone:  souproximo.org
 *   5. Repetir a rota para www.souproximo.org/dividas*, se o www estiver em uso.
 *
 * Importante: ORIGEM não pode ser souproximo.org, senão o Worker chama a si
 * mesmo. Use o endereço .pages.dev do projeto da calculadora.
 */

const PREFIXO = '/dividas';

export default {
  async fetch(pedido, ambiente) {
    const origem = ambiente.ORIGEM;
    if (!origem) {
      return new Response(
        'Worker sem a variável ORIGEM configurada.',
        { status: 500, headers: { 'content-type': 'text/plain; charset=utf-8' } },
      );
    }

    const url = new URL(pedido.url);

    // Só lemos páginas. Nada aqui recebe formulário.
    if (pedido.method !== 'GET' && pedido.method !== 'HEAD') {
      return new Response('Método não permitido.', { status: 405 });
    }

    // /dividas sem barra final quebraria os caminhos relativos dos arquivos
    // (o navegador procuraria /calculadora.css em vez de /dividas/...).
    if (url.pathname === PREFIXO) {
      url.pathname = PREFIXO + '/';
      return Response.redirect(url.toString(), 301);
    }

    if (!url.pathname.startsWith(PREFIXO + '/')) {
      return new Response('Não encontrado.', { status: 404 });
    }

    const caminhoInterno = url.pathname.slice(PREFIXO.length) || '/';
    const alvo = new URL(caminhoInterno + url.search, `https://${origem}`);

    const resposta = await fetch(alvo.toString(), {
      method: pedido.method,
      headers: { accept: pedido.headers.get('accept') ?? '*/*' },
      redirect: 'manual',
      cf: { cacheEverything: true, cacheTtl: 300 },
    });

    // Copiamos a resposta para poder mexer nos cabeçalhos.
    const saida = new Response(resposta.body, resposta);

    // O projeto Pages da calculadora não deve aparecer em buscador com o
    // endereço .pages.dev: o endereço público é souproximo.org/dividas.
    saida.headers.delete('x-robots-tag');

    return saida;
  },
};
