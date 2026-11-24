# Guía de Mascota

App para registrar paseos, comidas, salud y alergias de nuestras mascotas. La usamos mi hermano y yo,
desde el celular o la PC, y los dos vemos lo mismo.

---

## Parte 1: Dejar listo Supabase (una sola vez)

Ya hecho: proyecto creado, `schema.sql`, `02_fotos.sql` y `03_permisos.sql` corridos.

### 1.1 Compartir los datos entre los dos

1. Supabase → **SQL Editor** → **New query**.
2. Pega todo el contenido de `04_compartir.sql` → **Run**. Debe decir *Success*.

Desde ahí, cualquier cuenta con sesión iniciada ve y edita todo, y el historial guarda quién hizo cada registro.

### 1.1 b Comida, inventario y gastos

1. Supabase → **SQL Editor** → **New query**.
2. Pega todo el contenido de `05_comida.sql` → **Run**.

Agrega: actividad y objetivo de peso en la ficha, premios, peluquería y limpieza dental en salud, ingredientes por perro, inventario y gastos.

### 1.2 Que tu hermano tenga su cuenta

1. Tu hermano abre la app (en tu PC: `http://localhost:3000`; cuando esté publicada: la dirección de GitHub Pages).
2. Escribe su email → **Enviarme enlace de acceso** → abre el correo y toca el enlace.
3. Debe ver las mismas mascotas que tú.

### 1.3 Cerrar la puerta (que nadie más pueda entrar)

> Hazlo **después** de que tú y tu hermano hayan iniciado sesión al menos una vez.

1. Supabase → **Authentication** → **Sign In / Providers** (en algunas versiones: **Authentication → Settings**).
2. Desactiva **Allow new users to sign up** → **Save**.

Desde ahora solo entran las cuentas que ya existen. Si algún día quieren sumar a alguien:
**Authentication → Users → Add user / Invite user** con su email.

Para comprobarlo: abre la app en una ventana de incógnito y prueba con un email que no sea de ustedes.
No debe poder entrar.

---

## Parte 1 b: Activar la IA (gratis, una sola vez)

### 1. Clave de una IA gratuita (elige UNA)

> Ojo: **Groq** (con q, console.groq.com) es gratis. **Grok** (con k, de x.ai) es otra cosa y es de pago.
> Ninguna clave se pega en archivos del proyecto ni en GitHub: solo en los secretos de Supabase (paso 3).

| Opción | Dónde sacar la clave | Secretos a crear en Supabase |
|---|---|---|
| **A. Groq** (recomendada, modelo abierto GPT-OSS; por defecto `openai/gpt-oss-120b`) | console.groq.com → **API Keys** → **Create API Key** (empieza con `gsk_`) | `GROQ_API_KEY` = la clave |
| **B. Google Gemini** (si Groq pide tarjeta) | aistudio.google.com → **Get API key** → **Create API key** | `IA_API_KEY` = la clave · `IA_URL` = `https://generativelanguage.googleapis.com/v1beta/openai/chat/completions` · `IA_MODEL` = `gemini-2.0-flash` |
| **C. OpenRouter** (modelos abiertos gratis, con pocas consultas por día) | openrouter.ai → **Keys** → **Create Key** | `IA_API_KEY` = la clave · `IA_URL` = `https://openrouter.ai/api/v1/chat/completions` · `IA_MODEL` = `meta-llama/llama-3.3-70b-instruct:free` |

Si un modelo deja de existir, el error lo dice ("model not found" o "decommissioned"): busca otro en la lista de modelos del proveedor y cambia `IA_MODEL` (o `GROQ_MODEL` en la opción A).

### 2. Tabla de la IA
Supabase → **SQL Editor** → pega `06_ia.sql` → **Run**.

### 3. Función "ia" en Supabase
1. Supabase → **Edge Functions** → **Deploy a new function** → **Via Editor**.
2. Nombre de la función: `ia` (exactamente así, en minúsculas).
3. Borra el código de ejemplo y pega **todo** el contenido de `supabase/functions/ia/index.ts`.
4. **Deploy function**.
5. Edge Functions → **Secrets** (o *Manage secrets*) → **Add new secret**: los de la opción que elegiste en el paso 1. Para Groq:
   - Name: `GROQ_API_KEY` · Value: la clave `gsk_...` → **Save**.

### 4. Probar
Abre la app → 🏠 Hoy → **🤖 Asistente** → toca **¿Qué le doy hoy?**.

| Si aparece... | Qué hacer |
|---|---|
| "Falta configurar la clave de la IA" | Revisa los secretos del paso 3.5 (nombres exactos). |
| "Failed to send a request to the Edge Function" | La función `ia` no existe o tiene otro nombre: repite el paso 3. |
| "Invalid JWT" o error 401 | En la función `ia` → **Settings**, desactiva **Enforce JWT verification** (la función igual comprueba la sesión). |
| "La IA no respondió (400)" con *model* o *decommissioned* | El modelo cambió de nombre: en console.groq.com → *Models* elige uno de texto y agrégalo como secreto `GROQ_MODEL`. |
| "límite de 60 consultas" | Se usó mucho hoy. Vuelve mañana. |

### Cómo funciona (y por qué es segura)
- La IA **propone** y la app **decide**: antes de mostrar algo, lo revisa contra alergias, reglas y tóxicos.
  Si choca, lo bloquea y lo guarda como "bloqueada" con el motivo.
- "¿Puede comer chocolate?" lo responde la app sola: si está prohibido dice **No** sin preguntarle a la IA.
- En "¿Qué le doy hoy?" la IA elige ingredientes **solo** de los permitidos; los **gramos los calcula la app**.
- Lo que la IA quiere recordar o una regla que propone (ej. "alergia al salmón") queda **pendiente**:
  tú tocas **✓ Recordar** o **Crear regla**. Lo confirmado se le envía en cada consulta (🐾 Mascotas → 🧠 Recuerdos).
- Máximo 60 consultas por día entre los dos.
- No es consejo veterinario.

---

## Parte 2: Publicar en internet (GitHub Pages, gratis)

1. Entra a **github.com** → **+ → New repository**.
   - Nombre: `mascota` · **Public** · no marques ninguna casilla → **Create repository**.
   - Es público porque Pages es gratis solo así. No expone tus datos: la clave de `config.js` es pública
     por diseño y los datos solo se ven con sesión iniciada.
2. Pásale la URL del repo a Claude para que haga el primer commit y lo suba.
   La primera vez se abre una ventana para iniciar sesión en GitHub.
3. En el repo: **Settings → Pages → Source: GitHub Actions**.
4. Espera 1 o 2 minutos. En la pestaña **Actions** debe aparecer **Publicar** con ✅.
   Si aparece ❌, falló algún test y no se publicó nada: copia el error y pásaselo a Claude.
5. Supabase → **Authentication → URL Configuration**:
   - **Site URL:** `https://TU-USUARIO.github.io/mascota/`
   - **Redirect URLs:** agrega `https://TU-USUARIO.github.io/mascota/` (deja también `http://localhost:3000`).

Cada vez que se suben cambios, GitHub corre los tests y, si pasan, publica solo.

---

## Parte 3: Instalar en el celular

1. Abre `https://TU-USUARIO.github.io/mascota/` en el celular e inicia sesión.
   - Abre el enlace del correo **en el mismo celular**.
2. Instálala:
   - **Android (Chrome):** menú **⋮ → Instalar app** (o *Agregar a pantalla principal*).
   - **iPhone (Safari):** botón **Compartir → Agregar a inicio**.

Queda con el ícono de la huella verde y se abre como una app.

---

## Parte 4: Cómo se usa

### 🏠 Hoy
- **🚨 Emergencia:** teléfonos del veterinario para llamar con un toque, alergias y medicamentos de cada perro,
  y acceso a la ficha completa.
- **Arriba, la mascota:** si hay varias, toca su nombre. Todo lo que registres va a esa.
- **Registrar con un toque:** 🦮 Paseo, 🍖 Comida, 🦴 Premio, 🚪 Salida, 💊 Medicina, 🛁 Baño, 🤒 Síntoma, 🐕 Conducta, 📝 Otro.
  - Comida, Premio, Medicina, Conducta y Otro te piden una nota. En Comida te sugiere la del plan.
  - Comida y Premio avisan si lo que escribiste es **tóxico** (chocolate, uva, cebolla, ajo...) o choca con una alergia.
  - **Síntoma** abre una lista para tocar: vómito, diarrea, dolor abdominal, mucha sed, sangre en la orina, granitos en el lomo...
    Si se juntan señales de alarma (por ejemplo vómito + dolor abdominal, posible pancreatitis), la tarjeta lo marca en rojo.
  - Si te equivocaste, toca **Deshacer** en el aviso de abajo (dura 6 segundos).
- **⏱️ Paseo con cronómetro:** tócalo al salir y otra vez al volver. Guarda el paseo con su duración.
  Si cierras la app en el medio, sigue contando.
- **Tarjeta de cada mascota:**
  - ⛔ sus alergias, siempre a la vista;
  - avisos en rojo: comida del plan que falta, paseo de siempre que no se hizo, vacunas por vencer,
    dosis atrasadas, síntomas repetidos, cambios de peso;
  - último paseo y última comida, y **quién** los hizo;
  - resumen de la semana comparado con la anterior;
  - 📈 lo que la app aprendió: "come ~8:05 y 19:10". Empieza a aprender con 5 días de registros.
  - para Schnauzer: peluquería cada 6–8 semanas, análisis de sangre anual desde los 5 años, limpiar la barba después de comer;
  - ingredientes en prueba, bolsas de comida por acabarse y premios del día.

### 🐾 Mascotas
- **Fichas:** foto, raza (escribe "Schnauzer miniatura" para activar lo de la raza), nacimiento (la edad se calcula sola),
  **actividad** y **objetivo** (mantener o bajar de peso, con peso objetivo), notas.
- **Reglas y alergias:** lo que la app nunca olvida.
  - ⛔ **Alergia** y 🚫 **Evitar** bloquean: si registras algo que coincide, te avisa antes de guardar.
  - Al escribir la sustancia (ej. *pollo*) te sugiere sinónimos (*gallina, ave, chicken...*). Revísalos y agrega los que falten.
  - 💚 Preferencia y 🩺 Indicación del veterinario son solo informativas.
  - Para pausar una regla, desmarca **Activa** en vez de borrarla.
- **Plan de alimentación:** alimento, gramos y hora. Si algo choca con una alergia, lo marca en rojo.
- **Contactos:** veterinario, paseador, emergencia, con botón 📞 para llamar.

### 🍖 Comida
- **Calorías por día:** se calculan con su último peso, edad, si está esterilizado, actividad y objetivo.
  También muestra cuántas calorías pueden ir en premios (10 %) y el rango de peso de la raza.
- **Ingredientes:** toca ✅ si lo tolera, 🧪 si lo estás probando, ⛔ si es alérgico.
  - ⛔ crea la regla de alergia sola, con sus sinónimos. Quitar el ⛔ desactiva la regla (te pide confirmar).
  - 🧪: la app vigila 5 días. Si hay síntomas te sugiere ⛔; si no, te sugiere ✅.
  - Los tóxicos para perros están siempre bloqueados y no se pueden marcar.
- **Generar menú:** elige proteína, carbohidrato y verdura (solo aparecen los que puede comer, los ✅ primero),
  cuánto es casero y cuánto croquetas, y las comidas por día. Te da los gramos por día y por comida.
  - Avisa si el menú es alto en grasa (pancreatitis en Schnauzer) o en oxalato (cálculos).
  - **Usar como plan** lo pasa al plan de alimentación con sus horarios.
  - **Menú semanal:** 7 días rotando los ingredientes que tolera, más la lista de compras.
  - ⚠️ La comida casera **siempre** necesita un suplemento de calcio y vitaminas indicado por el veterinario.
- **Inventario:** carga la bolsa (kilos y fecha en que la abriste) y te dice cuándo se acaba.
  Si dejas vacío "gramos por día", lo calcula del plan.

### 🩺 Salud
- **Próximas fechas:** vacunas y desparasitaciones pendientes. En rojo si faltan 7 días o menos.
- **Medicamentos:** con **Dar ahora** se registra la toma y se calcula la próxima dosis.
- **Vacunas, desparasitaciones y consultas:** pon la **próxima fecha** para que la app te avise.
- **Peso:** gráfico y diferencia entre pesajes. Pesarla una vez al mes alcanza para detectar cambios.
- **🖨️ Ficha para el veterinario:** abre una hoja con todo resumido para imprimir o guardar como PDF.
  Si no abre, permite las ventanas emergentes.

### 📅 Historial
- Todo lo registrado, por día, con quién lo hizo. Filtra por mascota o tipo.
- Toca un registro para corregirlo: hora, duración del paseo, cantidad, nota. También puedes borrarlo.
- **+ Registro con otra fecha u hora:** para lo que te olvidaste de registrar en el momento.
- **⬇️ Exportar:** baja todo a un archivo que abre Excel.
- **Gastos:** veterinario, comida, peluquería, medicinas, accesorios. Muestra el total del mes y del mes anterior.

---

## Problemas comunes

| Problema | Qué hacer |
|---|---|
| No llega el correo o dice "email rate limit exceeded" | Supabase gratis manda muy pocos correos por hora. Espera ~1 hora sin reintentar, o entra con contraseña: ponla con **🔑 Contraseña** (arriba, con la sesión abierta) o créala en Supabase → Authentication → Users → **Add user → Create new user** (email + contraseña, marcando *Auto Confirm User*). |
| El enlace del correo abre una página de error | Revisa las URL de la Parte 2, paso 5. |
| "permission denied for table ..." | Corre `03_permisos.sql` otra vez. |
| Tu hermano ve la app vacía | Falta correr `04_compartir.sql` (Parte 1.1). |
| "Error al cargar: ... ingredientes_mascota" o "column ... does not exist" | Falta correr `05_comida.sql` (Parte 1.1 b). |
| No cargan los datos después de unos días sin uso | Supabase pausa los proyectos gratis tras ~1 semana sin uso: entra a supabase.com y toca **Restore**. |
| Cambié algo y no se ve | Recarga con Ctrl+F5 (PC) o cierra y abre la app (celular). |

## Qué NO hacer

- No pegues la clave **secret / service_role** de Supabase en ningún archivo.
- No borres una alergia "para probar": desmárcala como inactiva.
- La app **no reemplaza al veterinario**: sus avisos son recordatorios, no diagnósticos.
