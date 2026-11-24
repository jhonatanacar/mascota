// Filtro de reglas (alergias / evitar). Código fijo, sin IA. Lo usan index.html y reglas.test.js.

// Sinónimos sugeridos al crear una regla; el usuario los revisa antes de guardar.
const SINONIMOS = {
  pollo: ['gallina', 'ave', 'chicken', 'poultry', 'avicola'],
  res: ['vacuno', 'bovino', 'ternera', 'beef', 'carne de res'],
  cerdo: ['puerco', 'chancho', 'porcino', 'pork', 'tocino'],
  pescado: ['salmon', 'atun', 'sardina', 'merluza', 'fish'],
  cordero: ['ovino', 'borrego', 'lamb'],
  pavo: ['turkey'],
  huevo: ['egg', 'ovoproducto'],
  leche: ['lacteo', 'lactosa', 'queso', 'yogur', 'milk', 'dairy'],
  trigo: ['gluten', 'wheat', 'harina de trigo'],
  maiz: ['corn'],
  soya: ['soja', 'soy'],
};

// minúsculas, sin tildes, solo letras/números separados por un espacio
function normalizar(s) {
  return String(s ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ').trim();
}

function sugerirSinonimos(sustancia) {
  return SINONIMOS[normalizar(sustancia)] || [];
}

// ¿aparece el término como palabras completas? "pollo" no coincide con "repollo".
// Cada palabra admite plural y cambio o/a: "lacteo" ~ "lacteas", "harina de trigo" ~ "harinas de trigo".
// Puede bloquear de más (ej. "polla"), nunca de menos: preferible en alergias.
function contiene(texto, termino) {
  const t = normalizar(termino);
  if (!t) return false;
  const patron = t.split(' ').map(w => (/[oa]$/.test(w) ? w.slice(0, -1) + '[oa]' : w) + '(s|es)?').join(' ');
  return new RegExp(`(^| )${patron}( |$)`).test(normalizar(texto)); // seguro: normalizar deja solo [a-z0-9 ]
}

// Reglas activas de tipo alergia/evitar cuya sustancia o algún sinónimo aparece en el texto.
function chocan(texto, reglas) {
  return reglas.filter(r => r.activa !== false && (r.tipo === 'alergia' || r.tipo === 'evitar') &&
    [r.sustancia, ...(r.sinonimos || [])].some(t => contiene(texto, t)));
}

if (typeof module !== 'undefined') module.exports = { normalizar, sugerirSinonimos, contiene, chocan };
