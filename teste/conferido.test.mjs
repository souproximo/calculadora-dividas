// A data de verificação aparece em vários lugares da página. Se um deles for
// trocado e os outros não, a página diz duas datas diferentes para a mesma
// coisa. Para trocar todas juntas:  node ferramentas/conferido.mjs AAAA-MM-DD

import test from 'node:test';
import assert from 'node:assert/strict';

import { datasAtuais } from '../ferramentas/conferido.mjs';

test('a data de verificação é a mesma em todos os lugares', () => {
  const datas = datasAtuais();
  const primeira = datas[0].data;
  for (const { nome, arquivo, data } of datas) {
    assert.equal(data, primeira, `${arquivo} (${nome}) diz ${data}, o resto diz ${primeira}`);
  }
});
