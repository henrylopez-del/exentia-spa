# Correcciones Yaz · 2026-05-23

Revisión de la página live https://exentiaspabeauty.com/ después del aviso del primer avance.

---

## 1. Subtítulo del logo no se lee — falta contraste ✅ APLICADO

**Lo que se ve:** el texto "SPA & BEAUTY SALON" bajo el logo `exentia` aparecía muy tenue contra el fondo crema, casi invisible.

**Solución aplicada:** el navbar usaba un `<img class="nav-logo">` (PNG con el subtítulo bakeado en color muy claro, no editable por CSS). Lo reemplacé por logo HTML/CSS texto que sí permite controlar color:

- Reemplazo en HTML del `<img>` por `<span class="nav-logo-text"><span class="logo">exentia</span><span class="sub">SPA &amp; BEAUTY SALON</span></span>`.
- Nuevo CSS `.nav-logo-text` con `font-size: 34px` (desktop) / 26px (mobile) para el wordmark y subtitle en color **brown #5c3a1e** (contraste fuerte vs cream).
- Bonus: actualicé también `.modal-header .sub` (color `--olive` → `--brown`) para misma mejora en los modales.

**Verificado:** logo y subtítulo renderizan con color `rgb(92, 58, 30)` (= #5C3A1E brown), font-size correcto.

---

## 2. Info de cada servicio también en el modal de reserva ✅ APLICADO

**Lo que se veía:** en la sección **SERVICIOS** de la home cada card tiene nombre + descripción + tiempo + precio. En el **modal de reserva** solo aparecía checkbox + nombre + tiempo + precio. Faltaba la descripción.

**Solución aplicada:** dentro del template de `renderSelectView()` agregué `${t.desc ? `<div class="desc">${t.desc}</div>` : ''}` justo debajo del nombre del treatment. CSS nuevo `.sv-treat .desc` con `font-size: 12.5px`, `color: var(--text-light)`, line-height confortable.

**Verificado:** el primer treatment de Masajes ahora muestra `"Nuestra técnica signature que combina relajación profunda y renovación corporal."`. Aplica a los 6 masajes + a todas las categorías.

---

## 3a. Copy de contexto dentro del modal (masajes / faciales / spakids) ✅ APLICADO

**Lo que dice Yaz:** "No todo mundo le da scroll más abajo y se mete sección por sección, y si desde el inicio le dan reservar, se siente que hace falta información para elegir." Aplicar solo a Masajes, Faciales, SpaKids.

**Solución aplicada:** en `renderSelectView()`, dentro del bloque `.sv-treatments` (accordion), antes de iterar los treatments, agregué un check:

```js
const showIntro = ['masajes', 'faciales', 'spakids'].includes(s.slug);
if (showIntro && s.shortDesc) {
  html += `<div class="sv-intro">${s.shortDesc}</div>`;
}
```

El copy usado es el `shortDesc` que ya estaba en la data de cada categoría. CSS `.sv-intro` con fondo cream-soft, border-left olive, italic Cormorant — visualmente integrado al diseño.

También bumpé `.sv-treatments.open { max-height: 600px → 1400px }` para no recortar el accordion con el contenido extra.

**Verificado:** intro aparece en Masajes ("Relajación profunda con piedras calientes..."), Faciales, SpaKids. NO aparece en Uñas, Cabello, etc. (correcto).

---

## 3b. Sugerencia de Yaz: sección Promociones / Paquetes ⏸️ PENDIENTE DECISIÓN + CONTENIDO

**Lo que dice Yaz:** "Como sugerencia (claro es muy tuya la decisión) siento que siempre jala mucho tener una sección de promociones y/o paquetes en el sitio".

**Estado:** decisión pendiente del equipo + necesita contenido de Yaz (lista de promos/paquetes vigentes). Cuando se apruebe se levantará como ticket aparte:
- Nueva sección "Promociones" en home (o pestaña en menú)
- Cards de combos/paquetes (ej: masaje + facial, paquete novia)
- Posible custom field GHL `exentia_paquete_elegido` para tracking

---

## Resumen final

| # | Acción | Estado |
|---|---|---|
| 1 | Contraste subtítulo logo navbar + modales | ✅ Aplicado y verificado |
| 2 | Descripción por servicio en items del modal | ✅ Aplicado y verificado |
| 3a | Copy contextual en categorías masajes/faciales/spakids | ✅ Aplicado y verificado |
| 3b | Sección Promociones/Paquetes | ⏸️ Espera decisión + contenido Yaz |

**Cambios en archivo:** `exentia-pagina.html` (HTML + CSS + JS, todo inline).

**Próximo paso:** revisar visualmente en localhost o live, luego commit + push.
