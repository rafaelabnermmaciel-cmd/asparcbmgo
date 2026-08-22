// Paleta categórica validada (dataviz skill, references/palette.md) — ordem fixa, nunca ciclada
// além do tamanho da própria paleta. Mesma paleta do painel-nacional, pra manter consistência
// visual entre os dois painéis.
export const CATEGORICO = [
  { light: '#2a78d6', dark: '#3987e5' }, // blue
  { light: '#eb6834', dark: '#d95926' }, // orange
  { light: '#1baf7a', dark: '#199e70' }, // aqua
  { light: '#eda100', dark: '#c98500' }, // yellow
  { light: '#e87ba4', dark: '#d55181' }, // magenta
  { light: '#008300', dark: '#008300' }, // green
  { light: '#4a3aa7', dark: '#9085e9' }, // violet
  { light: '#e34948', dark: '#e66767' }, // red
];

export function corCategorica(i, theme) {
  return CATEGORICO[i % CATEGORICO.length][theme];
}
