// Supabase Edge Function "recordatorios": manda avisos al celular (Web Push).
// - Cada 15 min la llama la tarea automática de 07_recordatorios.sql (con el encabezado x-cron-secret).
// - Desde la app, "Probar" manda un aviso de prueba solo a ese dispositivo (requiere sesión).
// Secretos en Supabase: VAPID_PUBLICA, VAPID_PRIVADA, CRON_SECRET (y opcional ZONA_HORARIA, por defecto America/Bogota).
// En la configuración de la función hay que DESACTIVAR "Enforce JWT verification": la tarea automática no tiene sesión.
import webpush from 'npm:web-push@3.6.7';
import { createClient } from 'npm:@supabase/supabase-js@2.45.4';

const TZ = Deno.env.get('ZONA_HORARIA') ?? 'America/Bogota';
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// --- lógica (probada en recordatorios.test.js) ---
function normalizarTxt(s) {
  return String(s ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
}
const nombra = (texto, termino) => normalizarTxt(termino) !== '' && (' ' + normalizarTxt(texto) + ' ').includes(' ' + normalizarTxt(termino) + ' ');
const sumarDias = (dia, n) => new Date(Date.parse(dia) + n * 864e5).toISOString().slice(0, 10);
const horaTxt = (d, tz) => new Intl.DateTimeFormat('es', { timeZone: tz, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(d);
const ICONOS = { vacuna: '💉', desparasitacion: '🪱', consulta: '🩺', cirugia: '🏥', analisis: '🧪', peluqueria: '✂️', dental: '🦷' };

// día "YYYY-MM-DD" y minutos del día en la zona horaria del usuario
function horaLocal(fecha, tz) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(fecha).map(x => [x.type, x.value]));
  return { dia: `${p.year}-${p.month}-${p.day}`, min: +p.hour * 60 + +p.minute };
}

// Avisos que tocan ahora: [{ clave, titulo, cuerpo }]. La clave evita mandar dos veces el mismo aviso.
function calcularRecordatorios({ mascotas, meds, tomas, plan, comidas, salud, inventario }, ahora, tz) {
  const nombre = id => mascotas.find(m => m.id === id)?.nombre ?? 'Tu mascota';
  const { dia, min } = horaLocal(ahora, tz);
  const out = [];

  // 1. dosis: última toma que nombra el medicamento + cada_horas; avisa hasta 6 h después
  for (const x of meds) {
    if (!x.cada_horas || (x.hasta && x.hasta < dia)) continue;
    const t = tomas.find(t => t.mascota_id === x.mascota_id && nombra(t.nota, x.nombre)); // tomas: más nueva primero
    if (!t) continue;
    const toca = new Date(new Date(t.fecha_hora).getTime() + x.cada_horas * 36e5);
    if (ahora >= toca && ahora - toca < 6 * 36e5) out.push({ clave: `med:${x.id}:${toca.toISOString()}`,
      titulo: `💊 ${nombre(x.mascota_id)}: toca ${x.nombre}`,
      cuerpo: `${x.dosis ? x.dosis + ' · ' : ''}Tocaba a las ${horaTxt(toca, tz)}. Regístrala con "Dar ahora".` });
  }

  // 2. comidas del plan: 30 min después de la hora, si nadie registró comida desde 3 h antes; avisa hasta 4 h después
  for (const p of plan) {
    if (!p.activo || !p.hora) continue;
    const h = +p.hora.slice(0, 2) * 60 + +p.hora.slice(3, 5);
    if (min < h + 30 || min > h + 240) continue;
    const comio = comidas.some(c => {
      if (c.mascota_id !== p.mascota_id) return false;
      const l = horaLocal(new Date(c.fecha_hora), tz);
      return l.dia === dia && l.min >= h - 180;
    });
    if (!comio) out.push({ clave: `comida:${p.id}:${dia}`, titulo: `🍖 ¿${nombre(p.mascota_id)} ya comió?`,
      cuerpo: `La comida de las ${p.hora.slice(0, 5)} (${p.alimento}) no está registrada.` });
  }

  if (min >= 540) { // desde las 9:00
    // 3. salud: próxima fecha hoy o mañana; vale solo el registro más reciente de cada vacuna/tratamiento
    const vistos = new Set(), manana = sumarDias(dia, 1);
    for (const s of salud) { // más reciente primero
      const k = `${s.mascota_id}|${s.tipo}|${normalizarTxt(s.detalle)}`;
      if (vistos.has(k)) continue;
      vistos.add(k);
      if (s.proxima_fecha === dia || s.proxima_fecha === manana) out.push({ clave: `salud:${s.id}:${dia}`,
        titulo: `${ICONOS[s.tipo] ?? '🩺'} ${nombre(s.mascota_id)}: ${s.detalle || s.tipo} ${s.proxima_fecha === dia ? 'hoy' : 'mañana'}`,
        cuerpo: 'Recordatorio de salud.' });
    }
    // 4. inventario con gramos por día: se acaba en 2 días o menos
    for (const i of inventario) {
      if (!i.activo || !(i.gramos_dia > 0)) continue;
      const usados = Math.max(0, Math.round((Date.parse(dia) - Date.parse(i.abierto)) / 864e5));
      const quedan = Math.floor(Math.max(0, i.kg * 1000 - i.gramos_dia * usados) / i.gramos_dia);
      if (quedan <= 2) out.push({ clave: `inv:${i.id}:${dia}`, titulo: `🛒 ${i.alimento}`,
        cuerpo: quedan === 0 ? 'Se acaba hoy.' : `Se acaba en ${quedan} día${quedan === 1 ? '' : 's'}.` });
    }
  }
  return out;
}
// --- fin lógica ---

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  const json = (obj, status = 200) => new Response(JSON.stringify(obj), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

  try {
    const servicio = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const pub = Deno.env.get('VAPID_PUBLICA'), priv = Deno.env.get('VAPID_PRIVADA'), cron = Deno.env.get('CRON_SECRET');
    if (!servicio || !pub || !priv || !cron) return json({ error: 'Faltan secretos: VAPID_PUBLICA, VAPID_PRIVADA y CRON_SECRET.' }, 500);
    const admin = createClient(Deno.env.get('SUPABASE_URL') ?? '', servicio, { auth: { persistSession: false } });
    webpush.setVapidDetails('https://jhonatanacar.github.io/mascota/', pub, priv);
    const body = await req.json().catch(() => ({}));

    let avisos, destinos, prueba = false;
    if (req.headers.get('x-cron-secret') === cron) {
      const desde = d => new Date(Date.now() - d * 864e5).toISOString();
      const res = await Promise.all([
        admin.from('mascotas').select('id, nombre'),
        admin.from('medicamentos').select('*'),
        admin.from('eventos').select('mascota_id, nota, fecha_hora').eq('tipo', 'medicina').gte('fecha_hora', desde(7)).order('fecha_hora', { ascending: false }),
        admin.from('plan_alimentacion').select('*').eq('activo', true),
        admin.from('eventos').select('mascota_id, fecha_hora').eq('tipo', 'comida').gte('fecha_hora', desde(2)),
        admin.from('salud').select('*').order('fecha', { ascending: false }),
        admin.from('inventario').select('*').eq('activo', true),
        admin.from('push_suscripciones').select('*'),
      ]);
      const fallo = res.find(r => r.error);
      if (fallo) return json({ error: fallo.error.message }, 500);
      const [mascotas, meds, tomas, plan, comidas, salud, inventario, subs] = res.map(r => r.data);
      avisos = [];
      for (const a of calcularRecordatorios({ mascotas, meds, tomas, plan, comidas, salud, inventario }, new Date(), TZ)) {
        const { error } = await admin.from('push_enviados').insert({ clave: a.clave }); // falla si ya se mandó
        if (!error) avisos.push(a);
      }
      destinos = subs;
    } else {
      // prueba desde la app: requiere sesión; avisa solo a ese dispositivo
      const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer /, '');
      const { data: { user } } = await admin.auth.getUser(token);
      if (!user) return json({ error: 'No autorizado.' }, 401);
      const { data: sub } = await admin.from('push_suscripciones').select('*').eq('endpoint', String(body.endpoint ?? '')).maybeSingle();
      if (!sub) return json({ error: 'Este dispositivo no está suscrito.' }, 400);
      avisos = [{ clave: 'prueba', titulo: '🔔 Recordatorios activos', cuerpo: 'Así te van a llegar los avisos de tus mascotas.' }];
      destinos = [sub];
      prueba = true;
    }

    let enviados = 0, ultimoError = null;
    for (const a of avisos) for (const d of destinos) {
      try {
        await webpush.sendNotification({ endpoint: d.endpoint, keys: { p256dh: d.p256dh, auth: d.auth } },
          JSON.stringify({ titulo: a.titulo, cuerpo: a.cuerpo, tag: a.clave }), { TTL: 3600 });
        enviados++;
      } catch (e) {
        ultimoError = `${e?.statusCode ?? ''} ${e?.body ?? e?.message ?? e}`.trim();
        if (e?.statusCode === 404 || e?.statusCode === 410) await admin.from('push_suscripciones').delete().eq('endpoint', d.endpoint); // dispositivo dado de baja
      }
    }
    if (prueba && !enviados) return json({ error: 'No se pudo enviar: ' + ultimoError }, 502);
    return json({ avisos: avisos.length, dispositivos: destinos.length, enviados, error: ultimoError });
  } catch (e) {
    return json({ error: 'Error en la función: ' + (e?.message ?? String(e)) }, 500);
  }
});
