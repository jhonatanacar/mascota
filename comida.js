// Comida y raza: catálogo, tóxicos, calorías, menú balanceado, inventario y alertas Schnauzer. Sin IA.
// Lo usan index.html y comida.test.js. Depende de reglas.js (contiene, normalizar).
// Los valores nutricionales son aproximados (alimento cocido, sin sal ni aceite; referencia USDA).
// Orientativo: no reemplaza al veterinario.

const reglasLib = typeof module !== 'undefined' ? require('./reglas.js') : { contiene, normalizar };

// kcal, prot y grasa por 100 g cocido. oxalato: alto en oxalato (evitar si tuvo cálculos). grasaAlta: cuidado en Schnauzer.
const CATALOGO = [
  { id: 'pollo', nombre: 'Pollo (pechuga sin piel)', grupo: 'proteina', kcal: 165, prot: 31, grasa: 3.6, sinonimos: ['gallina', 'ave', 'chicken'] },
  { id: 'pavo', nombre: 'Pavo (pechuga)', grupo: 'proteina', kcal: 147, prot: 30, grasa: 2.1, sinonimos: ['turkey'] },
  { id: 'res', nombre: 'Res magra', grupo: 'proteina', kcal: 164, prot: 25, grasa: 6.4, grasaAlta: true, sinonimos: ['vacuno', 'bovino', 'ternera', 'beef', 'carne de res'] },
  { id: 'cordero', nombre: 'Cordero magro', grupo: 'proteina', kcal: 206, prot: 28, grasa: 9.5, grasaAlta: true, sinonimos: ['ovino', 'borrego', 'lamb'] },
  { id: 'pescado', nombre: 'Pescado blanco (tilapia, merluza)', grupo: 'proteina', kcal: 128, prot: 26, grasa: 2.7, sinonimos: ['tilapia', 'merluza', 'fish'] },
  { id: 'salmon', nombre: 'Salmón', grupo: 'proteina', kcal: 206, prot: 22, grasa: 12, grasaAlta: true, sinonimos: ['salmon'] },
  { id: 'conejo', nombre: 'Conejo', grupo: 'proteina', kcal: 173, prot: 33, grasa: 3.5, sinonimos: ['rabbit'] },
  { id: 'huevo', nombre: 'Huevo cocido', grupo: 'proteina', kcal: 155, prot: 13, grasa: 11, grasaAlta: true, sinonimos: ['egg'] },
  { id: 'cerdo', nombre: 'Cerdo magro (lomo)', grupo: 'proteina', kcal: 143, prot: 26, grasa: 3.5, sinonimos: ['puerco', 'chancho', 'porcino', 'pork'] },
  { id: 'arroz', nombre: 'Arroz blanco', grupo: 'carbohidrato', kcal: 130, prot: 2.7, grasa: 0.3, sinonimos: ['rice'] },
  { id: 'arroz_integral', nombre: 'Arroz integral', grupo: 'carbohidrato', kcal: 112, prot: 2.3, grasa: 0.8, sinonimos: [] },
  { id: 'avena', nombre: 'Avena (cocida en agua)', grupo: 'carbohidrato', kcal: 71, prot: 2.5, grasa: 1.5, sinonimos: ['oats'] },
  { id: 'papa', nombre: 'Papa sin piel', grupo: 'carbohidrato', kcal: 87, prot: 1.9, grasa: 0.1, sinonimos: ['patata', 'potato'] },
  { id: 'batata', nombre: 'Batata (camote)', grupo: 'carbohidrato', kcal: 90, prot: 2, grasa: 0.2, oxalato: true, sinonimos: ['camote', 'boniato'] },
  { id: 'quinoa', nombre: 'Quinoa', grupo: 'carbohidrato', kcal: 120, prot: 4.4, grasa: 1.9, oxalato: true, sinonimos: ['quinua'] },
  { id: 'zanahoria', nombre: 'Zanahoria', grupo: 'verdura', kcal: 35, prot: 0.8, grasa: 0.2, sinonimos: ['carrot'] },
  { id: 'calabacin', nombre: 'Calabacín (zucchini)', grupo: 'verdura', kcal: 17, prot: 1.2, grasa: 0.3, sinonimos: ['zucchini'] },
  { id: 'ahuyama', nombre: 'Ahuyama (calabaza)', grupo: 'verdura', kcal: 20, prot: 0.7, grasa: 0.1, sinonimos: ['calabaza', 'zapallo', 'pumpkin'] },
  { id: 'habichuela', nombre: 'Habichuela (judía verde)', grupo: 'verdura', kcal: 35, prot: 1.9, grasa: 0.3, sinonimos: ['judia verde', 'ejote', 'vainita'] },
  { id: 'brocoli', nombre: 'Brócoli', grupo: 'verdura', kcal: 35, prot: 2.4, grasa: 0.4, sinonimos: ['broccoli'] },
  { id: 'espinaca', nombre: 'Espinaca', grupo: 'verdura', kcal: 23, prot: 3, grasa: 0.3, oxalato: true, sinonimos: [] },
  { id: 'remolacha', nombre: 'Remolacha', grupo: 'verdura', kcal: 44, prot: 1.7, grasa: 0.2, oxalato: true, sinonimos: ['betabel', 'beterraga'] },
  { id: 'manzana', nombre: 'Manzana (sin semillas)', grupo: 'fruta', kcal: 52, prot: 0.3, grasa: 0.2, sinonimos: ['apple'] },
  { id: 'arandanos', nombre: 'Arándanos', grupo: 'fruta', kcal: 57, prot: 0.7, grasa: 0.3, sinonimos: ['blueberry'] },
  { id: 'banano', nombre: 'Banano', grupo: 'fruta', kcal: 89, prot: 1.1, grasa: 0.3, sinonimos: ['platano', 'banana', 'cambur'] },
  { id: 'pera', nombre: 'Pera (sin semillas)', grupo: 'fruta', kcal: 57, prot: 0.4, grasa: 0.1, sinonimos: [] },
  { id: 'sandia', nombre: 'Sandía (sin semillas)', grupo: 'fruta', kcal: 30, prot: 0.6, grasa: 0.2, sinonimos: ['patilla'] },
];
const GRUPOS = { proteina: 'Proteínas', carbohidrato: 'Carbohidratos', verdura: 'Verduras', fruta: 'Frutas (premios)' };

// Tóxicos para perros: se usan como reglas "evitar" graves que no se pueden desactivar.
const TOXICOS = [
  ['chocolate', ['cacao', 'cocoa']], ['uva', ['pasas', 'grape', 'raisin']], ['cebolla', ['cebollin', 'cebolleta', 'puerro', 'onion']],
  ['ajo', ['garlic']], ['xilitol', ['xylitol', 'chicle sin azucar']], ['macadamia', []], ['aguacate', ['palta', 'avocado']],
  ['alcohol', ['cerveza', 'vino', 'licor']], ['cafeina', ['cafe', 'energizante']], ['hueso cocido', ['huesos cocidos']],
  ['masa cruda', ['levadura']], ['nuez moscada', []], ['nueces', ['nuez', 'walnut']], ['lupulo', ['hops']], ['carambola', []],
].map(([sustancia, sinonimos]) => ({ id: 'toxico-' + sustancia, sustancia, sinonimos, tipo: 'evitar', gravedad: 'grave', activa: true, toxico: true }));

// meses cumplidos entre una fecha "YYYY-MM-DD" y hoy
function mesesDesde(fecha, hoy = new Date()) {
  const n = new Date(fecha + 'T00:00');
  return Math.max(0, (hoy.getFullYear() - n.getFullYear()) * 12 + hoy.getMonth() - n.getMonth() - (hoy.getDate() < n.getDate()));
}

// Calorías diarias: RER = 70 × kg^0.75, por un factor según etapa, esterilización, actividad y objetivo.
function kcalDiarias({ kg, edadMeses = null, esterilizado = false, actividad = 'normal', objetivo = 'mantener', pesoObjetivo = null }) {
  if (!(kg > 0)) return null;
  let factor, motivo, base = kg;
  if (edadMeses != null && edadMeses < 4) { factor = 3; motivo = 'cachorro menor de 4 meses'; }
  else if (edadMeses != null && edadMeses < 12) { factor = 2; motivo = 'cachorro'; }
  else if (objetivo === 'bajar') {
    // 1 × RER del peso objetivo, pero sin bajar de golpe: objetivo mínimo 85 % del peso actual
    factor = 1;
    base = +Math.max(pesoObjetivo > 0 ? pesoObjetivo : kg, kg * 0.85).toFixed(2);
    motivo = `bajar de peso de a poco (calculado sobre ${base} kg)`;
  }
  else if (actividad === 'baja') { factor = 1.4; motivo = 'adulto poco activo'; }
  else if (actividad === 'alta') { factor = 2; motivo = 'adulto muy activo'; }
  else { factor = esterilizado ? 1.6 : 1.8; motivo = esterilizado ? 'adulto esterilizado' : 'adulto sin esterilizar'; }
  const rer = 70 * base ** 0.75;
  return { rer: Math.round(rer), factor, kcal: Math.round(rer * factor), motivo };
}

// Gramos de cada ingrediente según proporciones en peso, escalados para llegar a kcalObjetivo.
function repartir(items, proporciones, kcalObjetivo) {
  const base = items.reduce((s, it, i) => s + proporciones[i] * it.kcal / 100, 0);
  const k = base > 0 && kcalObjetivo > 0 ? kcalObjetivo / base : 0;
  const gramos = proporciones.map(p => Math.round(p * k));
  const suma = campo => items.reduce((s, it, i) => s + gramos[i] * it[campo] / 100, 0);
  const kcal = suma('kcal'), grasa = suma('grasa');
  return { gramos, kcal: Math.round(kcal), grasa: +grasa.toFixed(1), prot: Math.round(suma('prot')), grasaPct: kcal ? Math.round(grasa * 9 / kcal * 100) : 0 };
}

// Menú del día: proteína + carbohidrato + verdura (2:1:1 en peso), opcionalmente mezclado con croquetas.
function calcularMenu({ kcalDia, prot, carb, veg, pctCasero = 100, kcalKgCroqueta = 3600, comidas = 2, reservaPremios = true }) {
  const kcalComida = kcalDia * (reservaPremios ? 0.9 : 1);
  const kcalCasero = kcalComida * pctCasero / 100;
  const r = repartir([prot, carb, veg], [2, 1, 1], kcalCasero);
  const croquetasG = pctCasero < 100 ? Math.round((kcalComida - kcalCasero) / (kcalKgCroqueta / 1000)) : 0;
  const avisos = [];
  if (pctCasero > 0 && (r.grasaPct > 25 || prot.grasaAlta)) avisos.push('grasa');
  if (pctCasero > 0 && [prot, carb, veg].some(i => i.oxalato)) avisos.push('oxalato');
  return {
    ...r, items: [prot, carb, veg], croquetasG, kcalPremios: reservaPremios ? Math.round(kcalDia * 0.1) : 0,
    porComida: [...r.gramos, croquetasG].map(g => Math.round(g / Math.max(1, comidas))), avisos,
  };
}

// 7 menús rotando los ingredientes disponibles de cada grupo, y la lista de compras de la semana.
function menuSemanal({ prots, carbs, vegs, ...opciones }) {
  const dias = Array.from({ length: 7 }, (_, i) => calcularMenu({
    ...opciones, prot: prots[i % prots.length], carb: carbs[i % carbs.length], veg: vegs[(i + 1) % vegs.length],
  }));
  const compras = {};
  for (const d of dias) {
    d.items.forEach((it, j) => { compras[it.nombre] = (compras[it.nombre] || 0) + d.gramos[j]; });
    if (d.croquetasG) compras.Croquetas = (compras.Croquetas || 0) + d.croquetasG;
  }
  return { dias, compras: Object.entries(compras).map(([nombre, gramos]) => ({ nombre, gramos })) };
}

// Cuánto queda de una bolsa y cuándo se acaba.
function seAcaba({ kg, abierto }, gramosDia, hoy = new Date()) {
  if (!(gramosDia > 0)) return null;
  const usados = Math.max(0, Math.floor((new Date(hoy.toDateString()) - new Date(abierto + 'T00:00')) / 864e5));
  const restante = Math.max(0, kg * 1000 - gramosDia * usados);
  const dias = Math.floor(restante / gramosDia);
  const fecha = new Date(hoy.toDateString());
  fecha.setDate(fecha.getDate() + dias);
  return { restante: Math.round(restante), dias, fecha };
}

// ---------- Raza ----------
const esSchnauzer = raza => reglasLib.contiene(raza, 'schnauzer');

function rangoRaza(raza) {
  if (!esSchnauzer(raza)) return null;
  const r = reglasLib.normalizar(raza);
  if (/gigante/.test(r)) return { nombre: 'Schnauzer gigante', min: 25, max: 48 };
  if (/estandar|mediano/.test(r)) return { nombre: 'Schnauzer estándar', min: 14, max: 20 };
  return { nombre: 'Schnauzer miniatura', min: 5, max: 9 };
}

// Síntomas con un toque (los primeros son típicos de la raza).
const SINTOMAS = ['Vómito', 'Diarrea', 'Dolor abdominal', 'Decaído', 'No quiere comer', 'Mucha sed', 'Orina mucho',
  'Sangre en la orina', 'Rascado', 'Granitos en el lomo', 'Ojos rojos o lagaña', 'Tos'];

// Combinaciones de síntomas que merecen llamar al veterinario.
function alertasSintomas(eventos, ahora = new Date()) {
  const en = (dias, termino) => eventos.some(e => e.tipo === 'sintoma' && ahora - new Date(e.fecha_hora) <= dias * 864e5 &&
    reglasLib.contiene(e.nota, termino));
  const out = [];
  if (en(3, 'vomito') && (en(3, 'dolor abdominal') || en(3, 'decaido') || en(3, 'no quiere comer'))) out.push('pancreatitis');
  if (en(7, 'mucha sed') && en(7, 'orina mucho')) out.push('diabetes');
  if (en(7, 'sangre en la orina')) out.push('urinario');
  return out;
}

if (typeof module !== 'undefined') module.exports = {
  CATALOGO, GRUPOS, TOXICOS, SINTOMAS, mesesDesde, kcalDiarias, repartir, calcularMenu, menuSemanal, seAcaba,
  esSchnauzer, rangoRaza, alertasSintomas,
};
