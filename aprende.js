// Reglas que aprenden (capa 1 del plan): patrones del historial, sin IA. Lo usan index.html y aprende.test.js.
// shortcut: no contempla horarios que cruzan la medianoche (ej. paseo 23:30 / 00:30); mejorar si aparece ese caso.

const minDelDia = d => d.getHours() * 60 + d.getMinutes();
const aMin = hora => +hora.slice(0, 2) * 60 + +hora.slice(3, 5); // "08:30:00" -> 510
function hhmm(min) {
  const m = Math.round(min);
  return `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`;
}

// Horarios habituales de un tipo de evento en los últimos `dias` días.
// Devuelve null si hay menos de 5 días con registros (todavía aprendiendo).
// Un horario es habitual si aparece (±90 min) en al menos la mitad de los días con registros.
function horariosHabituales(eventos, tipo, ahora = new Date(), dias = 30) {
  const desde = ahora.getTime() - dias * 864e5;
  const evs = eventos.filter(e => e.tipo === tipo).map(e => new Date(e.fecha_hora)).filter(d => d >= desde && d <= ahora);
  const diasTotales = new Set(evs.map(d => d.toDateString())).size;
  if (diasTotales < 5) return null;
  const candidatos = Array.from({ length: 24 }, (_, h) => {
    const cerca = evs.filter(d => Math.abs(minDelDia(d) - (h * 60 + 30)) <= 90);
    return { cerca, dias: new Set(cerca.map(d => d.toDateString())).size };
  }).sort((a, b) => b.dias - a.dias);
  const elegidos = [];
  for (const c of candidatos) {
    if (c.dias < diasTotales * 0.5) break;
    const min = c.cerca.reduce((s, d) => s + minDelDia(d), 0) / c.cerca.length;
    if (!elegidos.some(e => Math.abs(e.min - min) < 180)) elegidos.push({ min, dias: c.dias });
  }
  return elegidos.sort((a, b) => a.min - b.min);
}

// Horarios (en minutos) ya pasados por más de 90 min sin un evento cerca (±3 h).
// Cada evento cubre un solo horario, así una comida tardía no tapa dos comidas.
function faltantes(horarios, hechos, ahoraMin) {
  const libres = [...hechos];
  return horarios.filter(min => {
    let mejor = -1;
    libres.forEach((h, j) => {
      if (Math.abs(h - min) <= 180 && (mejor < 0 || Math.abs(h - min) < Math.abs(libres[mejor] - min))) mejor = j;
    });
    if (mejor >= 0) { libres.splice(mejor, 1); return false; }
    return ahoraMin > min + 90;
  });
}

// Lo que falta hoy para UNA mascota: comidas del plan (si hay plan con horas) y horarios aprendidos.
function pendientesHoy(eventos, plan, ahora = new Date()) {
  const ahoraMin = minDelDia(ahora);
  const hoy = eventos.filter(e => { const d = new Date(e.fecha_hora); return d <= ahora && d.toDateString() === ahora.toDateString(); });
  const hechos = tipo => hoy.filter(e => e.tipo === tipo).map(e => minDelDia(new Date(e.fecha_hora)));
  const out = [];
  const planHoy = plan.filter(p => p.activo && p.hora).sort((a, b) => aMin(a.hora) - aMin(b.hora));
  if (planHoy.length) {
    const falta = faltantes(planHoy.map(p => aMin(p.hora)), hechos('comida'), ahoraMin);
    for (const p of planHoy) if (falta.includes(aMin(p.hora))) out.push({ tipo: 'comida', min: aMin(p.hora), fuente: 'plan', alimento: p.alimento });
  }
  for (const tipo of planHoy.length ? ['paseo'] : ['comida', 'paseo']) {
    const hab = horariosHabituales(eventos, tipo, ahora);
    if (hab) for (const min of faltantes(hab.map(h => h.min), hechos(tipo), ahoraMin)) out.push({ tipo, min, fuente: 'aprendido' });
  }
  return out;
}

// Cambio de peso entre el último pesaje y uno de hace 3 a 8 semanas. Alerta si es de 5 % o más.
function cambioPeso(pesos) {
  const ult = pesos[pesos.length - 1];
  if (!ult) return null;
  const dias = p => (new Date(ult.fecha + 'T00:00') - new Date(p.fecha + 'T00:00')) / 864e5;
  const ref = [...pesos].reverse().find(p => dias(p) >= 21 && dias(p) <= 60);
  if (!ref) return null;
  const pct = (ult.kg - ref.kg) / ref.kg * 100;
  return { pct, dias: Math.round(dias(ref)), alerta: Math.abs(pct) >= 5 };
}

// Paseos (y sus minutos) de los últimos 7 días contra los 7 anteriores. bajo = paseó mucho menos que la semana anterior.
function resumenSemana(eventos, ahora = new Date()) {
  const r = { paseos: 0, minutos: 0, paseosAnt: 0 };
  for (const e of eventos) {
    if (e.tipo !== 'paseo') continue;
    const dias = (ahora - new Date(e.fecha_hora)) / 864e5;
    if (dias < 0 || dias >= 14) continue;
    if (dias < 7) { r.paseos++; r.minutos += e.duracion_min || 0; } else r.paseosAnt++;
  }
  r.bajo = r.paseosAnt >= 5 && r.paseos < r.paseosAnt * 0.6;
  return r;
}

function hace(fecha, ahora = new Date()) {
  const min = Math.max(0, Math.round((ahora - fecha) / 6e4));
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.floor(h / 24);
  return `hace ${d} día${d === 1 ? '' : 's'}`;
}

if (typeof module !== 'undefined') module.exports = { horariosHabituales, faltantes, pendientesHoy, cambioPeso, resumenSemana, hace, hhmm, aMin };
