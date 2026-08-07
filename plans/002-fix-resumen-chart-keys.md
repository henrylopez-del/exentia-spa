# Plan 002: Corregir claves de datos del dashboard Resumen (ventas $0, listas en 0)

> **Executor instructions**: Sigue este plan paso a paso. Corre cada
> verificación antes del siguiente paso. Ante cualquier "STOP condition",
> detente y reporta. Al terminar, actualiza tu fila en `plans/README.md`.
>
> **Drift check**: el archivo objetivo vive en el working tree (no commiteado).
> Compara los excerpts de "Current state" con greps antes de editar; si no
> coinciden, STOP.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: bug
- **Planned at**: commit `55d5cd0` (working tree), 2026-07-07

## Why this matters

En el tab **Resumen** del panel admin, la gráfica "Ventas por día" dibuja
siempre $0, y las listas "Top servicios" y "Citas por masajista" muestran 0 en
todos los renglones. Los KPIs de arriba sí son correctos. La causa es un
desajuste de nombres de campo entre lo que devuelve el RPC de Supabase y lo
que lee el frontend. Yaz va a tomar decisiones de negocio con este dashboard —
datos en cero lo hacen inútil y mina la confianza en todo el panel.

## Current state

Archivo: `panel/web/index.html`.

**Lo que devuelve el RPC `public.exentia_admin_stats`** (verificado con una
llamada real el 2026-07-07):

```json
{
  "ventas_por_dia":  [ { "fecha": "2026-07-01", "monto": 5140 }, ... ],
  "top_servicios":   [ { "cnt": 7, "nombre": "Masaje Exentia" }, ... ],
  "por_masajista":   [ { "cnt": 3, "nombre": "Victor Rodriguez" }, ... ],
  "citas_por_dia":   [ { "citas": 1, "fecha": "2026-06-30" }, ... ],
  "ventas_reservadas": 20830, "ventas_cobradas": 0,
  "ticket_promedio": 1893.63, "total_citas": 11, "completadas": 1,
  "canceladas": 0, "por_tipo": { "sucursal": 8, "domicilio": 3 }
}
```

Es decir: la serie de ventas usa **`monto`**, y las dos listas usan **`cnt`**.

**Lo que lee el frontend hoy** (los tres bugs):

`renderChartVentasDia` (~línea 2964):
```js
data: series.map(x => Number(x.ventas || 0)),   // ← 'ventas' no existe → siempre 0
```

`renderTopServicios` (~línea 3015):
```js
<span class="stats-list-item-val">${x.cantidad || x.total || 0}</span>   // ← 'cantidad'/'total' no existen
```

`renderPorMasajista` (~línea 3026):
```js
<span class="stats-list-item-val">${x.citas || x.cantidad || 0} cita...</span>   // ← 'citas'/'cantidad' no existen
```

`renderChartCitasDia` y los KPIs (`renderStats`, ~línea 2880) ya usan las
claves correctas — NO tocarlos.

## Commands you will need

| Purpose | Command | Expected |
|---|---|---|
| Ver output real del RPC | bloque curl abajo | JSON con `monto`/`cnt` |
| Deploy | bloque `gh api` del plan 001 (mismo comando, otro mensaje) | SHA |

Llamada real al endpoint (para confirmar el contrato antes de editar):

```bash
JWT=$(curl -s -X POST 'https://n8n-ntcue-clone-u59578.vm.elestio.app/webhook/exentia-panel-admin-login' \
  -H 'Content-Type: application/json' \
  -d '{"username":"exentiaadmin","password":"ExentiaAdmin2026"}' | python3 -c "import json,sys; print(json.load(sys.stdin)['sessionJwt'])")
curl -s "https://n8n-ntcue-clone-u59578.vm.elestio.app/webhook/exentia-panel-admin-stats?desde=2026-06-01&hasta=2026-07-31" \
  -H "Authorization: Bearer $JWT" | python3 -m json.tool | grep -E 'monto|cnt' | head -5
```

## Scope

**In scope**:
- `panel/web/index.html` — solo `renderChartVentasDia`, `renderTopServicios`, `renderPorMasajista`

**Out of scope**:
- El RPC `exentia_admin_stats` y el workflow n8n `exentia-panel-admin-stats` —
  el contrato del backend queda como fuente de verdad; NO renombres campos del
  lado servidor (el fix es más barato y seguro en el cliente)
- `renderStats`, `renderChartCitasDia`, `renderChartTipo`, KPIs — ya correctos

## Git workflow

- Igual que plan 001: sin commits locales; deploy vía `gh api` al repo `exentia-panel`.

## Steps

### Step 1: Corregir la serie de ventas

En `renderChartVentasDia`, cambia:

```js
data: series.map(x => Number(x.ventas || 0)),
```
por:
```js
data: series.map(x => Number(x.monto ?? x.ventas ?? 0)),
```

(se conserva `ventas` como fallback por si el RPC se armoniza después).

**Verify**: `grep -n 'x.monto' panel/web/index.html` → 1 match.

### Step 2: Corregir Top servicios

En `renderTopServicios`, cambia `${x.cantidad || x.total || 0}` por
`${x.cnt ?? x.cantidad ?? 0}`.

**Verify**: `grep -n 'x.cnt' panel/web/index.html` → ≥1 match.

### Step 3: Corregir Citas por masajista

En `renderPorMasajista`, cambia las DOS ocurrencias de
`x.citas || x.cantidad || 0` por `x.cnt ?? x.citas ?? 0`.

**Verify**: `grep -c 'x.cnt' panel/web/index.html` → 3 (pasos 2 y 3).

### Step 4: Deploy y verificación visual

Deploy con el bloque `gh api` (mensaje:
`fix(admin): claves monto/cnt en charts del Resumen`). Luego en el panel
(login `exentiaadmin`/`ExentiaAdmin2026`), tab Resumen con preset "Este mes":

- "Ventas por día" debe mostrar picos (>= $1,000 en días con citas — al
  2026-07-07 hay ventas el 30-jun, 1-jul, 2-jul, 3-jul, 4-jul, 6-jul, 12-jul).
- "Top servicios" debe listar "Masaje Exentia" con un número > 0.
- "Citas por masajista" debe mostrar conteos > 0.

**Verify**: los tres componentes muestran números > 0 coherentes con los KPIs.

## Test plan

Sin framework de tests. La verificación es la llamada curl (contrato) + la
verificación visual del paso 4.

## Done criteria

- [ ] `grep -c 'x.monto' panel/web/index.html` → 1
- [ ] `grep -c 'x.cnt' panel/web/index.html` → 3
- [ ] `grep -c 'x.ventas ||' panel/web/index.html` → 0 (la forma vieja ya no existe)
- [ ] Deploy hecho y verificación visual del paso 4 aprobada
- [ ] Fila actualizada en `plans/README.md`

## STOP conditions

- El curl del contrato devuelve claves distintas a `monto`/`cnt` (el RPC cambió
  después de escribir este plan) — en ese caso el fix correcto puede ser otro.
- Los excerpts no coinciden con el archivo vivo.

## Maintenance notes

- Deuda de fondo (aceptada): el contrato usa nombres poco descriptivos
  (`cnt`, `monto`). Si algún día se rehace el RPC, armonizar a
  `cantidad`/`ventas` y quitar los fallbacks del cliente.
- Verificar también, al pasar por aquí, que el filtro "Masajista" del Resumen
  realmente filtra (el RPC recibe `p_terapeuta uuid`); si no filtra, es bug del
  RPC y va como hallazgo nuevo, no lo arregles dentro de este plan.
