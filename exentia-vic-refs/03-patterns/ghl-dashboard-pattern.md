---
aliases: ["GHL Dashboard Pattern", "Patron Dashboard GHL"]
tags: [concept, pattern, ghl, dashboard]
family:
  - "[[balam-desayuno-mamas]]"
  - "[[sarahi.md|Sarahi UTM Dashboard]]"
created: 2026-04-21
---

# GHL Dashboard Pattern

Patrón probado para embeber dashboards HTML complejos (charts, tablas live, realtime) dentro de páginas de [[GHL]], esquivando las limitaciones brutales del page builder.

## El problema

GHL Custom Code tiene 4 venenos:

1. **Mojibake** — el code editor decodifica HTML entities a Unicode y re-encodea mal (UTF-8 → Mac Roman). Acentos español truenan (`Día` → `D√≠a`).
2. **CSS wrapper hostil** — inyecta `.c-section > .inner (max-width: 1170px)` que constriñe cualquier layout full-width.
3. **Scripts bloqueados** — `<script type="module">` bloqueado. Algunas CDNs también.
4. **Paste corrompido** — pegar >20KB de HTML con caracteres especiales a veces se trunca o mangle.

## La solución: iframe con srcdoc inline

En vez de pegar el HTML directo a GHL, se mete DENTRO de un iframe como `srcdoc` attribute.

```html
<iframe srcdoc="<html completo aquí, " escapado como &quot;>"></iframe>
```

Ventajas:
- **Iframe es sandbox** — GHL no toca el CSS interno
- **srcdoc se parsea como HTML** cuando el browser renderiza, no cuando GHL lo procesa
- **Spanish text en unicode escapes JS** (`\u00e9`) = ASCII puro en source = zero mojibake
- **No necesita hosting externo** — todo inline

## Las 2 variantes de la familia

### Variante A: HTML hosteado externo (Sarahi)
Si el repo es **público**, se puede hostear en GitHub Pages:
- Pipeline: `dashboard.html` en repo → GitHub Pages → iframe `src="..."` en GHL
- Ejemplo: [[sarahi.md|Sarahi UTM Dashboard]]
- URL: `https://henrylopez-del.github.io/sarahi-dashboard/`
- Mejor para dashboards que cambian frecuentemente (redeploy = push)

### Variante B: srcdoc inline (Balam)
Si el repo es **privado** o no quieres infra externa:
- Pipeline: `dashboard.html` → escape `"` → injectar como atributo srcdoc → un solo `<iframe srcdoc="...">` en GHL
- Ejemplo: [[balam-desayuno-mamas]]
- Mejor para dashboards one-shot o con datos muy sensibles

## Recetas técnicas

### 1. Escape del GHL wrapper (siempre usar)
```css
#my-dash {
  position: fixed !important;
  top: 0 !important; left: 0 !important;
  width: 100vw !important; height: 100vh !important;
  z-index: 2147483647 !important;
}
body { overflow: hidden !important; }
.c-section, .c-row, .c-column, .c-custom-code, [class*="c-section"],
[class*="c-row"], [class*="c-column"], [class*="c-custom-code"] {
  max-width: 100vw !important; width: 100vw !important;
  padding: 0 !important; margin: 0 !important;
  background: transparent !important; border: none !important;
}
```

### 2. Anti-mojibake en textos español
```js
// MAL (se mojibakea al pegar):
element.textContent = 'Día de la Madre';

// BIEN (ASCII puro en source):
element.textContent = 'D\u00eda de la Madre';
```

Y en HTML estático **cero texto español** — solo placeholders `<div id="t-title"></div>` que se llenan por JS al cargar.

### 3. Realtime con Supabase
```html
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script>
  var sb = window.supabase.createClient(URL, PUBLISHABLE_KEY);
  sb.channel('dash')
    .on('postgres_changes',
        { event: '*', schema: 'public', table: 'tu_tabla' },
        () => fetchStats())
    .subscribe();
</script>
```

Requiere:
- Tabla agregada a `publication supabase_realtime` (`ALTER PUBLICATION supabase_realtime ADD TABLE ...`)
- RLS policy que permita SELECT al publishable role (o disable RLS si es safe)
- Publishable key (NO service_role) en el HTML

### 4. Stats view pattern
Crear una view agregada que el dashboard consulta (en vez de hacer múltiples queries):

```sql
CREATE VIEW public.tu_stats AS
SELECT
  (SELECT COUNT(*) FROM public.opens) AS aperturas,
  (SELECT COUNT(*) FROM public.rsvp) AS total,
  (SELECT COUNT(*) FROM public.rsvp WHERE status='x') AS x_count,
  ...;

GRANT SELECT ON public.tu_stats TO anon, authenticated;
```

Una sola fetch → todos los KPIs.

### 5. Charts
Chart.js 4 via CDN UMD (no module):
```html
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
```

Funciona. Soporta donut, line, bar. Respeta la paleta de la marca.

### 6. Tabla realtime con scroll
- `<thead>` con `position: sticky; top: 0; z-index: 2` para header flotante
- `<tbody>` dentro de `.table-wrap { overflow-y: auto }`
- Animación `@keyframes rowIn` en tr para feedback visual al llegar nueva fila

## Stack mínimo para un dashboard así

1. **Supabase** para data + realtime
2. **Chart.js** para charts
3. **Supabase JS SDK** para WebSocket
4. **Google Fonts** (Fraunces + Manrope + JetBrains Mono recomendado)
5. **GHL Custom Code** con iframe srcdoc

## Paleta recomendada por tipo de cliente

| Cliente | Paleta | Ejemplo |
|---|---|---|
| Escuela premium | Navy + orange + ivory | [[balam-desayuno-mamas]] |
| Servicios B2C editorial | Cream + rose + charcoal | Arqalum |
| Dashboards utilitarios | GHL brand colors del cliente | [[sarahi.md|Sarahi]] |

## Cuándo usar este patrón
- Dashboards admin/client-facing en GHL
- Landing pages complejas (con charts o live data)
- Cuando GHL's native page builder no alcanza
- Eventos con RSVP + QR check-in + analytics

## Cuándo NO usar
- Forms simples (usar GHL Form nativo)
- Contenido estático (Custom Code funciona para HTML simple)
- Páginas donde el SEO importa (iframe srcdoc no indexa bien)

## Ver también
- [[balam-desayuno-mamas]] — variante B (srcdoc inline)
- [[sarahi.md|Sarahi UTM Dashboard]] — variante A (hosted)
- [[feedback/ghl-mojibake-fix]]
- [[feedback/iframe-srcdoc-bulletproof]]
- [[GHL]] · [[Supabase]]
