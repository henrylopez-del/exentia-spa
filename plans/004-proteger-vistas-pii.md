# Plan 004: Sacar las vistas con PII del alcance de la anon key

> **Executor instructions**: Sigue este plan paso a paso. Corre cada
> verificación antes del siguiente paso. Ante cualquier "STOP condition",
> detente y reporta. Al terminar, actualiza tu fila en `plans/README.md`.
>
> **Drift check**: superficies = 2 vistas Supabase + 2 workflows n8n + el HTML
> del panel (working tree, sin commitear). Confirma los excerpts con los
> comandos de inspección antes de editar.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MED (cambia el data-path de dos tabs; hacerlo con cuidado y probar)
- **Depends on**: none — pero coordina con 001/003 si corren en paralelo (tocan el mismo HTML)
- **Category**: security
- **Planned at**: commit `55d5cd0` (working tree), 2026-07-07

## Why this matters

Las vistas `public.exentia_admin_bookings` (nombres, teléfonos, emails,
direcciones de TODOS los clientes) y `public.exentia_terapeutas_admin`
(emails/teléfonos del staff) tienen `GRANT SELECT TO anon`. La anon key está
publicada en el HTML del panel en GitHub Pages (repo público). Cualquiera que
lea el source puede descargar la base completa de clientes con un curl, sin
login. La convención del proyecto (ver `exentia/CLAUDE.md`, sección "Dashboard
seguridad") es que las vistas anon expongan PII enmascarada y que los datos
completos pasen por n8n con JWT verificado. Estas dos vistas rompen esa regla.

## Current state

**Vistas expuestas** (verificado 2026-07-07):

- `public.exentia_admin_bookings` — creada en migration `admin_all_bookings_view`
  con `GRANT SELECT ON public.exentia_admin_bookings TO anon, authenticated;`
- `public.exentia_terapeutas_admin` — creada en migration
  `admin_terapeutas_view_and_upsert_return` con el mismo GRANT.

**Consumidores en `panel/web/index.html`** (fetch directo con anon key):

`loadCitas` (~línea 3548):
```js
const url = SUPABASE_URL + '/rest/v1/exentia_admin_bookings?select=*&limit=500';
const res = await fetch(url, { headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': 'Bearer ' + SUPABASE_ANON_KEY, ... } });
```

`loadTerapeutas` (~línea 3097):
```js
const url = SUPABASE_URL + '/rest/v1/exentia_terapeutas_admin?select=*';
// mismos headers anon
```

**El patrón correcto ya existe**: el workflow `exentia-panel-admin-citas`
(id `y2f87W8ZEU5Br8Qj`) verifica el JWT admin (HS256, secreto compartido) y
hace los GET a Supabase del lado servidor. Sus nodos JWT
(`Parsear JWT` → `Recomputar firma` (crypto HMAC) → `Verificar JWT admin` →
`¿JWT válido?`) son el bloque estándar a copiar. El workflow
`exentia-panel-admin-stats` (id `OQjAJZ6zTHzW5yDU`) es un ejemplo mínimo de
"JWT + un GET + Respond" — úsalo de plantilla.

**Vista que SÍ debe quedarse en anon**: `public.exentia_servicios_panel`
(catálogo, sin PII) — NO tocarla.

**Cómo editar workflows n8n**: mismo bloque §E del plan 003
(cookie `~/.n8n-cli/cookies.txt`, `PATCH /rest/workflows/<id>`,
deactivate/activate con versionId).

## Scope

**In scope**:
- SQL: `REVOKE` sobre las 2 vistas
- Workflow NUEVO `exentia-panel-admin-data` (o extender `exentia-panel-admin-stats` con un segundo path — elige crear el nuevo; es más simple que meter routing)
- `panel/web/index.html` — solo `loadCitas` y `loadTerapeutas`

**Out of scope**:
- `exentia_servicios_panel`, `exentia_panel_pool_slots`, `exentia_panel_mis_slots`
  y demás vistas existentes del flujo masajista (ya estaban así antes de este
  trabajo; si tienen PII de más es un hallazgo aparte, no lo arregles aquí)
- El RPC `exentia_admin_upsert_terapeuta` (ya pasa por admin-actions con JWT)

## Git workflow

- SQL como migration `revoke_anon_admin_views`. HTML vía `gh api` (bloque plan 001). Workflow vía REST.

## Steps

### Step 1: Crear el workflow puente `exentia-panel-admin-data`

Clona la estructura de `exentia-panel-admin-stats` (bájalo:
`curl -s -b "$COOKIE" "$N8N_URL/rest/workflows/OQjAJZ6zTHzW5yDU"`) y crea un
workflow nuevo con:

- Webhook GET path `exentia-panel-admin-data`, `responseMode: responseNode`,
  `allowedOrigins: '*'`
- Los 4 nodos JWT copiados tal cual (mismo secreto en el nodo crypto)
- En la rama válida, un nodo Code **`Router`** que lea
  `$('Webhook').first().json.query.recurso` (valores permitidos: `bookings`,
  `terapeutas`; otro valor → `{_error:'bad_recurso'}`)
- Dos HTTP GET (mismos headers apikey/Authorization del nodo de stats, que usan
  la **service/anon key del lado servidor** — tras el REVOKE del paso 3 la anon
  key ya no podrá leer estas vistas, así que estos GET deben usar la
  **service_role key**; pídesela al operador o tómala del nodo Postgres de otro
  workflow si existe — si no la consigues, STOP):
  - `GET .../rest/v1/exentia_admin_bookings?select=*&limit=500`
  - `GET .../rest/v1/exentia_terapeutas_admin?select=*`
- IF por recurso → Respond 200 con `{ok:true, rows: <array>}`

Crear vía `POST /rest/workflows`, mover a folder ADMINISTRADOR
(`PATCH {"parentFolderId":"cTH1B4BA0Ku1wkq7"}`), activar con versionId.

**Verify**:
```bash
JWT=$(...login exentiaadmin...)   # bloque del plan 002
curl -s "$N8N_URL/webhook/exentia-panel-admin-data?recurso=terapeutas" -H "Authorization: Bearer $JWT" | head -c 200
# esperado: {"ok":true,"rows":[{"id":"..."
curl -s "$N8N_URL/webhook/exentia-panel-admin-data?recurso=bookings" | head -c 120
# esperado (sin JWT): error/Workflow execution failed — NO datos
```

### Step 2: Apuntar el frontend al puente

En `panel/web/index.html`:

- Agrega la constante junto a las demás (~línea 2620):
  `const ADMIN_DATA_ENDPOINT = 'https://n8n-ntcue-clone-u59578.vm.elestio.app/webhook/exentia-panel-admin-data';`
- `loadCitas`: reemplaza el fetch a Supabase por
  `fetch(ADMIN_DATA_ENDPOINT + '?recurso=bookings', { headers: { 'Authorization': 'Bearer ' + localStorage.getItem(STORAGE_KEY) } })`
  y lee `data.rows` en lugar del array directo (`citasState.all = data.rows`).
- `loadTerapeutas`: ídem con `?recurso=terapeutas` y `terapeutasState.list = data.rows`.

**Verify**: `grep -c 'rest/v1/exentia_admin_bookings' panel/web/index.html` → 0;
`grep -c 'rest/v1/exentia_terapeutas_admin' panel/web/index.html` → 0.

### Step 3: REVOKE en Supabase

Migration `revoke_anon_admin_views`:

```sql
REVOKE SELECT ON public.exentia_admin_bookings FROM anon;
REVOKE SELECT ON public.exentia_terapeutas_admin FROM anon;
NOTIFY pgrst, 'reload schema';
```

(Deja `authenticated`/service_role para el workflow puente.)

**Verify**:
```bash
ANON="<anon key — está en panel/web/index.html como SUPABASE_ANON_KEY>"
curl -s "https://fneppfjeywhayknrgahe.supabase.co/rest/v1/exentia_admin_bookings?select=booking_id&limit=1" \
  -H "apikey: $ANON" -H "Authorization: Bearer $ANON"
# esperado: {"code":"42501",...} permission denied — NO datos
```

### Step 4: Deploy + E2E

Deploy del HTML (`gh api`, mensaje `fix(security): tabs Citas/Masajistas leen via n8n JWT`).
En el panel con login admin: tab Citas carga filas; tab Masajistas lista al
equipo; sin sesión, el curl del paso 3 sigue negando.

**Verify**: ambos tabs funcionan tras el deploy; el curl anon devuelve 42501.

## Test plan

Los verifies de los pasos 1, 3 y 4 son el test (positivo con JWT, negativo sin
JWT y negativo con anon key).

## Done criteria

- [ ] curl anon a ambas vistas → `permission denied`
- [ ] curl con JWT admin al puente → filas
- [ ] Tabs Citas y Masajistas cargan en producción
- [ ] `grep -c 'rest/v1/exentia_admin_bookings\|rest/v1/exentia_terapeutas_admin' panel/web/index.html` → 0
- [ ] Fila actualizada en `plans/README.md`

## STOP conditions

- No consigues una service_role key para los GET del workflow (paso 1) — sin
  ella el REVOKE rompería los tabs; reporta y deja TODO en el índice.
- El REVOKE rompe algún otro consumidor que no está en este plan
  (busca antes: `grep -rn 'exentia_admin_bookings\|exentia_terapeutas_admin' --include='*.html' --include='*.json' exentia/` — si aparece en más archivos que `panel/web/index.html`, STOP).
- Orden importa: NO ejecutes el paso 3 antes de que los pasos 1-2 estén
  verificados y deployados.

## Maintenance notes

- Cualquier vista `public.exentia_*` nueva con PII debe nacer sin GRANT a anon
  y consumirse vía workflow JWT. Agregar esta regla a `exentia/CLAUDE.md`.
- Futuro: unificar admin-citas/admin-stats/admin-data en un solo endpoint con
  router — hoy son 3 workflows con el mismo bloque JWT copiado.
