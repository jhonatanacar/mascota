// Test de la lógica de recordatorios (la toma tal cual de la Edge Function). Correr: node recordatorios.test.js
const assert = require('node:assert');
const fs = require('fs');
const src = fs.readFileSync(__dirname + '/supabase/functions/recordatorios/index.ts', 'utf8');
const logica = src.slice(src.indexOf('// --- lógica'), src.indexOf('// --- fin lógica ---'));
const { calcularRecordatorios, horaLocal } = new Function(logica + '\nreturn { calcularRecordatorios, horaLocal };')();

const TZ = 'America/Bogota'; // UTC-5, sin horario de verano
const bog = (dia, hhmm) => new Date(`${dia}T${hhmm}:00-05:00`);
const base = { mascotas: [{ id: 'a', nombre: 'Toby' }], meds: [], tomas: [], plan: [], comidas: [], salud: [], inventario: [] };
const calc = (datos, ahora) => calcularRecordatorios({ ...base, ...datos }, ahora, TZ);

// zona horaria
assert.deepStrictEqual(horaLocal(new Date('2026-11-24T03:30:00Z'), TZ), { dia: '2026-11-23', min: 22 * 60 + 30 }, '03:30 UTC = 22:30 del día anterior en Bogotá');

// 1. dosis: toma 08:00, cada 8 h -> toca 16:00
const meds = [{ id: 'm1', mascota_id: 'a', nombre: 'Amoxicilina', dosis: '1/2 pastilla', cada_horas: 8, hasta: null }];
const tomas = [{ mascota_id: 'a', nota: 'Le di amoxicilina', fecha_hora: bog('2026-11-24', '08:00').toISOString() }];
assert.strictEqual(calc({ meds, tomas }, bog('2026-11-24', '15:59')).length, 0, 'antes de la hora no avisa');
const d = calc({ meds, tomas }, bog('2026-11-24', '16:05'));
assert.ok(d.length === 1 && d[0].titulo.includes('Amoxicilina') && d[0].cuerpo.includes('16:00'), 'avisa la dosis de las 16:00');
assert.strictEqual(calc({ meds, tomas }, bog('2026-11-24', '22:30')).length, 0, 'más de 6 h tarde ya no avisa');
assert.strictEqual(calc({ meds: [{ ...meds[0], hasta: '2026-11-23' }], tomas }, bog('2026-11-24', '16:05')).length, 0, 'tratamiento terminado');
assert.strictEqual(calc({ meds, tomas: [{ ...tomas[0], nota: 'otra cosa' }] }, bog('2026-11-24', '16:05')).length, 0, 'sin toma registrada no avisa');
assert.strictEqual(calc({ meds, tomas }, bog('2026-11-24', '16:05'))[0].clave, calc({ meds, tomas }, bog('2026-11-24', '17:30'))[0].clave, 'misma clave: no se repite');

// 2. comida del plan 08:00
const plan = [{ id: 'p1', mascota_id: 'a', activo: true, hora: '08:00:00', alimento: 'Croquetas' }];
assert.strictEqual(calc({ plan }, bog('2026-11-24', '08:20')).length, 0, 'espera 30 min');
assert.strictEqual(calc({ plan }, bog('2026-11-24', '08:45'))[0].titulo, '🍖 ¿Toby ya comió?');
assert.strictEqual(calc({ plan, comidas: [{ mascota_id: 'a', fecha_hora: bog('2026-11-24', '07:50').toISOString() }] }, bog('2026-11-24', '08:45')).length, 0, 'ya comió');
assert.strictEqual(calc({ plan, comidas: [{ mascota_id: 'a', fecha_hora: bog('2026-11-23', '19:00').toISOString() }] }, bog('2026-11-24', '08:45')).length, 1, 'la comida de ayer no cuenta');
assert.strictEqual(calc({ plan }, bog('2026-11-24', '12:30')).length, 0, 'más de 4 h después ya no avisa');
assert.strictEqual(calc({ plan: [{ ...plan[0], activo: false }] }, bog('2026-11-24', '08:45')).length, 0, 'plan inactivo');

// 3. salud: hoy o mañana, desde las 9:00, solo el registro más reciente
const salud = [{ id: 's2', mascota_id: 'a', tipo: 'vacuna', detalle: 'Rabia', fecha: '2026-11-01', proxima_fecha: '2027-11-01' },
  { id: 's1', mascota_id: 'a', tipo: 'vacuna', detalle: 'rabia', fecha: '2025-11-25', proxima_fecha: '2026-11-25' },
  { id: 's3', mascota_id: 'a', tipo: 'peluqueria', detalle: null, fecha: '2026-10-01', proxima_fecha: '2026-11-24' }];
const sal = calc({ salud }, bog('2026-11-24', '09:10'));
assert.deepStrictEqual(sal.map(x => x.clave), ['salud:s3:2026-11-24'], 'peluquería hoy sí; la rabia vieja ya se renovó');
assert.ok(sal[0].titulo.includes('✂️') && sal[0].titulo.includes('hoy'));
assert.strictEqual(calc({ salud }, bog('2026-11-24', '08:00')).length, 0, 'antes de las 9 no avisa');

// 4. inventario: 1 kg abierto hace 9 días a 100 g/día -> queda 1 día
const inventario = [{ id: 'i1', alimento: 'Croquetas', kg: 1, abierto: '2026-11-15', gramos_dia: 100, activo: true }];
assert.strictEqual(calc({ inventario }, bog('2026-11-24', '10:00'))[0].cuerpo, 'Se acaba en 1 día.');
assert.strictEqual(calc({ inventario: [{ ...inventario[0], abierto: '2026-11-20' }] }, bog('2026-11-24', '10:00')).length, 0, 'quedan 6 días');
assert.strictEqual(calc({ inventario: [{ ...inventario[0], gramos_dia: null }] }, bog('2026-11-24', '10:00')).length, 0, 'sin gramos por día no avisa');

console.log('recordatorios.test.js: OK');
