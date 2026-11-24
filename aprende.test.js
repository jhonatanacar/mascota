// Test de las reglas que aprenden. Correr: node aprende.test.js  (si falla, no se publica)
const assert = require('node:assert');
const { horariosHabituales, faltantes, pendientesHoy, cambioPeso, resumenSemana, hace, hhmm } = require('./aprende.js');

const ahora = new Date(2026, 10, 23, 12, 0); // 23 nov 2026, 12:00 hora local
const el = (diasAtras, h, m, tipo) => ({ tipo, fecha_hora: new Date(2026, 10, 23 - diasAtras, h, m).toISOString() });

// 10 días anteriores: come 8:05 y 19:10, pasea 7:30
const historia = [];
for (let d = 1; d <= 10; d++) historia.push(el(d, 8, 5, 'comida'), el(d, 19, 10, 'comida'), el(d, 7, 30, 'paseo'));

// horarios aprendidos
const com = horariosHabituales(historia, 'comida', ahora);
assert.strictEqual(com.length, 2, 'dos comidas habituales');
assert.strictEqual(hhmm(com[0].min), '8:05');
assert.strictEqual(hhmm(com[1].min), '19:10');
assert.strictEqual(hhmm(horariosHabituales(historia, 'paseo', ahora)[0].min), '7:30');
assert.strictEqual(horariosHabituales(historia.slice(0, 12), 'comida', ahora), null, 'con 4 días todavía aprende');
assert.deepStrictEqual(horariosHabituales(historia, 'bano', ahora), null, 'sin datos');

// hoy comió 8:10 y no paseó -> falta el paseo; la cena aún no toca
const hoy = [...historia, el(0, 8, 10, 'comida')];
const p = pendientesHoy(hoy, [], ahora);
assert.deepStrictEqual(p.map(x => x.tipo), ['paseo'], 'solo falta el paseo');

// con plan: 08:00 y 19:00; a las 21:00 sin comidas hoy -> faltan las dos
const plan = [{ activo: true, hora: '08:00:00', alimento: 'Croquetas' }, { activo: true, hora: '19:00:00', alimento: 'Croquetas' }];
const noche = new Date(2026, 10, 23, 21, 0);
const pn = pendientesHoy(historia, plan, noche).filter(x => x.fuente === 'plan');
assert.strictEqual(pn.length, 2, 'faltan las dos comidas del plan');
// una sola comida tardía (10:30) cubre solo una del plan
const pt = pendientesHoy([...historia, el(0, 10, 30, 'comida')], plan, noche).filter(x => x.fuente === 'plan');
assert.deepStrictEqual(pt.map(x => x.min), [19 * 60], 'la comida de las 10:30 cubre solo la de las 8');
// plan inactivo no cuenta
assert.strictEqual(pendientesHoy([], [{ ...plan[0], activo: false }], noche).length, 0);

// faltantes: no avisa antes de 90 min de pasada la hora
assert.deepStrictEqual(faltantes([600], [], 600 + 60), []);
assert.deepStrictEqual(faltantes([600], [], 600 + 120), [600]);

// peso
assert.strictEqual(cambioPeso([]), null);
assert.strictEqual(cambioPeso([{ fecha: '2026-11-01', kg: 10 }, { fecha: '2026-11-20', kg: 9 }]), null, 'menos de 3 semanas: sin comparar');
const cp = cambioPeso([{ fecha: '2026-10-20', kg: 10 }, { fecha: '2026-11-17', kg: 9.4 }]);
assert.ok(cp.alerta && Math.round(cp.pct) === -6 && cp.dias === 28, 'bajó 6 % en 28 días');
assert.strictEqual(cambioPeso([{ fecha: '2026-10-20', kg: 10 }, { fecha: '2026-11-17', kg: 10.2 }]).alerta, false, '2 % no alerta');

// resumen semanal
const sem = [el(1, 7, 0, 'paseo'), el(2, 7, 0, 'paseo'), el(8, 7, 0, 'paseo'), el(9, 7, 0, 'paseo'), el(10, 7, 0, 'paseo'),
  el(11, 7, 0, 'paseo'), el(12, 7, 0, 'paseo'), el(20, 7, 0, 'paseo'), el(1, 8, 0, 'comida')];
sem[0].duracion_min = 30; sem[1].duracion_min = 45;
assert.deepStrictEqual(resumenSemana(sem, ahora), { paseos: 2, minutos: 75, paseosAnt: 5, bajo: true }, 'bajó de 5 a 2 paseos');
assert.strictEqual(resumenSemana(historia, ahora).bajo, false, 'paseo diario estable');
assert.deepStrictEqual(resumenSemana([], ahora), { paseos: 0, minutos: 0, paseosAnt: 0, bajo: false });

// hace
assert.strictEqual(hace(new Date(ahora - 5 * 6e4), ahora), 'hace 5 min');
assert.strictEqual(hace(new Date(ahora - 3 * 36e5), ahora), 'hace 3 h');
assert.strictEqual(hace(new Date(ahora - 864e5), ahora), 'hace 1 día');
assert.strictEqual(hhmm(479.6), '8:00');

console.log('aprende.test.js: OK');
