# Exentia Spa & Beauty Salon — Web + CRM + Tracking

Pagina web + sistema de reservas + tracking para Exentia (Cancun). Sigue el playbook combinado Arqalum + Sarahi de Ainnovation.

> Las API keys NO viven en este repo. Estan solo en el `CLAUDE.md` raiz del workspace local del developer (gitignored).

---

## Estado actual (Fase 1 · 2026-04-30)

### ✅ Lo que ya esta en produccion

| # | Componente | Donde |
|---|---|---|
| 1 | **Pagina web publica** | https://0victorrodriguez0.github.io/exentia-spa/exentia-pagina.html |
| 2 | **Tracker.js inline** | Inyectado en `<head>` de `exentia-pagina.html`. ~20 eventos canonicos con nombres en español para GA4 (cita_agendada, vio_servicio, click_whatsapp, etc.) + user properties + service params enriquecidos |
| 3 | **Bridge script** | Antes de `</body>`. Hookea `openModal`, postMessage de iframes GHL, cart events, CTAs Agendar. Page titles dinámicos al abrir modales |
| 4 | **6 workflows n8n** | `exentia-track`, `-reserva`, `-checkin`, `-resena`, `-upload-conversions` (cron, scaffold), `-cita-creada` (NUEVO 2026-04-30) |
| 5 | **Schema Supabase `exentia.*`** | 7 tablas + vistas + RLS + 2 storage buckets. `bookings.ghl_appointment_id` agregado para idempotencia. `lead_ref` eliminado de `bookings` (no se usaba) |
| 6 | **GHL Exentia (`0hGSRrhxkdywVQxCsNOi`)** | 27 custom fields `exentia_*` + 60 tags + Pipeline `Reservas` (9 stages) + form `ElRuF6DqgcwUiSyJaXoi` + calendar `VUbTtrop8lZFx8HRmJzV` + Workflow GHL "Appointment Created" → POST `/webhook/envio-exentia` |
| 7 | **Dashboard interno** | Standalone HTML en `monitoreo/dashboard/` (Variante B srcdoc, lista para pegar en GHL Custom Menu) |
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
│   └── 02_alter_bookings_add_ghl_appointment.sql     # ghl_appointment_id + drop lead_ref (2026-04-30)
├── n8n/                              # 6 workflows JSON listos para importar
│   ├── exentia-{track,reserva,checkin,resena,upload-conversions}.json
│   └── exentia-cita-creada.json                      # GHL appointment → bookings (2026-04-30)
├── ghl/                              # IDs de CFs, tags, pipeline + PENDIENTES.md
├── tracking/                         # tracker.js source + guias GA4/Clarity + tracking_ids.json (G-LQ4YJQ2MZV)
└── dashboard/                        # Dashboard standalone + deploy-srcdoc.py
```

---

## Workflow `exentia-cita-creada` (2026-04-30)

Captura las fechas reales de las citas que GHL crea cuando un cliente agenda en el calendario.

### Flujo

```
Calendario GHL (cliente agenda)
   ↓
GHL Workflow "Appointment Status: Booked"
   ↓ POST /webhook/envio-exentia
n8n exentia-cita-creada
   ↓ parse + UPSERT (idempotente por ghl_appointment_id)
Supabase exentia.bookings (fecha_agendada + hora_agendada poblados)
```

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

### Lógica del workflow (n8n)

1. **Webhook** POST `/envio-exentia`
2. **Normalize payload** (Code) — parsea fecha "Thursday, April 30, 2026 3:30 PM" → ISO con offset Cancún (-05:00). Normaliza phone a formato MX `52XXXXXXXXXX`. Calcula `duracion_total_min`. Genera `booking_code` corto.
3. **Validate** (IF) — requiere `ghl_appointment_id` + `fecha_agendada` no vacios.
4. **UPSERT bookings** — `ON CONFLICT (ghl_appointment_id) DO UPDATE`. Preserva datos previos con `COALESCE` (no sobrescribe nombre/teléfono/email del form si ya estaban).
5. **Respond** 200 con `{ ok: true, booking: {...} }` o 400 con detalle.

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
