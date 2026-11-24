// Test de la validación de la IA. Correr: node ia.test.js  (si falla, no se publica)
const assert = require('node:assert');
const { validarIA } = require('./ia.js');
const { CATALOGO, TOXICOS } = require('./comida.js');

const alergia = { id: 'r1', tipo: 'alergia', sustancia: 'pollo', sinonimos: ['gallina', 'ave', 'chicken'], activa: true };
const prohibidos = [alergia, ...TOXICOS];
const disp = { prot: ['pavo', 'pescado'], carb: ['arroz'], veg: ['zanahoria'] };
const v = res => validarIA(res, prohibidos, disp, CATALOGO);

// respuesta normal
const ok = v({ respuesta: 'Puede comer zanahoria cocida.', alimentos_recomendados: ['zanahoria'] });
assert.deepStrictEqual([ok.bloqueos.length, ok.menu, ok.regla, ok.aprendizaje], [0, null, null, null]);

// la IA recomienda pollo o chocolate -> bloqueado
assert.strictEqual(v({ respuesta: 'Dale pollo hervido', alimentos_recomendados: ['Pollo hervido'] }).bloqueos[0].regla.id, 'r1');
assert.strictEqual(v({ respuesta: 'Un premio', alimentos_recomendados: ['galleta de chocolate'] }).bloqueos[0].regla.toxico, true);
assert.strictEqual(v({ respuesta: 'x', alimentos_recomendados: ['caldo de gallina'] }).bloqueos.length, 1, 'sinónimo');

// menú: solo ids permitidos
assert.deepStrictEqual(v({ respuesta: 'Menú', menu: { prot: 'pavo', carb: 'arroz', veg: 'zanahoria' } }).menu, { prot: 'pavo', carb: 'arroz', veg: 'zanahoria' });
assert.strictEqual(v({ respuesta: 'Menú', menu: { prot: 'pollo', carb: 'arroz', veg: 'zanahoria' } }).menu, null, 'pollo no está permitido');
assert.strictEqual(v({ respuesta: 'Menú', menu: { prot: 'pavo', carb: 'quinoa', veg: 'zanahoria' } }).menu, null, 'id fuera de la lista');
assert.strictEqual(v({ respuesta: 'Menú', menu: { prot: 'pavo' } }).menu, null, 'menú incompleto');
// aunque el id esté en la lista, si su nombre choca se bloquea (defensa extra)
const dispMal = { prot: ['pollo'], carb: ['arroz'], veg: ['zanahoria'] };
const mal = validarIA({ respuesta: 'Menú', menu: { prot: 'pollo', carb: 'arroz', veg: 'zanahoria' } }, prohibidos, dispMal, CATALOGO);
assert.ok(mal.menu === null && mal.bloqueos.length === 1, 'defensa extra del menú');

// menciones: no bloquea, solo avisa
const men = v({ respuesta: 'Evita el pollo y el chocolate.', alimentos_recomendados: [] });
assert.deepStrictEqual([men.bloqueos.length, men.menciones], [0, ['pollo', 'chocolate']]);

// regla y aprendizaje propuestos
const rp = v({ respuesta: 'Se rasca después del salmón', regla_propuesta: { tipo: 'alergia', sustancia: ' salmón ', motivo: '3 veces' }, aprendizaje: 'Se rasca más en invierno' });
assert.deepStrictEqual(rp.regla, { tipo: 'alergia', sustancia: 'salmón', motivo: '3 veces' });
assert.strictEqual(rp.aprendizaje, 'Se rasca más en invierno');
assert.strictEqual(v({ respuesta: 'x', regla_propuesta: { tipo: 'borrar_todo', sustancia: 'x' } }).regla, null, 'tipo inválido');
assert.strictEqual(v({ respuesta: 'x', regla_propuesta: { tipo: 'alergia', sustancia: '' } }).regla, null);

// respuestas inválidas
for (const malo of [null, {}, { respuesta: '' }, { respuesta: 42 }, 'texto']) assert.ok(validarIA(malo, prohibidos, disp).error, 'inválida: ' + JSON.stringify(malo));
assert.strictEqual(v({ respuesta: 'x'.repeat(5000) }).respuesta.length, 1500, 'recorta textos largos');

console.log('ia.test.js: OK');
