---
type: action-plan
client: "[[Exentia]]"
updated: 2026-04-24
owner: Henry + Víctor
status: phase_0_alignment
aliases: ["Exentia Action Plan", "Exentia 0 a 100", "Plan de acción Exentia"]
related:
  - "[[Exentia]]"
  - "[[ainnovation-landing-playbook]]"
  - "[[exentia-ralph-loop]]"
---

# Exentia — Action Plan (aplicación concreta del pattern combinado)

> **Propósito:** guía de ejecución 0→100 para construir la landing + tracking + dashboard + closed loop de Exentia. Es la **aplicación específica del [[ainnovation-landing-playbook|Landing Data-Complete Playbook]]** al primer cliente real.
> **Audiencia:** Henry (orquesta) + Víctor (implementa). Leer junto con el Playbook y el [[exentia-ralph-loop|Ralph Loop]].
> **Criterio de éxito:** cada fase con verification explícita. Avanzar a siguiente fase solo cuando criterio actual está ✅.

## Resumen operativo de Exentia

- **Negocio:** masajes a domicilio, **Cancún**
- **Dueña:** Yazmin Agis (Yaz)
- **Agencia Meta/IG actual:** Gueñe — contacto: Jocelyn Hernandez
- **Google Ads specialist que va a entrar:** ex-Carem (recomendación Yaz)
- **Ainnovation team:** Luis (lead comercial), Víctor (dev), Henry (orquesta)
- **Modelo operativo terapeutas:** grupo WhatsApp (modelo C). Yaz postea reservas al grupo, primero en aceptar se queda con el servicio
- **Decisión landing:** página pregunta solo sexo + tipo masaje. NO muestra roster de terapeutas
- **Dashboard decision:** Variante B srcdoc privado (PII sensible: direcciones + fotos casa)

## Fases del plan

### Fase 0 — Alignment (semana 0-1)

**Owner:** Luis + Henry.

**Tareas:**
- Verificar correo de Yaz del 2026-04-12 (3 inbox: luis.acosta@ / henry.lopez@ / victor.rodriguez@ainnovation.com.mx)
- Pedir a Jocelyn el documento de "características de la marca" que se le mandó a Exentia
- Revisar propuesta antigua 2026-03-27 artifact: `https://claude.ai/public/artifacts/bf92eb92-9937-4cb6-bf3a-24bf9c4b62e3`
- Enviar checklist v2 a Exentia (sáb 25-abr) con **lista específica de fotos** (camilla en domicilio, aceites, terapeutas en acción, kit profesional, terapeuta llegando a casa — NO fachada/lobby)
- Cerrar con Yaz/Jocelyn antes de build:
  - Confirmar tipos de masaje disponibles → define `exentia_servicios` seed + dropdown landing + tags `servicio_*`
  - Whitelist zonas Cancún (ej: SM 1, SM 24, Puerto Cancún, Malecón Las Américas, Bonampak, Zona Hotelera, Puerto Juárez) → define `exentia_*` zonas seed + tags `zona_*`
  - Decisión WA bridge: manual vs Cloud API (recomendado: manual Fase 1, Cloud API Fase 9)
  - Método de pago Fase 1 (recomendado: manual Yaz marca en GHL; Stripe Fase 9)
  - Aviso de privacidad: template Ainnovation bajo responsabilidad Exentia vs abogado Yaz
- Recibir respuesta del checklist vie 2026-05-01

**Verification Fase 0:**
- Correo de Yaz ubicado y revisado
- Brand doc recibido o confirmación de que no existe
- Checklist enviado con lista de fotos específica
- Respuesta compilada de Exentia (tipos masaje + zonas + demás info)
- 5 decisiones cerradas (WA, pago, modelo operativo confirmado, nivel compromiso, aviso privacidad)

### Fase 0.5 — Deliverables documentales (semana 1-2, paralelo Fase 1-2)

**Owner:** Henry orquesta.

**Sub-tareas:**

1. **Playbook Ainnovation** (Deliverable A): `wiki/projects/ainnovation-landing-playbook.md` — ✅ creado
2. **Action plan Exentia:** este archivo — ✅ creado
3. **Ralph Loop:** `wiki/projects/exentia-ralph-loop.md` — ✅ creado
4. **PDF Exentia Deliverable B:**
   - Source markdown `exentia/deliverables/source/propuesta-exentia.md`
   - Generar PDF con skill `anthropic-skills:pdf` + `theme-factory` tema "Ainnovation light"
   - SIN PRICING en ninguna parte
   - Output: `exentia/deliverables/propuesta-exentia-v1.pdf`
   - Anexo imprimible: `exentia/deliverables/checklist-requerimientos.pdf`

**Verification Fase 0.5:**
- Playbook legible sin preguntas para dev nuevo de Ainnovation
- Action plan con verification criterion por fase
- Ralph Loop con estados iniciales ⬜ correctos
- PDF Exentia legible en mobile, cero jerga sin explicar, cero pricing

### Fase 1 — Brand identity absorción (semana 1-2)

**Owner:** Víctor + Jocelyn.

**Tareas:**
- Recibir de Jocelyn: manual marca + logos SVG/PNG (fondos claro/oscuro) + paleta primary/secondary + tipografías con family y weights + tono de voz
- Organizar en `/Users/henrylopez/Desktop/exentia/brand/`:
  ```
  brand/
  ├── logos/
  │   ├── exentia-logo-light.svg
  │   ├── exentia-logo-dark.svg
  │   ├── exentia-isotipo.svg
  │   └── exentia-logo-png/ (200w, 400w, 800w)
  ├── typography/
  │   ├── font-files/ (si son custom)
  │   └── fonts.md (Google Fonts link si public)
  ├── palette.md
  ├── voice-and-tone.md
  └── brand-guidelines.pdf (doc que manda Jocelyn)
  ```
- Generar CSS variables master `exentia/brand/css-vars.css`:
  ```css
  :root {
    --exentia-primary: #XXX;
    --exentia-secondary: #XXX;
    --exentia-accent: #XXX;
    --exentia-text: #XXX;
    --exentia-bg: #XXX;
    --exentia-font-heading: 'XXX', sans-serif;
    --exentia-font-body: 'XXX', sans-serif;
    --exentia-radius: 8px;
    --exentia-shadow: 0 2px 12px rgba(0,0,0,0.08);
  }
  ```
- Coordinar con Jocelyn la sesión de fotos usando la lista específica entregada en checklist

**Verification Fase 1:**
- `brand/` con todos los assets
- CSS vars funcionales en un HTML de prueba
- Sesión de fotos agendada con fecha

### Fase 2 — Data foundation Supabase (semana 1-2, paralelo Fase 1)

**Owner:** Víctor. **Sub-agent:** `general-purpose` con MCP Supabase.

**Tareas:**

#### 2.1 Crear proyecto Supabase
- Nombre: `exentia-prod`
- Region: recomendado `us-east-1` (latencia CDMX/Cancún)
- Guardar credenciales en tabla `credentials`:
  ```
  category: supabase
  client: exentia
  data: { url, anon_key, service_role_key, project_ref }
  ```

#### 2.2 Ejecutar DDL (`exentia/backend/supabase-schema.sql`)

Aplica schema canónico del Playbook adaptado a Exentia:

```sql
-- Leads tracking raw (schema canónico del playbook)
CREATE TABLE exentia_leads (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now(),
  lead_ref TEXT NOT NULL,
  session_id TEXT,
  event_type TEXT NOT NULL,
  page_path TEXT,
  landing_version TEXT,
  gclid TEXT, gbraid TEXT, wbraid TEXT, fbclid TEXT, msclkid TEXT,
  utm_source TEXT, utm_medium TEXT, utm_campaign TEXT, utm_content TEXT, utm_term TEXT,
  utm_source_first TEXT, utm_medium_first TEXT, utm_campaign_first TEXT,
  utm_content_first TEXT, utm_term_first TEXT,
  referrer TEXT,
  time_on_page_ms INT,
  scroll_depth_pct INT,
  user_agent TEXT, device_type TEXT, screen_size TEXT, language TEXT, timezone_offset INT,
  ghl_contact_id TEXT,
  extra JSONB DEFAULT '{}'::jsonb
);
CREATE INDEX ON exentia_leads (created_at DESC);
CREATE INDEX ON exentia_leads (lead_ref);
CREATE INDEX ON exentia_leads (session_id);
CREATE INDEX ON exentia_leads (event_type);
CREATE INDEX ON exentia_leads (gclid) WHERE gclid IS NOT NULL;

-- Bookings (11-state lifecycle)
CREATE TABLE exentia_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  booking_code TEXT UNIQUE NOT NULL,
  lead_ref TEXT,
  ghl_contact_id TEXT,
  cliente_nombre TEXT, cliente_telefono TEXT, cliente_email TEXT,
  servicios JSONB NOT NULL,                         -- [{slug, duracion_min, precio_mxn}]
  fecha_agendada DATE, hora_agendada TIME,
  duracion_total_min INT,
  precio_total_mxn NUMERIC(10,2),
  terapeuta_id UUID,                                -- FK interno, no expuesto landing
  terapeuta_asignado_at TIMESTAMPTZ,
  modo_asignacion TEXT DEFAULT 'whatsapp_group',    -- siempre C inicialmente
  preferencia_sexo TEXT,                            -- H | M | I
  zona_municipio TEXT DEFAULT 'Cancun',
  zona_colonia TEXT,
  direccion_libre TEXT, direccion_maps_url TEXT,
  latitud NUMERIC(10,7), longitud NUMERIC(10,7),
  fotos_casa_urls TEXT[],
  es_recurrente BOOLEAN DEFAULT FALSE,
  notas_cliente TEXT, notas_internas TEXT,
  estado TEXT NOT NULL DEFAULT 'reservo',
  confirmacion_enviada_at TIMESTAMPTZ,
  recordatorio_24h_enviado_at TIMESTAMPTZ,
  recordatorio_2h_enviado_at TIMESTAMPTZ,
  checkin_terapeuta_at TIMESTAMPTZ, checkin_lat NUMERIC, checkin_lng NUMERIC,
  checkout_terapeuta_at TIMESTAMPTZ,
  pago_recibido_at TIMESTAMPTZ, pago_monto_mxn NUMERIC(10,2), pago_metodo TEXT,
  resena_enviada_at TIMESTAMPTZ, resena_respondida_at TIMESTAMPTZ,
  resena_rating INT, resena_texto TEXT,
  cancelado_at TIMESTAMPTZ, cancelado_motivo TEXT
);
CREATE INDEX ON exentia_bookings (fecha_agendada);
CREATE INDEX ON exentia_bookings (estado);
CREATE INDEX ON exentia_bookings (terapeuta_id);
CREATE INDEX ON exentia_bookings (cliente_telefono);

-- Catálogo servicios (tipos de masaje)
CREATE TABLE exentia_servicios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,                        -- relajante, descontracturante, deportivo, etc
  nombre TEXT, descripcion TEXT,
  duracion_min INT, precio_mxn NUMERIC(10,2),
  categoria TEXT,
  orden_display INT,                                -- Yaz define top sellers arriba
  activo BOOLEAN DEFAULT TRUE,
  foto_url TEXT
);

-- Roster terapeutas (INTERNO — no expuesto landing, modelo C)
CREATE TABLE exentia_terapeutas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  nombre TEXT, sexo TEXT,
  foto_url TEXT, bio TEXT,
  especialidades TEXT[],
  zonas_cobertura TEXT[],
  telefono TEXT,
  activo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Disponibilidad (para dashboard utilización)
CREATE TABLE exentia_disponibilidad (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  terapeuta_id UUID REFERENCES exentia_terapeutas(id),
  fecha DATE, hora_inicio TIME, hora_fin TIME,
  estado TEXT DEFAULT 'libre',                      -- libre | reservado | bloqueado
  booking_id UUID REFERENCES exentia_bookings(id)
);
CREATE UNIQUE INDEX ON exentia_disponibilidad (terapeuta_id, fecha, hora_inicio);

-- Audit atribución
CREATE TABLE exentia_eventos_atribucion (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now(),
  booking_id UUID REFERENCES exentia_bookings(id),
  destino TEXT,                                     -- google_ads | meta_capi | meta_pixel
  tipo_evento TEXT,                                 -- purchase | lead | contact | schedule
  event_id TEXT,
  payload JSONB, response JSONB,
  status TEXT,
  retry_count INT DEFAULT 0
);

-- Mensajes WA para KPI tiempo respuesta
CREATE TABLE exentia_mensajes_wa (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now(),
  telefono TEXT,
  direccion TEXT,                                   -- inbound | outbound
  mensaje TEXT,
  booking_id UUID
);
```

#### 2.3 Views agregadas

```sql
CREATE VIEW exentia_dashboard_kpis_today AS
SELECT
  COUNT(*) FILTER (WHERE estado NOT IN ('cancelado','no_asistio')) AS reservas_hoy,
  COUNT(*) FILTER (WHERE estado='pagado') AS pagadas_hoy,
  SUM(pago_monto_mxn) FILTER (WHERE estado='pagado') AS revenue_hoy,
  AVG(pago_monto_mxn) FILTER (WHERE estado='pagado') AS ticket_promedio,
  COUNT(*) FILTER (WHERE es_recurrente) AS recurrentes_hoy
FROM exentia_bookings
WHERE fecha_agendada = CURRENT_DATE;

CREATE VIEW exentia_revenue_by_channel_7d AS
SELECT
  COALESCE(l.utm_source, 'direct') AS canal,
  COUNT(DISTINCT b.id) AS n_reservas,
  SUM(b.pago_monto_mxn) AS revenue,
  AVG(b.pago_monto_mxn) AS ticket_promedio
FROM exentia_bookings b
LEFT JOIN exentia_leads l ON l.lead_ref = b.lead_ref AND l.event_type='page_view'
WHERE b.fecha_agendada >= CURRENT_DATE - 7
GROUP BY 1;

CREATE VIEW exentia_terapeuta_utilization AS
SELECT t.id, t.nombre,
  SUM(b.duracion_total_min) FILTER (WHERE b.fecha_agendada >= CURRENT_DATE - 7) AS min_agendados_7d,
  COUNT(b.id) FILTER (WHERE b.fecha_agendada >= CURRENT_DATE - 7) AS n_bookings_7d
FROM exentia_terapeutas t
LEFT JOIN exentia_bookings b ON b.terapeuta_id = t.id
WHERE t.activo
GROUP BY 1, 2;

CREATE VIEW exentia_sessions AS
SELECT
  session_id,
  MIN(created_at) AS sesion_inicio,
  MAX(created_at) AS sesion_fin,
  EXTRACT(EPOCH FROM (MAX(created_at) - MIN(created_at))) * 1000 AS duracion_ms,
  MAX(scroll_depth_pct) AS max_scroll,
  bool_or(event_type='form_submit_whatsapp') AS convirtio_wa,
  bool_or(event_type='whatsapp_direct_click') AS clickeo_wa,
  bool_or(event_type='call_click') AS clickeo_call,
  MAX(utm_source) AS utm_source,
  MAX(gclid) AS gclid
FROM exentia_leads
GROUP BY session_id;
```

#### 2.4 RLS policies (`exentia/backend/rls-policies.sql`)

```sql
ALTER TABLE exentia_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE exentia_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE exentia_terapeutas ENABLE ROW LEVEL SECURITY;
ALTER TABLE exentia_servicios ENABLE ROW LEVEL SECURITY;
ALTER TABLE exentia_eventos_atribucion ENABLE ROW LEVEL SECURITY;

-- Leads: anon INSERT (desde tracker.js), authenticated SELECT (dashboard)
CREATE POLICY "leads_anon_insert" ON exentia_leads FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "leads_auth_select" ON exentia_leads FOR SELECT TO authenticated USING (true);

-- Bookings: solo service_role puede INSERT (vía edge function o n8n)
CREATE POLICY "bookings_auth_select" ON exentia_bookings FOR SELECT TO authenticated USING (true);

-- Servicios: anon SELECT (landing muestra catálogo)
CREATE POLICY "servicios_anon_select" ON exentia_servicios FOR SELECT TO anon USING (activo = TRUE);

-- Terapeutas: SOLO service_role (no exponer en landing, solo dashboard interno)
-- (no policies = default deny)

-- Atribución: solo service_role
```

#### 2.5 Storage buckets

```sql
INSERT INTO storage.buckets (id, name, public) VALUES
  ('exentia-public', 'exentia-public', true),        -- fotos servicios, bios, etc
  ('exentia-private', 'exentia-private', false);     -- fotos casa clientes

-- Policies
CREATE POLICY "public_read" ON storage.objects FOR SELECT TO anon
  USING (bucket_id = 'exentia-public');

CREATE POLICY "private_service_role_only" ON storage.objects FOR ALL
  USING (bucket_id = 'exentia-private' AND auth.role() = 'service_role');
```

#### 2.6 Seeds

`exentia/backend/seed-servicios.sql` — pendiente definición de tipos con Yaz (Fase 0). Ejemplo:

```sql
INSERT INTO exentia_servicios (slug, nombre, descripcion, duracion_min, precio_mxn, categoria, orden_display) VALUES
  ('relajante', 'Masaje Relajante', 'XXX', 60, 800, 'relajacion', 1),
  ('descontracturante', 'Masaje Descontracturante', 'XXX', 60, 900, 'terapeutico', 2),
  ('deportivo', 'Masaje Deportivo', 'XXX', 60, 950, 'terapeutico', 3),
  ('prenatal', 'Masaje Prenatal', 'XXX', 60, 1000, 'especializado', 4),
  ('piedras-calientes', 'Piedras Calientes', 'XXX', 75, 1200, 'especializado', 5);
```

`exentia/backend/seed-zonas-cancun.sql` — pendiente whitelist Yaz. Ejemplo:

```sql
-- (no hay tabla zonas, viven en GHL como tags zona_*; aquí solo docs)
-- Whitelist zonas Cancún (tags a crear en GHL):
-- zona_sm1, zona_sm24, zona_puerto_cancun, zona_malecon_americas, zona_bonampak,
-- zona_zona_hotelera, zona_puerto_juarez, ...
```

**Verification Fase 2:**
- `SELECT * FROM exentia_leads LIMIT 1` → 0 rows, no error
- `SELECT * FROM exentia_dashboard_kpis_today` → 1 row con 0s
- RLS verificado: con anon key, INSERT en `exentia_leads` funciona; SELECT en `exentia_terapeutas` denegado
- Storage buckets visibles en Supabase UI

### Fase 3 — GHL setup + workflows (semana 2-3)

**Owner:** Víctor. **Sub-agent:** `general-purpose` con GHL API.

#### 3.1 Crear location
- GHL location Exentia (sub-cuenta bajo agency Ainnovation)
- Timezone: America/Cancun (GMT-5)
- Credenciales a `credentials` categoría `ghl` client `exentia`

#### 3.2 Custom fields (27, prefijo `exentia_*`)

```
exentia_lead_ref (text)
exentia_session_id (text)
exentia_gclid (text)
exentia_gbraid (text)
exentia_wbraid (text)
exentia_fbclid (text)
exentia_msclkid (text)
exentia_utm_source_first (text)
exentia_utm_medium_first (text)
exentia_utm_campaign_first (text)
exentia_utm_content_first (text)
exentia_utm_term_first (text)
exentia_utm_source_last (text)
exentia_utm_medium_last (text)
exentia_utm_campaign_last (text)
exentia_utm_content_last (text)
exentia_utm_term_last (text)
exentia_referrer (text)
exentia_landing_version (text)
exentia_servicio_elegido (text)
exentia_zona (text)
exentia_direccion_maps_url (text)
exentia_preferencia_sexo (dropdown: H | M | I)
exentia_terapeuta_asignado (text)
exentia_es_recurrente (boolean)
exentia_fotos_casa_count (number)
exentia_valor_ticket_mxn (number)
```

Documentar IDs post-creation en `exentia/docs/ghl-custom-fields.md`.

#### 3.3 Pre-crear tags canónicas

**CRÍTICO:** GHL dropea silently tags que no existen. Crear TODAS antes de cualquier workflow.

```
# Servicios (uno por entrada de exentia_servicios — pendiente Yaz)
servicio_relajante
servicio_descontracturante
servicio_deportivo
servicio_prenatal
servicio_piedras_calientes
# ... etc según confirmación Yaz

# Zonas Cancún (pendiente whitelist Yaz)
zona_sm1
zona_sm24
zona_puerto_cancun
zona_malecon_americas
zona_bonampak
zona_zona_hotelera
# ... etc

# Canales (5)
canal_google
canal_meta
canal_organico
canal_directo
canal_referencia

# Etapas (9)
etapa_lead_entro
etapa_cotizo
etapa_reservo
etapa_agendado
etapa_confirmado
etapa_asistio
etapa_pago
etapa_resena
etapa_recurrente

# Preferencias (3)
preferencia_hombre
preferencia_mujer
preferencia_indistinto

# Operativas (6)
recurrente
opt_out
no_show
cancelado
vip
nuevo_30d
```

Documentar IDs en `exentia/backend/seed-tags-ghl.md`.

#### 3.4 Pipeline "Exentia — Reservas"

9 stages mapeados a tags `etapa_*`:
1. Lead entró
2. Cotizó
3. Reservó
4. Agendado
5. Confirmado
6. Asistió
7. Pago
8. Reseña
9. Recurrente

#### 3.5 Calendario GHL

Consolidado (un solo calendar para Exentia Reservas). Modelo C operativo maneja asignación real vía grupo WA.

#### 3.6 Workflows base

1. **Trigger tag `etapa_reservo`:**
   - Enviar WA confirmación (template con booking_code + fecha/hora/servicio + preferencia)
   - Enviar email confirmación
   - Enviar mensaje al grupo WA de terapeutas (manual inicialmente; automatizado Fase 9 con Cloud API)

2. **Time-based 24h antes de booking:**
   - Enviar WA recordatorio
   - UPDATE Supabase `recordatorio_24h_enviado_at`

3. **Time-based 2h antes:**
   - Enviar WA recordatorio
   - UPDATE Supabase `recordatorio_2h_enviado_at`

4. **Trigger tag `etapa_pago`:**
   - Webhook a `exentia-pago` (dispara Capa 5 closed loop)

5. **Trigger tag `no_show`:**
   - Workflow recuperación: WA template 48h después

**Verification Fase 3:**
- GHL API `GET /locations/{id}/customFields` devuelve 27
- GHL UI muestra todas las tags canónicas creadas
- Pipeline "Exentia — Reservas" visible con 9 stages
- Workflow test: aplicar tag `etapa_reservo` a contacto test → confirmación enviada

### Fase 4 — n8n workflows (semana 2-3, paralelo Fase 3)

**Owner:** Víctor. **Sub-agent:** `general-purpose` con AEC pattern ([[n8n-best-practices]]).

7 workflows en `/Users/henrylopez/Desktop/exentia/n8n/`:

#### 4.1 `exentia-track.json` — Ingress tracking

4 nodos canónicos del Playbook Capa 2:
- Webhook POST `/webhook/exentia-track`
- Normalize (Code JS): parse body, gen lead_ref si falta, enrich con ghl_contact_id por phone lookup si tenemos phone
- Supabase Insert `exentia_leads` con `Prefer: return=representation`, `continueOnFail: true`
- Respond 200 static `{"ok":true,"lead_ref":"..."}`

#### 4.2 `exentia-reserva.json` — Form submit

Nodos:
- Webhook POST `/webhook/exentia-reserva`
- Normalize
- Google Maps reverse geocode (HTTP Request a `https://maps.googleapis.com/maps/api/geocode/json?latlng=...` o `?place_id=...` extraído del URL)
- Extract colonia + lat/lng
- Supabase INSERT `exentia_bookings` estado='reservo'
- GHL Upsert Contact (match por phone):
  - Set custom fields `exentia_*`
  - Add tags: `etapa_reservo`, `servicio_*`, `zona_*`, `canal_*`, `preferencia_*`
- Build wa.me link ASCII puro:
  ```
  https://wa.me/{TEL_YAZ}?text=Hola,%20quiero%20reservar%20un%20masaje%20{tipo}%20en%20zona%20{zona}.%20Preferencia:%20{sexo}.%20Folio%20{booking_code}.
  ```
- Respond con `{success: true, booking_code, wa_link}`

#### 4.3 `exentia-checkin.json` — Terapeuta marca llegada

Nodos:
- Webhook POST `/webhook/exentia-checkin`
- Parse `{booking_id, lat, lng}` (desde mini form WA o app simple)
- Supabase UPDATE `exentia_bookings` set `checkin_terapeuta_at = now()`, `checkin_lat`, `checkin_lng`
- GHL tag `etapa_asistio`
- Respond 200

#### 4.4 `exentia-pago.json` — Yaz marca pago → Closed loop

Nodos:
- Webhook POST `/webhook/exentia-pago` (trigger desde GHL tag `etapa_pago` o manual)
- Parse `{booking_id, monto_mxn}`
- Supabase UPDATE `exentia_bookings` set `pago_recibido_at = now()`, `pago_monto_mxn`, `estado='pagado'`
- Fetch booking completo (gclid, email, phone, fbclid, etc)
- **Google Ads uploadClickConversions:**
  ```javascript
  POST https://googleads.googleapis.com/v17/customers/{customerId}:uploadClickConversions
  {
    conversions: [{
      conversionAction: 'customers/{customerId}/conversionActions/{conversionId}',
      gclid: booking.gclid,
      conversionDateTime: booking.pago_recibido_at_formatted,
      conversionValue: booking.pago_monto_mxn,
      currencyCode: 'MXN',
      orderId: booking.id,
      userIdentifiers: [
        {hashedEmail: sha256(booking.email.toLowerCase().trim())},
        {hashedPhoneNumber: sha256(normalizeE164(booking.phone))}
      ]
    }]
  }
  ```
- **Meta CAPI Purchase:**
  ```javascript
  POST https://graph.facebook.com/v25.0/{pixel_id}/events
  {
    data: [{
      event_name: 'Purchase',
      event_time: Math.floor(booking.pago_recibido_at_ts / 1000),
      event_id: `exentia_${booking.lead_ref}_Purchase_${yyyymmdd}`,
      action_source: 'system_generated',
      user_data: {
        em: sha256(booking.email.toLowerCase().trim()),
        ph: sha256(normalizeE164(booking.phone)),
        external_id: booking.lead_ref,
        fbc: booking.fbclid ? `fb.1.${now_ts}.${booking.fbclid}` : null
      },
      custom_data: {
        value: booking.pago_monto_mxn,
        currency: 'MXN',
        order_id: booking.id
      }
    }],
    access_token: '{{credentials.meta.exentia.capi_token}}'
  }
  ```
- INSERT `exentia_eventos_atribucion` con `destino`, `status`, `payload`, `response`
- Respond 200

#### 4.5 `exentia-resena.json` — Cliente responde reseña

Nodos:
- Webhook POST `/webhook/exentia-resena`
- Parse `{booking_id, rating, texto}`
- Supabase UPDATE `exentia_bookings` set `resena_respondida_at`, `resena_rating`, `resena_texto`, estado='resenado'
- GHL tag `etapa_resena`
- Si rating >= 4 → tag `vip` (posible recurrente)

#### 4.6 `exentia-upload-conversions.json` — Cron retry 1h

Schedule: cada 1 hora.
- Supabase SELECT `exentia_eventos_atribucion` WHERE `status='error' AND retry_count < 5`
- Para cada row: reintentar upload (mismo código que `exentia-pago`)
- Exponential backoff: intento N en `now() + 2^N horas` después del último
- UPDATE retry_count + status

#### 4.7 `exentia-meta-spend-pull.json` — Cron ROAS 6h

Schedule: cada 6 horas.
- Meta Marketing API `GET /act_{account_id}/insights?fields=spend,campaign_name,adset_name,ad_name&date_preset=yesterday`
- Guardar en tabla `exentia_meta_spend` (nueva, crear en Fase 2 como extensión)
- Dashboard usa para calcular ROAS

**Patterns AEC aplicados en los 7:**
- `continueOnFail: true` en todos los nodes de terceros
- `Prefer: return=representation` en Supabase Insert/Update
- `credentials: omit` en fetch desde browser (solo aplica a `exentia-track`)
- NO `{{placeholder}}` dentro de `={{ }}` expressions
- Binary field names consistentes

**Verification Fase 4:**
- `curl -X POST https://n8n.../webhook/exentia-track -d '{"event_type":"test"}'` → 200 + row insertada
- Test completo `exentia-reserva` con payload simulado → row en bookings + contacto en GHL + wa.me link válido
- Test `exentia-pago` mock → uploads Google + Meta registrados en audit

### Fase 5 — Tracking install (semana 3-4)

**Owner:** Víctor. **Sub-agent:** `general-purpose` + validación `Claude_Preview`.

#### 5.1 GA4
- Property nueva `exentia-prod`
- Measurement ID formato `G-EXENTIAXX`
- Instalar via gtag snippet inline en landing (NO lazy-load)
- Configurar custom events para los 20 del playbook como events enhanced measurement

#### 5.2 Microsoft Clarity
- Project nuevo `exentia-ghl`
- Snippet inline en landing

#### 5.3 Google Ads
- Sub-cuenta nueva bajo MCC `876-257-5839` (Ainnovation)
- Conversions:
  - `reserva_confirmada` (primary, value=$ dinámico, count=one)
  - `form_submit` (secondary)
  - `whatsapp_click` (secondary)
- Enhanced Conversions: Diagnostics → Customer Data → API mode ON

#### 5.4 Meta Pixel + CAPI

**CRÍTICO:** usar token con scope correcto. NO reusar token roto Sarahi (`read_ads_dataset_quality`).

- Crear Pixel bajo Business Manager de Exentia o Gueñe
- Pixel ID nuevo
- Generar CAPI access token:
  - Business Manager → System Users → crear `victor.rodriguez.ainnovation.exentia` (o similar)
  - Grant permissions: `ads_management` + `ads_read` + `business_management`
  - Generar token con esos scopes
- Guardar token en `credentials` cat `meta` client `exentia` key `capi_token`

#### 5.5 tracker.js IIFE

`/Users/henrylopez/Desktop/exentia/landing/tracker.js` (~300 líneas):

```javascript
(function(){
  'use strict';
  const N8N_ENDPOINT = 'https://n8n-ntcue-clone-u59578.vm.elestio.app/webhook/exentia-track';
  const COOKIE_NAME_FIRST = 'ex_first_attr';
  const COOKIE_DAYS = 30;

  // --- utils ---
  function uuid(){return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,function(c){var r=Math.random()*16|0,v=c==='x'?r:(r&0x3|0x8);return v.toString(16);});}
  function getParam(n){return new URLSearchParams(location.search).get(n);}
  function setCookie(n,v,d){var e=new Date();e.setTime(e.getTime()+d*864e5);document.cookie=n+'='+encodeURIComponent(v)+';expires='+e.toUTCString()+';path=/;SameSite=Lax';}
  function getCookie(n){var m=document.cookie.match(new RegExp('(^| )'+n+'=([^;]+)'));return m?decodeURIComponent(m[2]):null;}

  // --- session + attribution ---
  const SESSION_KEY = 'ex_session';
  let session = JSON.parse(localStorage.getItem(SESSION_KEY)||'null');
  const now = Date.now();
  if(!session || (now - session.last_activity) > 30*60*1000){
    session = {id: uuid(), started_at: now, last_activity: now};
  } else {
    session.last_activity = now;
  }
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));

  // Capture click IDs
  const clickIds = {
    gclid: getParam('gclid'),
    gbraid: getParam('gbraid'),
    wbraid: getParam('wbraid'),
    fbclid: getParam('fbclid'),
    msclkid: getParam('msclkid')
  };

  // Capture UTMs last-click (este request)
  const utmLast = {
    utm_source: getParam('utm_source'),
    utm_medium: getParam('utm_medium'),
    utm_campaign: getParam('utm_campaign'),
    utm_content: getParam('utm_content'),
    utm_term: getParam('utm_term')
  };

  // First-click: si no hay cookie, guardar los UTM/clickIds actuales
  let utmFirst = getCookie(COOKIE_NAME_FIRST);
  if(!utmFirst && (utmLast.utm_source || clickIds.gclid || clickIds.fbclid)){
    utmFirst = JSON.stringify({...utmLast, ...clickIds, captured_at: now});
    setCookie(COOKIE_NAME_FIRST, utmFirst, COOKIE_DAYS);
  }
  const utmFirstObj = utmFirst ? JSON.parse(utmFirst) : {};

  // Lead ref
  let leadRef = localStorage.getItem('ex_lead_ref');

  // --- track function ---
  function track(eventType, payload){
    payload = payload || {};
    const body = {
      event_type: eventType,
      lead_ref: leadRef,
      session_id: session.id,
      page_path: location.pathname,
      landing_version: window.EX_LANDING_VERSION || 'v1',
      ...clickIds,
      ...utmLast,
      utm_source_first: utmFirstObj.utm_source,
      utm_medium_first: utmFirstObj.utm_medium,
      utm_campaign_first: utmFirstObj.utm_campaign,
      utm_content_first: utmFirstObj.utm_content,
      utm_term_first: utmFirstObj.utm_term,
      referrer: document.referrer,
      user_agent: navigator.userAgent,
      device_type: /Mobile|Android|iPhone/i.test(navigator.userAgent)?'mobile':'desktop',
      screen_size: screen.width+'x'+screen.height,
      language: navigator.language,
      timezone_offset: new Date().getTimezoneOffset(),
      extra: payload
    };
    fetch(N8N_ENDPOINT, {
      method:'POST', keepalive:true, credentials:'omit', mode:'cors',
      body: JSON.stringify(body)
    }).then(r=>r.json()).then(j=>{
      if(j.lead_ref && !leadRef){
        leadRef = j.lead_ref;
        localStorage.setItem('ex_lead_ref', leadRef);
      }
    }).catch(()=>{});

    // Pixel + CAPI dedup event_id
    if(window.fbq){
      const ymd = new Date().toISOString().slice(0,10).replace(/-/g,'');
      const eventId = `exentia_${leadRef||'anon'}_${eventType}_${ymd}`;
      const pixelEvent = mapToPixelEvent(eventType);
      if(pixelEvent) fbq('track', pixelEvent, payload, {eventID: eventId});
    }
  }
  window.exentiaTrack = track;

  function mapToPixelEvent(t){
    if(t==='page_view') return 'PageView';
    if(t==='service_select' || t==='service_card_view') return 'ViewContent';
    if(t==='form_start') return null;
    if(t==='form_submit_whatsapp' || t==='whatsapp_direct_click') return 'Contact';
    if(t==='calendar_time_slot_click') return 'Schedule';
    return null;
  }

  // --- fire initial page_view ---
  track('page_view');

  // --- scroll milestones ---
  const scrollMarks = {25:false,50:false,75:false,100:false};
  function onScroll(){
    const pct = Math.round((window.scrollY + window.innerHeight) / document.documentElement.scrollHeight * 100);
    [25,50,75,100].forEach(m=>{
      if(pct >= m && !scrollMarks[m]){ scrollMarks[m]=true; track('scroll_'+m, {scroll_depth_pct: pct}); }
    });
  }
  window.addEventListener('scroll', onScroll, {passive:true});

  // --- IntersectionObserver service_card_view ---
  document.addEventListener('DOMContentLoaded', function(){
    const cards = document.querySelectorAll('[data-service-slug]');
    const io = new IntersectionObserver(entries=>{
      entries.forEach(e=>{
        if(e.isIntersecting){
          track('service_card_view', {servicio_slug: e.target.dataset.serviceSlug});
          io.unobserve(e.target);
        }
      });
    }, {threshold: 0.5});
    cards.forEach(c=>io.observe(c));

    // Click handlers
    document.querySelectorAll('[data-event="service_select"]').forEach(el=>{
      el.addEventListener('click', ()=>track('service_select', {servicio_slug: el.dataset.serviceSlug}));
    });
    document.querySelectorAll('[data-event="whatsapp_direct_click"]').forEach(el=>{
      el.addEventListener('click', ()=>track('whatsapp_direct_click'));
    });
    document.querySelectorAll('[data-event="call_click"]').forEach(el=>{
      el.addEventListener('click', ()=>track('call_click'));
    });
  });

  // --- session_end beacon ---
  const startTime = Date.now();
  window.addEventListener('pagehide', function(){
    const timeOnPage = Date.now() - startTime;
    const maxScroll = Math.max(...Object.keys(scrollMarks).filter(k=>scrollMarks[k]).map(Number), 0);
    track('session_end', {time_on_page_ms: timeOnPage, max_scroll_depth_pct: maxScroll});
  });
})();
```

(Script es esqueleto — se puede ampliar con `form_start`, `form_field_complete`, `photo_upload_*`, `maps_link_paste` según se construyan los componentes del form en Fase 6.)

**Verification Fase 5:**
- Abrir landing con `?gclid=TEST&utm_source=google&utm_medium=cpc&utm_campaign=test`
- GA4 DebugView muestra `page_view` en <3s
- `SELECT * FROM exentia_leads WHERE gclid='TEST'` → row
- Clarity muestra session en 5 min
- Meta Events Manager → PageView con event_id visible, dedup Pixel↔CAPI visible
- Form test → Pixel Lead + CAPI Lead con mismo event_id → Events Manager muestra "Deduplicated"

### Fase 6 — Landing estética (semana 4-6)

**Owner:** Víctor. **Sub-agent:** `frontend-design` + `general-purpose`.

**Dependencies:** Fase 1 brand + Fase 5 tracker + Fase 2 servicios seed + Fase 3 GHL form snippet.

**NO reusar preview** `https://access.ainnovation.com.mx/v2/preview/vAzECdU6YS7JC1VmdeJI?notrack=true`. Construir desde cero aplicando Playbook Sección 3 layout decisions + brand identity Fase 1.

**Estructura HTML:**
```
exentia/landing/
├── index.html              (estructura + secciones)
├── tracker.js              (Fase 5)
├── css/
│   ├── vars.css            (Fase 1 brand vars)
│   └── styles.css          (layout)
├── assets/
│   ├── hero.webp           (<100KB)
│   ├── servicios/*.webp
│   ├── process/*.svg       (iconos cómo funciona)
│   └── map-cancun.svg      (mini mapa cobertura)
└── partials/
    ├── header.html
    ├── sticky-cta.html
    └── footer.html
```

**10 secciones:**
1. Hero (terapeuta llegando a casa) + CTA WA primary + CTA secundario "Ver servicios"
2. Sticky CTA bottom bar (aparece scroll >200px)
3. Tipos de masaje (cards desde `exentia_servicios` ordenados por `orden_display`)
4. Cómo funciona (3 pasos icon grid: Eliges → Compartes ubicación → Llega tu terapeuta)
5. Cobertura Cancún (lista zonas + mini mapa)
6. ~~Terapeutas~~ (NO mostrar — modelo C)
7. Testimonios (3-5 reseñas autorizadas por Yaz)
8. FAQ (acordeón: horarios, pagos, cancelación, requisitos espacio ~2×2m + enchufe)
9. Reserva/contacto final (CTA WA + tel + form opcional 3 campos)
10. Footer + aviso de privacidad obligatorio

**Form 3 campos:**
```html
<form id="reserva-form">
  <input type="text" name="nombre" required>
  <input type="tel" name="telefono" required>
  <div class="row">
    <select name="servicio_slug" required>
      <option value="">Tipo de masaje...</option>
      <!-- poblado desde exentia_servicios -->
    </select>
    <fieldset class="sexo">
      <legend>Preferencia terapeuta</legend>
      <label><input type="radio" name="preferencia_sexo" value="H">Hombre</label>
      <label><input type="radio" name="preferencia_sexo" value="M">Mujer</label>
      <label><input type="radio" name="preferencia_sexo" value="I" checked>Indistinto</label>
    </fieldset>
  </div>
  <button type="submit">Reservar por WhatsApp</button>
</form>
```

Submit handler:
1. Fire `form_submit_intent`
2. POST a `exentia-reserva`
3. Recibir `{booking_code, wa_link}`
4. Fire `form_submit_whatsapp` + redirect a wa_link

**wa.me link ASCII puro:**
```
https://wa.me/521998XXXXXXX?text=Hola,%20quiero%20reservar%20un%20masaje%20{tipo}%20en%20Cancun.%20Preferencia:%20{sexo}.%20Folio%20{booking_code}.
```

Todo sin acentos. `%20` manual o `encodeURIComponent` pero verificar output.

**Decisiones FORZADAS (Playbook Sección 3 — no renegociables):**
- Single vertical scroll
- WhatsApp CTA dominante
- Form 3 campos max
- Hero WebP <100KB
- ASCII puro wa.me
- Sin `<meta noindex>`, robots.txt explícito
- Mobile-first

**Aviso de privacidad** (placeholder hasta que Yaz confirme template Ainn vs abogado):
- Mención explícita de recolección de: nombre, teléfono, email, dirección, fotos interior casa
- Uso: operación del servicio, atribución marketing, contactar para reseña
- Compartir con: terapeuta asignado (solo datos de servicio), Meta + Google (eventos hasheados)
- Derechos ARCO + contacto

**Verification Fase 6:**
- Lighthouse mobile ≥85
- Hero visible <1.5s en throttle 4G
- wa.me abre WhatsApp sin mojibake iOS (test en iPhone real)
- Form 3 campos funciona end-to-end → booking en Supabase + WA recibido
- robots verde Google Search Console
- Claude_Preview screenshots aprobados en 320/375/414/1440px

### Fase 7 — Closed attribution loop (semana 6-8)

**Owner:** Víctor.

Ya está implementado en Fase 4 (`exentia-pago.json`). Fase 7 es **activación + monitoreo** + tuning.

**Tareas de activación:**
- Ejecutar booking test completo end-to-end
- Marcar manual como pagado
- Verificar audit table `exentia_eventos_atribucion` tiene row con `status='ok'`
- Verificar Google Ads UI Conversions page (24-48h) muestra conv con label "Enhanced"
- Verificar Meta Events Manager Activity log muestra Purchase con event_id correcto + EMQ

**KPIs de atribución a monitorear (weekly):**
- Gclid match rate (target >90%)
- CAPI EMQ score (target >7)
- Offline conversions subidas semana vs semana anterior
- Dedup success ratio

**Verification Fase 7:**
- Primera conversión real (no test) cerrada end-to-end
- Google Ads reporta conv con valor MXN correcto
- Meta reporta Purchase con valor MXN correcto
- Audit table 100% `status='ok'` o retries automáticos funcionando

### Fase 8 — Dashboard (semana 7-9)

**Owner:** Víctor. **Sub-agent:** `frontend-design` + `general-purpose`.

**Variante B srcdoc** por PII sensible.

**Archivos:**
```
exentia/dashboard/
├── index.html              (source, lo que se escapa como srcdoc)
├── deploy-srcdoc.sh        (script pbcopy)
├── css/
│   └── dashboard.css       (escape CSS anti-wrapper GHL)
└── js/
    ├── supabase-connect.js
    ├── charts.js
    └── i18n-es.js          (unicode escapes)
```

**Stack:**
```html
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
```

**Escape CSS (Playbook):**
```css
#exentia-dashboard {
  position: fixed !important;
  top: 0 !important; left: 0 !important;
  width: 100vw !important; height: 100vh !important;
  z-index: 2147483647 !important;
}
body { overflow: hidden !important; }
```

**Anti-mojibake:** todo texto en español en JS con `\u00e9` escapes. HTML estático con placeholders `<div id="t-XXX"></div>` llenados por JS.

**Supabase realtime subscribe:**
```javascript
const sb = window.supabase.createClient(URL, ANON_KEY);
sb.channel('exentia-realtime')
  .on('postgres_changes', {event:'*', schema:'public', table:'exentia_bookings'}, refreshKPIs)
  .on('postgres_changes', {event:'*', schema:'public', table:'exentia_leads'}, refreshEvents)
  .subscribe();
```

**4 bloques KPI** (Playbook Capa 6):
- Yaz (operación default)
- Jocelyn (Meta)
- Google (ex-Carem)
- Ainnovation (diagnóstico)

**Filtros globales sticky:** fecha, canal, servicio, zona, first-vs-last-click toggle.

**Deploy script `deploy-srcdoc.sh`:**
```bash
#!/bin/bash
set -e
cd "$(dirname "$0")"
HTML=$(cat index.html)
ESCAPED=$(echo "$HTML" | sed 's/"/\&quot;/g')
IFRAME="<iframe srcdoc=\"${ESCAPED}\" style=\"width:100%;height:100vh;border:none\"></iframe>"
echo "$IFRAME" | pbcopy
echo "✅ srcdoc iframe copied. Paste in GHL Custom Menu Link → HTML mode."
```

**Repo privado:** `henrylopez-del/exentia-dashboard`.

**Verification Fase 8:**
- INSERT booking test → dashboard actualiza <2s vía WebSocket
- Cambiar filtros → KPIs re-calculan
- Iframe GHL sin scroll horizontal
- Acentos español renderizan correcto
- Safari iOS renderiza charts OK
- Review con Yaz + Jocelyn: aceptación de 4 bloques

### Fase 9 — Ads launch + optimización (semana 9+)

**Owner:** Luis + ex-Carem + Jocelyn.

**UTM taxonomies** (Playbook Sección 3):
- Google: `utm_source=google | utm_medium=cpc | utm_campaign={campaign} | utm_content={creative_id} | utm_term={keyword}`
- Meta: `utm_source=meta | utm_medium=paid | utm_campaign={campaign} | utm_content={creative_id} | utm_term={adset_slug}`

**Campaña Google (geo Cancún):**
- Search principal: keywords masajes + "a domicilio" + variaciones
- PMax opcional una vez hay suficiente conversion data (>50 conv/mes)
- Geo-targeting: Cancún + zonas cobertura (Yaz define radio)

**Campaña Meta (geo Cancún):**
- Objective: Leads o Conversions (según maturity del pixel)
- IG Stories + Reels + Feed
- FB Feed + Stories
- Creative responsabilidad de Gueñe

**Monitoreo primeros 7 días:**
- Daily check: CPL, match rate, dedup, funcionamiento end-to-end
- Blocker surveillance: si algo rompe, rollback inmediato

**Optimización continua:**
- Weekly review Yaz + Luis + dashboard (30 min)
- Creative refresh cada 2 semanas (Jocelyn)
- Keyword tuning mensual (ex-Carem)
- Lookalike audiences Meta refresh mensual (descargar CSV del dashboard)
- Expansión zonas Cancún según demanda observada en heatmap

**Verification Fase 9:**
- <$100 MXN test en cada canal → click → landing → captura → booking test → ciclo cerrado medible en dashboard
- Gclid match >90%, CAPI EMQ >7 sostenido
- Reporte semanal automatizado funcional

---

## Archivos creados en este plan

Ver sección Archivos del [[exentia-ralph-loop|Ralph Loop]] para lista completa con estados.

## See also
- [[ainnovation-landing-playbook]] — pattern combinado Arqalum + Sarahi
- [[exentia-ralph-loop]] — checklist iterable
- [[Exentia]] — ficha cliente
- [[ghl-dashboard-pattern]] — Variante A/B
- [[arqalum-archive/arqalum-capa1-tracking-2026-04-16]]
- [[sarahi-capi-backfill-2026-04-22]]
- [[n8n-best-practices]]
