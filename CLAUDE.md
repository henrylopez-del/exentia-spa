# Exentia Spa & Beauty Salon — Web + CRM + Tracking

Pagina web + sistema de reservas + tracking para Exentia (Cancun). Sigue el playbook combinado Arqalum + Sarahi de Ainnovation.

> Las API keys NO viven en este repo. Estan solo en el `CLAUDE.md` raiz del workspace local del developer (gitignored).

---

## Estado actual (Fase 1 · 2026-05-26)

### ✅ Lo que ya esta en produccion

| # | Componente | Donde |
|---|---|---|
| 1 | **Pagina web publica** | https://0victorrodriguez0.github.io/exentia-spa/exentia-pagina.html |
| 2 | **Tracker.js inline** | Inyectado en `<head>` de `exentia-pagina.html`. ~20 eventos canonicos con nombres en español para GA4 (cita_agendada, vio_servicio, click_whatsapp, etc.) + user properties + service params enriquecidos |
| 3 | **Bridge script** | Antes de `</body>`. Hookea `openModal`, postMessage de iframes GHL, cart events, CTAs Agendar. Page titles dinámicos al abrir modales |
| 4 | **6 workflows n8n** | `exentia-track`, `-reserva`, `-checkin`, `-resena`, `-upload-conversions` (cron, scaffold), `-cita-creada` (NUEVO 2026-04-30) |
| 5 | **Schema Supabase `exentia.*`** | 7 tablas + vistas + RLS + 2 storage buckets. `bookings.ghl_appointment_id` para idempotencia + `lead_ref`, `atribucion` JSONB, `valor_ticket_mxn` (migration 03, 2026-05-26) + index en `ghl_contact_id` |
| 6 | **GHL Exentia (`0hGSRrhxkdywVQxCsNOi`)** | 27 custom fields `exentia_*` + 60 tags + Pipeline `Reservas` (9 stages) + form `ElRuF6DqgcwUiSyJaXoi` + calendar `VUbTtrop8lZFx8HRmJzV` + Workflow GHL "Appointment Created" → POST `/webhook/envio-exentia` |
| 7 | **Dashboard interno** | Standalone HTML en `monitoreo/dashboard-exentia.html` (iframe srcdoc para GHL Custom Menu). KPIs en vivo, tabs Hoy/Semana/Todas, búsqueda fuzzy, filtro temporal, **modal registrar pago**, **modal historial por cliente**, **export CSV** (1 servicio = 1 fila), event delegation (sin inline onclick). Auto-refresh 10s. Conecta a Supabase vía RPCs `exentia_marcar_asistio` y `exentia_registrar_pago` |
| 8 | **GA4 instalado** | Property `Exentia` bajo account Arqalum. Measurement ID `G-LQ4YJQ2MZV` en `<head>` de la pagina. Eventos en español llegando con segmentación por traffic_source/device_type/came_from |
| 9 | **Lifecycle verificado** | reservo → asistio → resenado end-to-end testeado, todos los webhooks responden. Fechas de citas guardandose correctamente desde 2026-04-30 |

### 📝 Lo que falta

**Inmediato — Henry:**
- Crear project Microsoft Clarity (guia en `monitoreo/tracking/CLARITY_SETUP.md`). Pegar el ID en `<head>` de la pagina → tracker auto-detecta y empieza a enviar.
- Pegar dashboard srcdoc en GHL Custom Menu Link cuando Yaz lo apruebe (`python monitoreo/dashboard/deploy-srcdoc.py`).
- Marcar conversiones en GA4 cuando llegue primer trafico real: `cita_agendada`, `envio_formulario_whatsapp`, `click_whatsapp`.
- (Opcional) Registrar Custom Dimensions en GA4 para ver desglose por servicio: `servicio_nombre`, `servicio_categoria`, `traffic_source`, `device_type`, `came_from`.

**Yaz — checklist 2026-05-01:**
- Confirmar lista final de servicios a domicilio (las 28 tags `gen_servicio_*` son del spa fisico, algunas no aplican: balayage, color global con equipo grande). Renombrar `gen_*` → finales.
- Whitelist de zonas Cancun cubiertas a domicilio (las 8 tags `gen_zona_*` son tipicas).
- Telefono real de Yaz para el wa.me en workflow `exentia-reserva` (actualmente placeholder `529982XXXXXXX`).
- Precios + duracion por servicio → seed en `exentia.servicios`.

**Fase 2 — Henry + Jocelyn (cuando lleguen credenciales):**
- Meta Pixel + CAPI con scopes `ads_management + ads_read + business_management` (NUNCA `read_ads_dataset_quality` — bug Sarahi).
- Activar workflow `exentia-pago` para closed loop.

**Fase 3 — Henry + ex-Carem (Google Ads specialist):**
- Sub-cuenta nueva bajo MCC `876-257-5839` + conversion actions.
- Customer ID + OAuth + developer-token al workflow `exentia-upload-conversions`.

**Cosmetico:**
- Custom field GHL `exentia_es_recurrente` tiene mojibake en label "Si". Editar en UI, 30 segundos.

---

## Estructura

### Repo publico (GitHub Pages)

```
exentia-spa/
├── exentia-pagina.html       # SPA + tracker.js + bridge inlined
├── form-exentia.html         # Form custom para GHL Form Builder
├── README.md                 # Info publica
├── CLAUDE.md                 # Este archivo
├── .gitignore                # Excluye monitoreo/ y .claude/
└── assets/                   # Branding Fika Studio + fotos Instagram
```

### Local — `monitoreo/` (gitignored, NUNCA publicar)

```
monitoreo/
├── sql/
│   ├── 01_schema_init.sql                            # Schema exentia.* aplicado
│   ├── 02_alter_bookings_add_ghl_appointment.sql     # ghl_appointment_id + drop lead_ref (2026-04-30)
│   ├── 03_exentia_pagos_y_view_dash.sql              # tabla pagos + view recreada con ghl_contact_id + RPCs (2026-05-27)
├── n8n/                              # 7 workflows JSON listos para importar
│   ├── exentia-{track,reserva,checkin,resena,upload-conversions}.json
│   ├── exentia-cita-creada.json                      # GHL appointment → bookings (2026-04-30)
│   └── exentia-crear-invoice-ghl.json                # registra pago en GHL Invoices manualmente (2026-05-27)
├── ghl/                              # IDs de CFs, tags, pipeline + PENDIENTES.md
├── tracking/                         # tracker.js source + guias GA4/Clarity + tracking_ids.json (G-LQ4YJQ2MZV)
├── dashboard/                        # Dashboard standalone + deploy-srcdoc.py (legacy V1)
└── dashboard-exentia.html            # Dashboard V2 con pagos y CSV (2026-05-27)
```

---

## Dashboard V2 — Pagos, Historial y Export (2026-05-27)

Reemplaza el dashboard legacy en `dashboard/`. Pegar en GHL Custom Menu Link.

### Funcionalidades
- **KPIs**: Total citas, Citas hoy, Asistieron, **Revenue del Mes** (solo pagos del mes actual usando `pago_recibido_at`)
- **Tabs**: Hoy / Esta Semana / Todas (cards visuales en la parte superior)
- **Tabla "Todas las Citas"** con:
  - 🔍 Búsqueda fuzzy por nombre, teléfono, email, código booking, servicio, zona
  - 📅 Filtro temporal: Todo / Hoy / Ayer / Esta semana / Este mes / Últimos 30d / Últimos 90d
  - ⬇️ Botón "Descargar CSV" — exporta con el filtro actual aplicado
- **Botones por fila** (acción rápida + tag automático en GHL):
  - "Asistió" (verde) — RPC `exentia_marcar_asistio` + tag "asistio" en GHL
  - "No vino" (rojo) — RPC `exentia_marcar_no_asistio` + tag "no_asistio" en GHL (con confirmación)
  - "Pagó" (dorado) — abre modal de pago
  - "Historial" (gris) — abre modal con todos los pagos de ese cliente

### Modal Registrar Pago
- Pre-llenado con cliente, servicios, código
- Monto (MXN) con prefix `$`
- 4 métodos visuales: 💳 Tarjeta · 🏦 Transferencia · 💵 Efectivo · 📝 Otro
- Notas opcionales
- Submit → llama RPC `public.exentia_registrar_pago(uuid, numeric, text, text)` que:
  1. Inserta en `exentia.pagos`
  2. Actualiza `exentia.bookings.estado = 'pagado'`, suma al `valor_ticket_mxn`
  3. Devuelve total pagado y num_pagos

### Modal Historial de Pagos
- Cliente + Teléfono visible
- **Total Pagado** y **Número de Pagos** como cards
- Lista cronológica (más reciente primero) con:
  - Monto + badge método (color por tipo)
  - Fecha y hora · código booking · servicios
  - Notas (si las hay)
- Query: `public.exentia_pagos_dash?ghl_contact_id=eq.X` (fallback teléfono)

### CSV Export
- 1 servicio = 1 fila (desnormalizado para análisis)
- Columnas: Código, Cliente, Telefono, Email, Servicio, Fecha, Hora, Estado, Monto MXN, Modalidad, Notas Cliente, Fecha Creacion
- BOM UTF-8 para Excel
- Respeta filtro y búsqueda activos

### SQL aplicado (migration 03)
```sql
-- Tabla pagos (audit log de pagos)
CREATE TABLE exentia.pagos (
  id uuid PK, booking_id uuid FK, ghl_contact_id, cliente_telefono, cliente_nombre,
  monto_mxn numeric, metodo text (tarjeta/transferencia/efectivo/otro),
  notas, ghl_invoice_id, ghl_invoice_status, registrado_por, created_at
);

-- Vista recreada con ghl_contact_id + total_pagado + num_pagos
CREATE VIEW public.exentia_bookings_dash AS SELECT b.*, p.total_pagado, p.num_pagos
FROM exentia.bookings b LEFT JOIN LATERAL (SELECT SUM(monto_mxn) ..., COUNT(*) ...) p ON true;

-- Vista historial
CREATE VIEW public.exentia_pagos_dash AS
SELECT p.*, b.booking_code, b.servicios as booking_servicios, b.fecha_agendada as booking_fecha
FROM exentia.pagos p LEFT JOIN exentia.bookings b ON ...;

-- RPCs (anon callable)
CREATE FUNCTION public.exentia_registrar_pago(p_booking_id uuid, p_monto numeric, p_metodo text, p_notas text)
RETURNS TABLE(id uuid, total_pagado numeric, num_pagos bigint) SECURITY DEFINER ...;

CREATE FUNCTION public.exentia_marcar_asistio(p_booking_id uuid) SECURITY DEFINER ...;
```

### Workflow n8n `exentia-pago.json` — UNIFICADO (2026-05-27)

Un solo workflow que maneja DOS triggers:

**Trigger A — GHL Workflow "Tag Added 'pago'":**
```json
{ "contact_id": "...", "tag": "pago", "trigger_type": "tag_added" }
```
Para casos manuales (Yaz marca tag desde móvil GHL).

**Trigger B — Dashboard "Registrar Pago":**
```json
{
  "contact_id": "...",
  "monto": 850,
  "metodo": "tarjeta",
  "source": "dashboard",
  "pago_id": "uuid",
  "booking_code": "EX-XXXXXXXX",
  "notas": "..."
}
```

**Flujo:**
```
Webhook → Normalize (detecta source)
       → Validate
       → Get Contact GHL (lee custom fields)
       → IF Is Dashboard Source?
           ├── True: Preparar Invoice (line items prorrateados)
           │        → Crear Invoice GHL (POST /invoices/)
           │        → Record Payment GHL (POST /invoices/{id}/record-payment con método)
           │        → Save invoice_id (UPDATE exentia.pagos SET ghl_invoice_id)
           │        → Extract & Build CAPI
           └── False: Extract & Build CAPI (skip invoice creation)
       → Has fbclid?
           ├── True: Send Meta CAPI → Log Meta CAPI
           └── False: Log Skipped
       → Build Response → Respond 200
```

**Características:**
- Meta CAPI siempre se ejecuta (Trigger A o B) si el contacto tiene fbclid
- Invoice GHL solo se crea cuando viene del dashboard
- `Extract & Build CAPI` usa `$('Get Contact GHL').item.json` para acceder a los datos del contacto independiente del path
- `event_id` para Meta usa `pago_id` si viene del dashboard (idempotencia natural)
- Si el contacto vino del dashboard, el `valor_ticket_mxn` para CAPI usa el monto del pago (más preciso que el custom field GHL)
- Todos los pasos GHL tienen `continueOnFail: true` — si la API GHL falla, no rompe Meta CAPI

**Conexión desde el dashboard:**
```javascript
// En dashboard-exentia.html, tras RPC exentia_registrar_pago exitoso:
fetch('https://n8n-ntcue-clone-u59578.vm.elestio.app/webhook/exentia-pago', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({
    contact_id: booking.ghl_contact_id,
    monto, metodo,
    source: 'dashboard',
    pago_id: rpcResult.id,
    booking_code: booking.booking_code,
    notas
  })
}).catch(err => console.warn('webhook failed:', err));
```
Fire-and-forget — si el webhook falla, el pago YA está en Supabase. No bloquea la UX.

### Anti-loop integrado (2026-05-27)

El flujo "dashboard → tag pago → GHL workflow → webhook" tiene un loop natural. Solución implementada:

1. **Rama dashboard**: después de crear invoice + record payment, llama GHL API `POST /contacts/{id}/tags` con `["pago"]`
2. **GHL workflow "Tag Added pago"** se dispara automáticamente → llama webhook con `source=ghl_tag`
3. **Node "Check Recent Pago"**: query a `exentia.pagos WHERE ghl_contact_id = X AND created_at > NOW() - INTERVAL '5 minutes'`
4. **Node "Detect Loop"**: si es ghl_tag Y hay pago reciente → marca `is_loop=true`
5. **Node "Is Loop?"**: si true → "Respond Loop Skipped" 200 OK con `{skipped:true, reason:loop_prevention}`. Si false → continúa flujo normal (Get Contact GHL → Meta CAPI)

Esto garantiza: el dashboard dispara TODO (invoice + tag + Meta CAPI). El re-trigger por tag no duplica Meta CAPI. Pero si Yaz agrega tag manualmente (sin pago previo), el flujo sí ejecuta Meta CAPI normalmente.

---

## Workflow n8n `exentia-tag.json` (2026-05-27)

Webhook helper para add/remove tags en GHL desde el dashboard. Whitelist de tags permitidos para prevenir abuso.

**Endpoint:** `POST /webhook/exentia-tag`

**Body:**
```json
{
  "contact_id": "abc123",
  "tag": "asistio" | "no_asistio" | "no-show" | "cancelado_cliente",
  "action": "add" | "remove"
}
```

**Whitelist en el Code node:**
```js
const ALLOWED_TAGS = ['asistio', 'no_asistio', 'no-show', 'cancelado_cliente'];
```

**Flujo:**
```
Webhook → Normalize & Validate → Valid?
  ├── True: Action = add?
  │          ├── add: POST /contacts/{id}/tags
  │          └── remove: DELETE /contacts/{id}/tags
  │   → Respond 200
  └── False: Respond 400
```

**Uso desde dashboard:**
```javascript
// Al marcar "Asistió" en dashboard:
fireTag(booking.ghl_contact_id, 'asistio', 'add');
// Al marcar "No vino":
fireTag(booking.ghl_contact_id, 'no_asistio', 'add');
```

---

## Mobile Responsive (2026-05-27)

CSS media queries añadidas para tres breakpoints:

| Breakpoint | Cambios |
|---|---|
| `max-width: 900px` | KPIs en 2 cols, toolbar wrap, today-cards 1 col |
| `max-width: 600px` | Header stacked, modales fullscreen, table compacta, botones más grandes (min 44px touch), input font-size 16px (evita zoom iOS), toolbar vertical |
| `max-width: 380px` | KPIs en 1 col, botones de acción en línea con wrap |

**Reglas mobile clave:**
- Modales con `max-height: 100dvh` + `display: flex; flex-direction: column` → header/body/foot bien distribuidos
- `padding-top: calc(12px + env(safe-area-inset-top))` para notch iOS
- `padding: 12px` con `font-size: 16px` en inputs (evita zoom auto-iOS)
- Toast container con `bottom/left/right: 10px` en móvil
- Tags en GHL aparecen siempre que se haga acción en dashboard (consistencia desktop/mobile)

### Encoding srcdoc — lecciones aprendidas
- **Nunca usar `\"` dentro del srcdoc** (HTML parser lo interpreta como cierre del atributo)
- **Nunca usar comillas dobles literales** en JS-generated HTML strings → usar `var Q = String.fromCharCode(34)`
- **CSS con `url("...")`** rompe srcdoc → usar `url('...')` con single quotes
- **Inline `onclick="..."` rompe srcdoc** → usar `data-action` + event delegation
- Todas las strings con caracteres especiales (acentos, ñ, ·) van en objeto T y se inyectan vía JS para evitar mojibake

---

## Workflow `exentia-cita-creada` (actualizado 2026-05-26)

Captura las fechas reales de las citas que GHL crea cuando un cliente agenda en el calendario. Enriquece con custom fields de GHL (servicios, atribución, lead_ref) y hace merge inteligente con el pre-booking de `exentia-reserva`.

### Flujo completo de booking

```
Página web (usuario llena form + elige servicios)
   ↓ POST /webhook/exentia-reserva (best-effort)
n8n exentia-reserva → INSERT booking con servicios (sin appointment_id)
   ↓
Usuario elige "Agendar cita" → Calendario GHL
   ↓
GHL Workflow "Appointment Status: Booked"
   ↓ POST /webhook/envio-exentia
n8n exentia-cita-creada:
   1. Normalize payload (parse fecha GHL → ISO -05:00)
   2. Validate (appointment_id + fecha requeridos)
   3. GET Contact GHL → lee custom fields (servicios, UTMs, lead_ref)
   4. Extract Custom Fields → mapea IDs → datos legibles
   5. UPSERT CTE:
      a. UPDATE: busca booking existente por teléfono/email (2h window) → link
      b. INSERT ON CONFLICT: si no hay match, crea nuevo
   6. Respond 200/400
```

### Merge logic (CTE de 2 pasos)

El pre-booking de `exentia-reserva` tiene servicios pero **no** `ghl_appointment_id` ni `ghl_contact_id`.
El appointment de GHL tiene `ghl_appointment_id` + `ghl_contact_id` pero **no** servicios (a menos que estén en custom fields).

**Step 1 — link_existing:** `UPDATE bookings WHERE ghl_appointment_id IS NULL AND (telefono = X OR email = Y) AND created_at > NOW() - 2h`
**Step 2 — insert_new:** Solo si step 1 no matcheó. `INSERT ON CONFLICT (ghl_appointment_id) DO UPDATE` (idempotente para re-fires).

### Body que GHL manda al webhook

```json
{
  "appointment_id": "{{appointment.id}}",
  "start_time": "{{appointment.start_time}}",
  "end_time": "{{appointment.end_time}}",
  "contact_id": "{{contact.id}}",
  "email": "{{contact.email}}",
  "phone": "{{contact.phone}}",
  "first_name": "{{contact.first_name}}",
  "last_name": "{{contact.last_name}}"
}
```

⚠️ **Placeholders en snake_case** (`start_time`, no `startTime`). Con camelCase los campos llegan vacios.

### GHL Custom Fields extraídos

| Custom Field | ID | Uso |
|---|---|---|
| `exentia_servicio_elegido` | `ETSBOfoZqy1ng2RFBPzm` | servicios jsonb |
| `exentia_lead_ref` | `JgsK2j4h1p6Gf7pw0WDS` | lead_ref |
| `exentia_fbclid` | `vx52ah4vkjC7OENE0lWU` | atribucion.fbclid |
| `exentia_gclid` | `xgBoQXRSmURvYvhaxEzN` | atribucion.gclid |
| `exentia_utm_source_last` | `37CfTVmnM6SUFq6XUnHh` | atribucion.utm_source |
| `exentia_utm_medium_last` | `NZPrbivrqIQFQx40cSsD` | atribucion.utm_medium |
| `exentia_utm_campaign_last` | `Kc5n7iZqisG3PBKhufQd` | atribucion.utm_campaign |
| `exentia_zona` | `vVUbV7gxxxTpfefQyCLG` | zona_colonia |
| `exentia_preferencia_sexo` | `Ufj0CBEGwYouDqvcwPXD` | preferencia_sexo |
| `exentia_valor_ticket_mxn` | `E3eEAnNb1rXfbh0Up3EE` | valor_ticket_mxn |

### Credencial pendiente

⚠️ **Se necesita crear un credential `httpHeaderAuth` en n8n** con:
- Name: `GHL Exentia Bearer`
- Header Name: `Authorization`
- Header Value: `Bearer pit-67d64213-09c5-433f-aa22-d16615ce2758`
- Luego actualizar el ID en el nodo "Get Contact GHL" del workflow

### Lógica del workflow (n8n) — 8 nodos

1. **Webhook** POST `/envio-exentia`
2. **Normalize payload** (Code) — parsea fecha "Thursday, April 30, 2026 3:30 PM" → ISO con offset Cancún (-05:00). Normaliza phone a formato MX `52XXXXXXXXXX`. Calcula `duracion_total_min`. Genera `booking_code` corto.
3. **Validate** (IF) — requiere `ghl_appointment_id` + `fecha_agendada` no vacios.
4. **Get Contact GHL** (HTTP Request) — GET `/contacts/{contactId}` con Bearer auth. `continueOnFail: true`.
5. **Extract Custom Fields** (Code) — mapea customFields array por ID → servicios jsonb + atribucion jsonb + lead_ref + zona + preferencia.
6. **UPSERT bookings** (Postgres) — CTE de 2 pasos: link existing + insert new. 14 params.
7. **Respond OK** 200 con `{ ok: true, booking, enriched, source }`.
8. **Respond 400** con detalle si falla validación.

### GA4 — eventos en español

Cada evento del tracker se manda a GA4 con nombre traducido (mapeo en el Code de `send()`):

| Técnico (n8n / Supabase) | Español (GA4) |
|---|---|
| `service_card_view` | `vio_servicio` |
| `service_select` | `eligio_servicio` |
| `form_modal_open` | `abrio_formulario` |
| `form_submit_whatsapp` | `envio_formulario_whatsapp` |
| `calendar_view` | `abrio_calendario` |
| `calendar_booking_success` | `cita_agendada` |
| `whatsapp_direct_click` | `click_whatsapp` |
| `call_click` | `click_llamada` |

Cada evento lleva `traffic_source`, `traffic_medium`, `campaign`, `device_type`, `lead_ref`, `session_id`, `landing_version` automáticamente.

User properties globales (segmentación): `came_from` (instagram/facebook/google_organic/referral/directo), `device_type`, `has_lead_ref`, `has_click_id`, `landing_version`.

---

## Stack tecnico (resumen)

```
Browser (exentia-pagina.html)
  └── tracker.js → fetch text/plain (sin preflight CORS)
                     ↓
                  n8n webhook /exentia-{track,reserva,...}
                     ↓
                  Postgres INSERT exentia.{leads,bookings,...} (RETURNING)
                     ↓
                  Dashboard interno (anon key + RLS read-only en views public.exentia_*)

GHL Form/Calendar iframes (cross-origin)
  └── postMessage → bridge → tracker → form_submit_intent / calendar_booking_success
```

### Endpoints n8n (instancia compartida)

- `POST /webhook/exentia-track` — eventos browser → `exentia.leads`
- `POST /webhook/exentia-reserva` — form submit, devuelve `{booking_code, wa_link}`
- `POST /webhook/exentia-checkin` — terapeuta marca llegada
- `POST /webhook/exentia-resena` — cliente responde resena
- Cron 1h `exentia-upload-conversions` — retry Google/Meta (NO activado)

### GHL IDs clave

| Item | ID |
|---|---|
| Location | `0hGSRrhxkdywVQxCsNOi` |
| Calendar embed | `VUbTtrop8lZFx8HRmJzV` |
| Form | `ElRuF6DqgcwUiSyJaXoi` |
| Pipeline `Reservas` | `0yWVmwR1YLLZfwjPXRcw` |
| CDN Base | `https://assets.cdn.filesafe.space/0hGSRrhxkdywVQxCsNOi/media/` |

---

## Tracker — eventos capturados

**Engagement:** page_view, scroll_25/50/75/100, service_card_view (IntersectionObserver), service_select, service_detail_view, session_end (pagehide).
**Intent:** form_modal_open, form_start, form_field_complete, form_submit_intent.
**Conversion:** form_submit_whatsapp, whatsapp_direct_click, call_click, calendar_view, calendar_time_slot_click, calendar_booking_success.
**Upload:** photo_upload_start/complete, maps_link_paste.
**Cart:** cart_continue, service_remove.

**Atribucion:** cookie `ex_first_attr` (30d, first-click) + query params (last-click) + 5 click IDs (gclid, gbraid, wbraid, fbclid, msclkid). Lead_ref 8-char alfanum se inyecta en mensajes wa.me como `[Ref XXXXXXXX]`.

---

## Brand identity

| Color | Hex |
|---|---|
| Olive | `#9a9854` |
| Olive dark | `#7d7c3f` |
| Cream | `#f3e4c7` |
| Brown | `#5c3a1e` |
| Off-white | `#fdfbf4` |

Tipografias: Cormorant Garamond (serif, titulos) + Inter (sans, body). Branding original por [Fika Studio](https://fikastudio.mx/project/exentia/).

---

## Datos del negocio

- **Ubicacion:** Av. Huayacan, Plaza Hive, Cancun, Q. Roo
- **Telefono:** +52 998 480 3595
- **Horario:** Lunes a Sabado 9AM-6PM
- **Instagram:** [@exentiaspabeautysalon](https://www.instagram.com/exentiaspabeautysalon/)

### Servicios (6 categorias — del HTML actual, marcadas como genericas hasta confirmacion Yaz)

1. **Masajes** · Relajante, Piedras Calientes, Aromaterapia, Descontracturante
2. **Faciales** · Limpieza, Hidratante, Antiedad, Desintoxicante
3. **Unas** · Acrilicas, Gel, Dip Powder, Manicure Spa, Pedicure Spa
4. **Cabello** · Corte, Color, Tratamiento, Peinado Evento
5. **Depilacion & Maquillaje** · Cera, Cejas, Lash Lifting, Extensiones, Maquillaje Social/Novia
6. **SpaKids** · Mini Manicure, Mini Pedicure, Mini Spa, Peinado Princesa

---

## Notas tecnicas

- **CORS bypass:** tracker usa `fetch()` SIN Content-Type → text/plain → simple request, sin preflight. `sendBeacon` con JSON Blob fuerza preflight (que no maneja) → falla.
- **GHL form quirks:** campos nativos ocultos con CSS (`.form-field-container:not(:has(.exf))`). Boton submit es `button.button-element`. `form_embed.js` aplica `pointer-events: auto` a iframes → modales usan `display: none`, no `opacity: 0`.
- **Auto-relleno calendario:** GHL lee URL del padre (no del iframe). Se usa `history.replaceState` para agregar `?first_name=X&...`.
- **n8n workflows:** usan `executeQuery` con UN solo param JSONB + `jsonb_populate_record` (evita el bug de `queryReplacement` con multiples comas que tenia en intentos previos).
- **Dashboard seguridad:** anon key publico + RLS bloquea INSERT/UPDATE/DELETE. Vistas `public.exentia_*` ya tienen PII enmascarada (cliente "S. Test", telefono "5219****34"). Si el JWT se filtra, atacante solo lee agregados.
