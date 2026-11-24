# Mascota

Lee `PLAN.md` al empezar. Trabaja la siguiente fase sin marcar.
Al terminar una fase: márcala `[x]` y agrega una línea a la "Bitácora de decisiones".
Mantén la app sin build: HTML + JS + Supabase. No agregues dependencias pagas.
Toda tabla nueva en SQL necesita `enable row level security`, la política `compartido` (`for all to authenticated using (true) with check (true)`: todos los usuarios con sesión comparten todo, ver `04_compartir.sql`) y `grant select, insert, update, delete ... to authenticated` (Supabase ya no lo da solo).
El acceso se controla en Supabase (registro de usuarios nuevos desactivado), no en el código. Nunca escribas emails reales en archivos del repo: es público.
La IA solo propone (va a `aprendizajes` sin confirmar); las alergias se controlan con reglas fijas, nunca con IA.
Toda recomendación de la IA pasa por el filtro de `reglas` (con sinónimos) antes de mostrarse o guardarse como aceptada; el filtro debe tener test.
Usa `agy -p "..."` libremente para delegar tareas (sin `--dangerously-skip-permissions`). Revisa siempre su diff y corre los tests antes de aceptar su trabajo.
La clave de la IA vive solo en la Edge Function, nunca en el navegador.
