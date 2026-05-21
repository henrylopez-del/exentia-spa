# Guía Víctor — Qué hacer ANTES de recibir la identidad de marca de Exentia

**Para:** Víctor (dev Ainnovation)
**De:** Henry
**Fecha:** 2026-04-24
**Status del proyecto:** Esperando respuesta del checklist de Yaz/Jocelyn (due vie 2026-05-01) que incluye el documento de características de marca.

---

## Por qué esta guía

Tenemos ~7 días útiles antes de que llegue la identidad de marca. **No esperes esa entrega para empezar.** El 70% del proyecto Exentia es brand-agnostic — toda la plomería de data, GHL, n8n, tracking y la lógica del dashboard se puede construir sin un solo color o tipografía oficial. Cuando llegue el manual de marca, lo único que falta hacer es aplicar variables CSS y reemplazar placeholders visuales.

Esta guía te dice exactamente **qué construir, en qué orden, y qué validar antes de pasar a la siguiente tarea**. Refleja la Fase 2-5 del Action Plan + parte de la 6-8.

**Lecturas obligatorias antes de tocar código:**

1. `~/Desktop/HenryBrain/wiki/projects/ainnovation-landing-playbook.md` — pattern combinado, decisiones forzadas, antipatterns
2. `~/Desktop/HenryBrain/wiki/projects/exentia-action-plan.md` — alcance específico Exentia
3. `~/Desktop/HenryBrain/wiki/projects/exentia-ralph-loop.md` — checklist iterable; márcalo en cuanto cierres una tarea
4. `~/Desktop/exentia/CLAUDE.md` — convenciones técnicas y red flags

---

## Qué NO bloquea (puedes arrancar hoy)

- Crear proyecto Supabase y todo el schema
- Crear los 7 workflows de n8n
- Crear GHL location, custom fields, tags canónicas, pipeline
- Configurar GA4 property y Microsoft Clarity
- Escribir el `tracker.js` IIFE completo
- Estructura HTML semántica de la landing (sin estilos finales)
- Lógica del dashboard (queries, suscripciones realtime, Chart.js setup)
- Workflow `exentia-pago` con la integración a Google Ads y Meta CAPI (build, no activate)

## Qué SÍ bloquea (esperar a Jocelyn)

- CSS final de la landing (paleta, tipografías, sombras, bordes, espaciado fino)
- CSS final del dashboard
- Hero image y assets visuales
- Voice and tone del copy de la landing (placeholder copy se puede dejar)

## Qué bloquea pero es responsabilidad de Henry verificar

- Estado de la app OAuth en Google Cloud Console (Testing vs Production) — refresh token muere en 7 días si está en Testing. Ver `wiki/feedback/google-oauth-testing-expires.md`
- Nivel del Developer Token (Test / Explorer / Basic / Standard) — solo Basic+ funciona contra cuentas reales
- Estado del MCC `876-257-5839` y si acepta sub-cuentas nuevas

Yo te aviso cuando estos tres puntos estén resueltos. Mientras tanto el módulo de Google Ads (Capa 5 del Playbook) lo construyes pero no activas.

---

## Tareas ordenadas por dependencia

> **Convención:** cada tarea tiene **Output esperado** + **Cómo validar**. No la marques ✅ en el Ralph Loop hasta que la validación pase.

### Tarea 1 · Setup proyecto Supabase

**Output:**
- Proyecto nuevo `exentia-prod` creado en Supabase
- DDL ejecutado: tablas `exentia_leads`, `exentia_bookings`, `exentia_servicios`, `exentia_terapeutas`, `exentia_disponibilidad`, `exentia_eventos_atribucion`, `exentia_mensajes_wa`
- Vistas: `exentia_dashboard_kpis_today`, `exentia_revenue_by_channel_7d`, `exentia_terapeuta_utilization`, `exentia_sessions`
- RLS policies por tabla (ver Action Plan §2.4)
- Storage buckets: `exentia-public` (anon SELECT) + `exentia-private` (service_role only)
- Tabla `credentials` populada con `category=supabase, client=exentia` + URL + anon_key + service_role_key

**Cómo validar:**
```sql
SELECT count(*) FROM exentia_leads;          -- 0, no error
SELECT count(*) FROM exentia_dashboard_kpis_today;  -- 1 row con 0s
SELECT count(*) FROM information_schema.columns WHERE table_name='exentia_leads';  -- 26
```

Con anon key, INSERT en `exentia_leads` debe funcionar; SELECT en `exentia_terapeutas` debe devolver 0 rows (RLS block).

**Archivos:** `~/Desktop/exentia/backend/supabase-schema.sql`, `rls-policies.sql`.

---

### Tarea 2 · n8n workflows base (sin activar el de pago todavía)

Construye los 5 workflows que NO dependen de Meta/Google externos:

| Workflow | Para qué | Validable hoy |
|---|---|---|
| `exentia-track.json` | Captura eventos browser → Supabase | Sí |
| `exentia-reserva.json` | Form submit → reverse geocode + Supabase + GHL upsert + wa.me link | Sí (si GHL location existe) |
| `exentia-checkin.json` | Terapeuta marca llegada con geoloc | Sí |
| `exentia-resena.json` | Cliente responde reseña | Sí |
| `exentia-meta-spend-pull.json` | Cron pull gasto Meta para ROAS | Construir, NO programar el cron hasta tener token Meta |

**Patterns AEC (no negociables):** `continueOnFail: true`, Prefer `return=representation`, `credentials: omit` para CORS, NO `{{placeholder}}` dentro de `={{ }}` expressions. Ver `wiki/tools/n8n-best-practices.md`.

**Output:** archivos JSON en `~/Desktop/exentia/n8n/`.

**Cómo validar (`exentia-track`):**
```bash
curl -X POST https://n8n-ntcue-u59578.vm.elestio.app/webhook/exentia-track \
  -d '{"event_type":"page_view","page_path":"/test","utm_source":"test"}'
# Esperado: 200 con {"ok":true,"lead_ref":"XXXXXXXX"}
```
Luego `SELECT * FROM exentia_leads ORDER BY created_at DESC LIMIT 1;` debe mostrar la row.

---

### Tarea 3 · GHL location + custom fields + tags + pipeline

**Output:**
- GHL location nueva para Exentia (sub-cuenta bajo agency Ainnovation)
- Timezone: `America/Cancun`
- 27 custom fields prefijo `exentia_*` (lista exacta en Action Plan §3.2 y `docs/ghl-custom-fields.md`)
- Pipeline "Exentia — Reservas" con 9 stages
- Calendario consolidado
- **Tags canónicas pre-creadas TODAS antes de cualquier workflow.** Lista:
  - `canal_google | canal_meta | canal_organico | canal_directo | canal_referencia` (5)
  - `etapa_lead_entro | _cotizo | _reservo | _agendado | _confirmado | _asistio | _pago | _resena | _recurrente` (9)
  - `preferencia_hombre | preferencia_mujer | preferencia_indistinto` (3)
  - Operativas: `recurrente | opt_out | no_show | cancelado | vip | nuevo_30d` (6)
  - **Bloqueadas hasta que Yaz confirme:** `servicio_*` (uno por tipo de masaje) y `zona_*` (una por zona Cancún)

**Por qué pre-crear tags:** lección Arqalum — workflows GHL droppean silently tags que no existen.

**Cómo validar:**
- GHL API `GET /locations/{id}/customFields` devuelve los 27
- GHL UI: pipeline visible con 9 stages
- Crear contacto test, aplicar tag `etapa_reservo` manualmente → workflow de confirmación dispara

**Output docs:** `~/Desktop/exentia/docs/ghl-custom-fields.md` con IDs post-creation.

---

### Tarea 4 · GA4 property + Microsoft Clarity

**Output:**
- GA4 property nueva `exentia-prod`
- Measurement ID guardado en `credentials` cat `analytics`, client `exentia`
- Custom events configurados para los 20 del playbook (page_view ya viene gratis; los otros 19 son custom)
- Microsoft Clarity project nuevo (sin costo, ilimitado)
- Project ID guardado en `credentials`

**Cómo validar:** ambos servicios listos para recibir tráfico (no hay snippet en una página viva todavía, eso es Tarea 6).

---

### Tarea 5 · tracker.js IIFE completo

Implementa el script que la landing va a inyectar inline. Skeleton ya está en el Action Plan §5.5 — ampliarlo con todos los 20 eventos.

**Output:** `~/Desktop/exentia/landing/tracker.js`

**Cómo validar:**
- Crear un HTML stub local `/test.html` con `<script>` inline del tracker
- Abrirlo con `?gclid=TEST&utm_source=google&utm_medium=cpc`
- Network tab: ver POST a `exentia-track` con payload completo
- `SELECT * FROM exentia_leads WHERE gclid='TEST'` → row insertada
- `localStorage` debe tener `ex_session`, `ex_lead_ref`
- `document.cookie` debe tener `ex_first_attr` con UTMs serializados
- `window.exentiaTrack('test_event', {foo:'bar'})` desde DevTools → row con event_type='test_event' y extra.foo='bar'

---

### Tarea 6 · Landing estructura HTML semántica + tracker integrado (sin estilos finales)

Construye el HTML completo de la landing usando placeholders neutrales (Tailwind base o CSS minimal monocromo). Aplicas brand identity cuando llegue de Jocelyn.

**Output:** `~/Desktop/exentia/landing/index.html`

**Decisiones FORZADAS por data Arqalum + Sarahi (no negociables, ver Playbook §3):**
- Single vertical scroll, NO slider
- Hero con CTA WhatsApp primario sobre form
- Form 3 campos máximo: Nombre, Teléfono, Tipo de masaje + Sexo terapeuta (radio H/M/I)
- WebP <100KB hero (placeholder gris hasta tener foto real)
- wa.me link ASCII puro: `https://wa.me/521998XXXXXXX?text=Hola,%20quiero%20reservar...` sin acentos
- robots.txt explícito allow, **sin** `<meta noindex>`
- Mobile-first 100vh hero
- Sticky CTA WhatsApp bottom bar (aparece scroll >200px)

**10 secciones:**
1. Hero (terapeuta llegando a casa) + CTA WA
2. Sticky CTA WA bottom
3. Tipos de masaje (cards desde `exentia_servicios`)
4. Cómo funciona (3 pasos)
5. Cobertura Cancún (zonas + mini mapa)
6. ~~Terapeutas~~ (NO mostrar — modelo C operativo)
7. Testimonios (placeholder "Cliente A: '...'" hasta que Yaz mande reales)
8. FAQ (acordeón con preguntas estándar — horarios, pago, cancelación, espacio mínimo, requisitos)
9. Reserva final
10. Footer + aviso de privacidad

**`data-event` attributes para que el tracker enganche IntersectionObservers y clicks:**
```html
<div data-service-slug="relajante" class="service-card">...</div>
<a href="https://wa.me/..." data-event="whatsapp_direct_click">WhatsApp</a>
<a href="tel:..." data-event="call_click">Llamar</a>
<button type="submit" data-event="form_submit_intent">Reservar</button>
```

**Form submit handler:**
1. Fire `form_submit_intent`
2. POST a `exentia-reserva` con `{nombre, telefono, servicio_slug, preferencia_sexo, lead_ref, session_id, utm_*}`
3. Recibir `{booking_code, wa_link}`
4. Fire `form_submit_whatsapp`
5. `window.location.href = wa_link`

**Cómo validar:**
- Lighthouse mobile score ≥ 85 (placeholder colors permitidos para esta validación)
- Submit test → row en Supabase `exentia_bookings` + contacto en GHL + redirect a wa.me funcional sin mojibake
- Open en iPhone real → wa.me abre WhatsApp con texto sin caracteres rotos
- Tracker dispara los 20 eventos en sus triggers correspondientes

---

### Tarea 7 · Dashboard structure + queries + realtime (sin estilos finales)

Build del dashboard como repo privado nuevo `henrylopez-del/exentia-dashboard`. Variante B srcdoc por PII (ver Playbook §3 Capa 6).

**Output:**
- `~/Desktop/exentia/dashboard/index.html` con:
  - Chart.js v4 UMD + Supabase-JS v2 UMD vía CDN
  - Estructura de 4 bloques KPI (Yaz, Jocelyn, Google, Ainn)
  - Filtros globales sticky (fecha, canal, servicio, zona, first-vs-last toggle)
  - Suscripciones WebSocket a `exentia_bookings` + `exentia_leads`
  - Polling 60s a views agregadas
  - Anti-mojibake: textos en español con escapes `\u00e9`
  - Escape CSS anti-wrapper GHL: `position:fixed !important` + `z-index: 2147483647`
- `~/Desktop/exentia/dashboard/deploy-srcdoc.sh` (escape HTML → pbcopy)

**Estilos:** placeholder neutro (gris/blanco). Aplicas brand cuando llegue.

**Cómo validar:**
- INSERT booking test desde Supabase UI → dashboard actualiza < 2s vía WebSocket
- Cambiar filtro de fecha → KPIs re-calculan
- Pegar el srcdoc en una página GHL test → renderiza sin scroll horizontal
- Acentos español renderizan correcto (no `√≥` ni `Á`)

---

### Tarea 8 · Workflow `exentia-pago` (build, NO activar)

Construye la lógica completa del workflow `exentia-pago` siguiendo Action Plan §4.4. Incluye las llamadas a Google Ads `uploadClickConversions` y Meta CAPI `Purchase`.

**Output:** `~/Desktop/exentia/n8n/exentia-pago.json` + `exentia-upload-conversions.json` (cron retry).

**Estado al cerrar:** workflow construido, **NO activado**. Las HTTP Request nodes apuntan a credenciales que no existen aún (`credentials.google_ads.exentia.refresh_token`, `credentials.meta.exentia.capi_token`). Esto se llena cuando Henry resuelva el bloqueo de OAuth/MCC y cuando llegue el token Meta admin del Business Manager.

**Cómo validar (mock):**
- Mock manualmente las credenciales con valores placeholder
- Trigger el workflow con un `booking_id` test
- Verificar que el Code node calcula bien el `event_id = exentia_{lead_ref}_Purchase_{yyyymmdd}`
- Verificar que la estructura del payload Google Ads y Meta CAPI cumple los specs (sin errores de schema)
- Verificar que INSERT en `exentia_eventos_atribucion` registra el intento con `status='mock'`

---

### Tarea 9 · Documentación y handoff

Mantén estos archivos al día conforme avanzas:

- `~/Desktop/exentia/docs/event-taxonomy.md` — los 20 eventos con su payload schema
- `~/Desktop/exentia/docs/utm-taxonomy.md` — convención Google + Meta
- `~/Desktop/exentia/docs/ghl-custom-fields.md` — IDs de los 27 fields post-creation
- `~/Desktop/exentia/docs/pipeline-stages.md` — los 9 stages con descripción
- `~/Desktop/exentia/docs/kpi-definitions.md` — definición de cada KPI del dashboard
- `~/Desktop/exentia/backend/seed-tags-ghl.md` — IDs de las tags canónicas

**Por cada tarea cerrada, actualiza el Ralph Loop** (`~/Desktop/HenryBrain/wiki/projects/exentia-ralph-loop.md`) cambiando ⬜ por ✅ y agregando entry al decision log si tomaste alguna decisión arquitectónica.

---

## Lo que NO toques hasta que llegue brand de Jocelyn

- Variables CSS (paleta, tipografía, radios, sombras)
- Selección de Google Fonts o cargar fonts custom
- Imágenes hero o de servicios (deja placeholders gris/blanco)
- Voice and tone del copy (deja placeholder neutro tipo "Masaje relajante de 60 min en tu casa")
- Color del logo o iconografía
- Ajustes finos de espaciado/jerarquía visual

Cuando llegue el manual de marca, son ~2-3 días de trabajo aplicar todo eso (CSS vars + reemplazar placeholders + assets en buckets Storage).

---

## Si te bloqueas

**Antes de preguntarme:**

1. Consulta el `ainnovation-landing-playbook.md` — la mayoría de "cómo se hace X" está ahí
2. Consulta `wiki/clients/arqalum-archive/arqalum-capa1-tracking-2026-04-16.md` — el schema base sale de ahí
3. Consulta `wiki/tools/n8n-best-practices.md` para cualquier duda de n8n

**Cuando preguntes:** sé específico. "El INSERT a Supabase devuelve undefined" es accionable. "n8n no funciona" no lo es.

---

## Estimación de tiempos (mientras esperamos brand)

| Tarea | Días estimados |
|---|---|
| 1. Supabase setup + DDL | 0.5 |
| 2. n8n workflows base (5) | 1.5 |
| 3. GHL location + custom fields + tags + pipeline | 1.5 |
| 4. GA4 + Clarity | 0.5 |
| 5. tracker.js IIFE completo | 1 |
| 6. Landing HTML estructura + tracker integrado | 1.5 |
| 7. Dashboard structure + queries + realtime | 1.5 |
| 8. Workflow `exentia-pago` (build only) | 1 |
| 9. Docs + Ralph Loop maintenance | continuo |
| **Total** | **~9 días útiles** |

Tenemos exactamente eso antes de la respuesta de Yaz/Jocelyn (vie 1-may + buffer del fin de semana = ~7-9 días). Justo. Si te atrasas en una, paraleliza con la siguiente — Tarea 1 es prereq de 2 y 3, después casi todo es paralelo.

---

## Ver también
- [[ainnovation-landing-playbook]] · pattern combinado y antipatterns
- [[exentia-action-plan]] · alcance Fases 1-9
- [[exentia-ralph-loop]] · checklist iterable (mantén actualizado)
- [[Exentia]] · ficha cliente

---

*Henry · 2026-04-24*
