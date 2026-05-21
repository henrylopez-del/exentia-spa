---
type: project
client: "[[Exentia]]"
updated: 2026-04-24
owner: Luis + Henry
status: phase_0_alignment
aliases: ["Exentia Ralph Loop", "Exentia Checklist", "Ralph Exentia"]
related:
  - "[[Exentia]]"
  - "[[ainnovation-landing-playbook]]"
  - "[[exentia-action-plan]]"
---

# Exentia — Ralph Loop

> **Estado por tarea:** ⬜ TODO · 🟡 IN PROGRESS · ✅ DONE · ⛔ BLOCKED
> **Convención:** `[owner] descripción — due YYYY-MM-DD — agent: {tipo}` por tarea. Sub-agent consulta este archivo antes de trabajar (dependencies) y actualiza al completar.
> **Dependencias macro:** D1 Data → D2 GHL+Attribution → D3 Tracking → D4 Landing / D5 Dashboard (en paralelo). D0 Alignment bloquea parcialmente D1.

---

## D0 · Alignment (cross-dominio)

- ⬜ [Luis] Enviar checklist v2 a Yaz + Jocelyn — due **2026-04-25**
- ⬜ [Luis/Henry] Agregar al checklist lista específica de fotos (camilla en domicilio, aceites, terapeutas en acción, kit, llegada a casa — **NO** fachada/lobby) — due 2026-04-25
- ⬜ [Henry] Verificar correo Yaz del 2026-04-12 (3 inbox: luis.acosta@ / henry.lopez@ / victor.rodriguez@ainnovation.com.mx)
- ⬜ [Henry] Pedir a Jocelyn el documento de "características de la marca" que le mandaron a Exentia
- ⬜ [Henry] Revisar propuesta antigua 2026-03-27: `https://claude.ai/public/artifacts/bf92eb92-9937-4cb6-bf3a-24bf9c4b62e3`
- ⬜ [Yaz + Jocelyn] Responder checklist con toda la info — due **2026-05-01**
- ⬜ [Yaz] Compartir precios + orden por volumen de ventas (para `exentia_servicios.orden_display`)
- ⬜ [Yaz] Confirmar tipos de masaje (define dropdown landing + tags `servicio_*`)
- ⬜ [Yaz] Whitelist zonas **Cancún** (NO CDMX) — define tags `zona_*`
- ⬜ [Yaz] Contactar ex-Carem (Google Ads) + agendar sesión conjunta
- ⬜ [Henry + Yaz] Cerrar decisión Wazzap vs WA Cloud API vs manual (recomendado: manual Fase 1)
- ⬜ [Henry + Yaz] Confirmar método pago Fase 1 (recomendado: manual Yaz; Stripe Fase 9)
- ⬜ [Henry + Yaz] Aviso de privacidad (template Ainn bajo responsabilidad Exentia vs abogado Yaz)
- ⬜ [Henry] Cerrar nivel de compromiso con Exentia (N1/N2/N3) una vez revisen PDF

## D0.5 · Deliverables documentales

### Deliverable A — Playbook interno + Action plan
- 🟡 [Henry] Crear Ralph Loop — **en progreso** (este archivo)
- ⬜ [Henry] Playbook Landing Data-Complete — archivo: `wiki/projects/ainnovation-landing-playbook.md` — agent: general-purpose
- ⬜ [Henry] Action plan Exentia — archivo: `wiki/projects/exentia-action-plan.md` — agent: general-purpose
- ⬜ [Henry] Update `wiki/clients/Exentia.md` (CDMX → Cancún, links a playbook y action plan)

### Deliverable B — PDF propuesta Exentia (SIN PRICING)
- ⬜ [Henry] Source markdown `exentia/deliverables/source/propuesta-exentia.md` — 11 secciones
- ⬜ [Henry] Generar PDF v1 `exentia/deliverables/propuesta-exentia-v1.pdf` — agent: anthropic-skills:pdf + theme-factory
- ⬜ [Henry] Anexo imprimible `exentia/deliverables/checklist-requerimientos.pdf`
- ⬜ [Luis] Enviar PDF a Yaz + Jocelyn

## D1 · Data foundation (Supabase + n8n) — agent: general-purpose

**Depends on:** D0 decisiones Yaz (servicios, zonas) + D0.5 action plan aprobado

- ⬜ Crear proyecto Supabase nuevo `exentia-prod`
- ⬜ Guardar credenciales en tabla `credentials` cat `supabase` client `exentia`
- ⬜ Ejecutar DDL `exentia/backend/supabase-schema.sql`: 7 tablas
- ⬜ Ejecutar views: `exentia_dashboard_kpis_today`, `exentia_revenue_by_channel_7d`, `exentia_terapeuta_utilization`, `exentia_sessions`
- ⬜ RLS policies `exentia/backend/rls-policies.sql`
- ⬜ Storage buckets: `exentia-public` (servicios + bios), `exentia-private/casas/{booking_id}/`
- ⬜ Seed servicios `exentia/backend/seed-servicios.sql` (Yaz provee tipos)
- ⬜ Seed zonas `exentia/backend/seed-zonas-cancun.sql` (Yaz whitelist)
- ⬜ Seed terapeutas iniciales (internos, no landing)
- ⬜ 7 n8n workflows en `exentia/n8n/`:
  - ⬜ `exentia-track.json`
  - ⬜ `exentia-reserva.json` (con Google Maps reverse geocode)
  - ⬜ `exentia-checkin.json`
  - ⬜ `exentia-pago.json` (dispara closed loop Fase 7)
  - ⬜ `exentia-resena.json`
  - ⬜ `exentia-upload-conversions.json` (cron 1h retry)
  - ⬜ `exentia-meta-spend-pull.json` (cron 6h ROAS)
- ⬜ Validation: `SELECT * FROM exentia_leads LIMIT 1` OK + `curl` webhook → 200 + row insertada

## D2 · GHL + Attribution — agent: general-purpose

**Depends on:** D1 tabla `exentia_eventos_atribucion`

- ⬜ Crear GHL location Exentia (sub-cuenta bajo agency Ainnovation)
- ⬜ Guardar credenciales en `credentials` cat `ghl` client `exentia`
- ⬜ 27 custom fields prefijo `exentia_*` — docs en `exentia/docs/ghl-custom-fields.md`
- ⬜ Pre-crear tags canónicas (ANTES de workflows):
  - ⬜ `servicio_*` (uno por tipo masaje)
  - ⬜ `zona_*` (uno por zona Cancún)
  - ⬜ `canal_google | canal_meta | canal_organico | canal_directo | canal_referencia`
  - ⬜ `etapa_*` (9 stages)
  - ⬜ `preferencia_hombre | preferencia_mujer | preferencia_indistinto`
  - ⬜ Operativas: `recurrente`, `opt_out`, `no_show`, `cancelado`, `vip`, `nuevo_30d`
- ⬜ Pipeline "Exentia — Reservas" con 9 stages
- ⬜ Calendario GHL consolidado (modelo C operativo)
- ⬜ Workflow `etapa_reservo` → confirmación WA + email + postear al grupo WA terapeutas
- ⬜ Workflow recordatorio 24h antes
- ⬜ Workflow recordatorio 2h antes
- ⬜ Workflow `etapa_pago` → webhook `exentia-pago`
- ⬜ Google Ads sub-cuenta bajo MCC `876-257-5839`
- ⬜ Conversions en Google Ads: `reserva_confirmada` (primary), `form_submit`, `whatsapp_click`
- ⬜ Enhanced Conversions API mode ON en Google Ads
- ⬜ Meta Pixel NUEVO (no reusar token roto Sarahi)
- ⬜ Meta CAPI token scope correcto: `ads_management + ads_read + business_management`
- ⬜ Guardar tokens Meta en `credentials` cat `meta` client `exentia`
- ⬜ Audit retry logic en `exentia_eventos_atribucion`
- ⬜ Verification: GHL API devuelve 27 custom fields + tags visibles + pipeline funcional

## D3 · Tracking / Analytics — agent: general-purpose + Claude_Preview

**Depends on:** D1 webhook `exentia-track` + D2 Pixel ID + conv IDs

- ⬜ GA4 property `exentia-prod` + measurement ID `G-EXENTIAXX`
- ⬜ Microsoft Clarity project nuevo
- ⬜ `exentia/landing/tracker.js` IIFE ~300 líneas con 20 eventos canónicos
- ⬜ Meta Pixel wireup browser-side + `event_id` match con CAPI
- ⬜ Google Ads gtag conversion tags (vía GA4)
- ⬜ Documentar `exentia/docs/event-taxonomy.md` y `utm-taxonomy.md`
- ⬜ Validation Claude_Preview: `?gclid=TEST&utm_source=google` → GA4 + Supabase + Clarity + Meta <3s

## D4 · Landing estética — agent: frontend-design + general-purpose

**Depends on:** D1 storage + servicios/zonas seeds + D2 GHL form snippet + D3 tracker.js + Fase 1 brand

- ⬜ Recibir brand identity de Jocelyn — organizar en `exentia/brand/`
- ⬜ Generar CSS variables master
- ⬜ Construir `exentia/landing/index.html` desde cero (NO reusar preview `vAzECdU6YS7JC1VmdeJI`)
- ⬜ Hero WebP <100KB (terapeuta llegando a casa)
- ⬜ Form minimalista 3 campos (nombre, tel, tipo masaje + sexo)
- ⬜ wa.me ASCII puro con mensaje pre-llenado
- ⬜ Google Maps link field + reverse geocode backend
- ⬜ Supabase Storage uploader fotos casa (signed URL)
- ⬜ Sticky CTA WhatsApp bottom bar (scroll >200px)
- ⬜ 10 secciones ordenadas (hero, servicios, cómo funciona, cobertura, testimonios, FAQ, reserva, footer)
- ⬜ NO sección de terapeutas (modelo C, no exponer roster)
- ⬜ Aviso de privacidad obligatorio (PII domiciliaria)
- ⬜ Eliminar `<meta noindex>` + robots.txt explícito
- ⬜ Deploy a GHL página Exentia
- ⬜ Verification: Lighthouse mobile ≥85 + hero <1.5s 4G + wa.me sin mojibake iOS

## D5 · Dashboard Variante B — agent: frontend-design + general-purpose

**Depends on:** D1 views + D2 GHL location + D3 eventos fluyendo

- ⬜ Repo privado `henrylopez-del/exentia-dashboard`
- ⬜ `exentia/dashboard/index.html` con Chart.js v4 UMD + Supabase-JS v2 UMD
- ⬜ WebSocket realtime `exentia_bookings` + `exentia_leads`
- ⬜ Polling 60s views agregadas
- ⬜ Brand identity aplicado (Fase 1 CSS vars)
- ⬜ Escape CSS `position:fixed + z-index 2147483647`
- ⬜ Unicode escapes `\u00e9` para español
- ⬜ 4 bloques KPI:
  - ⬜ Yaz (operación default): reservas, revenue, heatmap hora pico, zona Cancún, terapeuta-util, recurrentes, no-show, tiempo respuesta WA, servicio top
  - ⬜ Jocelyn (Meta): CPL campaña/adset/creative, ROAS, creative fatigue, lookalike CSV
  - ⬜ Google (ex-Carem): gclid match rate, Enhanced Conv coverage, offline conv, CPL, search queries
  - ⬜ Ainnovation: eventos 24h, error rate webhooks, CAPI dedup %
- ⬜ Filtros globales sticky: fecha, canal, servicio, zona Cancún, first-vs-last-click
- ⬜ Script `exentia/dashboard/deploy-srcdoc.sh` (escape HTML → pbcopy)
- ⬜ Paste como GHL Custom Menu Link "Dashboard Exentia"
- ⬜ Review con Yaz + Jocelyn, iterar
- ⬜ Verification: INSERT booking test → dashboard <2s realtime + filtros re-calculan

## D6 · Closed attribution loop — agent: general-purpose

**Depends on:** D2 Google Ads + Meta CAPI + D5 dashboard para ver los eventos

- ⬜ Workflow `exentia-pago` dispara al tag `etapa_pago`
- ⬜ Google Ads `ConversionUploadService.uploadClickConversions` con gclid + hash PII + valor MXN
- ⬜ Enhanced Conversions fallback cuando no hay gclid
- ⬜ Meta CAPI Purchase event con `event_id` dedup
- ⬜ INSERT `exentia_eventos_atribucion` con status/payload/response/retry
- ⬜ Cron `exentia-upload-conversions` cada hora retry exponential backoff
- ⬜ Verification: booking test → Google Ads "Enhanced" 24-48h + Meta EMQ >7 + gclid match >90%

## D7 · Ads launch + optimización — agent: — (Luis + ex-Carem + Jocelyn humanos)

**Depends on:** D1-D6 completas, baseline de tracking ≥2 semanas

- ⬜ UTM taxonomy Google alineada con ex-Carem
- ⬜ UTM taxonomy Meta alineada con Jocelyn
- ⬜ Estructura campaña Google (Search + PMax opcional, geo Cancún)
- ⬜ Estructura campaña Meta (IG + FB, geo Cancún)
- ⬜ Monitoreo primeros 7d
- ⬜ Weekly review Yaz + Luis + dashboard
- ⬜ Creative refresh 2-sem (Jocelyn)
- ⬜ Keyword tuning mensual (ex-Carem)
- ⬜ Lookalike refresh mensual (descargar CSV dashboard)
- ⬜ Expansión zonas Cancún por demanda observada

## Fase 10 — Opcional / Futuro

- ⬜ WhatsApp Cloud API oficial (aprobación templates)
- ⬜ Stripe/Mercado Pago embed
- ⬜ Modelo predictivo no-show (ML basado en historial)
- ⬜ Expansión geográfica fuera de Cancún

---

## Decision log

| Fecha | Decisión | Quién | Nota |
|---|---|---|---|
| 2026-04-24 | Pivote solo masajes a domicilio | Yaz | Kickoff reunión |
| 2026-04-24 | Modelo C grupo WA para asignación terapeutas | Yaz | Operación existente, respetar |
| 2026-04-24 | Landing NO muestra roster terapeutas | Henry (propuesta) | Compatible con modelo C |
| 2026-04-24 | Variante B srcdoc dashboard | Henry (propuesta) | PII domiciliaria |
| 2026-04-24 | Supabase proyecto nuevo `exentia-prod` | Henry (propuesta) | RLS clean boundary |
| 2026-04-24 | Operación en Cancún (NO CDMX) | Henry | Corrección |
| 2026-04-24 | NO reusar preview `vAzECdU6YS7JC1VmdeJI` | Henry | Aplicar patterns Arqalum+Sarahi desde cero |
| 2026-04-24 | PDF Exentia sin pricing | Henry | Pricing se maneja separado |
| 2026-04-24 | Deliverable interno = playbook Ainnovation reusable | Henry | A partir de ahora toda landing futura nace con data-complete |

## Blockers activos

- ⛔ Modelo de masaje (tipos) — bloquea seed `exentia_servicios` + dropdown landing + tags `servicio_*`. Pendiente Yaz (respuesta checklist vie 1-may)
- ⛔ Brand identity docs — bloquea Fase 1. Pendiente Jocelyn
- ⛔ Whitelist zonas Cancún — bloquea seed + dropdown + tags `zona_*`. Pendiente Yaz
- ⛔ Nivel de compromiso (N1/N2/N3) — bloquea alcance final. Pendiente Exentia después de recibir PDF

## Cross-dominio dependency graph

```
D0 Alignment ────┐
                 ▼
D0.5 Docs ──► D1 Data ──► D2 GHL+Attr ──► D3 Tracking ──► D4 Landing
                  │                            │            │
                  └───────────────► D5 Dashboard ◀──────────┘
                                         │
                                         ▼
                                    D6 Closed loop
                                         │
                                         ▼
                                    D7 Ads launch + opt
```

## See also
- [[Exentia]] — ficha cliente
- [[ainnovation-landing-playbook]] — patrón reusable de landing data-complete
- [[exentia-action-plan]] — plan de acción específico Henry + Víctor
- [[ghl-dashboard-pattern]] — Variante B srcdoc
- [[arqalum-archive/arqalum-capa1-tracking-2026-04-16|Arqalum Capa 1]] — schema canónico referencia
- [[sarahi.md|Sarahi]] — dashboard UTM 15-column referencia
- [[sarahi-capi-token-broken]] — anti-pattern scope CAPI
- [[n8n-best-practices]] — AEC workflow pattern
