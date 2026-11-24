// Supabase > Project Settings > API. La "anon public key" es pública por diseño; los datos los protege RLS.
const SUPABASE_URL = 'https://bdxoljwhbfmsxwisbkys.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_Ak1wrWBTjqxcBXe70QB6Qw_jLFCJjQc';
// Clave pública para las notificaciones (Web Push). Es pública por diseño; la privada vive solo en los secretos de Supabase.
const VAPID_PUBLICA = 'BI0gQhXfHmTLXmOYjciScHe9Vtu9svqE1VwqkRaCl5fbS8Ubr-djTrD1nRO_MtF0o7TyLKxQpUCnsU-JhvUjBuI';
