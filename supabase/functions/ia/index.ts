// Supabase Edge Function "ia": puente entre la app y Groq (modelo abierto, plan gratuito).
// La clave GROQ_API_KEY vive en los secretos de Supabase, nunca en el navegador ni en GitHub.
// Se pega en Supabase > Edge Functions > Deploy a new function > Via Editor (ver GUIA.md).
import { createClient } from 'npm:@supabase/supabase-js@2.45.4';

const LIMITE_DIA = 60; // consultas por día entre todos los usuarios, para no pasar la cuota gratuita
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const SISTEMA = `Eres el asistente de una app para cuidar perros. Reglas estrictas:
1. Responde SOLO sobre las mascotas del contexto y su cuidado. Si preguntan otra cosa, di que solo ayudas con las mascotas.
2. NUNCA recomiendes nada de "contexto.prohibidos" (alergias, cosas a evitar y tóxicos) ni sus sinónimos o derivados.
3. No diagnostiques. No recetes medicamentos ni dosis. Ante síntomas preocupantes, di que consulten al veterinario.
4. No inventes datos: si algo no está en el contexto, dilo.
5. Español, breve (máximo 120 palabras), tono cercano.
6. Responde SOLO con un objeto JSON con esta forma exacta:
{"respuesta": "texto para el usuario",
 "alimentos_recomendados": ["cada alimento que recomiendas; [] si ninguno"],
 "menu": {"prot": "id", "carb": "id", "veg": "id"} o null (solo en modo "menu"; ids elegidos SOLO de contexto.disponibles, prefiriendo estado "tolera"),
 "regla_propuesta": {"tipo": "alergia" | "evitar" | "preferencia", "sustancia": "...", "motivo": "..."} o null (solo si los datos muestran un patrón claro y repetido, por ejemplo síntomas después de un mismo alimento),
 "aprendizaje": "un hecho útil y estable sobre la mascota para recordar" o null}
Modos: "menu" = qué darle de comer hoy; "resumen" = resumen de los últimos 7 días con lo bueno y lo que hay que vigilar; "pregunta" = responder la pregunta.`;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  const json = (obj, status = 200) => new Response(JSON.stringify(obj), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

  try {
    // cliente con el token del usuario: respeta RLS y confirma que inició sesión
    // proyectos nuevos con claves "publishable" pueden no tener SUPABASE_ANON_KEY: se usa la que manda la app
    const clavePublica = Deno.env.get('SUPABASE_ANON_KEY') || req.headers.get('apikey') || '';
    const sb = createClient(Deno.env.get('SUPABASE_URL') ?? '', clavePublica, {
      global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
    });
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return json({ error: 'Inicia sesión para usar la IA.' }, 401);

    const { modo, pregunta, contexto } = await req.json();
    if (!['menu', 'resumen', 'pregunta'].includes(modo) || typeof pregunta !== 'string' || pregunta.length > 500 ||
        JSON.stringify(contexto ?? {}).length > 30000) return json({ error: 'Pedido inválido.' }, 400);

    const hoy = new Date();
    hoy.setUTCHours(0, 0, 0, 0);
    const { count } = await sb.from('ia_llamadas').select('id', { count: 'exact', head: true }).gte('creado', hoy.toISOString());
    if ((count ?? 0) >= LIMITE_DIA) return json({ error: `Se alcanzó el límite de ${LIMITE_DIA} consultas de hoy. Vuelve mañana.` }, 429);
    await sb.from('ia_llamadas').insert({ usuario: user.email, modo });

    // Proveedor con API compatible con OpenAI: Groq por defecto; IA_URL + IA_MODEL + IA_API_KEY para otro (ver GUIA.md)
    const clave = Deno.env.get('IA_API_KEY') ?? Deno.env.get('GROQ_API_KEY');
    if (!clave) return json({ error: 'Falta configurar la clave de la IA (IA_API_KEY o GROQ_API_KEY) en los secretos de Supabase.' }, 500);
    const r = await fetch(Deno.env.get('IA_URL') ?? 'https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${clave}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: Deno.env.get('IA_MODEL') ?? Deno.env.get('GROQ_MODEL') ?? 'llama-3.3-70b-versatile',
        temperature: 0.3,
        max_tokens: 800,
        response_format: { type: 'json_object' },
        messages: [{ role: 'system', content: SISTEMA }, { role: 'user', content: JSON.stringify({ modo, pregunta, contexto }) }],
      }),
    });
    if (!r.ok) return json({ error: `La IA no respondió (${r.status}): ${(await r.text()).slice(0, 200)}` }, 502);
    const salida = (await r.json()).choices?.[0]?.message?.content ?? '';
    // algunos modelos envuelven el JSON en texto o en ```json: se toma el primer objeto { ... }
    try { return json(JSON.parse(salida)); } catch {}
    try { return json(JSON.parse(salida.match(/\{[\s\S]*\}/)?.[0] ?? '')); } catch {}
    return json({ error: 'La IA respondió en un formato inválido. Intenta de nuevo.' }, 502);
  } catch (e) {
    return json({ error: 'Error en la función: ' + (e?.message ?? String(e)) }, 500);
  }
});
