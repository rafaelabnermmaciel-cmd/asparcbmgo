const UA = 'painel-captacao-cbmgo/1.0 (uso interno, sem fins comerciais)';
const PAGINA = 'Eleições estaduais em Goiás em 2026';
const url = `https://pt.wikipedia.org/w/api.php?action=parse&page=${encodeURIComponent(PAGINA)}&prop=wikitext&format=json`;
const res = await fetch(url, { headers: { 'User-Agent': UA } });
const data = await res.json();
const wikitext = data.parse.wikitext['*'];

function extrairSecao(texto, nomeSecao, nivel = '==') {
  const escapado = nomeSecao.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`^${nivel}+\\s*${escapado}\\s*${nivel}+$`, 'm');
  const m = re.exec(texto);
  if (!m) return null;
  const inicio = m.index + m[0].length;
  const resto = texto.slice(inicio);
  const marcadorFim = resto.search(new RegExp(`^={2,${nivel.length}}(?!=)`, 'm'));
  return marcadorFim === -1 ? resto : resto.slice(0, marcadorFim);
}
function limparNomeCelula(celula) {
  let s = celula.trim();
  s = s.replace(/'''/g, '');
  s = s.replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, '$2');
  s = s.replace(/\[\[([^\]]+)\]\]/g, '$1');
  s = s.replace(/\s*\([^)]*\)\s*$/, '');
  return s.trim();
}
function celulasDaLinha(blocoLinha) {
  return blocoLinha.split('\n').map((l) => l.trim())
    .filter((l) => l.startsWith('|') && !l.startsWith('|-') && !l.startsWith('|}'))
    .map((l) => l.replace(/^\|\s*(?:style="[^"]*"\s*\|)?\s*/, '').trim());
}
const secaoResultados = extrairSecao(wikitext, 'Resultados');
const secaoFederais = extrairSecao(secaoResultados, 'Deputados federais', '===');
console.log('--- bruto completo da secaoFederais ---');
console.log(secaoFederais);
console.log('--- fim do bruto ---');
