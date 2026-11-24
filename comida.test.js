// Test de comida.js. Correr: node comida.test.js  (si falla, no se publica)
const assert = require('node:assert');
const { chocan } = require('./reglas.js');
const c = require('./comida.js');
const ing = id => c.CATALOGO.find(x => x.id === id);

// catálogo sano: ids únicos, todos con números válidos y grupo conocido
assert.strictEqual(new Set(c.CATALOGO.map(x => x.id)).size, c.CATALOGO.length, 'ids únicos');
for (const x of c.CATALOGO) {
  assert.ok(x.kcal > 0 && x.prot >= 0 && x.grasa >= 0 && c.GRUPOS[x.grupo], 'datos válidos: ' + x.id);
  assert.strictEqual(chocan(x.nombre, c.TOXICOS).length, 0, 'ningún ingrediente del catálogo es tóxico: ' + x.id);
}

// tóxicos: bloquean siempre, aunque el usuario no tenga reglas
for (const t of ['Galleta de chocolate', 'uvas pasas', 'pasas', 'arroz con cebolla', 'salsa de ajo', 'chicle con xilitol',
  'guacamole de aguacate', 'café', 'un hueso cocido de pollo', 'Nueces de macadamia']) {
  assert.ok(chocan(t, c.TOXICOS).length >= 1, 'tóxico no detectado: ' + t);
}
assert.strictEqual(chocan('pollo con arroz y zanahoria', c.TOXICOS).length, 0, 'comida normal no es tóxica');

// una alergia al pollo bloquea el ingrediente del catálogo
const alergiaPollo = [{ tipo: 'alergia', sustancia: 'pollo', sinonimos: ['ave'], activa: true }];
assert.strictEqual(chocan(ing('pollo').nombre, alergiaPollo).length, 1);
assert.strictEqual(chocan(ing('pavo').nombre, alergiaPollo).length, 0, 'pavo no es pollo');

// calorías: Schnauzer miniatura de 7 kg esterilizado -> RER ≈ 301, ×1.6 ≈ 482
const k = c.kcalDiarias({ kg: 7, edadMeses: 48, esterilizado: true });
assert.strictEqual(k.rer, 301);
assert.strictEqual(k.kcal, 482);
assert.strictEqual(c.kcalDiarias({ kg: 7, edadMeses: 6 }).factor, 2, 'cachorro');
assert.strictEqual(c.kcalDiarias({ kg: 7, edadMeses: 2 }).factor, 3, 'cachorro chico');
assert.strictEqual(c.kcalDiarias({ kg: 9, edadMeses: 60, objetivo: 'bajar', pesoObjetivo: 8 }).kcal, Math.round(70 * 8 ** 0.75));
assert.strictEqual(c.kcalDiarias({ kg: 9, edadMeses: 60, objetivo: 'bajar', pesoObjetivo: 6 }).kcal, Math.round(70 * 7.65 ** 0.75), 'no baja de golpe');
assert.ok(chocan('nueces', c.TOXICOS).length && chocan('jugo de carambola', c.TOXICOS).length, 'tóxicos nuevos');
assert.strictEqual(c.kcalDiarias({ kg: 7, edadMeses: 60, actividad: 'baja' }).factor, 1.4);
assert.strictEqual(c.kcalDiarias({ kg: 0 }), null);

// menú: llega a las calorías (±2 %), proporción 2:1:1 y por comida
const m = c.calcularMenu({ kcalDia: 482, prot: ing('pavo'), carb: ing('arroz'), veg: ing('zanahoria'), comidas: 2 });
assert.ok(Math.abs(m.kcal - 482 * 0.9) / (482 * 0.9) < 0.02, 'kcal del menú: ' + m.kcal);
assert.ok(Math.abs(m.gramos[0] - 2 * m.gramos[1]) <= 1 && Math.abs(m.gramos[1] - m.gramos[2]) <= 1, 'proporción 2:1:1');
assert.strictEqual(m.kcalPremios, 48);
assert.strictEqual(m.porComida[0], Math.round(m.gramos[0] / 2));
assert.deepStrictEqual(m.avisos, [], 'pavo+arroz+zanahoria sin avisos');
assert.ok(c.calcularMenu({ kcalDia: 482, prot: ing('salmon'), carb: ing('arroz'), veg: ing('espinaca') }).avisos.includes('grasa'), 'salmón avisa grasa');
assert.ok(c.calcularMenu({ kcalDia: 482, prot: ing('pavo'), carb: ing('arroz'), veg: ing('espinaca') }).avisos.includes('oxalato'), 'espinaca avisa oxalato');

// mixto 50 % con croquetas de 3600 kcal/kg
const mx = c.calcularMenu({ kcalDia: 400, prot: ing('pollo'), carb: ing('arroz'), veg: ing('zanahoria'), pctCasero: 50, reservaPremios: false });
assert.strictEqual(mx.croquetasG, Math.round(200 / 3.6));
assert.ok(Math.abs(mx.kcal - 200) <= 4);
// 0 % casero: solo croquetas, sin avisos de ingredientes
const solo = c.calcularMenu({ kcalDia: 360, prot: ing('salmon'), carb: ing('arroz'), veg: ing('zanahoria'), pctCasero: 0, reservaPremios: false });
assert.strictEqual(solo.croquetasG, 100);
assert.deepStrictEqual(solo.gramos, [0, 0, 0]);
assert.deepStrictEqual(solo.avisos, []);

// menú semanal y compras
const sem = c.menuSemanal({ prots: [ing('pavo'), ing('pescado')], carbs: [ing('arroz')], vegs: [ing('zanahoria'), ing('ahuyama')], kcalDia: 482 });
assert.strictEqual(sem.dias.length, 7);
assert.strictEqual(sem.dias[1].items[0].id, 'pescado', 'rota la proteína');
const arroz = sem.compras.find(x => x.nombre === ing('arroz').nombre);
assert.strictEqual(arroz.gramos, sem.dias.reduce((s, d) => s + d.gramos[1], 0), 'compras suma la semana');

// inventario
const hoy = new Date(2026, 10, 23);
const s = c.seAcaba({ kg: 3, abierto: '2026-11-13' }, 100, hoy); // 10 días usados -> quedan 2000 g -> 20 días
assert.deepStrictEqual([s.restante, s.dias, s.fecha.getDate()], [2000, 20, 13]);
assert.strictEqual(c.seAcaba({ kg: 1, abierto: '2026-01-01' }, 100, hoy).dias, 0, 'bolsa vacía');
assert.strictEqual(c.seAcaba({ kg: 1, abierto: '2026-11-23' }, 0, hoy), null);

// raza
assert.ok(c.esSchnauzer('Schnauzer miniatura') && c.esSchnauzer('schnauzer') && !c.esSchnauzer('Poodle') && !c.esSchnauzer(null));
assert.strictEqual(c.rangoRaza('Schnauzer').max, 9);
assert.strictEqual(c.rangoRaza('Schnauzer Gigante').min, 25);
assert.strictEqual(c.rangoRaza('Schnauzer estándar').min, 14);
assert.strictEqual(c.rangoRaza('Labrador'), null);
assert.strictEqual(c.mesesDesde('2021-11-24', hoy), 59);

// alertas de síntomas
const ahora = new Date(2026, 10, 23, 12);
const sint = (diasAtras, nota) => ({ tipo: 'sintoma', nota, fecha_hora: new Date(ahora - diasAtras * 864e5).toISOString() });
assert.deepStrictEqual(c.alertasSintomas([sint(1, 'Vómito, Dolor abdominal')], ahora), ['pancreatitis']);
assert.deepStrictEqual(c.alertasSintomas([sint(1, 'Vómito'), sint(2, 'Decaído')], ahora), ['pancreatitis']);
assert.deepStrictEqual(c.alertasSintomas([sint(1, 'Vómito')], ahora), [], 'solo vómito no alcanza');
assert.deepStrictEqual(c.alertasSintomas([sint(5, 'Vómito, Dolor abdominal')], ahora), [], 'hace 5 días: viejo');
assert.deepStrictEqual(c.alertasSintomas([sint(2, 'Mucha sed'), sint(4, 'Orina mucho')], ahora), ['diabetes']);
assert.deepStrictEqual(c.alertasSintomas([sint(1, 'Sangre en la orina')], ahora), ['urinario']);

console.log('comida.test.js: OK');
