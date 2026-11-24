// Test del filtro de reglas. Correr: node reglas.test.js  (si falla, no se publica)
const assert = require('node:assert');
const { chocan, sugerirSinonimos, normalizar } = require('./reglas.js');

const pollo = { tipo: 'alergia', sustancia: 'Pollo', sinonimos: sugerirSinonimos('pollo'), gravedad: 'grave', activa: true };
const reglas = [pollo];
const bloquea = t => assert.strictEqual(chocan(t, reglas).length, 1, `debería bloquear: "${t}"`);
const pasa = t => assert.strictEqual(chocan(t, reglas).length, 0, `debería pasar: "${t}"`);

bloquea('Croquetas sabor pollo');
bloquea('POLLO al horno');
bloquea('pollos');
bloquea('Harina de ave');
bloquea('Subproductos de aves');
bloquea('caldo de gallina');
bloquea('Adult Chicken & Rice');
bloquea('carne de pollo, arroz');

pasa('Cordero con arroz');
pasa('repollo cocido');
pasa('avena');
pasa('nave');
pasa('');
pasa(null);

bloquea('Chicken-flavored treats');
bloquea('chickens');
bloquea('proteína avícola');

// plurales en compuestos y femeninos (otras sustancias)
const r = s => [{ tipo: 'alergia', sustancia: s, sinonimos: sugerirSinonimos(s) }];
assert.strictEqual(chocan('Harinas de trigo', r('trigo')).length, 1, 'plural compuesto');
assert.strictEqual(chocan('carnes de res', r('res')).length, 1, 'plural compuesto 2');
assert.strictEqual(chocan('grasa bovina', r('res')).length, 1, 'femenino');
assert.strictEqual(chocan('proteínas lácteas', r('leche')).length, 1, 'femenino plural');
assert.strictEqual(chocan('carne porcina', r('cerdo')).length, 1, 'femenino 2');
assert.strictEqual(chocan('arroz integral', r('trigo')).length, 0, 'no bloquea de más');

// regla inactiva o que no bloquea
assert.strictEqual(chocan('pollo', [{ ...pollo, activa: false }]).length, 0, 'inactiva no bloquea');
assert.strictEqual(chocan('pollo', [{ ...pollo, tipo: 'preferencia' }]).length, 0, 'preferencia no bloquea');
assert.strictEqual(chocan('pollo', [{ ...pollo, tipo: 'evitar' }]).length, 1, 'evitar bloquea');

// tildes y mayúsculas en la regla y en el texto
assert.strictEqual(chocan('Salmón ahumado', [{ tipo: 'alergia', sustancia: 'SALMÓN', sinonimos: [] }]).length, 1, 'tildes');
assert.strictEqual(normalizar('  Maíz-Ñandú!! '), 'maiz nandu');
assert.deepStrictEqual(sugerirSinonimos('Maíz'), ['corn']);
assert.deepStrictEqual(sugerirSinonimos('chocolate'), []);

console.log('reglas.test.js: OK');
