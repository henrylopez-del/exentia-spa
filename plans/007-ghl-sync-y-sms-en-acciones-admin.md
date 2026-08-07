# Plan 007: Sincronizar GHL y avisar por SMS al reagendar/eliminar desde admin

> **Executor instructions**: Sigue este plan paso a paso. Corre cada
> verificación antes del siguiente paso. Ante cualquier "STOP condition",
> detente y reporta. Al terminar, actualiza tu fila en `plans/README.md`.
>
> **Drift check**: superficie = workflow n8n `exentia-panel-admin-actions`
> (id `7g9FqP3KaV18Mj6v`). Baja el JSON y confirma los excerpts antes de
> editar. El HTML NO se toca en este plan.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: MED (toca acciones destructivas en producción)
- **Depends on**: 001 (para poder disparar las acciones desde el tab Citas al probar)
- **Category**: bug / gap
- **Planned at**: commit `55d5cd0`, 2026-07-07

## Why this matters

Cuando el admin reagenda o elimina una cita desde el panel, el cambio solo
ocurre en Supabase. El appointment del calendario GHL queda con la fecha vieja
(o vivo tras un delete), y las masajistas asignadas no se enteran. Los RPCs ya
devuelven todo lo necesario (`ghl_appointments`, `terapeutas_afectadas`) — el
workflow simplemente lo tira. Consecuencia operativa: doble agenda y masajistas
presentándose a citas movidas o borradas.

## Current state

**Workflow `exentia-panel-admin-actions`** (id `7g9FqP3KaV18Mj6v`, activo,
folder ADMINISTRADOR). Cadena actual:

```
Webhook (POST exentia-panel-admin-actions)
 → Parsear request (code: extrae JWT + body; params = body)
 → Recomputar firma (crypto HMAC-SHA256)
 → Verificar JWT admin (code: firma+exp+role, whitelist de actions)
 → ¿JWT válido? → (true) Switch action → [RPC cancel | RPC delete |
     RPC reschedule booking | RPC reschedule slot | RPC upsert terapeuta]
     → Respond 200   ← TODAS las ramas van directo aquí
   → (false) Respond 401
```

Los nodos RPC postean a `https://fneppfjeywhayknrgahe.supabase.co/rest/v1/rpc/<fn>`
con headers apikey/Authorization ya configurados. Ejemplos de body:

```
RPC delete:              {p_booking_id: $json.params.booking_id}
RPC reschedule booking:  {p_booking_id: ..., p_fecha: ..., p_hora: ...}
RPC reschedule slot:     {p_slot_id: ..., p_fecha: ..., p_hora: ...}
```

**Qué devuelven los RPCs** (verificar con `SELECT pg_get_functiondef(oid)` para
cada uno antes de cablear — los shapes esperados según su diseño):

- `exentia_admin_cancel_booking` → jsonb con `ghl_appointments` (array de IDs)
  y `terapeutas_afectadas`
- `exentia_admin_delete_booking` → jsonb con `status` y (verificar) los
  appointment IDs recolectados antes del delete
- `exentia_admin_reschedule_booking` → jsonb con lista de
  `{slot_id, terapeuta_id, ghl_appointment_id}` para sync
- `exentia_admin_reschedule_slot` → jsonb con el slot movido (o
  `{status:'overlap'}` / `{status:'not_found'}`)

**Patrones GHL ya usados en este proyecto** (mismos headers:
`Authorization: Bearer <API key GHL Exentia — está en el nodo "Enviar SMS" del
workflow exentia-panel-admin-create-cita>`, `Version: 2021-07-28`):

- Borrar appointment: `DELETE https://services.leadconnectorhq.com/calendars/events/{appointmentId}`
  (patrón existente en el workflow `exentia-cancelar-cliente`)
- Reagendar appointment: `PUT https://services.leadconnectorhq.com/calendars/events/appointments/{appointmentId}`
  con body `{startTime, endTime}` en ISO con offset Cancún `-05:00`
  (patrón existente en `exentia-crear-cita-ghl`, que soporta update con
  `existing_appointment_id` — revisa ese workflow como referencia)
- SMS al grupo Avisos Panel: POST
  `https://services.leadconnectorhq.com/conversations/messages` con
  `{type:'SMS', contactId:'l3XxNhQvAK7eWxFJcTGj', message:'...'}`

**Reglas de copy del proyecto**: SMS sin emojis, lenguaje natural
("La cita de las 2:00 pm del jue 10 jul se movió al vie 11 jul 3:00 pm").

**Edición de workflows**: bloque §E del plan 003 (PATCH + deactivate/activate).

## Scope

**In scope**:
- Workflow `exentia-panel-admin-actions` — agregar nodos post-RPC
- (Solo si falta) ajustar los RPCs para que devuelvan los `ghl_appointment_id`
  necesarios — verificar primero

**Out de scope**:
- El HTML del panel (los botones ya postean bien)
- `upsert_terapeuta` (no tiene side-effects GHL)
- SMS al cliente final (solo grupo interno en este plan; cliente = decisión de
  producto pendiente con Yaz)

## Git workflow

- Solo workflow n8n; sin commits de código. Si tocas RPCs, migration
  `admin_actions_return_ghl_ids`.

## Steps

### Step 1: Verificar los returns reales de los 4 RPCs

`SELECT proname, pg_get_functiondef(oid) FROM pg_proc WHERE proname IN
('exentia_admin_cancel_booking','exentia_admin_delete_booking',
'exentia_admin_reschedule_booking','exentia_admin_reschedule_slot');`

Confirma que cada uno devuelve los `ghl_appointment_id` afectados y, en los
reschedule, la nueva fecha/hora y `duracion_min` del slot (necesaria para el
`endTime`). Si el delete NO devuelve los appointment IDs (los borra antes de
reportarlos), modifícalo para recolectarlos en un array ANTES del DELETE y
devolverlos en el jsonb.

**Verify**: pega en el reporte el shape jsonb de cada RPC.

### Step 2: Rama post-reschedule (booking y slot)

Después de `RPC reschedule booking` y `RPC reschedule slot` (ambas pueden
converger en el mismo sub-flujo), inserta:

1. **`Preparar sync GHL`** (Code): del jsonb del RPC extrae
   `[{ghl_appointment_id, fecha, hora, duracion_min}]`; construye para cada uno
   `startTime = fecha + 'T' + hora + '-05:00'` y
   `endTime = startTime + duracion_min` (formatea ISO). Devuelve un item por
   appointment (o `_skip: true` si no hay ninguno).
2. **`PUT appointment GHL`** (HTTP, `onError: continueRegularOutput`):
   PUT al endpoint de appointments con `{startTime, endTime}`.
3. **`SMS aviso grupo`** (HTTP): mensaje tipo
   `"Cita reagendada · {booking_code} · ahora {fecha legible} {hora 12h} · {cliente}"`.
4. Converge a `Respond 200` (la respuesta al panel no cambia de shape:
   sigue siendo `{ok:true, action, result}` — usa un Code final si hace falta
   restaurar `$('RPC reschedule booking').item.json` como `result`).

**Verify**: reagendar una cita de prueba (crearla con el flujo del plan 003
paso 7 o desde la página) que tenga `ghl_appointment_id`; confirmar en GHL que
el appointment se movió y que llegó el SMS al grupo.

### Step 3: Rama post-delete/cancel

Tras `RPC delete` (y `RPC cancel`): nodo Code que emita un item por
`ghl_appointment_id` → **`DELETE appointment GHL`** (HTTP DELETE,
`onError: continueRegularOutput` — el appointment puede ya no existir) → SMS
al grupo `"Cita eliminada por administración · {booking_code} · {fecha} {hora} · {cliente}"`
→ Respond 200.

**Verify**: eliminar una cita de prueba con appointment → desaparece del
calendario GHL; el panel recibe `{ok:true}` y el SMS llega.

### Step 4: Probar que las acciones sin side-effects siguen igual

`upsert_terapeuta` y los reschedule de citas SIN `ghl_appointment_id` deben
seguir respondiendo `{ok:true,...}` sin tocar GHL (los nodos con `_skip`
pasan derecho).

**Verify**: upsert de una terapeuta de prueba responde ok; reagendar una cita
sin appointment no genera llamadas GHL (revisar ejecución en n8n:
`n8n executions list 5`).

## Test plan

E2E de los pasos 2-4 con citas de prueba (crear → reagendar → eliminar),
verificación en GHL UI o vía API
(`GET /calendars/events/appointments/{id}` → 404 tras delete), y limpieza de
datos de prueba al final.

## Done criteria

- [ ] Reagendado mueve el appointment GHL (start/end correctos, offset -05:00)
- [ ] Delete/cancel borra el/los appointments GHL
- [ ] SMS de aviso llegan al grupo (sin emojis)
- [ ] `{ok:true, action, result}` intacto para el frontend en todas las ramas
- [ ] Ejecuciones n8n sin nodos en rojo (`n8n executions errors 5` limpio)
- [ ] Fila actualizada en `plans/README.md`

## STOP conditions

- Los RPCs no devuelven los appointment IDs y modificarlos requiere tocar
  lógica de slots que no entiendes con certeza — reporta con el functiondef.
- El PUT de GHL devuelve 4xx persistente (formato de fecha o permisos del
  API key) — prueba el mismo PUT a mano con curl y reporta el body exacto.
- Cualquier prueba tendría que correr contra citas REALES de clientes — usa
  solo citas de prueba creadas por ti.

## Maintenance notes

- Cuando se decida avisar también al cliente final, agregar la rama aquí
  (upsert contact + SMS), con checkbox en el modal de reagendar (el frontend ya
  tiene el patrón del checkbox en Crear cita).
- Si el panel gana "cancelar" como acción visible (hoy solo eliminar), la rama
  del paso 3 ya la cubre (`RPC cancel`).
