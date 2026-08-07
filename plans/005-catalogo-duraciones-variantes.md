# Plan 005: Popup de productos — duraciones reales y variantes de precio

> **Executor instructions**: Sigue este plan paso a paso. Corre cada
> verificación antes del siguiente paso. Ante cualquier "STOP condition",
> detente y reporta. Al terminar, actualiza tu fila en `plans/README.md`.
>
> **Drift check**: superficies = HTML del panel (working tree) + tabla
> `exentia.servicios` (Supabase). Confirma los excerpts antes de editar.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: LOW
- **Depends on**: 003 (usa el mismo `submitCrearCita`; ejecutar 003 primero evita conflictos de merge)
- **Category**: bug / data
- **Planned at**: commit `55d5cd0` (working tree), 2026-07-07

## Why this matters

En el selector de productos del tab "Crear cita":

1. **63 de los 82 servicios** de `public.exentia_servicios_panel` tienen
   `duracion_min` NULL (verificado por SQL el 2026-07-07). El popup los
   muestra como "0 min" y la cita se crea con `duracion_total_min = 0` → el
   trigger de slots genera cupos sin duración, lo que rompe la validación de
   overlap del reagendado y el render del calendario.
2. **Los 82 servicios tienen variantes** en el jsonb `precios` (ej. "Acrílico
   /Polygel" tiene 10 precios distintos), pero `extractVariants` solo devuelve
   el precio base — el admin no puede elegir la variante y puede cobrar mal.

## Current state

**Shape real del jsonb `precios`** (muestras reales):

```json
{"parche":60,"acripie":500,"extra_largo":120,"retoque_con_gel":580,"tip_no3_cover_natural":550}
{"n1":15,"n2":30,"n3":40,"n4":60,"n5":80}
{"desde":1000}
{"base":650}
{"frances":195,"regular":180,"regular_infantil":140,"gel_semipermanente":290}
```

Es un mapa plano `{slug_variante: precio}`. **No hay duraciones por variante**
en la BD. Claves especiales: `base` y `desde` = precio único (no son variantes
reales a elegir).

**El código actual** (`panel/web/index.html`):

`extractVariants` (~línea 3322):
```js
function extractVariants(s) {
  // Precios jsonb puede traer variantes; formato mixto. Simplificamos al precio base.
  const p = s.precio_mxn;
  const d = s.duracion_min;
  return [{ label: (d ? d + ' min' : 'default'), duracion_min: d, precio_mxn: p }];
}
```

`renderCatalog` (~línea 3298) — cada card llama
`addSvcToCart(id, primary.label)` con la única variante; la card muestra
`${primary.duracion_min || s.duracion_min || 0} min` (→ "0 min" para 63 servicios).

`updateCartUI` (~línea 3360) — renglones del carrito con
`${c.duracion_min || 0} min · $...` y botón quitar.

`submitCrearCita` — manda `cart` con `{slug, name, duracion_min, precio_mxn, categoria, servicio_id}`.

**Dónde SÍ hay duraciones**: la página pública `exentia-pagina.html` resuelve
duración por servicio con una función local `_durMinForKey(slug)` (mapa
hardcodeado en JS de la página) — la BD nunca se pobló. Ese mapa usa los slugs
de la página, que NO coinciden 1:1 con `exentia.servicios.slug`; NO intentes
migrarlo automáticamente.

## Scope

**In scope**:
- `panel/web/index.html` — `extractVariants`, `renderCatalog`, `addSvcToCart`,
  `updateCartUI`, CSS nuevo del selector de variantes
- (Opcional, paso 5) UPDATE de datos a `exentia.servicios.duracion_min` SOLO si
  el operador entrega la lista de duraciones; sin lista, se omite

**Out of scope**:
- `exentia-pagina.html` (página pública) y su catálogo local
- El shape del jsonb `precios` en BD (no lo migres)
- El workflow admin-create-cita (el cart ya viaja con duracion_min por ítem)

## Git workflow

- HTML vía `gh api` (bloque plan 001).

## Steps

### Step 1: Parser real de variantes

Reemplaza `extractVariants` por:

```js
function extractVariants(s) {
  const base = { label: 'Precio base', duracion_min: s.duracion_min || null, precio_mxn: Number(s.precio_mxn) || 0, vkey: '_base' };
  const p = s.precios;
  if (!p || typeof p !== 'object' || Array.isArray(p)) return [base];
  const keys = Object.keys(p).filter(k => typeof p[k] === 'number' || (typeof p[k] === 'string' && p[k] !== ''));
  // 'base'/'desde' solos = precio único, no variantes elegibles
  const soloBase = keys.length <= 1 && (keys[0] === 'base' || keys[0] === 'desde' || !keys.length);
  if (soloBase) return [base];
  const nice = k => k.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  return keys.map(k => ({
    label: nice(k),
    duracion_min: s.duracion_min || null,   // la BD no tiene duración por variante
    precio_mxn: Number(p[k]) || 0,
    vkey: k,
  }));
}
```

**Verify**: `grep -n 'vkey' panel/web/index.html` → ≥3 matches (este paso y los siguientes).

### Step 2: Selector de variante en la card

En `renderCatalog`, para servicios con `variants.length > 1`, en lugar de
agregar directo al carrito, muestra las variantes. Implementación mínima que
respeta el patrón actual (HTML por template string, handlers globales,
`escapeHtml` en textos):

- Card con variantes: al hacer click, expande/colapsa una lista interna de
  botones — uno por variante — con `label` y precio. Cada botón llama
  `addSvcToCart('<id>', '<vkey>')`.
- Card sin variantes (`variants.length === 1`): comportamiento actual (click
  agrega/quita).
- Marca `selected` si CUALQUIER variante del servicio está en el carrito.

Cuidado con el quoting: los `vkey` vienen de claves del jsonb (snake_case, sin
comillas), pero usa igual `JSON.stringify` para ambos argumentos del onclick y
`escapeHtml` para el label visible.

**Verify**: en el preview/navegador, "Acrílico / Polygel" muestra ~10 variantes
con precios distintos ($60–$650); "Combo Laminado..." (solo `base`) agrega directo.

### Step 3: `addSvcToCart` por vkey + duración editable en el carrito

- Cambia la firma a `addSvcToCart(id, vkey)`: busca la variante por `vkey`
  (fallback a la primera). La entrada del carrito lleva
  `__key = id + ':' + vkey`, `name = svc.nombre + (variante !== '_base' ? ' — ' + variant.label : '')`.
- En `updateCartUI`, agrega a cada renglón un input numérico de duración:

```html
<input type="number" class="crear-cart-dur" min="10" step="5"
       value="${c.duracion_min || 60}" data-key="${escapeHtml(c.__key)}"> min
```

  con un listener (delegado en `#cc-cart`, `change`) que haga
  `crearState.cart.find(x => x.__key === key).duracion_min = parseInt(v,10) || 60`
  y llame `recalcSummary()`.
- Al agregar al carrito, si `duracion_min` es null → default `60` (el admin lo
  ajusta en el input). Así ningún cart-item viaja con duración 0.

**Verify**: agregar un servicio sin duración → el carrito muestra input con 60;
cambiarlo a 90 y `console.log(crearState.cart)` refleja 90.

### Step 4: Deploy + E2E

Deploy (`gh api`, mensaje `feat(admin): variantes de precio y duracion editable en Crear cita`).
E2E en producción: crear una cita con "Color — Gel Semipermanente" ($290) y
duración 45 → verificar en Supabase
`SELECT servicios, duracion_total_min FROM exentia.bookings ORDER BY created_at DESC LIMIT 1;`
→ el ítem trae `precio_mxn: 290` y `duracion_total_min = 45`. Borrar el
booking de prueba (patrón DELETE del plan 003 paso 1).

## Test plan

E2E del paso 4 + los verifies visuales. Sin framework de tests.

## Done criteria

- [ ] Servicios multi-variante muestran selector; `base`/`desde` no
- [ ] Ningún ítem entra al carrito con `duracion_min` 0/null
- [ ] Booking E2E con precio de variante y duración editada correctos en BD
- [ ] Datos de prueba limpiados
- [ ] Fila actualizada en `plans/README.md`

## STOP conditions

- El jsonb `precios` de producción tiene shapes distintos a los documentados
  (objetos anidados, arrays) — muestra 5 ejemplos y reporta antes de parsear.
- `submitCrearCita` cambió y ya no manda `cart` con `duracion_min` por ítem
  (plan 003 pudo tocarlo) — reconciliar con lo deployado antes de editar.

## Maintenance notes

- La causa raíz es de datos: `exentia.servicios.duracion_min` está NULL en 63
  filas. Cuando Yaz entregue duraciones oficiales, poblarlas
  (`UPDATE exentia.servicios SET duracion_min = X WHERE slug = '...'`) y el
  default de 60 dejará de usarse.
- Si algún día `precios` gana duraciones por variante
  (`{key: {precio, duracion}}`), extender `extractVariants` — está aislado
  precisamente para eso.
