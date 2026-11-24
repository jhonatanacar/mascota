// Validación de lo que responde la IA. Código fijo: la IA propone, esto decide qué se muestra.
// Lo usan index.html e ia.test.js. Depende de reglas.js (chocan).

const iaReglas = typeof module !== 'undefined' ? require('./reglas.js') : { chocan };

// res: JSON devuelto por la IA. prohibidos: reglas alergia/evitar activas + tóxicos.
// disponibles: { prot: [ids], carb: [ids], veg: [ids] } que la app permite para el menú.
function validarIA(res, prohibidos, disponibles, catalogo = []) {
  if (!res || typeof res.respuesta !== 'string' || !res.respuesta.trim()) return { error: 'La IA respondió algo inválido. Intenta de nuevo.' };
  const recomendados = Array.isArray(res.alimentos_recomendados) ? res.alimentos_recomendados.filter(a => typeof a === 'string' && a.trim()) : [];

  // el menú solo vale si cada id está entre los permitidos y su nombre no choca con nada
  let menu = null;
  if (res.menu && typeof res.menu === 'object') {
    const ids = ['prot', 'carb', 'veg'].map(k => res.menu[k]);
    if (ids.every((id, i) => (disponibles[['prot', 'carb', 'veg'][i]] || []).includes(id))) menu = { prot: ids[0], carb: ids[1], veg: ids[2] };
  }
  const nombresMenu = menu ? Object.values(menu).map(id => catalogo.find(c => c.id === id)?.nombre || id) : [];

  const bloqueos = [...recomendados, ...nombresMenu].flatMap(a => iaReglas.chocan(a, prohibidos).map(regla => ({ alimento: a, regla })));
  if (bloqueos.length) menu = null;

  // nombra algo prohibido en el texto (puede ser "evita el pollo"): no bloquea, pero se avisa
  const menciones = prohibidos.filter(r => iaReglas.chocan(res.respuesta, [r]).length).map(r => r.sustancia);

  const rp = res.regla_propuesta;
  const regla = rp && ['alergia', 'evitar', 'preferencia'].includes(rp.tipo) && typeof rp.sustancia === 'string' && rp.sustancia.trim()
    ? { tipo: rp.tipo, sustancia: rp.sustancia.trim().slice(0, 60), motivo: String(rp.motivo || '').slice(0, 200) } : null;
  const aprendizaje = typeof res.aprendizaje === 'string' && res.aprendizaje.trim() ? res.aprendizaje.trim().slice(0, 200) : null;

  return { respuesta: res.respuesta.trim().slice(0, 1500), recomendados, menu, bloqueos, menciones, regla, aprendizaje };
}

if (typeof module !== 'undefined') module.exports = { validarIA };
