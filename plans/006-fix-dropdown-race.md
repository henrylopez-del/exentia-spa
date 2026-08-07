# Plan 006: Dropdowns de masajista vacíos si el tab se abre antes de cargar datos

> **Executor instructions**: Sigue este plan paso a paso. Corre cada
> verificación antes del siguiente paso. Ante cualquier "STOP condition",
> detente y reporta. Al terminar, actualiza tu fila en `plans/README.md`.
>
> **Drift check**: archivo en working tree (sin commitear). Confirma los
> excerpts con greps antes de editar.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none (coordina con 001-005 si corren en paralelo: mismo archivo)
- **Category**: bug
- **Planned at**: commit `55d5cd0` (working tree), 2026-07-07

## Why this matters

Los tabs Resumen, Citas y Crear cita llenan sus dropdowns de "Masajista" desde
`adminState.data.terapeutas` UNA sola vez, la primera vez que se abre el tab
(gates `adminState.tabsLoaded` / `crearState.inited` / `citasState.inited`).
`adminState.data` se llena async por `fetchAdminCitas()` (1-3 s tras el login).
Si el admin hace click en un tab antes de que termine ese fetch, el dropdown
queda vacío **para siempre** en esa sesión: el filtro por masajista del
Resumen/Citas no filtra y "Asignar a" en Crear cita solo ofrece "Dejar en el
pool".

## Current state

`panel/web/index.html`:

`initStatsTab` (~línea 2780):
```js
function initStatsTab() {
  const sel = document.getElementById('stats-terapeuta');
  if (sel && adminState.data && adminState.data.terapeutas) {   // ← si data aún es null, no llena y nunca reintenta
    sel.innerHTML = '<option value="">Todas</option>' + adminState.data.terapeutas...
```

`initCitasTab` (~línea 3513) e `initCrearCitaTab` (~línea 3248) tienen el mismo
patrón con `citas-terapeuta` y `cc-asignar` respectivamente.

El punto donde los datos LLEGAN: `fetchAdminCitas` (~línea 3727) hace
`adminState.data = data;` y llama `renderAdminCalendars()` (~línea 3783), que
termina con `populateViewAsDropdown()`.

`escapeHtml` está disponible globalmente (línea ~4548).

## Scope

**In scope**:
- `panel/web/index.html` — una función nueva + 4 líneas de integración

**Out of scope**:
- Reestructurar el lazy-load de tabs, `tabsLoaded`, o los fetch

## Git workflow

- Deploy vía `gh api` (bloque plan 001).

## Steps

### Step 1: Helper idempotente

Agrega junto a `populateViewAsDropdown` (~línea 3925):

```js
function populateTerapeutaDropdowns() {
  const ts = (adminState.data && adminState.data.terapeutas) || [];
  if (!ts.length) return;
  const fill = (id, firstLabel) => {
    const sel = document.getElementById(id);
    if (!sel) return;
    const current = sel.value;
    sel.innerHTML = '<option value="">' + firstLabel + '</option>' +
      ts.map(t => '<option value="' + t.id + '">' + escapeHtml(t.nombre || '—') + '</option>').join('');
    if (current && ts.find(t => t.id === current)) sel.value = current;
  };
  fill('stats-terapeuta', 'Todas');
  fill('citas-terapeuta', 'Todas');
  fill('cc-asignar', 'Dejar en el pool');
}
```

(Preserva la selección actual — el fetch se repite cada 3 min por polling y no
debe resetear el filtro elegido.)

**Verify**: `grep -c 'function populateTerapeutaDropdowns' panel/web/index.html` → 1.

### Step 2: Llamarlo cuando llegan datos y al abrir cada tab

- En `renderAdminCalendars`, junto a `populateViewAsDropdown();`, agrega
  `populateTerapeutaDropdowns();`.
- En `initStatsTab`, `initCitasTab` e `initCrearCitaTab`: reemplaza el bloque
  local que arma el `sel.innerHTML` de terapeutas por una llamada a
  `populateTerapeutaDropdowns();` (elimina el código duplicado).

**Verify**: `grep -c 'populateTerapeutaDropdowns()' panel/web/index.html` → 5
(1 definición + 4 llamadas). `grep -n "id=\"stats-terapeuta\"" panel/web/index.html`
sigue existiendo en el HTML (no borraste el select).

### Step 3: Deploy + prueba de la carrera

Deploy (`gh api`, mensaje `fix(admin): dropdowns de masajista se rellenan al llegar datos`).
Prueba: login admin y haz click en "Resumen" INMEDIATAMENTE (antes de que
cargue el calendario). Espera 3 s → el dropdown Masajista debe tener opciones
(Calendario Dos, Vez Test, Victor Rodriguez).

**Verify**: dropdown poblado pese a abrir el tab temprano; el filtro
seleccionado sobrevive un ciclo de polling (espera 3+ min o fuerza
`fetchAdminCitas()` desde consola).

## Test plan

La prueba de carrera del paso 3. Sin framework.

## Done criteria

- [ ] `grep -c 'populateTerapeutaDropdowns' panel/web/index.html` → 5
- [ ] Sin código duplicado de llenado en los 3 init (grep de `'<option value="">Todas</option>' +` → solo dentro del helper)
- [ ] Prueba de carrera del paso 3 pasa
- [ ] Fila actualizada en `plans/README.md`

## STOP conditions

- Los init ya no existen con esa forma (otro plan los tocó) — reconcilia contra
  lo deployado en `0VictorRodriguez0/exentia-panel` antes de editar.

## Maintenance notes

- Cualquier dropdown nuevo que dependa de `adminState.data` debe agregarse a
  `populateTerapeutaDropdowns` (o generalizar a un evento `admin-data-ready`).
