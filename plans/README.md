# Implementation Plans — Panel Admin Exentia

Generados por el skill improve el 2026-07-07 (auditoría del modo administrador
de `panel/web/index.html` + workflows n8n + RPCs Supabase, a petición de
Victor). Ejecutar en el orden de abajo salvo que las dependencias digan otra
cosa. Cada executor: lee el plan completo antes de empezar, respeta sus STOP
conditions y actualiza tu fila al terminar.

Contexto de deploy: el HTML vive en el working tree de este repo
(`panel/web/index.html`, sin commitear) y se publica al repo separado
`0VictorRodriguez0/exentia-panel` vía `gh api ... contents/index.html PUT`
(bloque completo en el plan 001). Los workflows n8n se editan por REST con la
cookie de `~/.n8n-cli/` (bloque en el plan 003 §E). SQL vía MCP Supabase,
proyecto `fneppfjeywhayknrgahe`.

## Execution order & status

| Plan | Title | Priority | Effort | Depends on | Status |
|------|-------|----------|--------|------------|--------|
| 001 | Tab Citas abre el modal de detalle (hoy muerto) | P1 | S | — | DONE |
| 002 | Claves de datos del Resumen (ventas $0, listas en 0) | P1 | S | — | DONE |
| 003 | Contrato de Crear cita (personas/asignar/notificar/tipo_cita) | P1 | L | — | DONE (multi-slot claim = solo primer cupo, deferred) |
| 004 | Vistas con PII fuera de la anon key | P1 | M | — | DONE |
| 005 | Popup de productos: duraciones reales + variantes de precio | P2 | M | 003 | DONE |
| 006 | Dropdowns de masajista vacíos por carrera de carga | P2 | S | — | DONE |
| 007 | Sync GHL + SMS al reagendar/eliminar | P2 | M | 001 | DONE |

Status values: TODO | IN PROGRESS | DONE | BLOCKED (con razón) | REJECTED (con rationale)

## Dependency notes

- 005 depende de 003 porque ambos editan `submitCrearCita` y el shape del cart;
  003 primero evita conflictos.
- 007 depende de 001 porque las pruebas E2E de reagendar/eliminar se disparan
  desde el tab Citas, que hoy no abre el modal.
- 001, 002, 004, 005 y 006 tocan el MISMO archivo `panel/web/index.html` — si
  se ejecutan en paralelo habrá conflictos; recomendado en serie, deployando
  después de cada uno.
- Dentro de 004 el orden interno es crítico: primero el workflow puente y el
  frontend, DESPUÉS el REVOKE (si no, se rompen los tabs en producción).

## Findings considered and rejected

- **`onclick` con JSON.stringify en atributos single-quote** (renderCatalog,
  renderCitasTable): riesgo real solo si un nombre de servicio/uuid trae
  comilla simple — hoy no ocurre con datos propios. No vale un plan; se
  corrige de paso si 005 reescribe esas cards.
- **Cap de 60 items en el catálogo y 500 filas en Citas sin aviso**: volúmenes
  actuales (82 servicios, 13 citas) están lejos del cap. Anotar, no actuar.
- **"Citas este mes" del tab Masajistas cuenta solo slots claimed presentes en
  `adminState.data.mias`**: aproximación aceptable para un contador informativo.
- **SMS de "cita en pool" del create aún trae emoji 🆕** (regla del proyecto:
  sin emojis): cosmético; corregirlo dentro del paso 5 del plan 003 si se pasa
  por ese nodo, no como plan aparte.
- **`exentia_admin_stats` filtro `p_terapeuta`**: no se verificó que filtre de
  verdad; el plan 002 incluye la verificación como paso — si no filtra, abrir
  hallazgo nuevo.

## Alcance de la auditoría

Auditado: modo admin del panel (5 tabs), workflows `exentia-panel-admin-*`
(login, citas, stats, actions, create-cita), RPCs y vistas Supabase que esos
flujos consumen, y el contrato del RPC compartido `exentia_agendar_cita_pool`.
NO auditado: flujo masajista del panel (claim/release/slot-status), página
pública `exentia-pagina.html`, dashboard de monitoreo GHL, y el resto de
workflows de tracking/reserva.
