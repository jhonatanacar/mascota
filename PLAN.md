# Plan de trabajo: Mascota

App web para administrar el cuidado de mis mascotas: paseos, salidas, comidas, plan de alimentación,
alergias, salud y comportamiento. La app aprende de lo que registro.
Gratis, se abre desde cualquier lugar (celular o PC) y los datos se guardan en la nube.

## Tecnologías (todo gratis)

| Pieza | Elección | Por qué |
|---|---|---|
| Pantallas | Un solo `index.html` + JS sin framework | Nada que compilar ni instalar |
| Datos + login | Supabase (plan gratuito: base Postgres de 500 MB + auth + Edge Functions) | Se consulta desde cualquier lugar, con login y respaldo |
| Hosting | GitHub Pages | Gratis y publica con cada `git push` |
| Celular | PWA (manifest + ícono) | Se instala como app, sin tiendas |
| IA | Modelo abierto (Llama / Qwen) por **Groq** en su plan gratuito; de respaldo, **OpenRouter** con modelos `:free` | Gratis y sin servidor propio |
| Puente a la IA | Supabase Edge Function | La clave de la IA nunca llega al navegador |

## Datos

- `mascotas`: id, nombre, especie, raza, fecha_nacimiento, sexo, esterilizado, foto_url, notas
- `eventos`: id, mascota_id, tipo (`paseo` | `comida` | `salida` | `medicina` | `bano` | `sintoma` | `conducta` | `otro`), fecha_hora, duracion_min, cantidad, nota
- `plan_alimentacion`: id, mascota_id, alimento, gramos, hora, activo
- `reglas`: id, mascota_id, tipo (`alergia` | `evitar` | `preferencia` | `indicacion_vet`), sustancia, sinonimos (lista), gravedad (`leve` | `moderada` | `grave`), origen (`yo` | `ia` | `veterinario`), activa, creada. Es lo que la app **nunca olvida**.
- `recomendaciones`: id, mascota_id, fecha, texto, ingredientes (lista), estado (`propuesta` | `aceptada` | `rechazada` | `bloqueada`), motivo_bloqueo, regla_id
- `salud`: id, mascota_id, tipo (`vacuna` | `desparasitacion` | `consulta` | `cirugia` | `analisis`), fecha, proxima_fecha, detalle, veterinario
- `medicamentos`: id, mascota_id, nombre, dosis, cada_horas, desde, hasta
- `peso`: id, mascota_id, fecha, kg
- `contactos`: id, nombre, tipo (`veterinario` | `paseador` | `emergencia`), telefono
- `aprendizajes`: id, mascota_id, fecha, origen (`regla` | `ia`), texto, confirmado (bool). Es la "memoria" de la app.
- Row Level Security en todas las tablas: cada usuario ve solo sus datos.

## Memoria: reglas que la app nunca olvida

Ejemplo: "Firulais es alérgico al pollo".

1. **Cómo nace una regla** (siempre la confirmo yo):
   - La cargo a mano en la ficha de la mascota.
   - O la detecta la IA en lo que escribo ("le cayó mal el pollo") o en un síntoma registrado → la propone → yo confirmo → se crea la regla con `origen = ia`.
2. **Sinónimos**: al crear la regla, la app sugiere sinónimos y yo los apruebo. Para pollo: gallina, ave, aves, chicken, "subproductos de ave", "harina de ave", "grasa de pollo".
3. **Dónde se aplica** (código fijo, no IA):
   - Al registrar comida, premio o medicamento → si coincide con una regla `alergia` o `evitar`, se bloquea y pide confirmación.
   - En cada recomendación de la IA → **antes de mostrarla** se revisan sus ingredientes contra todas las reglas activas. Si choca, se guarda como `bloqueada` con el motivo ("contiene pollo: alergia") y no se muestra como sugerencia.
   - En cada llamada a la IA → se le envían **todas** las reglas activas al inicio del prompt: "NUNCA recomiendes: pollo y sinónimos (alergia grave)".
4. **Recomendaciones guardadas**: todo lo que propone la IA queda en `recomendaciones`. Si acepto una, se puede pasar al plan de alimentación con un clic, y vuelve a pasar por el filtro de reglas.
5. **Si cambia una regla** (por ejemplo, se agrega una alergia nueva), las recomendaciones y el plan de alimentación ya guardados se revisan otra vez y se marcan las que ahora chocan.
6. **Prueba obligatoria**: el filtro de reglas lleva un test (`node reglas.test.js`) con casos como "Croquetas sabor pollo" → bloquea, "Harina de ave" → bloquea, "Cordero con arroz" → pasa. Si el test falla, no se publica.

## Cómo aprende (en dos capas)

1. **Reglas fijas** (en el navegador, sin IA y siempre activas):
   - Hora habitual de cada tipo de evento y cuánto pasó desde el último.
   - Comida fuera del plan o en más cantidad que la planificada → aviso.
   - **Reglas y alergias:** ver "Memoria: reglas que la app nunca olvida". Nunca dependen de la IA.
   - Vacunas, desparasitaciones y medicinas que vencen o tocan pronto.
   - Cambio de peso mayor al 5 % en un mes → aviso.
2. **IA (opcional)**: resumen semanal, detección de patrones ("come menos los días sin paseo") y preguntas libres ("¿cuándo fue su última vacuna?").

## IA con comportamiento controlado

- Solo **lee** un resumen de los datos de la mascota y **propone**. Nunca escribe en la base por su cuenta.
- Lo que propone se guarda en `aprendizajes` con `confirmado = false`. Solo lo que yo confirmo pasa a ser memoria y se le vuelve a enviar como contexto.
- Prompt de sistema fijo: responder solo sobre las mascotas registradas, no diagnosticar ni recetar, y ante síntomas preocupantes decir "consulta al veterinario" y mostrar su contacto.
- Respuesta en JSON con un formato fijo; si no lo cumple, se descarta.
- Límite de llamadas por día en la Edge Function para no pasar la cuota gratuita.
- Si la IA falla o no hay cuota, la app sigue funcionando con las reglas fijas.

## Fases (una por sesión, se marcan al terminar)

- [x] **1. Base**: crear el proyecto en Supabase, las tablas y RLS; `index.html` con login por email.
- [x] **2. Mascotas**: ficha completa (alta, edición, foto) y contactos.
- [x] **3. Registro rápido**: un botón por tipo que guarda el evento con la hora actual.
- [x] **4. Historial**: lista por día con filtro por mascota y tipo.
- [x] **5. Reglas y alimentación**: reglas con sinónimos, filtro de reglas con su test, plan diario y bloqueo al registrar.
- [x] **6. Salud**: vacunas, desparasitaciones, consultas, medicamentos con horario y peso con gráfico.
- [ ] **7. Publicar**: repo en GitHub + GitHub Pages + PWA instalable en el celular.
- [ ] **8. Reglas que aprenden**: avisos de horario, plan, vencimientos y peso (capa 1).
- [ ] **9. IA** (código listo; falta configurar Groq y la Edge Function): Edge Function con Groq que envía las reglas activas en cada llamada, recomendaciones guardadas y filtradas, reglas propuestas por la IA para confirmar, resumen semanal y preguntas libres (capa 2).
- [ ] **10. Extras (solo si hacen falta)**: compartir con la familia, exportar a CSV/PDF para el veterinario, recordatorios por notificación.

## Cuentas que necesito

- supabase.com (gratis)
- github.com (gratis)
- console.groq.com (gratis, para la clave de la IA; recién en la fase 9)

## Ayudante: agy

Claude puede delegar en `agy` (ya instalado) todo lo que necesite: generar código, investigar, revisar, escribir tests, etc. Siempre bajo la supervisión de Claude:

- Se invoca con `agy -p "<tarea concreta>" --mode plan` o `--mode accept-edits`. **Nunca** con `--dangerously-skip-permissions`.
- Una tarea chica y bien definida por llamada, que nombre los archivos que puede tocar.
- Claude revisa todo lo que agy produce antes de aceptarlo: lee el diff, corre los tests y verifica que respete `CLAUDE.md` y las reglas (alergias, claves fuera del navegador, sin dependencias pagas).
- Si no cumple, Claude lo corrige o lo descarta. Nada de agy se publica sin esa revisión.
- En la bitácora se anota qué se le delegó a agy.

## Cómo se recuerda el avance

- Este archivo es la fuente de verdad: al cerrar cada fase se marca `[x]` y se anota abajo lo decidido.
- `CLAUDE.md` le pide a Claude leer este plan al empezar cada sesión.

## Bitácora de decisiones

- 2026-11-23: Plan inicial. Stack: HTML/JS + Supabase + GitHub Pages.
- 2026-11-23: Se suman alimentación, alergias, salud, peso, contactos y conducta. IA abierta y gratuita (Groq/OpenRouter) detrás de una Edge Function; propone y yo confirmo.
- 2026-11-23: `alergias` pasa a ser `reglas` (alergia, evitar, preferencia, indicación del vet) con sinónimos. Toda recomendación se guarda y pasa por el filtro de reglas antes de mostrarse.
- 2026-11-23: Claude puede delegar tareas en `agy`, siempre revisando su trabajo antes de aceptarlo.
- 2026-11-23: Fase 1 escrita: `schema.sql` (todas las tablas + RLS), `index.html` (login por enlace al email), `config.js`. agy revisó el SQL y se aplicaron sus 3 observaciones (security definer, `(select auth.uid())`, FK regla-mascota). Falta que el usuario cree el proyecto en Supabase y lo pruebe para marcarla `[x]`. Nota: `agy -p` sin permisos no puede leer archivos; hay que pasarle el contenido dentro del mensaje.
- 2026-11-23: Fase 1 probada por el usuario (login OK). Marcada `[x]`.
- 2026-11-23: Fase 2 escrita: fichas de mascotas (con foto achicada a 800px en el bucket privado `fotos`, ver `02_fotos.sql`) y contactos con enlace para llamar. `foto_url` guarda la ruta en Storage, no una URL. agy revisó `index.html`: 3 de sus 6 observaciones eran reales y se corrigieron (Enter cancelaba el formulario, foto huérfana, limpiar datos al salir); 3 eran falsas (user_id, signedURL, data-id).
- 2026-11-23: Error "permission denied for table mascotas": los proyectos nuevos de Supabase no dan GRANT automático a `authenticated`. Se agregó `03_permisos.sql`. **Toda tabla nueva que se cree en el futuro necesita su propio `grant ... to authenticated`.**
- 2026-11-23: Fase 2 probada por el usuario. Marcada `[x]`.
- 2026-11-23: Fase 3 escrita: 8 botones de registro de un toque (síntoma, conducta y otro piden una nota), selector de mascota (se oculta si hay una sola; recuerda la última en localStorage) y aviso con "Deshacer" por 6 s. agy revisó: 1 de 5 observaciones aplicada (fijar la mascota antes de guardar).
- 2026-11-23: Fase 3 probada por el usuario. Marcada `[x]`.
- 2026-11-23: Fase 4 escrita: historial agrupado por día (Hoy, Ayer, fecha), filtros por mascota y tipo, páginas de 50 con "Cargar más", edición/borrado de cada registro (fecha, duración, cantidad, nota) y "Registro con otra fecha u hora" para lo olvidado. Fechas probadas con TZ America/Bogota. agy: la revisión completa superó los 5 min; conviene pasarle solo el fragmento y usar `--effort low`. 1 de 4 observaciones aplicada (desempate por id).
- 2026-11-23: Fase 4: el usuario pidió continuar (se toma como probada). Marcada `[x]`.
- 2026-11-23: Fase 5 escrita: `reglas.js` (filtro sin IA: palabras completas, sin tildes, plural y o/a por palabra, sinónimos sugeridos) + `reglas.test.js` (`node reglas.test.js`, debe pasar antes de publicar). UI: reglas por mascota (alergia/evitar/preferencia/indicación vet), plan de alimentación con aviso "Choca con", alergias visibles en la tarjeta, y confirmación ⛔ al registrar comida/medicina o editar un registro que choca. "Comida" sugiere el alimento del plan más cercano a la hora actual. agy encontró 2 falsos negativos reales del filtro (plural en compuestos, femeninos) → corregidos y con test.
- 2026-11-23: Fase 5: el usuario pidió continuar (se toma como probada). Marcada `[x]`.
- 2026-11-23: Fase 6 escrita: Salud con "Próximas fechas" (por mascota+tipo+detalle vale solo el registro más reciente; ≤7 días o vencido en rojo), medicamentos con "Dar ahora" (registra el evento medicina, pasa por el filtro de reglas) y próxima dosis = última toma cuya nota nombra el medicamento + cada_horas, registros de salud con veterinario sugerido desde contactos, y peso de la mascota elegida con gráfico SVG sin librerías + diferencia entre pesajes. Lógica probada con datos de ejemplo en TZ Bogotá. agy: 5 observaciones, ninguna aplicable.
- Pendiente de UX: la página ya tiene muchas secciones; evaluar pestañas (Hoy / Mascotas / Salud / Historial) cuando moleste.
- 2026-11-23: Fase 7 preparada: `manifest.webmanifest` + íconos PNG (generados con un script de Node sin librerías) para instalar como app, y `.github/workflows/publicar.yml`, que publica en GitHub Pages en cada push a `main` **solo si pasa `node reglas.test.js`**. Repo git local inicializado. Falta: el usuario crea el repo público en GitHub, se hace el push, se activa Pages (Source: GitHub Actions) y se agrega la URL de Pages en Supabase > Authentication > URL Configuration.
- 2026-11-23: Fase 6: el usuario pidió continuar (se toma como probada). Marcada `[x]`.
- 2026-11-23: Antes de publicar, el usuario pidió más funciones. Se adelantó la fase 8 y parte de la 10:
  - Pestañas fijas abajo (Hoy / Mascotas / Salud / Historial); el selector de mascota queda arriba, visible en todas.
  - `aprende.js` + `aprende.test.js`: horarios habituales (≥5 días de datos; horario presente en ≥50 % de los días, ±90 min), comidas del plan o paseos atrasados (+90 min, cada evento cubre un solo horario), cambio de peso ≥5 % (contra un pesaje de hace 3 a 8 semanas). Test probado en 3 zonas horarias.
  - Panel "Hoy" por mascota: alergias, avisos (falta comida del plan, paseo habitual, comió más de lo planeado, vencimientos ≤7 días, dosis atrasadas, ≥2 síntomas en 7 días con el contacto del veterinario, peso) e info (último paseo/comida, próxima dosis, "Aprendí que come ~8:05…"). Se refresca cada minuto.
  - Ficha para el veterinario (ventana imprimible / PDF) y exportar historial a CSV (separador ";", BOM, protegido contra fórmulas de Excel).
  - El workflow ahora corre los dos tests antes de publicar.
- Pendiente para después de publicar: compartir mascotas con la familia (requiere cambiar RLS y Storage), fase 9 (IA con Groq), notificaciones.
- 2026-11-23: La app la usan solo el usuario y su hermano, y comparten todo. `04_compartir.sql`: tabla `permitidos` (emails, sin políticas, solo la lee la función `permitido()` security definer) y política `hogar` en todas las tablas y en Storage, que reemplaza "cada uno ve lo suyo". Los emails reales se cargan solo en Supabase, nunca en el repo público. Además se desactiva el registro de usuarios nuevos en Supabase Auth.
- 2026-11-23: Cambio de decisión: sin lista de emails. `04_compartir.sql` ahora pone la política `compartido` (todos los usuarios con sesión ven y editan todo, también las fotos) y agrega `eventos.creado_por` (email de quien registró). El acceso se controla desactivando el registro de usuarios nuevos en Supabase. Guía de instalación y uso en `GUIA.md`.
- 2026-11-23: Funciones para uso de dos personas: "quién registró" (`creado_por`) en historial y en Hoy; recarga automática al volver a la app (visibilitychange); ⏱️ paseo con cronómetro (inicio en localStorage, guarda fecha de inicio + duración, descarta si dura <1 min); resumen semanal en Hoy con aviso si los paseos bajan >40 % (`resumenSemana` en aprende.js, con test). **Requiere correr `04_compartir.sql` antes de usar esta versión** (si no existe la columna `creado_por`, la carga falla). agy: 4 observaciones, ninguna aplicable.

## Fase 11: Comida y especialización Schnauzer (pedida el 2026-11-23)

- [ ] Catálogo de ingredientes (kcal, proteína y grasa por 100 g cocido, aprox. USDA) con estado por perro: ✅ tolera, 🧪 probando, ⛔ alérgico. ⛔ crea o activa la regla de alergia.
- [ ] Tóxicos para perros siempre bloqueados (chocolate, uva/pasas, cebolla, ajo, xilitol, macadamia, aguacate, alcohol, cafeína, hueso cocido, masa cruda, nuez moscada).
- [ ] Prueba de ingrediente nuevo: 🧪 con fecha; Hoy avisa si hubo síntomas o si ya pasaron 5 días sin síntomas.
- [ ] Calorías diarias: RER = 70 × kg^0.75 × factor (cachorro, esterilizado, actividad, objetivo bajar de peso).
- [ ] Generador de menú: proteína + carbohidrato + verdura (2:1:1 en peso), modo mixto con croquetas, reserva del 10 % para premios, gramos por comida, aviso de grasa (pancreatitis) y oxalato (cálculos), guardar como plan.
- [ ] Menú semanal rotativo + lista de compras.
- [ ] Inventario: "se acaba el jueves".
- [ ] Schnauzer: rango de peso de la raza, síntomas de la raza con un toque (alerta de posible pancreatitis, diabetes, problema urinario), peluquería cada 6–8 semanas, análisis anual desde los 5 años, recordatorio de la barba.
- [ ] Premios como tipo de registro; gastos; botón de emergencia.
- Después de publicar: IA "¿Qué le doy hoy?" / "¿Puede comer X?" (fase 9), notificaciones, álbum de fotos, turnos.
- 2026-11-23: Fase 11 escrita (falta que el usuario la pruebe para marcarla): `comida.js` + `comida.test.js` (catálogo de 27 ingredientes, 15 tóxicos, calorías, menú 2:1:1 con croquetas y premios, menú semanal + compras, inventario, rango de raza, alertas de síntomas), `05_comida.sql` (actividad/objetivo/peso_objetivo en mascotas; tipos premio, peluquería y dental; tablas ingredientes_mascota, inventario y gastos con política `compartido`). UI: pestaña 🍖 Comida, botón 🦴 Premio con chequeo de tóxicos, diálogo de síntomas con un toque, avisos de raza en Hoy, 🚨 Emergencia, Gastos en Historial, rango de peso en Salud. ⛔ de un ingrediente sale solo de una regla de alergia activa (la regla es la fuente de verdad). agy revisó la nutrición (se aplicaron: suplemento obligatorio, 3 tóxicos más, bajar de peso con objetivo mínimo del 85 % del peso actual, res magra marcada como grasa alta) y el código (estado ⛔ engañoso y texto del confirm). Prueba de humo con DOM falso: 15/15. El workflow corre los 3 tests.
- 2026-11-23: Primer push a https://github.com/jhonatanacar/mascota (rama main). En la primera ejecución de Actions los 3 tests pasaron y falló `configure-pages` porque Pages aún no estaba activado (Settings > Pages > Source: GitHub Actions). Sitio esperado: https://jhonatanacar.github.io/mascota/
- 2026-11-23: Fase 9 escrita: `supabase/functions/ia/index.ts` (Edge Function: comprueba la sesión, límite 60/día en `ia_llamadas`, prompt de sistema fijo, Groq `llama-3.3-70b-versatile` o el secreto `GROQ_MODEL`, respuesta JSON), `06_ia.sql` (`ia_llamadas` solo lectura/alta; `aprendizajes.datos`), `ia.js` + `ia.test.js` (`validarIA`: bloquea alimentos o menú que chocan con reglas/tóxicos, menú solo con ids permitidos, menciones, regla/aprendizaje propuestos validados). UI: 🤖 Asistente en Hoy ("¿Qué le doy hoy?", "Resumen de la semana", pregunta libre; las preguntas sobre algo prohibido las responde el código sin IA), 🧠 Recuerdos en Mascotas, recomendaciones en Comida (se revisan otra vez contra las reglas). Los gramos siempre los calcula `calcularMenu`. Prueba de humo con IA simulada: 8/8. agy (seguridad de la función): se aplicó que no se puedan borrar registros de `ia_llamadas`. Workflow: 4 tests, checkout@v5, setup-node@v5, Node 22. Pasos de configuración en GUIA.md, Parte 1 b.
- 2026-11-24: La publicación falló 3 veces con "No artifacts named github-pages were found" (el artefacto sí existía: deploy-pages corría 1 s después de subirlo, en el mismo trabajo). Se resolvió separando el workflow en dos trabajos (`preparar` → `publicar`, con `needs`), más `actions: read` y upload-pages-artifact@v4. Funciona desde el commit 723b3c8.
- 2026-11-24: Login con contraseña opcional (signInWithPassword + botón 🔑 para ponerla) por el límite de correos de Supabase. Mascota activa más visible: barra fija arriba con foto y nombre (con el número de avisos de las otras), títulos "… de <nombre>", y todo segmentado por la mascota activa (reglas, plan, salud, peso, comida, asistente, historial; en Hoy la tarjeta completa es la de la activa y las demás van en una línea). Prueba de humo: 31/31.
- 2026-11-24: "Failed to send a request to the Edge Function": la función `ia` no estaba desplegada (404 sin CORS). El usuario no tenía clave de Groq (confusión Groq/Grok; pensó que pedía tarjeta). La función ahora acepta cualquier proveedor compatible con OpenAI vía secretos `IA_URL` / `IA_MODEL` / `IA_API_KEY` (por defecto Groq con `GROQ_API_KEY`), y extrae el JSON si el modelo lo envuelve en texto. Opciones gratis en GUIA.md: Groq, Gemini, OpenRouter.
- 2026-11-24: Groq: `llama-3.3-70b-versatile` ya no está en el plan gratis (model_not_found; figura como Enterprise en console.groq.com/docs/models). Modelo por defecto: `openai/gpt-oss-120b` (abierto), con `reasoning_effort: low` y `max_tokens` 2500 porque razona antes de responder.
