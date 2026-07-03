# AGENTS.md — Guía completa para continuar el proyecto Exentia

> Este documento existe para que cualquier agente de IA (Codex, Claude, otro modelo) o desarrollador humano pueda retomar el proyecto Exentia sin romper nada. Léelo entero antes de tocar código.

Última actualización: 2026-07-01

---

## 1. Contexto del proyecto

**Cliente:** Exentia Spa & Beauty Salon (Cancún, Q. Roo, MX).
**Producto:** Sistema completo de reservas de spa a domicilio y en sucursal. Tres piezas conectadas en tiempo real:

1. **Página pública** (`exentia-pagina.html` → GitHub Pages) para que los clientes exploren servicios, se logueen, agenden citas, cancelen, editen su perfil, revisen su historial.
2. **Panel del equipo** (`panel/web/index.html` → GitHub Pages) para que las masajistas vean el pool de citas disponibles, tomen citas, las cancelen, y gestionen su calendario semanal. Incluye un modo administradora oculto que impersona a un masajista de pruebas.
3. **Dashboard interno** (`monitoreo/dashboard-exentia.html` — iframe srcdoc en GHL Custom Menu) para Yaz: KPIs, pagos, historial.

**Backend:** n8n Elestio (workflows), Supabase (Postgres + Realtime), GHL (CRM/calendarios/mensajería).

**Cliente / product owner:** Yaz (dueña del spa).
**Foco de la fase actual (2026-06-30):** sincronización end-to-end entre la página y el panel del equipo. Cuando un cliente agenda desde la página, la cita aparece en el pool del panel de inmediato. Cuando una masajista la toma, el estado se propaga en tiempo real al resto del equipo. Esta capa está estable.

---

## 2. Arquitectura de alto nivel

```
┌──────────────────────────┐          ┌────────────────────────────┐
│  exentia-pagina.html     │          │  exentia-panel index.html   │
│  (GitHub Pages)          │          │  (GitHub Pages)             │
│  Cliente final           │          │  Masajistas + admin oculto  │
└─────────────┬────────────┘          └──────────────┬──────────────┘
              │                                       │
              ▼                                       ▼
     ┌─────────────────────────────────────────────────────────┐
     │  n8n Elestio  https://n8n-ntcue-clone-u59578.vm.elestio.app│
     │  ~ 25 workflows en carpetas EXENTIA/*                    │
     └───────────┬──────────────────────────┬──────────────────┘
                 │                          │
                 ▼                          ▼
    ┌──────────────────────────┐  ┌────────────────────────────┐
    │  Supabase Postgres        │  │  GoHighLevel (GHL)          │
    │  project fneppfjeywhayknr │  │  Location 0hGSRrhxkdywVQxCsNOi│
    │  schema `exentia`         │  │  Contactos, custom fields,   │
    │  RPCs SECURITY DEFINER    │  │  calendarios, mensajería,    │
    │  vistas en `public`       │  │  appointments                │
    │  Realtime (WebSocket)     │  └────────────────────────────┘
    └──────────────────────────┘
```

**Regla de oro:** las tablas del schema `exentia` **no están expuestas** por PostgREST. Cualquier acceso desde el frontend o n8n va contra **vistas en `public`** con prefijo `exentia_*` o RPCs `exentia_*` con SECURITY DEFINER. Si necesitas exponer una tabla nueva, crea una vista `public.exentia_<nombre>`, no expongas la tabla directa.

---

## 3. Repositorios git

| Repo | Local path | Live URL | Cómo se pushea |
|---|---|---|---|
| [0VictorRodriguez0/exentia-spa](https://github.com/0VictorRodriguez0/exentia-spa) | `/Users/victorisairodriguezpoot/Desktop/claude code/promt/exentia/` | https://0victorrodriguez0.github.io/exentia-spa/exentia-pagina.html | Clon local: `git commit && git push origin main` |
| [0VictorRodriguez0/exentia-panel](https://github.com/0VictorRodriguez0/exentia-panel) | `panel/web/index.html` dentro del repo anterior | https://0victorrodriguez0.github.io/exentia-panel/ | **No hay clon local del repo panel.** Se pushea con `gh api ... contents/index.html --method PUT` (ver sección 13) |

Archivos clave del proyecto:
- `exentia-pagina.html` — página pública (~17k líneas). SPA vanilla JS + hash routing (`#servicio/<slug>`, `#mi-cuenta`).
- `preparacion.html` — mini-formulario post-pago "Preparación de tu Experiencia" (mobile-first, standalone, ~1.4k líneas). Solo aplica a citas a domicilio. Recopila accesos, estacionamiento, camillas, ambiente, receptor y observaciones. Pre-llena para clientes recurrentes. Se sirve por GitHub Pages junto a `exentia-pagina.html`.
- `form-exentia.html` — formulario custom para GHL Form Builder.
- `panel/web/index.html` — panel del equipo (~3.3k líneas). Vanilla JS + Supabase JS SDK v2 para Realtime.
- `monitoreo/dashboard-exentia.html` — dashboard interno V2 (Yaz). Iframe srcdoc para GHL Custom Menu.
- `monitoreo/n8n/*.json` — copias de referencia de los workflows (no fuente de verdad; la fuente es Elestio).
- `monitoreo/sql/*.sql` — migraciones históricas del schema.

**Ojo con `monitoreo/`:** está gitignored en el repo público. Sirve como cuaderno local.

**Estado actual del repo local** (`git status --short` en `exentia/`):
- Cambios sin commitear en `exentia-pagina.html`, `.gitignore`, `dashboard-exentia.html`, `monitoreo/n8n/exentia-reserva.json`.
- Archivos untracked: este `AGENTS.md`, `PLAN_UX_usuario_logueado.md`, `booking-proxy.py`, `calendario-demo.html`, `cliente-auth/`, `panel/` (subrepo del panel), etc.
- Antes de commitear, verifica que **NO** subes credenciales ni `monitoreo/` (revisar `.gitignore`).

---

## 4. Credenciales e IDs críticos

### GHL Exentia
- Location ID: `0hGSRrhxkdywVQxCsNOi`
- API Key (PIT): `pit-67d64213-09c5-433f-aa22-d16615ce2758`
- Base URL: `https://services.leadconnectorhq.com`
- Version header: `2021-07-28`
- Calendar embed principal: `ep6YHJFqv8qFzrzJpL2W`
- Form ID: `ElRuF6DqgcwUiSyJaXoi`
- Pipeline `Reservas`: `0yWVmwR1YLLZfwjPXRcw`
- CDN Base: `https://assets.cdn.filesafe.space/0hGSRrhxkdywVQxCsNOi/media/`

### Supabase
- Project ID: `fneppfjeywhayknrgahe`
- URL: `https://fneppfjeywhayknrgahe.supabase.co`
- Anon key (público, hardcoded en workflows):
  ```
  eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZuZXBwZmpleXdoYXlrbnJnYWhlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4NjMzMTQsImV4cCI6MjA3NTQzOTMxNH0.DuSL3Dv44AtASDam5uL1NJecy141rT5NFaYNRtPcnvw
  ```

### n8n Elestio
- URL: `https://n8n-ntcue-clone-u59578.vm.elestio.app`
- Login admin: `henry.lopez@ainnovation.com.mx` / `Ainnovation2026@`
- API interna: `/rest/*` con cookie de sesión (endpoints tipo `/rest/workflows/{id}`).

### JWT secret compartido (todos los workflows del panel)
```
FzJCOMB4rVslDjOi4gRDZpgg2i0S5srTLPKrn1JcVDRPcFotk1uHMcLFbPDiSq3w
```

HS256 con base64url manual. Si rotas este secreto, hay que editar los ~7 nodos Crypto distribuidos en los workflows de auth y del panel. Todos los JWT emitidos por google-login, otp-verify, admin-login y admin-impersonate lo usan.

### Contacto "Avisos Panel" (buzón de SMS al equipo)
- Nombre: `Avisos Panel`
- Teléfono: `+52 998 346 3802`
- Al crear un booking, `exentia-reserva` manda un SMS a este contacto con el tag `[DOMICILIO]` o `[SUCURSAL]` al inicio del mensaje.

### Admin oculto del panel (para pruebas)
- URL: https://0victorrodriguez0.github.io/exentia-panel/
- Usuario (en el input de email del panel): `ExentiaMasajista` (case insensitive)
- Contraseña: `ExentiaMasajista2026`
- Comportamiento: valida contraseña con `exentia-panel-admin-login`, obtiene JWT admin, luego automáticamente llama a `exentia-panel-admin-impersonate` con el terapeuta_id del masajista de pruebas "Calendario Dos" y sobrescribe el JWT admin por el JWT masajista. El usuario entra directo a la sesión de Calendario Dos con todos los permisos.

---

## 5. Estructura de carpetas en n8n

Todos los workflows están en el proyecto `admin` (id `FGfXRVC8X4Hwk56C`) y organizados así:

```
EXENTIA/                              (id jbhMGG8F1570DcbA)
├── PAGINA/          (id 9ptSGmfxoJi8ITxV)   workflows de la página pública
├── ADMINISTRADOR/   (id cTH1B4BA0Ku1wkq7)   workflows del panel del equipo
├── PANEL/           (id tFtJ3Z5E321r5WGq)   LEGACY (magic-link inactivos + checkin)
├── MONITOREO/       (id 3Shmg8nHJZxSd2fW)   scaffolding (upload-conversions)
└── META/                                     legacy
```

### Workflows en `PAGINA` (14 activos)

| Workflow | ID | Endpoint | Función |
|---|---|---|---|
| exentia-reserva | vd8O2EZPPvsbxh99 | POST /webhook/exentia-reserva | Crea booking + upsert GHL + SMS cliente + SMS panel |
| exentia-cita-creada | PL1ctJNmbSDntZja | POST /webhook/envio-exentia | GHL appointment → link/create booking |
| exentia-page-agendar-cita | xsmXmlybLKYBdtiq | POST /webhook/exentia-page-agendar-cita | Agendar desde página con calendario propio |
| exentia-cancelar-cliente | TN4oYmN6m9Sy7ogz | POST /webhook/exentia-cancelar-cliente | 3 modos: lookup/preview/execute |
| exentia-cliente-google-login | JH3EAQODGxF9sUmm | POST /webhook/exentia-cliente-google-login | Login Google del cliente |
| exentia-cliente-otp-request | xmUOckEq3TwSad2T | POST /webhook/exentia-cliente-otp-request | Pedir OTP email o SMS |
| exentia-cliente-otp-verify | kGxqcdzK05kVSZz8 | POST /webhook/exentia-cliente-otp-verify | Verificar OTP y emitir JWT cliente |
| exentia-cliente-me | Rdqda9MHZM5iycOb | GET /webhook/exentia-cliente-me | Perfil + historial del cliente (JWT) |
| exentia-update-phone | JlOjz1C8nIt4WiYU | POST /webhook/exentia-update-phone | Actualiza phone/name del cliente + sync GHL |
| exentia-track | 7QeAEBaHQnXjE5ha | POST /webhook/exentia-track | Eventos tracker → `exentia.leads` |
| exentia-tag | xxtESeOjldPhtzsG | POST /webhook/exentia-tag | Add/remove tags GHL (whitelist) |
| exentia-pago | QX6woe7gvo2chF0y | POST /webhook/exentia-pago | Registrar pago + Meta CAPI + GHL Invoice |
| exentia-resena | SHqQWoav1TSSlJll | POST /webhook/exentia-resena | Reseña cliente |
| exentia-lead-claim | Hf4Ij8vs7lFbiGUN | POST /webhook/exentia-lead-claim | Lead claim (tracking) |
| exentia-prep-lookup | SCgQerewDfgaMh25 | GET /webhook/exentia-prep-lookup?prep=&lt;uuid&gt; | Contexto cita + prep actual + prev_prep (recurrentes) para `preparacion.html` |
| exentia-prep-save | f9NZza8sM0AUeH9J | POST /webhook/exentia-prep-save | Autosave paso 1..6 con whitelist de claves |
| exentia-prep-complete | 7Y9exy46FHtYKPBb | POST /webhook/exentia-prep-complete | Marca completado + anexa resumen a `notas_internas` + SMS a Avisos Panel + SMS al terapeuta si claimed. Idempotente. |

### Workflows en `ADMINISTRADOR` (14 activos)

| Workflow | ID | Endpoint | Función |
|---|---|---|---|
| exentia-panel-citas | 7w3fl6wLwpqo9XHW | GET /webhook/exentia-panel-citas | Pool + mias + busy para el masajista logueado |
| exentia-panel-claim | KvRk4NpuKGDmp5OM | POST /webhook/exentia-panel-claim | Tomar cita + crear GHL appointment + SMS cliente |
| exentia-panel-release | NPEVGpZMdYjqbi7w | POST /webhook/exentia-panel-release | Liberar cita propia (release_window 2h) |
| exentia-panel-cancel-booking | uUuISYN4XYUNq1VA | POST /webhook/exentia-panel-cancel-booking | Cancelar cita del panel |
| exentia-panel-cron-auto-revert | QFXdSkgBdNsgDNuT | Cron 5 min | Auto-revertir slots vencidos |
| exentia-panel-cron-assignment-reminders | qZXgrGsL9f2ZAUYs | Cron 1 min | **Modo prueba:** avisos de cita incompleta en minutos 1/2/3/4 y seguimiento final en minuto 5 |
| exentia-panel-google-login | 3wVDXYWvkekmNMs3 | POST /webhook/exentia-panel-google-login | Login masajista con Google (valida tag `masajista`) |
| exentia-panel-otp-request | H0hhad2yl3rgFKHE | POST /webhook/exentia-panel-otp-request | OTP email/SMS para masajista |
| exentia-panel-otp-verify | 7Ygec9aZG3UCvQSe | POST /webhook/exentia-panel-otp-verify | Verificar OTP y emitir JWT masajista |
| exentia-crear-cita-ghl | r1jbh5hwh0k9C8OG | POST /webhook/exentia-crear-cita-ghl | Llamado por panel-claim para crear GHL appointment |
| exentia-panel-admin-login | SRRtiQi4G2XP46A3 | POST /webhook/exentia-panel-admin-login | Valida password admin y emite JWT role:admin |
| exentia-panel-admin-citas | y2f87W8ZEU5Br8Qj | GET /webhook/exentia-panel-admin-citas | Devuelve todos los masajistas + slots (mosaico) |
| exentia-panel-view-as | c6mT2Db1lklvicwC | GET /webhook/exentia-panel-view-as?as=id | Datos de un masajista, formato panel-citas (readonly) |
| exentia-panel-admin-impersonate | tXKyDylvSkMPDitl | POST /webhook/exentia-panel-admin-impersonate | Admin obtiene JWT REAL de un masajista para operar como él (2h) |

### Workflows en `PANEL` (legacy, mayoría inactivos)
`exentia-checkin` (active), `exentia-auth-callback` (inactive), 8 copias de `exentia-panel-magic-link-{request,verify}` (todos inactivos). Se pueden borrar en cualquier momento.

### Workflows en `MONITOREO`
`exentia-upload-conversions` — scaffolding, no activo. Se activará en fase 3 con credenciales de Google Ads.

---

## 6. Base de datos Supabase — schema `exentia`

### Tablas principales
- **`bookings`** — reservas. Campos clave: `booking_code`, `ghl_contact_id`, `ghl_appointment_id`, `cliente_nombre`, `cliente_telefono`, `cliente_email`, `fecha_agendada`, `hora_agendada`, `duracion_total_min`, `modalidad` (individual/pareja/grupo/simultaneo/turnos/economica), `num_personas`, `num_terapeutas_estimado`, `personas_servicios` (jsonb), `servicios` (jsonb), `precio_total_mxn`, `valor_ticket_mxn`, `costo_traslado_total`, `direccion_libre`, `direccion_maps_url`, `zona_colonia`, `preferencia_sexo`, `notas_cliente`, `notas_internas`, `tipo_cita` (`sucursal`/`domicilio`/null), `estado_asignacion` (pool/claimed/cancelled/completed), `estado` (reservo/asistio/no_asistio/pagado/resenado), `cancel_token`, `prep_token` (uuid, default `gen_random_uuid()`, indexed), `atribucion` (jsonb), `lead_ref`.
- **`booking_slots`** — cupos por reserva (multi-cupo para grupos y pareja). Cada slot corresponde a UN masajista. Campos: `id`, `booking_id`, `slot_number`, `persona_label`, `servicios` (jsonb), `duracion_min`, `precio_mxn`, `hora_inicio`, `fecha`, `estado` (pool/claimed/release_window/confirmed/cancelled), `terapeuta_id`, `claimed_at`, `release_window_until`, `ghl_appointment_id`.
- **`booking_preparacion`** — 1:1 con `bookings` (PK = `booking_id`, ON DELETE CASCADE). Guarda las respuestas del formulario "Preparación de tu Experiencia" (accesos, estacionamiento, camillas, ambiente, receptor, observaciones) + `ultimo_paso`, `completado_at`. Todo el acceso va vía RPCs — NO expuesta por PostgREST.
- **`terapeutas`** — masajistas. Campos: `id`, `nombre`, `slug`, `sexo`, `email`, `ghl_contact_id`, `telefono`, `activo`, `foto_url`.
- **`cancelaciones`, `terapeuta_comisiones`, `claim_log`, `pagos`, `servicios`, `leads`**.

### Vistas públicas (accesibles vía PostgREST)
| Vista | Uso |
|---|---|
| `public.exentia_panel_pool_slots` | Slots en pool (para todas las masajistas) |
| `public.exentia_panel_mis_slots` | Slots asignados a un terapeuta_id |
| `public.exentia_panel_busy_slots` | Slots ocupados por OTROS masajistas |
| `public.exentia_slot_with_booking` | Slot + booking padre embebido (para panel-claim) |
| `public.exentia_terapeutas_panel` | Masajistas activos |
| `public.exentia_bookings_dash` | Bookings + totales de pagos (dashboard) |
| `public.exentia_pagos_dash` | Historial de pagos por cliente |

Todas incluyen la columna `tipo_cita`.

### RPCs (SECURITY DEFINER, callable desde `anon`)
- `exentia_ensure_terapeuta(p_contact_id, p_email, p_name)` — idempotente, devuelve o crea la fila del masajista.
- `exentia_claim_slot(p_slot_id, p_terapeuta_id)` — RPC atómica para tomar un slot (`claimed`/`already_claimed`/`time_conflict`).
- `exentia_release_slot(p_slot_id, p_terapeuta_id, p_motivo)` — libera un slot (queda en `release_window` 2h).
- `exentia_auto_revert_releases()` — cron; devuelve al pool los slots vencidos.
- `exentia_set_slot_appointment(p_slot_id, p_appointment_id)` — persiste ghl_appointment_id (usado por crear-cita-ghl).
- `exentia_registrar_pago(p_booking_id, p_monto, p_metodo, p_notas)`.
- `exentia_marcar_asistio(p_booking_id)`, `exentia_marcar_no_asistio(p_booking_id)`.
- `exentia_cliente_lookup_cancel(p_booking_code)`, `exentia_cliente_cancelacion_preview(...)`, `exentia_cliente_ejecutar_cancelacion(...)` — cancelación por el cliente.
- `exentia_prep_lookup(p_token)` — devuelve contexto de la cita + `prep` (fila actual, si existe) + `prev_prep` + `prev_prep_meta` (última preparación completada del mismo cliente por `ghl_contact_id` o teléfono, para pre-llenar recurrentes). Match de teléfono via helper `_exentia_phone_last` que quita prefijo mexicano (521/52) y compara últimos 10 dígitos.
- `exentia_prep_save(p_token, p_paso, p_data jsonb)` — UPSERT autosave por paso; solo actualiza las claves presentes en `p_data`. Devuelve `status: 'saved' | 'not_found' | 'already_completed'`.
- `exentia_prep_complete(p_token)` — idempotente. Marca `completado_at = now()`, construye resumen legible, reemplaza cualquier bloque previo "Preparación del servicio" en `notas_internas` (separador `\n\n--- Preparación del servicio ---\n`). Devuelve `resumen`, `booking_code`, `cliente_nombre`, fecha/hora y `terapeuta_telefono` (del primer slot claimed/confirmed con teléfono no vacío).
- `_exentia_phone_last(p_phone)` — helper IMMUTABLE: normaliza teléfono removiendo caracteres no dígitos, quita prefijo `521` o `52` si aplica, devuelve últimos 10 dígitos. Usado por `exentia_prep_lookup` para matching de cliente recurrente sin GHL contact id.

### Triggers
- `fn_autocreate_slots` (BEFORE INSERT en `bookings`) — crea booking_slots según modalidad y personas_servicios. Tiene fix defensivo para el caso `persona_id=0` en paquete pareja simultaneo.
- `fn_sync_booking_state` (AFTER UPDATE en `booking_slots`) — mantiene `bookings.estado_asignacion` derivado.
- `fn_auto_precio_total` (BEFORE INSERT en `bookings`) — extrae precio del slug si no viene `precio_mxn` como campo.

### Realtime
- Habilitado en `exentia.booking_slots` y `exentia.bookings`.
- Requiere `GRANT SELECT` a `anon` (ya aplicado).
- El panel HTML se suscribe con `debouncedRefresh(400ms)`.

### PostgREST — exposed schemas
Solo `public`, `graphql_public`, `soberanis`. El schema `exentia` **NO** está expuesto directamente. Todo va a través de las vistas `public.exentia_*` o RPCs.

---

## 7. Página pública — mapa de funciones críticas

Archivo: `exentia-pagina.html` (~17k líneas).

### Modales (`<div id="modal-...">`)
- `#modal-select` — selector de servicios (accordion por categoría)
- `#modal-form` — formulario pre-cita
- `#modal-choice` — checkout con resumen del carrito
- `#modal-calendar` — calendario propio con picker
- `#modal-agendar` — datos personales
- `#modal-place-first` — sucursal vs domicilio
- `#modal-modality` — individual / pareja / grupo
- `#modal-auth` — login (Google / OTP / invitado)
- `#modal-pago-simulador` — simulador Stripe (4 test cards)
- `#modal-group-summary` — resumen del grupo con edición inline
- `#modal-mis-citas` — historial del cliente logueado

### Funciones clave (líneas aproximadas)
- `openFormModal()`, `openAgendarModal()` — abren modales de datos
- `hydrateFormUserDataFromSession()` — pre-rellena datos del JWT cliente
- `submitAgendarForm()` — arma body del POST a `exentia-reserva`
- `submitCustomForm()` — envío legacy alternativo
- `_pgFormatTotal()`, `_pgSimulate()`, `_pgDispatchReserva()` — simulador Stripe
- `openMisCitasModal()` — modal Mis Citas
- `smartAgendar()` — CTA principal, decide flujo según sesión
- `canReservarNow()` — validaciones antes de permitir pagar
- OTP: `requestOTP`, `submitCode`, `requestOTPviaSMS`

### localStorage keys
- `exentia_cliente_jwt` — JWT cliente (30 días)
- `sj_user`, `_formUserData` — cache datos del form
- `ex_first_attr` — cookie atribución first-click (30 días)

### Reglas de UI heredadas
- Modales usan `display: none` (no opacity 0) por bug de GHL `form_embed.js`.
- Campos GHL nativos ocultos con `.form-field-container:not(:has(.exf))`.
- Cambio de dirección requiere Google Places para poblar `direccion_maps_url` con `place_id`.
- Al cambiar `tipo_cita = 'sucursal'`: limpiar state residual de domicilio (address, lat, lng, zona, costoTraslado). Defense-in-depth aplicado en `submitCustomForm` y `submitAgendarForm`.

### Cambios recientes de la página (2026-06-30)
Cambios en `exentia-pagina.html` **pendientes de commit + push**:
1. **OTP SMS fallback** — si el correo empresarial bloquea el código (Microsoft 365, etc.), el cliente puede pedirlo por SMS. Botón "Enviarme el código por SMS" abre input con `intl-tel-input`. Se guarda en `_authOtpState.phone` y se persiste en GHL después del verify.
2. **Sección "Mi perfil" editable** — botón "Editar mis datos" convierte "Mis datos" en formulario editable (nombre + WhatsApp). Guardar dispara `PUT` a GHL vía `exentia-update-phone`. Al abrir el modal se refresca el profile desde `/webhook/exentia-cliente-me`.
3. **Fix modalidad warning** — la validación "elige modalidad" solo cuenta personas con items reales en el cart (antes contaba `currentPersonaId` aunque estuviera vacío).
4. **Fix OTP verify** — `Preparar OTP JWT` ahora lee `$('Generar código').item.json` (antes leía del HMAC node y perdía campos).

Workflows n8n modificados hoy y ya reactivos en producción:
- `exentia-cliente-otp-request` — agregada rama SMS (3 nodos + propagación via/phone)
- `exentia-cliente-otp-verify` — fix `signInput` + upgrade silencioso de nodos legacy
- `exentia-update-phone` — body dinámico acepta `phone`/`firstName`/`lastName`

Backups locales de los JSON: `/tmp/wf-otp-cliente-bak.json`, `/tmp/wf-verify-cliente-bak.json`, `/tmp/wf-updphone-bak.json`.

---

## 8. Panel del equipo — mapa de funciones críticas

Archivo: `panel/web/index.html` (~3.3k líneas).

### Vistas (`<div id="view-...">`)
- `#view-login` — login (email + OTP, Google, o password admin oculto)
- `#view-panel` — vista principal del masajista (calendario semanal + toolbar)
- `#view-admin` — mosaico de todos los masajistas (existe pero oculto en el flujo actual)

### Estados globales
- `calState` — state del calendario masajista (payload, bookingsById, weekStart, subscripción realtime)
- `adminState` — state del mosaico admin
- `viewAsState` — flag de impersonación (queda `false` en el flujo actual porque admin va directo a Calendario Dos sin pasar por la vista mosaico)

### Constantes clave
- `AUTH_ENDPOINT`, `OTP_REQUEST_ENDPOINT`, `OTP_VERIFY_ENDPOINT`
- `ADMIN_LOGIN_ENDPOINT`, `ADMIN_CITAS_ENDPOINT`, `ADMIN_IMPERSONATE_ENDPOINT`
- `CITAS_ENDPOINT`, `CLAIM_ENDPOINT`, `RELEASE_ENDPOINT`
- `SUPABASE_URL`, `SUPABASE_ANON_KEY`
- `ADMIN_VIEW_AS_ALLOWLIST` — array de masajistas que el admin puede impersonar. **Solo Calendario Dos** en el estado actual.

### Flujo del admin (producción actual)
1. Usuario escribe `ExentiaMasajista` en el input de email.
2. `handleEmailSubmit` detecta el username y muestra `#admin-password-form`.
3. `submitAdminPassword()`:
   - POST a `ADMIN_LOGIN_ENDPOINT` → recibe JWT admin.
   - POST a `ADMIN_IMPERSONATE_ENDPOINT` con `terapeuta_id` del `ADMIN_VIEW_AS_ALLOWLIST[0]` → recibe JWT masajista de Calendario Dos.
   - Guarda el JWT masajista en `localStorage[exentia_panel_jwt]`.
   - Llama `init()` que ve el JWT masajista y va a `showPanel()`.
4. El admin opera como Calendario Dos con acceso completo (tomar, cancelar, ver Realtime).

### Flujo del masajista normal
1. Usuario escribe su correo → OTP por correo (o SMS de fallback).
2. Verifica el código → `submitCode` → JWT masajista (contactId de GHL, role:masajista, tags:['masajista'], exp 30 días).
3. `init()` valida el JWT y llama `showPanel(payload)`.
4. `fetchCitas()` → GET `/webhook/exentia-panel-citas` con Bearer → renderiza calendar.

---

## 9. Endpoints públicos que consume el frontend

### Página pública (`exentia-pagina.html`)
- `POST /webhook/exentia-track` — eventos de tracking
- `POST /webhook/exentia-reserva` — crear booking
- `POST /webhook/exentia-cliente-google-login` — login Google del cliente
- `POST /webhook/exentia-cliente-otp-request` — pedir OTP
- `POST /webhook/exentia-cliente-otp-verify` — verificar OTP
- `GET  /webhook/exentia-cliente-me` (Bearer JWT) — perfil + historial
- `POST /webhook/exentia-update-phone` — actualizar phone/name
- `POST /webhook/exentia-cancelar-cliente` — cancelar cita (3 modos)

### Panel (`panel/web/index.html`)
- `POST /webhook/exentia-panel-google-login` — login masajista
- `POST /webhook/exentia-panel-otp-request` / `-otp-verify`
- `GET  /webhook/exentia-panel-citas` (Bearer JWT)
- `POST /webhook/exentia-panel-claim` (Bearer JWT)
- `POST /webhook/exentia-panel-release` (Bearer JWT)
- `POST /webhook/exentia-panel-cancel-booking` (Bearer JWT)
- `POST /webhook/exentia-panel-admin-login` — password admin → JWT admin
- `POST /webhook/exentia-panel-admin-impersonate` (Bearer admin JWT)

---

## 10. Herramientas locales requeridas

### CLIs
- **`gh`** — GitHub CLI. Necesario para pushear al repo `exentia-panel` sin clon. Autenticar con `gh auth login`.
- **`git`** — para el repo `exentia-spa`.
- **`curl`, `jq`, `base64`** — utilidades estándar.
- **Python 3.10+** con la venv del proyecto graphify si vas a correr scripts del skill `nota`. El intérprete se guarda en `/Users/victorisairodriguezpoot/Documents/Notas/notas/graphify-out/.graphify_python`.

### n8n CLI wrapper (opcional)
- Binario en `~/.local/bin/n8n`, config en `~/.n8n-cli/config`.
- Uso: `n8n workflows list`, `n8n executions errors 10`, `n8n raw GET /rest/projects`.
- Bug conocido: relogin automático depende de código 401 explícito; si el server responde `Unauthorized` sin código, forzar login inicial con `curl` (ver CLAUDE.md raíz del workspace).

### Editor
- Cualquiera que abra HTML de 17k líneas sin morir (VS Code funciona).

---

## 11. Conectores MCP usados

Estos MCP están conectados en el entorno del usuario (Claude Code). Un agente externo (Codex u otro) probablemente NO los tenga y deberá usar equivalentes.

| Conector MCP | Uso | Equivalente sin MCP |
|---|---|---|
| Supabase MCP (`mcp__04f1c2da-...__execute_sql`) | SQL directo contra el project | Supabase Studio SQL Editor, o `curl POST /rest/v1/rpc/*` con anon key |
| `mcp__Claude_in_Chrome__*` | Debug UI en vivo | Chrome DevTools manual, o Playwright |
| `mcp__Claude_Preview__*` | Preview interactivo | Preview local con dev server |

**MCPs que requieren OAuth y NO están autenticados** (no relevantes para Exentia, ignorar):
`mercadopago`, `plugin:data:*`, `plugin:engineering:*`, `plugin:marketing:*`, `plugin:product-management:*`, `plugin:productivity:*`.

**Regla dura para GHL en Exentia:** NO usar `mcp__ghl-ainnovacion__*` ni `mcp__ghl-bmr__*` ni `mcp__ghl-sarahi__*` porque esos MCPs usan credenciales de otras subcuentas. Para Exentia siempre `curl` directo con la API key `pit-67d64213-09c5-433f-aa22-d16615ce2758`.

---

## 12. Skills usados (Claude Code)

Ubicación local: `~/.claude/skills/`. Cada uno tiene su `SKILL.md` con instrucciones.

| Skill | Uso | Archivo |
|---|---|---|
| `nota` | Persistir sesión de trabajo a Obsidian + Graphify | `~/.claude/skills/nota/SKILL.md` |
| `graphify` | Construir/actualizar el grafo del vault | `~/.claude/skills/graphify/SKILL.md` |
| `mensaje` | Redactar a clientes en el estilo de Luis Acosta (CEO Ainnovation) | `~/.claude/skills/mensaje/SKILL.md` + `PLAYBOOK.md` |
| `anthropic-skills:n8n-expert` | Buenas prácticas n8n (nodos, expresiones, error handling) | plugin path |
| `iframe-page` | Páginas iframe embebidas en GHL Custom Code | `~/.claude/skills/iframe-page/SKILL.md` |
| `dashboard-pipeline` | Pipeline de datos para dashboards iframe (n8n → Supabase → HTML) | `~/.claude/skills/dashboard-pipeline/SKILL.md` |

**El skill `mensaje` es crítico para toda comunicación con Yaz.** Reglas duras que **no son negociables**:
- Cero em-dashes (—). Sustituir por coma, dos puntos, o reescribir.
- Plural empresa ("nosotros", "el equipo"), nunca "yo".
- Plazo explícito en cada mensaje que pide o promete algo.
- Saludo con nombre + cierre cálido sin emojis.
- Nunca decir "yo voy a...", siempre "el equipo lo revisa..."
- **Sin la palabra "ya" como muletilla** ("ya está listo" → "quedó listo"). Regla adicional del proyecto Exentia por preferencia de Victor.
- Sin "le comento" / "le comentamos".

Si vas a redactar un mensaje a Yaz, léelo antes de enviar y valida contra estas reglas.

---

## 13. Cómo hacer cambios en producción (playbook)

### Cambio en la página pública (`exentia-pagina.html`)
```bash
cd "/Users/victorisairodriguezpoot/Desktop/claude code/promt/exentia"
# ... editar ...
git add exentia-pagina.html
git commit -m "feat: descripción corta"
git push origin main
```
GitHub Pages propaga en ~1 min. Hard refresh del cliente (Cmd+Shift+R) para invalidar cache.

### Cambio en el panel (`panel/web/index.html`)
No hay clon local del repo `exentia-panel`. Se pushea con `gh api`:
```bash
cd "/Users/victorisairodriguezpoot/Desktop/claude code/promt/exentia/panel/web"
SHA=$(gh api repos/0VictorRodriguez0/exentia-panel/contents/index.html --jq '.sha')
B64=$(base64 -i index.html)
cat > /tmp/payload.json <<EOF
{
  "message": "descripción del cambio",
  "content": "$B64",
  "sha": "$SHA",
  "branch": "main"
}
EOF
gh api repos/0VictorRodriguez0/exentia-panel/contents/index.html \
  --method PUT --input /tmp/payload.json --jq '.commit.html_url'
```

### Cambio en un workflow n8n
```bash
URL="https://n8n-ntcue-clone-u59578.vm.elestio.app"
COOKIE="/tmp/n8n_cookies.txt"
# 1) Login (guardar cookie)
curl -s -c "$COOKIE" -X POST "$URL/rest/login" \
  -H 'Content-Type: application/json' \
  --data-raw '{"emailOrLdapLoginId":"henry.lopez@ainnovation.com.mx","password":"Ainnovation2026@"}'
# 2) GET workflow
curl -s -b "$COOKIE" "$URL/rest/workflows/{WORKFLOW_ID}" > /tmp/wf.json
# 3) Editar el JSON (Python / jq) → /tmp/wf_patched.json con solo name/nodes/connections/settings
# 4) PATCH
curl -s -b "$COOKIE" -X PATCH "$URL/rest/workflows/{WORKFLOW_ID}" \
  -H 'Content-Type: application/json' --data @/tmp/wf_patched.json
# 5) Refrescar trigger (deactivate + activate)
curl -s -b "$COOKIE" -X POST "$URL/rest/workflows/{ID}/deactivate"
VER=$(curl -s -b "$COOKIE" "$URL/rest/workflows/{ID}" | jq -r '.data.versionId')
curl -s -b "$COOKIE" -X POST "$URL/rest/workflows/{ID}/activate" \
  -H 'Content-Type: application/json' -d "{\"versionId\":\"$VER\"}"
```

### Cambio de schema Supabase
1. Aplicar SQL con `execute_sql` (Supabase MCP) o Studio SQL Editor.
2. Si creas una tabla en `exentia`, **también crea una vista** `public.exentia_<nombre>` para exponerla.
3. `GRANT SELECT ON public.exentia_<nombre> TO anon, authenticated, service_role;`
4. `NOTIFY pgrst, 'reload schema';`
5. `CREATE OR REPLACE VIEW` **no permite reordenar columnas**. Si agregas una en posición intermedia, `DROP VIEW CASCADE` + `CREATE VIEW`.

### Anuncio a Yaz / cliente
Usar el skill `mensaje` (o replicar sus reglas). NUNCA usar el skill `anuncio` porque tiene reglas distintas.

---

## 14. Bugs conocidos y anti-patrones

### GHL upsert con tags no persiste inmediato
- `POST /contacts/upsert` con `tags:[...]` responde 200 con el body correcto **antes** de persistir. La búsqueda posterior puede devolver el estado viejo por ~30-60 s.
- **Fix:** para agregar tags de forma atómica usar `POST /contacts/{id}/tags` con `{tags:[...]}`.
- Se manifestó en el bug del login del masajista Victor: el panel rechazó el acceso porque `/search` devolvía el estado viejo sin el tag `masajista`.

### Frontend cart vacío antes del simulador
- `window.cart` puede quedar vacío justo antes de `_pgSimulate` aunque el resumen mostró servicios.
- `submitAgendarForm` construye `servicios` desde `personasMeta + getItemsForPersona(pid)`, no desde `cart`.

### PostgREST: tablas de `exentia` no expuestas
- `GET /rest/v1/<tabla_del_schema_exentia>` devuelve 406 PGRST106.
- **Siempre** usar vistas en `public` con prefijo `exentia_*`.

### Trigger `fn_autocreate_slots` — caso paquete pareja
- Si `personas_servicios` viene con un solo elemento `persona_id=0` y `num_personas>1`, el trigger duplica el bloque para las N personas manteniendo los mismos servicios.

### Bug del frontend `tipo_cita`
- El toggle sucursal/domicilio del modal-place-first puede mandar `tipo_cita: 'sucursal'` aunque el usuario elija domicilio (residuo del leak de campos).
- El backend normaliza y persiste literal lo que llega.
- **Pendiente auditar en `exentia-pagina.html`** por qué el toggle envía sucursal cuando el usuario eligió domicilio.

### GHL Placeholders snake_case
- El workflow "Appointment Created" de GHL debe usar `{{appointment.start_time}}`, no `{{appointment.startTime}}`. Con camelCase los campos llegan vacíos.

### GHL form quirks (página pública)
- Campos nativos se ocultan con CSS.
- El botón submit es `button.button-element`.
- `form_embed.js` aplica `pointer-events: auto` a los iframes → modales usan `display: none`, no `opacity: 0`.

---

## 15. Flujo de vida de una cita (referencia)

```
1. Cliente entra a exentia-pagina.html
2. Elige servicios → cart local
3. Login (Google / OTP) o sigue como invitado
4. modal-choice (checkout)
5. modal-calendar (elige fecha/hora)
6. modal-form / modal-agendar (datos)
7. modal-pago-simulador (Stripe test)
8. "Simular pago" → _pgDispatchReserva → POST /webhook/exentia-reserva
   ↓
   n8n exentia-reserva:
   - Normalize (extrae tipo_cita, servicios, etc.)
   - Upsert Contact GHL (crea/actualiza + custom fields + tags)
   - INSERT exentia.bookings (trigger crea slots + calcula precio)
   - SMS al cliente
   - SMS al panel "Avisos Panel" con tag [DOMICILIO]/[SUCURSAL]
   ↓
9. La cita aparece en el pool → todas las masajistas la ven al abrir su panel
10. Masajista toma cita → POST /webhook/exentia-panel-claim
    ↓
    n8n panel-claim:
    - Verifica JWT
    - RPC exentia_claim_slot (atómico)
    - Get slot+booking (vista exentia_slot_with_booking)
    - Llama exentia-crear-cita-ghl → POST GHL appointment
    - RPC exentia_set_slot_appointment persiste ghl_appointment_id
    - SMS al cliente confirmando quién atiende
    ↓
11. Realtime propaga el cambio a las otras masajistas (pool → busy)
12. Cron de asignación revisa los cupos de cada cita nueva:
    - **Modo prueba temporal:** si faltan cupos, avisa al grupo operativo en los minutos 1, 2, 3 y 4
    - Cada etapa se registra en `exentia.booking_assignment_notifications` para evitar duplicados
    - Cuando `cupos_tomados >= cupos_total`, deja de enviar avisos
    - En el minuto 5 desde la creación, si sigue incompleta, pide contactar al cliente
    - Canal GHL: contacto `l3XxNhQvAK7eWxFJcTGj` (`+52 1 998 346 3802`, tag `panel-notificaciones`)
13. Día de la cita: masajista marca "asistió" desde dashboard o app GHL
14. Cliente puede cancelar hasta 2h antes desde Mi Cuenta o link de cancelación
15. Post-cita: registro de pago → GHL Invoice + Meta CAPI
```

---

## 16. Notas de Obsidian (contexto adicional)

Vault local del usuario: `/Users/victorisairodriguezpoot/Documents/Notas/notas/AInnovation/`. Contiene notas atómicas con contexto profundo. Las más relevantes para este proyecto:

- `Clientes/Exentia Spa.md` — hub con bitácora cronológica
- `Tecnico/Exentia - Mapa de exentia-pagina.html.md`
- `Tecnico/Exentia - Panel masajistas n8n workflows.md`
- `Tecnico/Exentia - Vista exentia_slot_with_booking.md`
- `Tecnico/Exentia - Trigger fn_auto_precio_total.md`
- `Tecnico/Exentia - Trigger fn_sync_booking_state.md`
- `Tecnico/Exentia - tipo_cita end-to-end persistencia.md`
- `Tecnico/Exentia - n8n folders ADMINISTRADOR.md`
- `Tecnico/Exentia - Panel masajistas Supabase schema.md`
- `Tecnico/Exentia - Workflow crear cita GHL con calendar picker.md`
- `Tecnico/Exentia - OTP cliente rama SMS via Avisos Panel.md`
- `Lecciones/GHL upsert con tags - 200 OK no garantiza persistencia inmediata.md`
- `Lecciones/Postgres CREATE OR REPLACE VIEW no permite reordenar columnas.md`
- `Lecciones/PostgREST - tablas en schema exentia no expuestas usar vistas en public.md`
- `Lecciones/n8n HMAC mismatch entre request y verify.md`
- `Lecciones/n8n typeVersion mismatch tumba activate.md`
- `Lecciones/GHL PUT contact phone falla por duplicate.md`

En un entorno donde Obsidian no está disponible, este AGENTS.md concentra lo esencial.

---

## 17. Pendientes conocidos (roadmap)

**En producción (2026-07-03):**
- **Preparación de tu Experiencia** — mini-formulario post-pago (`preparacion.html`) para citas a domicilio, con pre-llenado para clientes recurrentes. Pipeline BD (`booking_preparacion` + 3 RPCs) + 3 workflows n8n (`exentia-prep-lookup`, `-save`, `-complete`) + integración en `exentia-reserva` (SMS al cliente lleva link solo en domicilio, respuesta incluye `prep_token`+`tipo_cita`) + botón "Preparar mi experiencia" en el modal de éxito de pago (`exentia-pagina.html`).

**Inmediato:**
- **Fix del toggle sucursal/domicilio** en la página cuando el usuario elige domicilio.
- **Custom field GHL `exentia_es_recurrente`** tiene mojibake en label "Si" (cosmético, 30 s en la UI).
- **Simplificar fallback** `b.tipo_cita || (b.direccion_libre ? 'domicilio' : 'sucursal')` en `exentia-pagina.html` líneas ~13743 y ~17101 → quedarse solo con `b.tipo_cita || 'sucursal'`.
- **Recordatorio automático** para clientes que no completaron `preparacion.html` (candidato fase 2: cron revisa `completado_at IS NULL` con cita próxima).
- **Sincronizar respuestas de preparación a custom fields GHL** (fase 2 si Yaz lo pide — hoy vive solo en `notas_internas` + SMS al equipo).

**Yaz:**
- Confirmar servicios reales a domicilio (renombrar tags `gen_servicio_*` → finales).
- Whitelist de zonas Cancún cubiertas a domicilio.
- Teléfono real de Yaz para el wa.me del workflow `exentia-reserva`.
- Precios + duración por servicio → seed en `exentia.servicios`.

**Fase 2 (Henry + Jocelyn):**
- Meta Pixel + CAPI con scopes `ads_management + ads_read + business_management` (nunca `read_ads_dataset_quality`).
- Activar workflow `exentia-pago` para closed-loop.

**Fase 3 (Henry + ex-Carem):**
- Google Ads sub-cuenta bajo MCC `876-257-5839` + conversion actions.
- Customer ID + OAuth + developer-token al workflow `exentia-upload-conversions`.

**Panel del equipo:**
- Escalar `ADMIN_VIEW_AS_ALLOWLIST` en `panel/web/index.html` cuando Yaz quiera ver más masajistas.
- Volver a mostrar el dropdown "Ver como" si se activa la lista.
- Cleanup: borrar workflows magic-link inactivos de `PANEL/`.

---

## 18. Checklist antes de tocar producción

- [ ] ¿El cambio está probado localmente / en el simulador?
- [ ] ¿Actualicé este AGENTS.md si creé workflows/tablas/vistas nuevas?
- [ ] Si toqué un workflow n8n: ¿está reactivado (deactivate + activate)?
- [ ] Si toqué el schema Supabase: ¿corrí `NOTIFY pgrst, 'reload schema'`?
- [ ] Si toqué el panel: ¿pushé a `exentia-panel` con `gh api`?
- [ ] Si toqué la página: ¿pushé a `exentia-spa` con git?
- [ ] Si es cambio visible: ¿confirmé hard refresh (Cmd+Shift+R) en el navegador?
- [ ] Si es cambio con impacto en Yaz: ¿preparé mensaje siguiendo las reglas del skill `mensaje`?

---

## 19. Contacto interno

- **Ainnovation (agencia):** Luis Acosta (CEO), Henry López (ejecución), Victor Rodriguez (desarrollo).
- **Exentia:** Yaz (dueña / product owner).
- Grupo WhatsApp "Soporte" para comunicación operativa con Yaz.

**Este documento debe actualizarse** cuando se agreguen workflows nuevos, se modifiquen credenciales o cambie la arquitectura. Es el punto de entrada para retomar el proyecto sin depender de una sesión previa de Claude/Codex.

---

Fin del documento. Si algo aquí no coincide con lo que ves en producción, confía en producción y actualiza este archivo.
