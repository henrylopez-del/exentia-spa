# Plan 003: Reparar el contrato de datos de "Crear cita" (personas, asignación, notificación, tipo_cita)

> **Executor instructions**: Sigue este plan paso a paso. Corre cada
> verificación antes del siguiente paso. Ante cualquier "STOP condition",
> detente y reporta. Al terminar, actualiza tu fila en `plans/README.md`.
>
> **Drift check**: hay TRES superficies — el HTML (working tree), el workflow
> n8n `exentia-panel-admin-create-cita` (id `iJc31umIO7IqiUKz`, en la nube) y
> el RPC `public.exentia_agendar_cita_pool` (Supabase). Antes de editar cada
> una, confirma los excerpts de "Current state" con los comandos de
> inspección. Si no coinciden, STOP.

## Status

- **Priority**: P1
- **Effort**: L
- **Risk**: MED
- **Depends on**: none (recomendado después de 001 y 002 por ser el más largo)
- **Category**: bug
- **Planned at**: commit `55d5cd0` (working tree), 2026-07-07

## Why this matters

El tab "Crear cita" del panel admin aparenta funcionar pero pierde datos en
silencio en 4 puntos:

1. El formulario manda `num_personas`, pero el workflow lee
   `body.personas_total` → **una cita de pareja se crea como 1 persona** (el
   trigger de slots crea 1 cupo en vez de 2).
2. El dropdown "Asignar a" manda `asignar_a`, pero ni el workflow ni el RPC lo
   leen → **la asignación directa es un no-op**: la cita siempre cae al pool.
3. El checkbox "Enviar SMS al cliente" manda `notificar_cliente`, que nadie
   lee → **no-op**.
4. El RPC declara `v_tipo_cita` pero **nunca lo escribe** en el INSERT/UPDATE →
   las citas creadas desde el panel (y desde la página pública vía el mismo
   RPC) quedan sin `tipo_cita`, así que el badge Domicilio/Sucursal y el
   filtro "Tipo" no las ven, y el traslado a domicilio nunca se registra.

El admin cree que asignó, notificó y registró domicilio — y nada de eso pasó.

## Current state

### A. Frontend — `panel/web/index.html`, `submitCrearCita` (~línea 3417)

Payload que arma hoy:

```js
const payload = {
  cliente_nombre, cliente_telefono,
  cliente_email: cliente_email || null,
  fecha, hora, tipo_cita,
  direccion: tipo_cita === 'domicilio' ? direccion : null,
  num_personas,                    // ← el workflow lee personas_total
  modalidad,
  cart: crearState.cart.map(c => ({ slug, name, duracion_min, precio_mxn, categoria, servicio_id })),
  asignar_a,                       // ← nadie lo lee
  notificar_cliente,               // ← nadie lo lee
  origen: 'panel-admin'
};
```

### B. Workflow n8n `exentia-panel-admin-create-cita` (id `iJc31umIO7IqiUKz`)

Cadena: `Webhook → [JWT: Parsear JWT → Recomputar firma → Verificar JWT admin
→ ¿JWT válido?] → Normalizar payload → ¿payload válido? → RPC agendar pool →
Formato SMS → ¿enviar SMS? → Enviar SMS → Respuesta final → Respond 200`.

Nodo **Normalizar payload** (Code) — fragmento relevante del final:

```js
const payload = {
  booking_code: body.booking_code || null,
  cliente_nombre, cliente_telefono,
  cliente_email: ..., servicios, fecha, hora,
  duracion_total_min: duracion_total,
  precio_total_mxn: precio_total,
  personas_total: parseInt(body.personas_total || 1, 10),   // ← siempre 1 con el payload del panel
  modalidad: body.modalidad || (body.personas_total > 1 ? 'simultaneo' : 'individual'),
  tipo_cita: body.tipo_cita || 'sucursal',
  zona_colonia: body.zona_colonia || null,
  direccion: body.direccion || null,
  lead_ref: body.lead_ref || null
};
return [{ json: payload }];
```

Nodo **RPC agendar pool** (HTTP): POST
`https://fneppfjeywhayknrgahe.supabase.co/rest/v1/rpc/exentia_agendar_cita_pool`
con body `{"p_payload": {{ JSON.stringify($json) }}}` y headers apikey/Authorization
(anon key, ya configurados — cópialos de ese mismo nodo si creas nodos nuevos).

Nodo **Enviar SMS** (HTTP): POST
`https://services.leadconnectorhq.com/conversations/messages` con
`contactId: "l3XxNhQvAK7eWxFJcTGj"` (grupo Avisos Panel), headers
`Authorization: Bearer <API key GHL Exentia>` + `Version: 2021-07-28`.

**El SMS actual va SOLO al grupo Avisos** — nunca al cliente.

### C. RPC `public.exentia_agendar_cita_pool(p_payload jsonb)` (Supabase, proyecto `fneppfjeywhayknrgahe`)

Puntos verificados en el source (2026-07-07):

- Lee `v_tipo_cita := p_payload->>'tipo_cita'` pero **NO aparece ni en el
  UPDATE (caso A: booking_code existente) ni en el INSERT (caso B)**.
- Lee `v_num_personas := COALESCE((p_payload->>'personas_total')::INT, 1)` —
  la clave correcta a mandar es `personas_total`.
- No calcula ni escribe `costo_traslado_total`.
- Devuelve tabla: `booking_code, action('created'|'updated'), cliente, fecha,
  hora, duracion_min, precio_mxn, servicios_label`. **No devuelve booking_id
  ni slots** — para asignar necesitaremos leer los slots creados.

### D. RPC de asignación existente

`public.exentia_claim_slot(p_slot_id uuid, p_terapeuta_id uuid)` — ya existe y
es el mecanismo estándar del panel para asignar un cupo. Los slots de un
booking se leen de la vista `public.exentia_panel_pool_slots`
(`?booking_code=eq.<code>&select=slot_id,slot_number`).

### E. Cómo editar workflows n8n en este proyecto

```bash
source ~/.n8n-cli/config   # define N8N_URL (o usa https://n8n-ntcue-clone-u59578.vm.elestio.app)
COOKIE=~/.n8n-cli/cookies.txt
# bajar
curl -s -b "$COOKIE" "$N8N_URL/rest/workflows/iJc31umIO7IqiUKz" > /tmp/wf.json
# editar nodes/connections en el JSON (python), luego subir:
curl -s -b "$COOKIE" -X PATCH "$N8N_URL/rest/workflows/iJc31umIO7IqiUKz" \
  -H 'Content-Type: application/json' \
  -d @/tmp/wf_patch.json      # {"nodes": [...], "connections": {...}}
# recargar trigger: deactivate + activate (activate requiere versionId fresco)
curl -s -b "$COOKIE" -X POST "$N8N_URL/rest/workflows/iJc31umIO7IqiUKz/deactivate" -H 'Content-Type: application/json'
VID=$(curl -s -b "$COOKIE" "$N8N_URL/rest/workflows/iJc31umIO7IqiUKz" | python3 -c "import json,sys; print(json.load(sys.stdin)['data']['versionId'])")
curl -s -b "$COOKIE" -X POST "$N8N_URL/rest/workflows/iJc31umIO7IqiUKz/activate" \
  -H 'Content-Type: application/json' -d "{\"versionId\":\"$VID\"}"
```

Gotcha conocido: si `curl` devuelve `{"status":"error","message":"Unauthorized"}`,
re-loguea: `curl -c ~/.n8n-cli/cookies.txt -X POST "$N8N_URL/rest/login" -H 'Content-Type: application/json' --data-raw '{"emailOrLdapLoginId":"<email>","password":"<password>"}'`
(credenciales en `~/.n8n-cli/config`).

### F. Cómo aplicar SQL

Usa el MCP de Supabase (`apply_migration` para DDL) con
`project_id: fneppfjeywhayknrgahe`, o pídele al operador acceso. Regla del
proyecto: `CREATE OR REPLACE FUNCTION` está bien; terminar con
`NOTIFY pgrst, 'reload schema';`.

## Scope

**In scope**:
- `panel/web/index.html` — solo `submitCrearCita`
- Workflow n8n `exentia-panel-admin-create-cita` (id `iJc31umIO7IqiUKz`) — nodos
  `Normalizar payload`, `Formato SMS` y nodos NUEVOS de asignación/SMS cliente
- RPC `public.exentia_agendar_cita_pool` — solo agregar `tipo_cita` y
  `costo_traslado_total` al INSERT/UPDATE

**Out of scope** (NO tocar):
- Workflow `exentia-page-agendar-cita` (id `xsmXmlybLKYBdtiq`) — es el flujo
  PÚBLICO de la página; comparte el RPC pero su Normalize es suyo. El cambio
  del RPC lo beneficia sin tocarlo.
- El trigger `fn_autocreate_slots` y los RPCs de claim/release
- `personas_servicios` por-persona (asignación de servicios a cada persona):
  deferred — ver Maintenance notes

## Git workflow

- HTML: deploy vía `gh api` (bloque del plan 001). SQL: migration con nombre
  `agendar_pool_tipo_cita_traslado`. Workflow: PATCH + deactivate/activate.

## Steps

### Step 1: RPC — persistir `tipo_cita` y traslado

Aplica esta migration (recrea la función; el resto del cuerpo NO cambia — parte
del source actual, que debes bajar primero con
`SELECT pg_get_functiondef(oid) FROM pg_proc WHERE proname='exentia_agendar_cita_pool';`):

- Agrega al DECLARE: `v_traslado NUMERIC := COALESCE((p_payload->>'costo_traslado_total')::NUMERIC, 0);`
- En el UPDATE (caso A) agrega: `tipo_cita = COALESCE(NULLIF(v_tipo_cita,''), tipo_cita), costo_traslado_total = NULLIF(v_traslado, 0),`
- En el INSERT (caso B) agrega las columnas `tipo_cita, costo_traslado_total`
  con valores `v_tipo_cita, NULLIF(v_traslado, 0)`.
- Termina con `NOTIFY pgrst, 'reload schema';`

**Verify**:
```sql
SELECT public.exentia_agendar_cita_pool(jsonb_build_object(
  'cliente_nombre','TEST PLAN 003','cliente_telefono','+5219990000003',
  'servicios', jsonb_build_array(jsonb_build_object('slug','test','name','Test','duracion_min',60,'precio_mxn',100)),
  'fecha','2026-09-01','hora','10:00:00','tipo_cita','domicilio',
  'costo_traslado_total', 200, 'personas_total', 1));
SELECT tipo_cita, costo_traslado_total FROM exentia.bookings WHERE cliente_nombre='TEST PLAN 003';
-- esperado: domicilio | 200
DELETE FROM exentia.booking_slots WHERE booking_id IN (SELECT id FROM exentia.bookings WHERE cliente_nombre='TEST PLAN 003');
DELETE FROM exentia.bookings WHERE cliente_nombre='TEST PLAN 003';
```

### Step 2: Frontend — mandar las claves que el backend lee

En `submitCrearCita` cambia el payload:

- `num_personas` → **agregar además** `personas_total: num_personas` (deja
  `num_personas` por compat).
- Agregar `costo_traslado_total: <el traslado calculado>` — replica el cálculo
  de `recalcSummary` (hoy: `tipo === 'domicilio' ? 200 + Math.max(0, numPers-1)*100 : 0`)
  o refactoriza `recalcSummary` para que devuelva `{svc, traslado, total}` y
  úsalo en ambos lados.

**Verify**: `grep -n 'personas_total' panel/web/index.html` → ≥1 match en `submitCrearCita`.

### Step 3: Workflow — propagar asignar_a / notificar_cliente por el Normalize

En el nodo `Normalizar payload` del workflow `iJc31umIO7IqiUKz`, agrega al
objeto `payload` final:

```js
costo_traslado_total: parseFloat(body.costo_traslado_total || 0) || 0,
_asignar_a: (body.asignar_a || '').toString().trim() || null,
_notificar_cliente: body.notificar_cliente === true,
_cliente_telefono_sms: cliente_telefono,
```

Las claves con `_` viajan dentro de `p_payload` al RPC (que las ignora — es
jsonb) y quedan disponibles río abajo vía `$('Normalizar payload').item.json`.

**Verify**: bajar el workflow y `python3 -c "...; assert '_asignar_a' in code"` sobre el jsCode del nodo.

### Step 4: Workflow — rama de asignación directa

Inserta después de `RPC agendar pool` (y antes de `Formato SMS`) dos nodos:

1. **`Get slots creados`** (HTTP Request, GET):
   `https://fneppfjeywhayknrgahe.supabase.co/rest/v1/exentia_panel_pool_slots?booking_code=eq.{{ $json[0] ? $json[0].booking_code : $json.booking_code }}&select=slot_id,slot_number`
   con los mismos headers apikey/Authorization del nodo `RPC agendar pool`.
   Configúralo con `alwaysOutputData: true` y `onError: continueRegularOutput`.
2. **`Asignar si aplica`** (Code):

```js
const asignarA = $('Normalizar payload').item.json._asignar_a;
const rpcOut = $('RPC agendar pool').first().json;
const rpc = Array.isArray(rpcOut) ? rpcOut[0] : rpcOut;
const slots = $input.all().map(i => i.json).filter(s => s && s.slot_id);
return [{ json: { ...rpc, _slots: slots, _asignar_a: asignarA } }];
```

3. **`Claim por slot`** (HTTP Request, POST, solo si `_asignar_a` no es null —
   usa un IF `¿asignar?` con condición `{{ $json._asignar_a }}` not empty):
   POST `https://fneppfjeywhayknrgahe.supabase.co/rest/v1/rpc/exentia_claim_slot`
   body `={{ JSON.stringify({p_slot_id: $json._slots[0] ? $json._slots[0].slot_id : null, p_terapeuta_id: $json._asignar_a}) }}`.
   V1: asignar solo el primer slot es aceptable para citas individuales; para
   multi-cupo itera con un nodo Code que haga los claims con `this.helpers.httpRequest`
   en loop (o documenta la limitación en el Respond).

Reconecta: `RPC agendar pool → Get slots creados → Asignar si aplica →
¿asignar? → (true: Claim por slot → Formato SMS / false: Formato SMS)`.

**Verify**: test E2E del paso 7 con `asignar_a` = uuid de "Calendario Dos"
(`e77ca4ab-be8e-45aa-b027-7bcf5b01419c`): el slot debe quedar `claimed`:
`SELECT estado, terapeuta_id FROM exentia.booking_slots WHERE booking_id = (SELECT id FROM exentia.bookings WHERE booking_code='<code devuelto>');`

### Step 5: Workflow — SMS opcional al cliente

Después de `Enviar SMS` (grupo), agrega IF **`¿notificar cliente?`** con
condición `{{ $('Normalizar payload').item.json._notificar_cliente }}` === true
→ nodo **`SMS cliente`** (HTTP): mismo endpoint GHL pero el mensaje corto:

```
Hola {nombre}, tu cita en Exentia quedó agendada para {fecha} a las {hora}. Total: ${total}. Te esperamos.
```

Problema: GHL manda SMS por `contactId`, no por teléfono → primero upsert del
contacto: POST `https://services.leadconnectorhq.com/contacts/upsert` con
`{locationId:'0hGSRrhxkdywVQxCsNOi', phone: <_cliente_telefono_sms>, name: <cliente>}`
(mismos headers GHL), toma `contact.id` de la respuesta y úsalo en el SMS.
Ambas ramas terminan en `Respuesta final`.

**Verify**: E2E con `notificar_cliente: true` y un teléfono de prueba tuyo —
llega el SMS; con `false` no llega.

### Step 6: Deploy frontend + reactivar workflow

Deploy del HTML (bloque `gh api`) y deactivate/activate del workflow (bloque §E).

**Verify**: `curl -s "$N8N_URL/rest/workflows/iJc31umIO7IqiUKz" -b "$COOKIE" | python3 -c "import json,sys; print(json.load(sys.stdin)['data']['active'])"` → `True`.

### Step 7: E2E completo

Con JWT admin (bloque curl del plan 002):

```bash
curl -s -X POST 'https://n8n-ntcue-clone-u59578.vm.elestio.app/webhook/exentia-panel-admin-create-cita' \
 -H "Authorization: Bearer $JWT" -H 'Content-Type: application/json' -d '{
  "cliente_nombre":"E2E Plan003","cliente_telefono":"+5219990000031",
  "fecha":"2026-09-02","hora":"11:00","tipo_cita":"domicilio","direccion":"Calle Test 1",
  "num_personas":2,"personas_total":2,"modalidad":"simultaneo",
  "costo_traslado_total":300,
  "cart":[{"slug":"masaje-test","name":"Masaje Test","duracion_min":60,"precio_mxn":800}],
  "asignar_a":"e77ca4ab-be8e-45aa-b027-7bcf5b01419c",
  "notificar_cliente":false,"origen":"panel-admin"}'
```

Comprobar en Supabase: booking con `num_personas=2`, `tipo_cita='domicilio'`,
`costo_traslado_total=300`, 2 slots creados, slot 1 `claimed` por Calendario
Dos. Al final, limpiar: borrar slots y booking del E2E (mismo patrón DELETE del
paso 1).

## Test plan

Los pasos 1 y 7 son los tests (SQL + E2E curl). No hay framework de tests.

## Done criteria

- [ ] Booking de prueba del paso 7 con `num_personas=2`, `tipo_cita='domicilio'`, `costo_traslado_total=300`
- [ ] Slot asignado a Calendario Dos cuando `asignar_a` viene
- [ ] SMS al cliente solo cuando `notificar_cliente=true`
- [ ] Workflow activo tras las ediciones
- [ ] Datos de prueba limpiados de la BD
- [ ] Fila actualizada en `plans/README.md`

## STOP conditions

- El source del RPC difiere del descrito (alguien ya lo tocó) — re-lee y ajusta o reporta.
- `exentia_claim_slot` devuelve error de constraint en el claim del paso 4
  — puede significar que el slot no está en estado `pool`; reporta con el output.
- El PATCH del workflow devuelve `request/body must NOT have additional properties` —
  manda solo `{"nodes":..., "connections":...}` en el body.
- No puedes autenticarte a n8n tras el re-login del gotcha §E.

## Maintenance notes

- **Deferred**: asignación multi-cupo (iterar claims para N slots) y
  `personas_servicios` por persona — hoy la pareja crea 2 slots iguales.
- **Deferred**: selector de variantes de precio (plan 005).
- El workflow público `exentia-page-agendar-cita` gana `tipo_cita` persistido
  gratis con el paso 1 — revisar que su Normalize ya mande `tipo_cita` (sí lo
  manda, verificado 2026-07-07).
- Revisor: verificar que el claim usa el RPC (atómico) y no un UPDATE directo.
