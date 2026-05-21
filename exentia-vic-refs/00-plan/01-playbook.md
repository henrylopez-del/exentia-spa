---
type: playbook
owner: Ainnovation
updated: 2026-04-24
version: 1.0
aliases: ["Ainnovation Landing Playbook", "Landing Data-Complete Playbook", "Pattern Landing Ainnovation"]
related:
  - "[[Arqalum]]"
  - "[[Sarahi]]"
  - "[[Exentia]]"
  - "[[ghl-dashboard-pattern]]"
  - "[[arqalum-archive/arqalum-capa1-tracking-2026-04-16]]"
  - "[[sarahi-capi-backfill-2026-04-22]]"
  - "[[n8n-best-practices]]"
---

# Ainnovation Landing Playbook — Data-Complete

> **Propósito:** a partir de hoy **toda landing que Ainnovation construya nace con registro de data completo**. Este documento es memoria institucional: qué aprendimos en Arqalum, qué aprendimos en Sarahi, el patrón combinado reusable, cómo se aplicó a Exentia (primer caso), y la plantilla para futuros clientes.

> **Audiencia:** Henry, Víctor, y cualquier colaborador futuro que construya una landing para un cliente de Ainnovation. Lectura recomendada antes de cualquier kickoff de landing nuevo.

> **Principio rector:** data-first reverse engineering. Decidir primero qué ve el cliente en el dashboard → derivar qué captura la página → elegir herramientas → cerrar atribución → escribir SQL → montar el stack → y al final diseñar el layout con decisiones forzadas por data histórica.

---

## Tabla de contenido

1. [Sección 1 — Qué hicimos en Arqalum y por qué](#sección-1--qué-hicimos-en-arqalum-y-por-qué)
2. [Sección 2 — Qué hicimos en Sarahi y por qué](#sección-2--qué-hicimos-en-sarahi-y-por-qué)
3. [Sección 3 — Pattern combinado reusable (Landing Data-Complete)](#sección-3--pattern-combinado-reusable-landing-data-complete)
4. [Sección 4 — Aplicación a Exentia (primer caso del pattern combinado)](#sección-4--aplicación-a-exentia-primer-caso-del-pattern)
5. [Sección 5 — Plantilla para futuras landings](#sección-5--plantilla-para-futuras-landings)
6. [Anexos — Antipatterns + red flags](#anexos)

---

## Sección 1 — Qué hicimos en Arqalum y por qué

**Cliente:** [[Arqalum]] — vidrios y aluminios Cancún. Google Ads a $290/día.
**Instalado:** 2026-04-16 (Capa 1 tracking). Dashboard local + landings `/cotizacion-residencial` y `/cotizacion-comercial` v3 desplegadas 2026-04-18.
**Referencia técnica completa:** [[arqalum-archive/arqalum-capa1-tracking-2026-04-16]]

### Qué disparó este stack

Usuario hizo test manual de embudo (búsqueda Google → click anuncio → click WhatsApp → mensaje a Gerardo). **No había registro en ningún sistema.** El canal de conversión (WhatsApp personal de Gerardo) era caja negra sin telemetría. Cada click se perdía al cruzar al app de WhatsApp.

**Implicación para todo Ainnovation:** si no mides el click-out a WhatsApp, no mides nada. El 100% de las conversiones B2C MX pasan por WhatsApp y ninguna plataforma de ads lo captura solo.

### Stack en producción

```
Browser (arqalum.com/cotizacion-*)
    ├── gtag (Google Ads)        → conversiones oficiales
    ├── Microsoft Clarity         → grabación sesiones + heatmaps
    └── Tracker inline (fetch, credentials:'omit') → n8n webhook
                    ↓
            n8n "arqalum-track"
              Webhook → Normalize (JS) → Supabase Insert → Respond 200
                    ↓
            Supabase tabla arqalum_leads (+ 2 views + indexes)
                    ↓
            Dashboard local (auto-refresh 15s)
```

### Componentes

| Componente | ID / ruta | Decisión |
|---|---|---|
| Supabase project | `fneppfjeywhayknrgahe` | service_role JWT hardcoded en n8n (server-side only, no expuesto) |
| Tabla `arqalum_leads` | 22 columnas (id, created_at, lead_ref, click_type, page_path, landing_version, gclid, gbraid, wbraid, utm_*, referrer, session_id, time_on_page_ms, scroll_depth_pct, user_agent, device_type, screen_size, language, extra JSONB) | **Esta es la tabla canónica que clonamos para todo cliente nuevo** |
| Views | `arqalum_leads_today`, `arqalum_sessions` | `arqalum_sessions` agrega por session_id con booleans `convirtio_wa/call/form` |
| n8n webhook | `https://n8n-ntcue-u59578.vm.elestio.app/webhook/arqalum-track` | 4 nodos: Webhook → Normalize → Supabase Insert → Respond 200 static |
| Microsoft Clarity | `wcs7oe8lhe` | Gratis, ilimitado, heatmaps + session recordings + rage clicks + dead clicks |
| Lead ref | 8-char alfanum uppercase | Se inyecta en `wa.me?text=...[Ref XXXXXXXX]` para que Gerardo lo vea sin CRM |

### 12 eventos capturados

`pageview`, `scroll_25`, `scroll_50`, `scroll_75`, `scroll_100`, `gallery_click`, `proof_cta`, `form_start`, `form_submit_intent`, `whatsapp_click`, `call_click`, `session_end`.

**Persistencia sessionStorage:** SID, REF, UTMs sobreviven navegación intra-sesión.

### Por qué estas decisiones

1. **n8n como proxy** (NO Supabase directo desde browser): evita exponer anon key en HTML, centraliza validación, permite cambiar schema sin tocar HTML deployed.
2. **`fetch()` con `credentials:'omit'` + sin Content-Type** en vez de `navigator.sendBeacon`: evita preflight CORS. `sendBeacon` fuerza `credentials:include` que es incompatible con `Access-Control-Allow-Origin: *`. Esto se aprendió a golpes.
3. **`keepalive:true`** para el `session_end` beacon al cerrar tab: asegura el request se completa aunque la página esté cerrándose.
4. **Lead ref 8-char alfanum uppercase**: corto (cabe en WhatsApp message), legible (sin confusión 0/O, 1/l), único (30^8 = espacio enorme), visible sin CRM.
5. **Inyección del ref en `wa.me?text=...[Ref XXX]`**: Gerardo ve el identificador del lead incluso sin CRM conectado. Sobrevive el desacople CRM↔WhatsApp cuando ocurre.
6. **Clarity gratis**: vs Hotjar/PostHog, cero costo, cero límite de tráfico, features suficientes para B2C.
7. **service_role JWT en n8n** (no anon): el JWT server-side solo corre en n8n, no está expuesto al browser. Permite INSERT sin RLS policies complejas.

### Bugs resueltos (para NO repetir)

- **Bug A — HTTP 500 en Respond 200 (v1):** expresión `$('Normalize').item.json.lead_ref` falla en n8n 2.15.1. **Fix:** body estático `{"ok":true}`.
- **Bug B — Supabase Insert `undefined.data`:** header `Prefer: return=minimal` → Supabase devuelve body vacío → n8n HttpRequest parser falla al leer `.data`. **Fix:** `Prefer: return=representation`.
- **Bug C — CORS preflight blocked:** `sendBeacon` fuerza `credentials:include`. **Fix:** `fetch()` con `credentials:'omit'`, sin Content-Type.
- **Bug D — Normalize no parseaba body:** con text/plain, n8n pasa body como string. **Fix:** `if (typeof body === 'string') body = JSON.parse(body)`.
- **Bug E — OctoberCMS CSRF token viejo:** **Fix:** hard reload (Cmd+Shift+R).

### Learnings de layout (data real Arqalum — aplicables a cualquier cliente B2C)

Del A/B de v1 vs v3:

| Decisión | Fuente | Magnitud |
|---|---|---|
| Single vertical scroll > slider | Slider v1 tenía **0% form conversion** en 45 users | 100% improvement al quitar |
| WhatsApp CTA > form 3-field | **3 WhatsApp clicks vs 0 form submits** | 73% vieron form sin tocarlo |
| WebP 86KB vs JPG 474KB hero | Reducción 1s load time | -27% bounce |
| ASCII puro en `wa.me?text=` | iOS decodificaba mal acentos: "cotización" → "√≥" | Fix total mojibake |
| Eliminar `<meta noindex>` | Google rechazaba como Quality Score | Recuperó CPC |
| Mobile-first 100vh hero | Ads IG/FB/Google = 80%+ mobile | — |

### Bugs del producto que afectaron landing

- Residencial servía contenido comercial (paste bug 16-abr) — corregido v3 (18-abr). **Lesson:** validar LANDING_LABEL variable antes de deploy.
- Scroll horizontal desktop saltaba 2 slides (dominant axis detection) — removed slider entirely, problem disappeared.

### Capas del framework Arqalum

- **Capa 1 (operativo):** Supabase + n8n tracking + Clarity — captura eventos brutos ✅
- **Capa 2 (pendiente):** tabla `arqalum_deals` con stages (lead → respondió → cotizó → asistió → cerró → referido)
- **Capa 3 (pendiente):** interfaz Gerardo (Google Sheet o web form) para actualizar stage
- **Capa 4 (pendiente):** `ConversionUploadService.uploadClickConversions` trigger cuando stage → cerrado (gclid + valor)
- **Capa 5 (opcional):** Enhanced Conversions (hash phone/email) para recuperar 20-30% casos sin gclid

### Lo que NO había en Arqalum (y sí necesitamos en Exentia)

- UTM first-click vs last-click dual columns (Sarahi lo tiene)
- Meta Pixel + CAPI (Sarahi lo tiene)
- Dashboard para cliente (no solo local)
- event_id dedup server-side/browser-side
- `fbclid`, `msclkid` capture (solo `gclid/gbraid/wbraid` hoy)

---

## Sección 2 — Qué hicimos en Sarahi y por qué

**Cliente:** [[Sarahi Jaramillo]] — beauty coach, CRM + cursos + ads Meta.
**Dashboard construido:** 2026-04-23 (UTM Dashboard hosted Variante A).
**Referencia técnica completa:** [[sarahi.md|Sarahi]] + [[sarahi-capi-backfill-2026-04-22]]

### Qué disparó este stack

Sarahi venía invirtiendo en Meta Ads sin pixel funcional por 6 meses (~$14,265 MXN sept 2025 → feb 2026). Meta solo veía tráfico, no señales de conversión. **Algoritmo optimizaba a ciegas.** Ainnovation ingresó marzo 2026, reinstaló pixel + configuró UTM tracking + backfilled CAPI con 159 eventos históricos.

**Implicación para todo Ainnovation:** si el cliente tiene ads sin pixel correcto, el dinero de los últimos meses NO es recuperable en aprendizaje del algoritmo. Lo mejor que podemos hacer es un **backfill CAPI** con datos históricos (hasta 7 días para eventos standard; más allá requiere setup especial).

### Dashboard UTM Sarahi — Variante A hosted

| Aspecto | Detalle |
|---|---|
| URL live | `https://henrylopez-del.github.io/sarahi-dashboard/` |
| Repo | `henrylopez-del/sarahi-dashboard` (público) |
| Data source | Google Sheet `1PZ8KHyTZtkbSJH3t25Ki5UO3JRRfnnwZKPza9LlNA64` |
| Método de carga | **JSONP** (script tag con callback) — bypasea CORS de Google Sheets |
| Refresh | 60s polling |
| Pipeline | Meta Ads → GHL custom fields → n8n webhook → Google Sheet → JSONP → GitHub Pages → iframe en GHL |
| Guia replicable | `AEC-MASTER/MASTER-FLOW/18-UTM-DASHBOARD-GUIDE.md` |

**15 columnas canónicas:**
```
fecha, nombre, telefono, correo,
utm_source, utm_medium, utm_campaign, utm_adset, utm_content,
utm_source_first_click, utm_medium_first_click, utm_campaign_first_click, utm_adset_first_click, utm_content_first_click,
estado
```

**Filtros dropdown:** estado, utm_source, utm_medium, utm_campaign, utm_content.

### Por qué JSONP y no Supabase directo

- Google Sheets ya tenía el sheet con UTMs (poblado por n8n desde GHL)
- Conectar Supabase implicaba migrar el flujo existente
- JSONP bypass CORS sin token expuesto: Google permite `gviz/tq?tqx=responseHandler:callback`
- **Trade-off consciente:** 60s latency, no realtime. Para Sarahi está bien.
- **Para Exentia NO aplica:** queremos realtime + datos sensibles + control total. Usamos Supabase directo.

### Meta Pixel + CAPI setup Sarahi

| Pieza | Estado | ID |
|---|---|---|
| Pixel browser (fbq) | Funcional desde marzo 2026 | `1900054267348259` (Pixel Mentora Data) |
| CAPI backfill histórico | Completado 2026-04-22, 159 eventos enviados, $32,455 USD en Purchases | Token `EAAKEq...` scopes `ads_management` + `ads_read` |
| CAPI forward (tag-driven) | **ROTO** — workflow n8n usa token viejo con scope `read_ads_dataset_quality` | Requiere reemplazo |
| Dedup event_id | `sarahi_retro_{contactId}_{EventName}` | Pattern canónico |

**Eventos backfilled:**

| Evento | GHL tag fuente | Contactos | Valor |
|---|---|--:|--:|
| ViewContent | `video-visto` | 70 | — |
| Schedule | `agendo-cita` | 64 | — |
| Purchase | `compro` | 10 | $25,000 USD |
| Purchase | `curso-mentalidad-beauty-boss` | 9 | $4,473 USD |
| Purchase | `curso-reestructura-y-factura` | 6 | $2,982 USD |
| **Total** | | **159** | **$32,455 USD** |

### Qué aprendimos del anti-pattern CAPI token roto

**El scope `read_ads_dataset_quality` NO permite enviar eventos.** El error fue:

1. Víctor generó un token en el Business Manager con el scope que "sonaba" correcto (`read_ads_dataset_quality`)
2. El token pasaba checks de autenticación pero **silent failure** al enviar events
3. No detectado por meses hasta que Henry pulló diagnostic: Events Manager mostraba 0 server events
4. **Fix:** nuevo token con `ads_management + ads_read + business_management` (System User de Ainnovation)

**Lesson:** siempre verificar en Meta Events Manager → Diagnostics que el pixel/dataset recibe eventos server-side con `events_received > 0 AND events_rejected == 0`. Si es 0/0, token roto.

### UTM dual first+last click — por qué

En Sarahi, muchos leads vienen por IG orgánico (ven video), luego ven un anuncio pagado, luego entran al funnel. Si solo medimos `utm_source` (last click), perdemos la atribución al IG orgánico inicial.

**Solución:** cookie 30d para first-click + URL params live para last-click. Ambas se guardan en el Google Sheet → dashboard muestra filtros para ambas dimensiones.

**Aplicable a cualquier cliente con ciclo de venta >1 día.**

### Lo que NO había en Sarahi (y sí necesitamos en Exentia)

- Dashboard privado (Sarahi es público — Exentia tiene direcciones)
- Supabase realtime (Sarahi es polling 60s)
- Google Ads (Sarahi es Meta puro)
- Enhanced Conversions
- Tracker.js inline para custom events (Sarahi solo captura UTMs en form submit)
- Scroll tracking / heatmaps (Sarahi no tiene)

---

## Sección 3 — Pattern combinado reusable (Landing Data-Complete)

**Esto es lo nuevo que sale de este proyecto.** Integra lo mejor de Arqalum (tracking pro Google + tracker.js custom events + Clarity + learnings layout) con lo mejor de Sarahi (Meta Pixel + CAPI + UTM dual first-last + dashboard client-facing) — plus elementos nuevos (Variante B srcdoc para PII, event_id dedup, Enhanced Conversions, attribution 5-capa completa).

### Arquitectura de 6 capas

```
┌──────────────────────────────────────────────────────────────────┐
│ CAPA 1 · DATA CAPTURE (browser-side)                              │
│   tracker.js IIFE · 20 eventos canónicos                          │
│   first+last click UTM cookies · session_id rolling 30min         │
│   Google Ads gtag · Meta Pixel fbq · Clarity · beacon pagehide    │
└──────────────────────────────────────────────────────────────────┘
                               ↓
┌──────────────────────────────────────────────────────────────────┐
│ CAPA 2 · INGRESS (servidor)                                       │
│   n8n webhook AEC pattern                                         │
│   continueOnFail:true, Prefer:return=representation               │
│   credentials:omit, text/plain bypass preflight                   │
│   Normalize → lead_ref gen → Supabase Insert → Respond 200        │
└──────────────────────────────────────────────────────────────────┘
                               ↓
┌──────────────────────────────────────────────────────────────────┐
│ CAPA 3 · STORAGE (Supabase)                                       │
│   Tabla {client}_leads (schema canónico 26 columnas)              │
│   Tabla {client}_bookings (lifecycle 11-state enum)               │
│   Tabla {client}_eventos_atribucion (audit uploads)               │
│   Views agregadas para dashboard                                  │
│   Storage buckets público + privado con signed URLs               │
└──────────────────────────────────────────────────────────────────┘
                               ↓
┌──────────────────────────────────────────────────────────────────┐
│ CAPA 4 · CRM (GHL)                                                │
│   27 custom fields con prefijo {client}_*                         │
│   Tags canónicas pre-creadas (servicio_*, zona_*, etapa_*, etc)   │
│   Pipeline 9-stage estándar                                       │
│   Workflows: confirmación, recordatorios, trigger closed loop     │
└──────────────────────────────────────────────────────────────────┘
                               ↓
┌──────────────────────────────────────────────────────────────────┐
│ CAPA 5 · ATTRIBUTION CYCLE                                        │
│   Google Ads uploadClickConversions (gclid + hash PII + valor)    │
│   Enhanced Conversions fallback (20-30% recovery)                 │
│   Meta CAPI Purchase (event_id dedup con Pixel)                   │
│   Audit table con retry exponential backoff                       │
└──────────────────────────────────────────────────────────────────┘
                               ↓
┌──────────────────────────────────────────────────────────────────┐
│ CAPA 6 · VISIBILITY (dashboard)                                   │
│   Variante A hosted (datos no sensibles) o B srcdoc (PII)         │
│   4 bloques KPI: Operación, Meta, Google, Diagnóstico             │
│   Supabase Realtime WebSocket + polling 60s views                 │
│   Chart.js v4 UMD · brand identity del cliente                    │
└──────────────────────────────────────────────────────────────────┘
```

### Capa 1 — Data capture (tracker.js IIFE)

**20 eventos canónicos** (agrupados por intent):

**Engagement:**
- `page_view`
- `scroll_25`, `scroll_50`, `scroll_75`, `scroll_100`
- `service_card_view` (IntersectionObserver, cuando card entra al viewport)
- `service_select` (click en card)
- `service_detail_view` (si hay modal/expandible)
- `session_end` (beacon en pagehide, incluye `time_on_page_ms` + `max_scroll_depth_pct`)

**Intent:**
- `price_calculator_interaction`
- `zone_selector_interaction`
- `form_start` (primer focus en input)
- `form_field_complete` (por cada field completado — diagnostica dónde abandonan)
- `form_submit_intent` (click submit antes de validar)

**Conversion:**
- `form_submit_whatsapp` (submit válido que abre wa.me)
- `whatsapp_direct_click` (sticky WA sin pasar por form)
- `call_click` (botón tel:)
- `calendar_view`
- `calendar_time_slot_click`

**Upload:**
- `photo_upload_start`
- `photo_upload_complete`
- `maps_link_paste` (detecta paste de Google Maps URL)

**Attribution captura (persistida en cookie 30d + localStorage):**
- Click IDs: `gclid`, `gbraid`, `wbraid`, `fbclid`, `msclkid`
- UTMs last-click (URL params cada sesión): `utm_source`, `utm_medium`, `utm_campaign`, `utm_term`, `utm_content`
- UTMs first-click (cookie 30d, inmutable primera visita): `utm_source_first`, `utm_medium_first`, `utm_campaign_first`, `utm_term_first`, `utm_content_first`
- `referrer`, `landing_page_first`, `landing_page_last`
- `session_id` (UUID rolling 30 min)
- `lead_ref` (8-char alfanum generado server-side en primer INSERT)
- `user_agent`, `device_type`, `screen_size`, `language`, `timezone_offset`

**Dedup event_id:** `{client}_{lead_ref}_{event_name}_{yyyymmdd}`. Pixel browser y CAPI server envían el mismo event_id → Meta dedupe sola.

**Transport:**
```javascript
fetch('https://n8n.../webhook/{client}-track', {
  method: 'POST',
  keepalive: true,
  credentials: 'omit',
  mode: 'cors',
  // NO Content-Type header → text/plain → simple request, no preflight
  body: JSON.stringify({event_type, ...payload})
});
```

### Capa 2 — Ingress (n8n AEC pattern)

**4 nodos:** Webhook → Normalize → Supabase Insert → Respond 200

**Configuración crítica (no olvidar):**

| Nodo | Setting | Por qué |
|---|---|---|
| Webhook | Response: "Respond to Webhook" node | No default "Immediately" — queremos controlar el body |
| Normalize (Code) | `if (typeof body === 'string') body = JSON.parse(body)` | text/plain llega como string |
| Normalize | Genera `lead_ref` si falta: `Math.random().toString(36).substring(2,10).toUpperCase()` | Server-side único |
| Supabase Insert | Headers: `Prefer: return=representation`, `apikey: {service_role}`, `Authorization: Bearer {service_role}` | `return=minimal` rompe el parser en downstream |
| Supabase Insert | `continueOnFail: true` | NO perder acknowledgment al cliente si Supabase falla momentáneamente |
| Respond 200 | Body estático `{"ok":true,"lead_ref":"..."}` (inyectado de Normalize) | Expresiones frágiles fallan en n8n 2.15.1 |

**Naming convention:** `{client}-track`, `{client}-reserva`, `{client}-checkin`, `{client}-pago`, `{client}-resena`, `{client}-upload-conversions` (cron), `{client}-meta-spend-pull` (cron).

### Capa 3 — Storage (Supabase schema canónico)

**Tabla `{client}_leads` — 26 columnas:**

```sql
CREATE TABLE {client}_leads (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now(),
  lead_ref TEXT NOT NULL,                          -- 8-char alfanum UPPERCASE
  session_id TEXT,
  event_type TEXT NOT NULL,                        -- uno de los 20 canónicos
  page_path TEXT,
  landing_version TEXT,
  gclid TEXT, gbraid TEXT, wbraid TEXT,
  fbclid TEXT, msclkid TEXT,
  utm_source TEXT, utm_medium TEXT, utm_campaign TEXT,
  utm_content TEXT, utm_term TEXT,
  utm_source_first TEXT, utm_medium_first TEXT,
  utm_campaign_first TEXT, utm_content_first TEXT, utm_term_first TEXT,
  referrer TEXT,
  time_on_page_ms INT,
  scroll_depth_pct INT,
  user_agent TEXT, device_type TEXT,
  screen_size TEXT, language TEXT, timezone_offset INT,
  ghl_contact_id TEXT,
  extra JSONB DEFAULT '{}'::jsonb
);
CREATE INDEX ON {client}_leads (created_at DESC);
CREATE INDEX ON {client}_leads (lead_ref);
CREATE INDEX ON {client}_leads (session_id);
CREATE INDEX ON {client}_leads (event_type);
CREATE INDEX ON {client}_leads (gclid) WHERE gclid IS NOT NULL;
```

**Tabla `{client}_bookings` — lifecycle 11-state enum:**
```
estado: lead_entro | cotizo | reservo | agendado | confirmado |
        asistio | pagado | resenado | recurrente | cancelado | no_asistio
```

Schema completo en Sección 4 (Exentia adaptation). El template aplica a servicios, productos, bookings, con variantes por vertical.

**Tabla `{client}_eventos_atribucion` — audit uploads:**
```sql
CREATE TABLE {client}_eventos_atribucion (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now(),
  booking_id UUID,
  destino TEXT,                                    -- google_ads | meta_capi | meta_pixel
  tipo_evento TEXT,                                -- purchase | lead | contact | schedule
  event_id TEXT,                                   -- dedup key
  payload JSONB, response JSONB,
  status TEXT,                                     -- ok | error | retry
  retry_count INT DEFAULT 0
);
```

**Views canónicas (4):**
- `{client}_dashboard_kpis_today` — aggregate hoy
- `{client}_revenue_by_channel_7d` — attribution breakdown
- `{client}_sessions` — aggregate por session_id con booleans convirtio_*
- `{client}_utilization` o vista específica por vertical

**Storage:**
- `{client}-public` — assets servicios, bios (anon SELECT)
- `{client}-private/<namespace>/{id}/` — PII sensible, signed URL 24h

**Naming convention:** `{client_slug}_{entity}`. Ejemplos:
- `arqalum_leads`, `arqalum_sessions`
- `sarahi_utms` (existe como sheet, futuro como tabla)
- `exentia_leads`, `exentia_bookings`, `exentia_terapeutas`

### Capa 4 — CRM (GHL)

**27 custom fields con prefijo `{client}_*`** — evita colisión cross-location, permite audit fácil:

```
{client}_lead_ref (text, joint key Supabase↔GHL)
{client}_session_id (text)
{client}_gclid, _gbraid, _wbraid, _fbclid, _msclkid (text, click IDs)
{client}_utm_source_first, _medium_first, _campaign_first, _content_first, _term_first (5)
{client}_utm_source_last, _medium_last, _campaign_last, _content_last, _term_last (5)
{client}_referrer (text)
{client}_landing_version (text)
{client}_servicio_elegido (text — adapta al vertical)
{client}_zona (text — adapta al vertical)
{client}_preferencia_* (según vertical — sexo, tipo, etc)
{client}_es_recurrente (boolean)
{client}_valor_ticket_mxn (number)
+ específicos del vertical
```

**Tags canónicas pre-creadas (lección Arqalum: drops silent si no existen):**
- `servicio_*` — uno por oferta
- `zona_*` — una por área de cobertura
- `canal_google | canal_meta | canal_organico | canal_directo | canal_referencia` (5)
- `etapa_lead_entro | _cotizo | _reservo | _agendado | _confirmado | _asistio | _pago | _resena | _recurrente` (9)
- Operativas: `recurrente`, `opt_out`, `no_show`, `cancelado`, `vip`, `nuevo_30d`
- Preferencias: `preferencia_*` (sexo, tipo, tamaño, lo que aplique)

**Pipeline 9-stage estándar:** `lead_entro → cotizo → reservo → agendado → confirmado → asistio → pago → resena → recurrente`.

**Workflows base (siempre crear estos 5):**
1. Tag `etapa_reservo` aplicada → confirmación WA + email
2. Booking 24h antes → recordatorio WA
3. Booking 2h antes → recordatorio WA
4. Tag `etapa_pago` aplicada → webhook `{client}-pago` (dispara Capa 5)
5. Tag `no_show` aplicada → workflow recuperación (WA 48h después)

### Capa 5 — Attribution cycle (closed loop)

**Trigger:** `etapa_pago` → webhook n8n `{client}-pago`.

**Google Ads upload:**
```javascript
ConversionUploadService.uploadClickConversions({
  conversionAction: 'customers/{customerId}/conversionActions/{conversionId}',
  gclid: booking.gclid,                            // primario
  conversionDateTime: booking.pago_recibido_at,
  conversionValue: booking.pago_monto_mxn,
  currencyCode: 'MXN',
  orderId: booking.id,                             // idempotencia
  userIdentifiers: [                               // Enhanced Conversions
    {hashedEmail: sha256(booking.email.toLowerCase().trim())},
    {hashedPhoneNumber: sha256(normalizeE164(booking.phone))}
  ]
});
```

**Meta CAPI Purchase:**
```javascript
POST https://graph.facebook.com/v25.0/{pixel_id}/events
{
  data: [{
    event_name: 'Purchase',
    event_time: booking.pago_recibido_at,
    event_id: `{client}_${booking.lead_ref}_Purchase_${yyyymmdd}`,  // dedup con Pixel
    action_source: 'system_generated',
    user_data: {
      em: sha256(email),
      ph: sha256(phone),
      external_id: booking.lead_ref,
      fbc: booking.fbclid ? `fb.1.${Date.now()}.${booking.fbclid}` : null
    },
    custom_data: {
      value: booking.pago_monto_mxn,
      currency: 'MXN',
      order_id: booking.id
    }
  }],
  access_token: '{CAPI_TOKEN_SCOPES_AD_MGMT_READ_BIZMGMT}'
}
```

**Audit:** INSERT row en `{client}_eventos_atribucion` con `status`, `payload`, `response`, `retry_count`.

**Retry:** cron `{client}-upload-conversions` cada hora busca `status='error' AND retry_count < 5`, reintentar con exponential backoff (1h, 2h, 4h, 8h, 16h).

**Metrics a monitorear:**
- Gclid match rate en Google Ads Diagnostics: target **>90%**
- CAPI Event Match Quality en Events Manager: target **>7**
- Dedup success: "Deduplicated" count en Events Manager (Pixel + CAPI)
- Enhanced Conversions recovery: % bookings sin gclid recuperadas via hash

### Capa 6 — Visibility (dashboard)

**Decidir variante:**

| Criterio | Variante A hosted | Variante B srcdoc |
|---|---|---|
| Tipo de datos | No sensibles (UTMs, contacts basic) | PII sensible (direcciones, fotos casa, payment) |
| Acceso | GitHub Pages público (queries expuestas aunque anon key RLS-gated) | Solo usuarios logueados en GHL del cliente |
| Updates | Push a repo → deploy auto | Paste srcdoc escapado en GHL |
| CORS/CSP | Requiere manejo | Sandbox iframe, zero issues |
| Realtime | Posible pero más setup | Supabase WebSocket funciona out of box |
| Ejemplos | Sarahi | Balam, Exentia |

**Stack técnico (ambas variantes):**
- Chart.js v4 UMD via CDN (NO module — GHL bloquea scripts module)
- Supabase-JS v2 UMD via CDN
- Supabase WebSocket realtime + polling 60s views agregadas
- Brand identity del cliente (CSS vars)
- Escape CSS anti-wrapper GHL: `position:fixed !important` + `z-index: 2147483647`
- Anti-mojibake: unicode escapes `\u00e9` (NO pegar español directo — el editor GHL lo corrompe)

**4 bloques KPI canónicos (aplica a cualquier cliente B2C):**

1. **Operación** (owner del negocio, default view): bookings/revenue/AOV, heatmap hora pico, zona demanda, utilización recursos, recurrentes vs nuevos, no-show, tiempo respuesta (p50/p90), servicio top.
2. **Meta** (community manager / Gueñe-style): CPL campaña/adset/creative con thumbnails, ROAS, creative fatigue flag (CPL 7d > 2× 30d), lookalike CSV exportable (hashed SHA-256).
3. **Google** (Google Ads specialist): gclid match rate, Enhanced Conv coverage, offline conv subidas, CPL, search queries insights.
4. **Diagnóstico Ainnovation** (técnico): eventos 24h por tipo, error rate webhooks, CAPI dedup %, uptime.

**Filtros globales sticky:** fecha (hoy/7d/30d/custom), canal, servicio, recurso (terapeuta/agente/etc), zona, toggle first-click vs last-click.

**Deploy Variante B (script):**
```bash
#!/bin/bash
# deploy-srcdoc.sh
node -e "
const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');
const escaped = html.replace(/\"/g, '&quot;');
const iframe = '<iframe srcdoc=\"' + escaped + '\" style=\"width:100%;height:100vh;border:none\"></iframe>';
require('child_process').execSync('pbcopy', {input: iframe});
console.log('✅ srcdoc iframe copied to clipboard. Paste in GHL Custom Menu Link HTML.');
"
```

### Layout decisions forzadas por data (tabla reusable para toda landing)

| Decisión | Fuente | Por qué |
|---|---|---|
| Single vertical scroll, NO slider | Arqalum: slider = 0% form conv | 100% improvement al quitar |
| WhatsApp CTA primario > form | Arqalum: 3 WA vs 0 form en 45 users | Reduce fricción, cierra en WA con contexto |
| Form 3 campos máximo | Arqalum abandon rate | Cada field extra = -X% submit |
| WebP <100KB hero | Arqalum: -1s load time | -27% bounce |
| ASCII puro en `wa.me?text=` | iOS mojibake | Fix definitivo |
| Sin `<meta noindex>` + robots.txt explícito | Arqalum Quality Score recovery | Evita penalty Google |
| Mobile-first 100vh hero | 80%+ mobile en ads B2C | — |
| First + last click UTM capture dual | Sarahi pattern | Atribución compleja ciclos >1 día |
| Dedup event_id Pixel↔CAPI | Sarahi aprendizaje | Meta no doble cuenta |
| Sticky CTA bottom bar mobile | Ainnovation standard | Siempre visible |
| Aviso privacidad obligatorio si PII | Legal + UX | Confianza + cumplimiento |

### UTM taxonomy canónica

**Google Ads:**
- `utm_source=google`
- `utm_medium=cpc`
- `utm_campaign={campaign_name_slug}`
- `utm_content={ad_creative_id}`
- `utm_term={keyword}` (o `{adgroup_slug}` en DSAs/PMax)

**Meta Ads:**
- `utm_source=meta` (o `fb` / `ig` para diferenciar placement — pendiente convención)
- `utm_medium=paid`
- `utm_campaign={campaign_name_slug}`
- `utm_content={ad_creative_id}`
- `utm_term={adset_slug}`

**Orgánico:**
- `utm_source=instagram|facebook|tiktok|youtube`
- `utm_medium=organic`
- `utm_campaign={link_in_bio|story|post|reel}`
- `utm_content={post_id}` si aplica

**Email / newsletter:**
- `utm_source=email`
- `utm_medium={newsletter|transactional}`
- `utm_campaign={campaign_slug}`

---

## Sección 4 — Aplicación a Exentia (primer caso del pattern)

Ver [[exentia-action-plan]] y [[exentia-ralph-loop]] para detalle de Fases 0-9 aplicadas.

**Desviaciones específicas de Exentia respecto al pattern:**

| Área | Pattern default | Exentia desviación | Razón |
|---|---|---|---|
| Variante dashboard | A si no hay PII | **B srcdoc privado** | Direcciones + fotos casa |
| Supabase project | Reusar existente si cabe | **Nuevo `exentia-prod`** | Cliente externo, RLS clean boundary |
| Modelo asignación | Variable por vertical | **Modelo C grupo WA** | Yaz ya opera así; respetar |
| Landing roster humano | Mostrar si aplica (modelo A) | **NO mostrar terapeutas** | Compatible con modelo C operativo |
| WA bridge | Variable | **MVP manual → Cloud API Fase 9** | Escalable sin setup inicial pesado |
| Método pago | Stripe/MP si ticket alto | **Manual Fase 1 → Stripe Fase 9** | Ticket bajo-medio, volumen inicial bajo |
| Geografía | Por cliente | **Cancún** (no CDMX) | Realidad operativa Yaz |

**Custom Exentia-specific:**

- Tabla `exentia_terapeutas` existe pero NO se expone en landing (solo para ops y dashboard)
- Campo `exentia_direccion_maps_url` — reverse geocode a lat/lng + colonia Cancún
- Storage privado `exentia-private/casas/{booking_id}/` con signed URL 24h
- Custom field GHL `exentia_preferencia_sexo` (H/M/I) en vez de preferencias genéricas
- Tag `preferencia_hombre | _mujer | _indistinto`

---

## Sección 5 — Plantilla para futuras landings

### Checklist setup cliente nuevo (días esperados por fase)

| Fase | Días | Owner primario |
|---|---|---|
| 0 · Alignment (checklist enviado, respuesta cliente) | 7-10 | Luis/PM |
| 0.5 · Deliverables docs (playbook application + PDF cliente) | 2-3 | Henry |
| 1 · Brand identity absorción | 3-5 | Víctor + agencia cliente |
| 2 · Data foundation (Supabase + n8n) | 3-5 | Víctor |
| 3 · GHL setup + workflows | 3-5 | Víctor |
| 4 · n8n workflows completos | 2-3 | Víctor |
| 5 · Tracking install (GA4 + Clarity + Pixel + Google Ads conv) | 3-5 | Víctor |
| 6 · Landing estética | 5-10 | Víctor + frontend-design |
| 7 · Closed loop activation | 2-3 | Víctor |
| 8 · Dashboard build | 5-7 | Víctor + frontend-design |
| 9 · Ads launch + 1 week monitoring | 7+ | Luis + specialist ads |

**Total típico:** 6-10 semanas desde alignment hasta primer ciclo cerrado medido.

### Decisiones SIEMPRE cerrar con cliente antes de build

1. Variante dashboard A vs B (criterio: ¿hay PII sensible?)
2. Supabase proyecto nuevo vs reuso (criterio: ¿cliente externo con compliance?)
3. Modelo operativo de asignación de recursos humanos (si aplica — terapeutas, agentes, vendedores)
4. Lista de servicios/productos + orden por volumen (define `orden_display` en catálogo)
5. Lista de zonas/segmentos de cobertura (whitelist — define tags `zona_*`)
6. WA bridge: manual / Cloud API / Wazzap (criterio: volumen + presupuesto)
7. Método de pago: manual / Stripe / Mercado Pago / otro (criterio: ticket + volumen)
8. Aviso de privacidad: template Ainnovation vs abogado cliente (criterio: tipo de PII + regulación local)
9. Nivel de compromiso (si ofrecemos tiers): N1 básico / N2 intermedio / N3 completo
10. Brand identity source (manual, docs existentes, nuevo desde cero)

### Red flags durante setup (verificar siempre)

- [ ] **Meta CAPI token scope**: `ads_management + ads_read + business_management`. NUNCA `read_ads_dataset_quality` (anti-pattern Sarahi).
- [ ] **GHL tags**: pre-creadas ANTES de cualquier workflow. Si no existen, GHL drops silent.
- [ ] **Supabase anon key vs service_role**: service_role SOLO en n8n server-side. Anon key en browser con RLS gating estricto.
- [ ] **RLS policies**: probar con anon role qué puede SELECT/INSERT/UPDATE/DELETE. Por default RLS enabled bloquea todo.
- [ ] **gtag `send_to` param**: cada conversion tag debe tener `send_to: 'AW-XXX/label'`. Si falta, no dispara.
- [ ] **gtag NO lazy-loaded**: cargar sincrónico en `<head>`. Lazy pierde eventos iniciales.
- [ ] **wa.me texts en ASCII**: cero acentos, cero emojis. iOS mojibake si no.
- [ ] **Storage buckets**: público vs privado según sensibilidad. Signed URL 24h para privado.
- [ ] **robots.txt** explícito, `<meta noindex>` REMOVIDO en producción (Arqalum Quality Score lesson).
- [ ] **Lighthouse mobile ≥85**: hero <1.5s en throttle 4G. Si no, el Quality Score de Google Ads se resiente.
- [ ] **Event dedup**: Pixel browser + CAPI server con mismo `event_id`. Verificar en Events Manager que aparecen como "Deduplicated".
- [ ] **Gclid match rate Google Ads Diagnostics >90%**: si menor, gclid no se está guardando o se pierde en re-direccionamientos.

### Matriz de decisión: variante dashboard

```
¿El dashboard muestra alguno de esto?
├── Direcciones domiciliarias → Variante B (srcdoc privado)
├── Fotos/videos de clientes → Variante B
├── Datos médicos/legales → Variante B
├── Pricing interno no público → Variante B
├── Payment info → Variante B
└── Solo UTMs + contact basics → Variante A (hosted público ok)
```

### Matriz de decisión: modelo operativo asignación

```
Cliente tiene recursos humanos variables (terapeutas, agentes, etc)?
├── NO (producto/servicio estándar) → Calendar simple, no aplica
└── SÍ
    ├── ¿Cliente quiere que usuario elija?
    │   ├── SÍ → Modelo A (mostrar roster con filtros)
    │   └── NO
    │       ├── ¿Hay especialidades + disponibilidad conocidas?
    │       │   ├── SÍ → Modelo B (auto con algoritmo)
    │       │   └── NO
    │       │       └── Modelo C (grupo WA, primero en aceptar)
```

---

## Anexos

### A — Antipatterns (qué NO hacer)

**Token Meta CAPI roto:**
- ❌ `read_ads_dataset_quality` — SILENT FAILURE
- ✅ `ads_management + ads_read + business_management`

**GHL tags silent drop:**
- ❌ Workflow crea tag que no existe → la tag se droppea silenciosamente
- ✅ Pre-crear todas las tags canónicas en GHL UI ANTES de desplegar workflow

**Supabase anon expuesta:**
- ❌ service_role JWT en HTML public
- ✅ service_role solo en n8n server-side; anon key en browser con RLS policies estrictas

**CORS preflight:**
- ❌ `fetch` con Content-Type: application/json + credentials:include → preflight → falla con `*`
- ✅ Sin Content-Type header (text/plain implicit) + `credentials:'omit'`

**wa.me mojibake iOS:**
- ❌ `wa.me/XX?text=cotización` → "√≥" en iOS
- ✅ `wa.me/XX?text=cotizacion` (ASCII puro, sin tilde)

**Slider/carousel en landing B2C:**
- ❌ Slider de secciones principal → 0% form conversion (Arqalum)
- ✅ Single vertical scroll

**Form de 6+ campos:**
- ❌ Campo de m², empresa, email, fecha → 0 submits
- ✅ 3 campos máximo (nombre, tel, servicio). Resto en WA conversación.

**Pixel sin `send_to`:**
- ❌ gtag sin `send_to: 'AW-XXX/label'` → conversion no dispara
- ✅ Siempre incluir `send_to`, verificar en Google Ads Tag Assistant

**`<meta noindex>` en producción:**
- ❌ Página en producción con noindex → Google Ads Quality Score tanks
- ✅ Remover noindex, robots.txt explícito allow

### B — Lessons del vault (referencias)

- [[arqalum-archive/arqalum-capa1-tracking-2026-04-16|Arqalum Capa 1 Tracking]] — 5 bugs resueltos detallados
- [[sarahi-capi-token-broken]] — anti-pattern scope CAPI
- [[sarahi-capi-backfill-2026-04-22]] — backfill histórico 159 eventos
- [[ghl-dashboard-pattern]] — Variante A vs B
- [[n8n-best-practices]] — AEC pattern, binary data handling, If node gotchas
- [[balam-desayuno-mamas]] — primera Variante B srcdoc implementada

### C — Queries útiles para monitoreo post-launch

```sql
-- Eventos capturados últimas 24h por tipo
SELECT event_type, COUNT(*) FROM {client}_leads
WHERE created_at > now() - interval '24 hours'
GROUP BY event_type ORDER BY count DESC;

-- Gclid capture rate últimos 7d
SELECT
  COUNT(*) FILTER (WHERE utm_source='google' AND utm_medium='cpc') AS total_google_cpc,
  COUNT(*) FILTER (WHERE utm_source='google' AND utm_medium='cpc' AND gclid IS NOT NULL) AS con_gclid,
  ROUND(100.0 * COUNT(*) FILTER (WHERE gclid IS NOT NULL) / NULLIF(COUNT(*) FILTER (WHERE utm_source='google' AND utm_medium='cpc'), 0), 1) AS gclid_rate_pct
FROM {client}_leads
WHERE created_at > now() - interval '7 days';

-- Sessions que convirtieron por canal
SELECT utm_source, utm_medium,
       COUNT(*) AS sessions,
       COUNT(*) FILTER (WHERE convirtio_wa) AS convirtio_wa,
       ROUND(100.0 * COUNT(*) FILTER (WHERE convirtio_wa) / NULLIF(COUNT(*), 0), 1) AS conv_rate
FROM {client}_sessions
WHERE sesion_inicio > now() - interval '7 days'
GROUP BY utm_source, utm_medium
ORDER BY sessions DESC;

-- Audit uploads de atribución
SELECT destino, status, COUNT(*), AVG(retry_count)
FROM {client}_eventos_atribucion
WHERE created_at > now() - interval '7 days'
GROUP BY destino, status;
```

---

## Ver también
- [[Exentia]] — primer cliente del pattern combinado
- [[exentia-action-plan]] — aplicación concreta Fases 0-9
- [[exentia-ralph-loop]] — checklist iterable
- [[ghl-dashboard-pattern]] — Variantes A/B detalladas
- [[Arqalum]] · [[Sarahi Jaramillo]] — fuentes del pattern
- [[Ainnovation]]
