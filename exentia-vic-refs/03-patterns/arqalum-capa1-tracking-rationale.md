---
type: project
client: "[[Arqalum]]"
date: 2026-04-16
tags: [arqalum, tracking, capa-1, instalacion, tracking-infrastructure, gclid]
status: operativo
related:
  - "[[arqalum-forensic-2026-04-15]]"
  - "[[arqalum-plan-heath-2026-04-15]]"
  - "[[arqalum-first-real-session-2026-04-16]]"
aliases: ["Arqalum Capa 1", "Capa 1 Arqalum", "Tracking v1 Arqalum"]
---

# Arqalum · Capa 1 Tracking v1 · instalado 2026-04-16

> **Objetivo:** capturar cada interacción con las landings de Arqalum, identificar al visitante vía `gclid` de Google Ads, y preparar la atribución para Capas 2-4 (CRM stages + upload offline conversions).

**Duración de sesión:** ~4 horas (14:00 a 18:00 CDMX el 2026-04-16)
**Status:** operativo en producción, validado end-to-end.

---

## 🧠 Contexto que disparó la sesión

Usuario (colega de Henry) hizo test manual del embudo (búsqueda Google → click anuncio → click WhatsApp → mensaje a Gerardo). **Claude confirmó que no había registro en ningún sistema.** Pregunta de Henry:

> "El CRM se desconectó del número de WhatsApp. No puedo ir con Gerardo a preguntarle si le llegó."

Esto reveló que el canal de conversión (WhatsApp personal de Gerardo) era **una caja negra sin telemetría**. Cada click se perdía al cruzar al app de WhatsApp.

## 🔍 Diagnóstico previo (bugs identificados)

1. **Bug `send_to` faltante en gtag** → los clicks a WhatsApp nunca disparaban conversión en Google Ads
2. **Lazy-load del gtag** → script cargaba al primer scroll/click, perdía eventos de usuarios que clickeaban inmediato
3. **4 conversion actions primarias** (Lead Comercial, WhatsApp Click, Calls from ads) → confundían Smart Bidding
4. **CORS + credentials issue** al primer intento de tracker → bloqueaba requests del browser
5. **OctoberCMS token CSRF expira rápido** → primer paste falló por sesión vieja

## 🏗️ Arquitectura instalada

```
Browser (arqalum.com/cotizacion-*)
    ├── gtag (Google Ads) → conversiones oficiales
    ├── Microsoft Clarity (wcs7oe8lhe) → grabación sesiones + heatmaps
    └── ArqTrack inline tracker (fetch, credentials:'omit') → n8n webhook
                    ↓
            n8n webhook "arqalum-track"
                    ↓
            Normalize (parse body, genera lead_ref)
                    ↓
            Supabase arqalum_leads (tabla + 2 views + indexes)
                    ↓
            Dashboard local (auto-refresh 15s)
```

## 🔧 Componentes técnicos

### 1. Supabase table `arqalum_leads`
- **Project:** `fneppfjeywhayknrgahe`
- **Columnas:** id, created_at, lead_ref, click_type, page_path, landing_version, gclid, gbraid, wbraid, utm_*, referrer, session_id, time_on_page_ms, scroll_depth_pct, user_agent, device_type, screen_size, language, extra (JSONB)
- **Índices:** created_at, click_type, gclid (partial), session_id, lead_ref
- **Views:** `arqalum_leads_today` (filtro hoy), `arqalum_sessions` (agregado por sesión con booleans de WhatsApp/Call/Form click)
- **RLS:** enabled, allow authenticated read only
- **SQL canónica:** `~/Desktop/arqalum-tracking-v1/01-supabase-schema.sql`

### 2. n8n workflow "Arqalum Click Tracker v2"
- **URL:** `https://n8n-ntcue-u59578.vm.elestio.app/webhook/arqalum-track`
- **4 nodos:** Webhook (POST) → Normalize (JS code) → Supabase Insert (HTTP POST) → Respond 200 (text static)
- **Key design decisions:**
  - Normalize parsea string JSON body (browser manda text/plain sin Content-Type)
  - Supabase Insert con `Prefer: return=representation` (evita error "undefined.data")
  - Respond 200 con body estático `{"ok":true}` (evita expresión frágil con `$('Normalize').item.json`)
  - `continueOnFail: true` en Supabase Insert para no perder acknowledgment al cliente
- **JSON canónico:** `~/Desktop/arqalum-tracking-v1/02-n8n-workflow-v2.json`

### 3. Microsoft Clarity
- **Project ID:** `wcs7oe8lhe`
- **URL dashboard:** https://clarity.microsoft.com/projects/view/wcs7oe8lhe/dashboard
- **Gratis, sin límite de tráfico**
- **Captura:** session recordings, heatmaps clicks/scroll/attention, rage clicks, dead clicks, JS errors

### 4. Tracker JavaScript inline
- **Inyectado en el `<head>` de:**
  - `/cotizacion-residencial` (arqalum.com)
  - `/cotizacion-comercial` (arqalum.com)
- **Eventos capturados (12 tipos):**
  - `pageview`, `scroll_25`, `scroll_50`, `scroll_75`, `scroll_100`
  - `gallery_click`, `proof_cta`
  - `form_start`, `form_submit_intent`
  - `whatsapp_click`, `call_click`
  - `session_end`
- **Persistencia:** `sessionStorage` para SID, REF, UTMs (sobreviven navegación intra-sesión)
- **Transport:** `fetch()` con `keepalive:true`, `credentials:'omit'`, `mode:'cors'`, sin Content-Type (evita preflight)
- **Inyección de ref:** cada link `wa.me` se modifica en tiempo real para incluir `[Ref XXXXXXXX]` en el mensaje

### 5. Dashboard local
- **Archivo:** `~/Desktop/arqalum-tracking-v1/dashboard.html`
- **Features:** auto-refresh 15s, filtros por click_type, búsqueda libre, stats en vivo
- **Keys:** usa service_role JWT (local-only, no hostear)

---

## 🐛 Bugs resueltos durante la instalación

### Bug A · HTTP 500 en `Respond 200` (v1)
- **Causa:** expresión `$('Normalize').item.json.lead_ref` fallaba en n8n 2.15.1
- **Fix v2:** body estático `{"ok":true}` y respondWith: text

### Bug B · Supabase Insert retornaba undefined.data
- **Causa:** header `Prefer: return=minimal` → Supabase devolvía body vacío → n8n HttpRequest parser fallaba al leer `.data` inexistente
- **Fix:** cambiar a `Prefer: return=representation`

### Bug C · CORS preflight blocked
- **Causa:** `navigator.sendBeacon` fuerza `credentials: include` en el request. Server respondía `Access-Control-Allow-Origin: *` que es incompatible con credentials
- **Fix:** reemplazar sendBeacon con `fetch()` + `credentials:'omit'`, quitar Content-Type header (evita preflight al ser text/plain simple request)

### Bug D · Normalize no parseaba body string
- **Causa:** con text/plain, n8n pasa body como string en vez de objeto
- **Fix:** `if (typeof body === 'string') body = JSON.parse(body)` al inicio de Normalize

### Bug E · OctoberCMS "invalid security token"
- **Causa:** sesión expirada, CSRF token viejo
- **Fix:** hard reload (Cmd+Shift+R), login fresco

---

## ✅ Validación end-to-end

### Test 1 · curl → Supabase
- POST a webhook con payload completo → HTTP 200 `{"ok":true}`
- Fila creada en Supabase con todos los campos

### Test 2 · browser real (Henry, 22:20 UTC)
- URL: `https://arqalum.com/cotizacion-residencial?gclid=FINAL_TEST_NO_CORS&utm_source=google&utm_medium=cpc&utm_campaign=install-final&utm_term=henry%20final%20test`
- Resultado: **7 eventos en la misma sesión**:
  - pageview (310ms post-load)
  - scroll_25 (1s)
  - scroll_50 (2s)
  - scroll_75 (10s)
  - scroll_100 (10s)
  - session_end (12.9s)
  - **whatsapp_click (12.9s)** ← el evento que era invisible antes

### Test 3 · tráfico real espontáneo
Ver [[arqalum-first-real-session-2026-04-16]] — primer visitante real desde Google Ads capturado dentro de las primeras 3 horas post-install.

---

## 📐 Decisiones arquitectónicas clave

1. **n8n como proxy** en vez de Supabase directo desde frontend → evita exponer anon key en HTML, centraliza lógica de validación
2. **Text/plain en fetch** para evitar preflight CORS → simplifica configuración del webhook sin perder estructura del payload (Normalize parsea)
3. **Lead ref de 8 chars UPPERCASE** alfanumérico → corto, legible, único para Gerardo en WhatsApp
4. **Inyección del ref en `wa.me?text=...[Ref XXX]`** → Gerardo ve el identificador del lead incluso sin CRM conectado
5. **Supabase service_role JWT hardcoded en n8n workflow** → simplifica; el JWT solo se usa server-side en n8n (no expuesto al browser)
6. **Microsoft Clarity gratuito** vs Hotjar/PostHog → cero costo, cero límite, features suficientes

---

## 📁 Archivos entregables

Todos en `~/Desktop/arqalum-tracking-v1/`:
- `01-supabase-schema.sql`
- `02-n8n-workflow.json` (v1, deprecated)
- `02-n8n-workflow-v2.json` (v2, actual)
- `03-tracking.js` (standalone, ya inlineado en HTMLs)
- `INSTALL.md`
- `cotizacion-residencial.html` (con tracking)
- `cotizacion-comercial.html` (con tracking)
- `dashboard.html`
- `generate-reporte-tracking-pdf.py`
- `REPORTE-ARQALUM-TRACKING-V1-2026-04-16.pdf`

Copia del PDF también en `~/Desktop/` y `~/Desktop/HenryBrain/raw/`.

---

## 🔜 Lo que falta (Capas 2-4)

- **Capa 2:** tabla `arqalum_deals` con stages del funnel (lead → respondió → cotizó → asistió → cerró → referido), Google Sheet o dashboard Supabase para que Gerardo actualice status
- **Capa 3:** interfaz de Gerardo (Sheet o simple web form, sincronizado con Supabase via n8n)
- **Capa 4:** upload automático de offline conversions a Google Ads via `ConversionUploadService.uploadClickConversions` cuando cambia el stage → Smart Bidding aprende qué gclids cierran deals reales
- **Capa 5 (opcional):** Enhanced Conversions (hash phone/email) para recuperar atribución cuando gclid se pierde (~20-30% de casos)

---

## Ver también
- [[Arqalum]]
- [[arqalum-forensic-2026-04-15]]
- [[arqalum-plan-heath-2026-04-15]]
- [[arqalum-first-real-session-2026-04-16]]
- [[google-ads-playbook]]
- [[Ben Heath]]
