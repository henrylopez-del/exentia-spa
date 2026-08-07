# Plan 001: Hacer que el tab Citas abra el modal de detalle (hoy no abre nunca)

> **Executor instructions**: Sigue este plan paso a paso. Corre cada comando de
> verificación y confirma el resultado esperado antes del siguiente paso. Si
> ocurre algo de "STOP conditions", detente y reporta — no improvises. Al
> terminar, actualiza tu fila en `plans/README.md`.
>
> **Drift check (correr primero)**: el archivo objetivo NO está commiteado en
> este repo — vive en el working tree y se deploya al repo separado
> `0VictorRodriguez0/exentia-panel` vía API. Verifica el drift comparando los
> excerpts de "Current state" contra el archivo vivo con los greps indicados.
> Si un excerpt no coincide, STOP.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: bug
- **Planned at**: commit `55d5cd0` (working tree sin commitear), 2026-07-07

## Why this matters

En el panel de administrador (login `exentiaadmin`), el tab **Citas** muestra la
tabla correctamente, pero hacer click en una fila (o en el botón "Abrir") no
abre el modal de detalle — falla en silencio, sin error visible. La causa: el
modal `openCitaModal` resuelve sus datos desde dos stores
(`calState.bookingsById` y `window._modalExtraRef`) y la función
`openCitaFromTable` no registra la cita en ninguno de los dos antes de llamar
al modal. En modo admin `calState.bookingsById` está siempre vacío (es el store
del flujo masajista). Resultado: todo el tab Citas es de solo-lectura-de-tabla,
sin acceso a reagendar/eliminar.

## Current state

Archivo único: `panel/web/index.html` (SPA de ~5960 líneas, un solo `<script>`
grande que inicia en la línea ~2612; funciones declaradas top-level, hoisting
aplica en todo el bloque).

**1. El resolver del modal** (`openCitaModal`, línea ~4554):

```js
function openCitaModal(bookingId, kind, opts) {
  opts = opts || {};
  const adminMode = !!opts.adminMode;
  const readOnly = !!opts.readOnly || adminMode;
  const ref = calState.bookingsById[bookingId] || (window._modalExtraRef && window._modalExtraRef[bookingId]);
  if (!ref) return;          // ← aquí muere el click del tab Citas
  const b = ref.booking;
```

`ref` debe tener la forma `{ kind: 'mine'|'pool', booking: <objeto slot>, terapeuta_id? }`.

**2. El patrón correcto ya existe** — el calendario admin registra en
`_modalExtraRef` antes de abrir (`openAdminCitaModal`, línea ~3912):

```js
function openAdminCitaModal(slotId) {
  const entry = adminState.bookingsById[slotId];
  if (!entry) return;
  if (!window._modalExtraRef) window._modalExtraRef = {};
  window._modalExtraRef[slotId] = entry;
  openCitaModal(slotId, entry.kind, { adminMode: true, terapeuta_id: entry.terapeuta_id });
}
```

**3. La función rota** (`openCitaFromTable`, línea ~3657):

```js
function openCitaFromTable(bookingId) {
  const all = [
    ...((adminState.data && adminState.data.mias) || []),
    ...((adminState.data && adminState.data.pool) || []),
  ];
  const slot = all.find(s => s.booking_id === bookingId);
  if (slot) {
    const kind = slot.terapeuta_id ? 'mine' : 'pool';
    openCitaModal(slot.slot_id || slot.id, kind, { adminMode: true, terapeuta_id: slot.terapeuta_id });  // ← no registra en _modalExtraRef
    return;
  }
  // Fallback: usar el registro directo de citasState.all
  const c = citasState.all.find(x => x.booking_id === bookingId);
  if (c) {
    const pseudoSlot = {
      booking_id: c.booking_id,
      slot_id: c.booking_id,
      cliente: c.cliente_nombre,
      ...
      precio_traslado: c.traslado,     // ← nombre equivocado: el modal lee costo_traslado
      direccion: c.direccion_libre,    // ← nombre equivocado: el modal lee direccion_libre
      ...
    };
    openCitaModal(c.booking_id, 'mine', { adminMode: true, slot: pseudoSlot });  // ← opts.slot NO existe en openCitaModal, se ignora
  }
```

**4. Campos que el modal lee del objeto `booking`** (verificados en
`openCitaModal` líneas 4560-4685): `cliente`, `cliente_telefono`,
`cliente_email`, `fecha`, `hora`, `duracion_min`, `precio_total` (fallback
`precio_mxn`), `costo_traslado`, `tipo_cita`, `modalidad`, `direccion_libre`,
`direccion_maps_url`, `zona`, `servicios` (array de `{name, slug,
duracion_min, precio_mxn}`), `notas_cliente`, `notas_internas`,
`preferencia_sexo`, `estado_asignacion`, `cupos_total`, `cupos_tomados`,
`persona_label`.

**5. Datos disponibles en `citasState.all`** — filas de la vista Supabase
`public.exentia_admin_bookings` con columnas: `booking_id`, `booking_code`,
`cliente_nombre`, `cliente_telefono`, `cliente_email`, `fecha`, `hora`,
`duracion_min`, `precio_total`, `traslado`, `tipo_cita`, `modalidad`,
`num_personas`, `direccion_libre`, `zona_municipio`, `zona_colonia`,
`servicios`, `notas_cliente`, `notas_internas`, `estado`, `estado_asignacion`,
`cancelado_at`, `terapeutas_asignadas` (array `[{id,nombre}]`),
`slots_summary` (`{total,claimed,pool,cancelled}`).

**6. Los botones admin del modal** (líneas ~4707-4719) llaman
`openAdminRescheduleModal(b, opts.terapeuta_id)` y `adminDeleteBooking(b)`.
`adminDeleteBooking` usa `booking.booking_id || booking.id` — con el
pseudo-slot funciona porque `booking_id` está presente.
`submitAdminReschedule` con scope `'slot'` usa `b.slot_id || b.id` — para un
pseudo-slot esto mandaría el **booking_id como slot_id** al RPC
`exentia_admin_reschedule_slot`, que no lo encontraría (devuelve `not_found`,
sin corrupción). Aceptable, pero hay que ocultar la opción "Solo este cupo"
cuando no hay slot real (paso 3).

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Sintaxis JS del archivo | `node --check <(sed -n '/^<script>$/,/^<\/script>$/p' "panel/web/index.html" \| sed '1d;$d')` — si falla por el heredoc, usa el paso de verificación por grep de cada paso | exit 0 |
| Deploy a GitHub Pages | ver bloque abajo | imprime SHA del commit |

Deploy (desde `/Users/victorisairodriguezpoot/Desktop/claude code/promt/exentia`):

```bash
FILE="panel/web/index.html"
SHA=$(gh api repos/0VictorRodriguez0/exentia-panel/contents/index.html --jq .sha)
CONTENT=$(base64 -i "$FILE")
gh api repos/0VictorRodriguez0/exentia-panel/contents/index.html \
  --method PUT -f message="fix(admin): tab Citas abre modal de detalle" \
  -f content="$CONTENT" -f sha="$SHA" --jq '.commit.sha'
```

## Scope

**In scope** (único archivo a modificar):
- `panel/web/index.html` — solo la función `openCitaFromTable` (~línea 3657) y, si el paso 3 lo requiere, `openAdminRescheduleModal` (~línea 5008)

**Out of scope** (NO tocar):
- `openCitaModal` — lo usan el flujo masajista y el calendario admin; cambiar su resolver arriesga regresión en producción
- `openAdminCitaModal` — funciona; es el patrón a imitar
- Los workflows n8n y las vistas Supabase
- `exentia-pagina.html`

## Git workflow

- El repo local `exentia/` tiene el archivo sin commitear; NO hagas commit en este repo salvo que el operador lo pida. El deploy real es el `gh api PUT` al repo `exentia-panel`.

## Steps

### Step 1: Ruta con slot real → delegar en `openAdminCitaModal`

En `openCitaFromTable`, reemplaza la rama `if (slot) {...}` para reutilizar el
helper existente (que ya registra en `_modalExtraRef`):

```js
if (slot) {
  openAdminCitaModal(slot.slot_id || slot.id);
  return;
}
```

**Verify**: `grep -n 'openAdminCitaModal(slot.slot_id' panel/web/index.html` → 1 match dentro de `openCitaFromTable`.

### Step 2: Ruta fallback → registrar pseudo-slot en `_modalExtraRef` con los nombres de campo que el modal lee

Reemplaza la rama del fallback por:

```js
const c = citasState.all.find(x => x.booking_id === bookingId);
if (c) {
  const pseudoSlot = {
    booking_id: c.booking_id,
    // sin slot_id real — marca para que el reagendado use scope booking
    id: c.booking_id,
    _noSlot: true,
    cliente: c.cliente_nombre,
    cliente_telefono: c.cliente_telefono,
    cliente_email: c.cliente_email,
    fecha: c.fecha,
    hora: c.hora,
    duracion_min: c.duracion_min,
    precio_total: c.precio_total,
    costo_traslado: c.traslado,
    tipo_cita: c.tipo_cita,
    modalidad: c.modalidad,
    direccion_libre: c.direccion_libre,
    zona: [c.zona_municipio, c.zona_colonia].filter(Boolean).join(' · '),
    servicios: c.servicios,
    notas_cliente: c.notas_cliente,
    notas_internas: c.notas_internas,
    estado_asignacion: c.estado_asignacion,
    cupos_total: c.slots_summary ? c.slots_summary.total : 1,
    cupos_tomados: c.slots_summary ? c.slots_summary.claimed : 0,
  };
  if (!window._modalExtraRef) window._modalExtraRef = {};
  const kind = (c.slots_summary && c.slots_summary.claimed > 0) ? 'mine' : 'pool';
  window._modalExtraRef[c.booking_id] = { kind, booking: pseudoSlot };
  openCitaModal(c.booking_id, kind, { adminMode: true });
} else {
  showToast('No se encontró detalle de la cita.', 'warn');
}
```

Notas obligatorias:
- Los nombres `costo_traslado` y `direccion_libre` son los que el modal lee
  (ver Current state §4). NO uses `precio_traslado` ni `direccion`.
- `_noSlot: true` lo consume el paso 3.

**Verify**: `grep -n '_modalExtraRef\[c.booking_id\]' panel/web/index.html` → 1 match; `grep -n 'precio_traslado' panel/web/index.html` → 0 matches.

### Step 3: Ocultar "Solo este cupo" cuando el booking no tiene slot real

En `openAdminRescheduleModal` (~línea 5008), después de asignar
`_adminReschedule.booking = booking;`, agrega:

```js
const slotBtn = document.querySelector('#admin-resch-scope button[data-scope="slot"]');
if (slotBtn) slotBtn.style.display = booking._noSlot ? 'none' : '';
```

**Verify**: `grep -n '_noSlot' panel/web/index.html` → 2 matches (paso 2 y paso 3).

### Step 4: Deploy y prueba E2E manual

1. Corre el bloque de deploy de "Commands you will need".
2. Abre `https://0victorrodriguez0.github.io/exentia-panel/` (espera ~1 min al
   build de Pages; agrega `?v=2` para saltar caché).
3. Login: username `exentiaadmin`, password `ExentiaAdmin2026`.
4. Tab **Citas** → click en cualquier fila → debe abrir el modal con datos
   (cliente, servicios, cobro) y los botones "Cambiar horario" / "Eliminar cita" / "Cerrar".
5. Click en una cita que también aparezca en el tab Calendarios (futura) →
   mismo resultado.

**Verify**: el modal abre en ambos casos; consola del navegador sin errores rojos.

## Test plan

No hay framework de tests en este proyecto (HTML único sin build). La
verificación es el E2E manual del paso 4 más los greps por paso. Si tienes
acceso a las herramientas de preview del harness, úsalas para el paso 4 en
lugar de pedirle al usuario que verifique.

## Done criteria

- [ ] `grep -c 'openAdminCitaModal(slot.slot_id' panel/web/index.html` → 1
- [ ] `grep -c 'precio_traslado' panel/web/index.html` → 0
- [ ] `grep -c '_noSlot' panel/web/index.html` → 2
- [ ] Deploy hecho (`gh api ... --jq '.commit.sha'` imprimió un SHA)
- [ ] Modal abre desde el tab Citas (E2E paso 4)
- [ ] Fila actualizada en `plans/README.md`

## STOP conditions

- Los excerpts de "Current state" no coinciden con el archivo vivo (alguien lo editó después del 2026-07-07).
- `openCitaModal` ya no usa `_modalExtraRef` como fallback (refactor previo).
- El deploy con `gh api` devuelve 409 (conflicto de SHA) dos veces seguidas.

## Maintenance notes

- Si en el futuro el tab Citas gana su propio modal, eliminar el pseudo-slot y
  `_modalExtraRef` en favor de un solo store por booking_id.
- El plan 007 (sync GHL) tocará los mismos botones del modal — ejecutar este primero.
- Deuda aceptada: para bookings multi-cupo abiertos desde el fallback, el modal
  muestra el booking completo, no un cupo específico.
