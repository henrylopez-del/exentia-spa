# Handoff · Mi Cuenta del cliente (Exentia)

Contexto para el chat que trabaja `exentia/exentia-pagina.html`. Todo el backend ya existe y está activo — solo hay que cablear el frontend a los endpoints correctos y arreglar el bug de fecha.

---

## 1) Endpoint UNO que trae todo lo actualizado

`POST https://n8n-ntcue-clone-u59578.vm.elestio.app/webhook/exentia-cliente-me-v2`

- Header: `Authorization: Bearer <JWT_del_OTP>`
- Body: `{}` (el JWT trae `contactId` incrustado)

Cada llamada consulta **en vivo**:
- `GET /contacts/{id}` en GHL → nombre, email, teléfono, preferencias (customFields)
- `GET /rest/v1/exentia_bookings_dash?ghl_contact_id=eq.X` en Supabase → bookings actualizados (vista con JOIN, refleja reagendas al instante)

### Response shape (ya listo en el workflow)

```jsonc
{
  "ok": true,
  "contactId": "LKgYhxe3auh2AmewyKPD",
  "cliente": {
    "nombre": "victor",
    "apellido": "rodriguez",
    "email": "victor.rodriguez@ainnovation.com.mx",
    "telefono": "+529983463802",
    "preferencias": {
      "presion": "Media",              // Suave | Media | Fuerte | ''
      "aromas": "Aromas suaves",       // Sin aromas | Aromas suaves | Cualquier aroma | ''
      "genero": "Sin preferencia",     // Mujer | Hombre | Sin preferencia | ''
      "terapeuta_favorita": "",        // texto libre
      "zona": ""
    }
  },
  "citas": {
    "proximas": [ /* array de bookings futuras */ ],
    "historial": [ /* pasadas */ ]
  },
  "ghl_appointments": [ /* raw de GHL por si se necesita */ ]
}
```

Cada booking en `proximas` / `historial` trae:
```jsonc
{
  "booking_id": "...", "booking_code": "EX-...",
  "fecha_agendada": "2026-08-08",    // date string YYYY-MM-DD
  "hora_agendada": "19:00:00",       // time string HH:MM:SS
  "servicios": [...], "estado": "confirmado",
  "tipo_cita": "sucursal" | "domicilio",
  "cancel_token": "uuid-para-cancelar",
  "precio_total": 1800, "total_mxn": 1800,
  "zona": "Sucursal Plaza Hive",
  "direccion_libre": "...", "direccion_maps_url": "...",
  "ghl_appointment_id": "...",
  "cancelado_at": null, "cancelado_por": null
}
```

**Regla de oro**: no cachear en localStorage — llamar `me-v2` cada vez que el usuario abre "Mi Cuenta" (o al menos cada vez que abre un tab distinto), para reflejar reagendas hechas desde el panel admin.

---

## 2) BUG CRÍTICO: fecha se ve un día menos

Reproducido por Victor: reagendó cita al día 8, la página muestra día 7 en "Inicio" e "Mis citas".

**Causa**: en el frontend actual (`exentia-pagina.html` L15706-15883), hace `new Date(b.fecha_agendada)` con un string `"2026-08-08"`. JavaScript lo interpreta como **UTC midnight** = `2026-08-07 19:00` en Cancún → se muestra el día anterior.

**Fix ya validado** (aplicado en el panel admin, commit `61de183`). Reemplazar cualquier parseo directo de date puro:

```js
// ❌ ANTES (bug UTC):
const dt = new Date(b.fecha_agendada);

// ✅ AHORA (local):
function parseLocalDate(iso) {
  if (!iso) return null;
  const s = String(iso).slice(0, 10);
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return new Date(iso);
  return new Date(+m[1], +m[2] - 1, +m[3]);
}
const dt = parseLocalDate(b.fecha_agendada);
```

### Lugares del archivo que hay que revisar
- L15706 · filtro "próximas" (`.getTime() > now`)
- L15708 · sort por fecha
- L15874 · repartir en próximas/historial
- L15877 · sort próximas
- L15883 · construir Date para render de la card
- L13658 · `toLocaleDateString` — asegurar que el Date que se le pasa vino de `parseLocalDate`

Aplicar el mismo patrón en TODOS. `hora_agendada` viene como `"19:00:00"` — para mostrar hora, usar `hora.slice(0,5)` (evitar Date que causa shift también).

---

## 3) Preferencias · leer y escribir

### Leer (ya funciona con me-v2)
`cliente.preferencias.presion / aromas / genero / terapeuta_favorita` vienen directo del contact GHL vivo.

### Escribir (falta cableo — sugerencia)

El workflow `exentia-panel-cliente-sync` (id `sGoxLcoBx6c5UPIS`, path `/webhook/exentia-panel-cliente-sync`) hoy solo hace **GHL → Supabase** (one-way, para poblar cache local). No es el correcto para escribir.

Opciones:

**A) Escribir directo a GHL desde la página** (más simple, sin nuevo workflow):
```js
await fetch(`https://services.leadconnectorhq.com/contacts/${contactId}`, {
  method: 'PUT',
  headers: {
    'Authorization': 'Bearer <PIT_TOKEN>',
    'Version': '2021-07-28',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    customFields: [
      { id: 'rHdSeHlHubNzMbp2DBdS', value: 'Media' },        // presion
      { id: '4YZAwSfeUlJwBS45MfSs', value: 'Aromas suaves' }, // aromas
      { id: 'Ufj0CBEGwYouDqvcwPXD', value: 'Mujer' },        // genero_terapeuta
      { id: 'iNwalR0HFqAD9mZwy1Y0', value: 'Notas libres' }  // notas
    ]
  })
});
```
⚠️ Nunca exponer el PIT token público en el HTML. Necesita workflow proxy.

**B) Crear workflow `exentia-cliente-update-prefs`** (recomendado):
- POST webhook con `{ jwt, prefs: {presion, aromas, genero, notas} }`
- Verifica JWT (mismo patrón que `cliente-me-v2`)
- PUT a GHL con customFields por ID (mapa arriba)
- Retorna `{ok:true}` — el frontend recarga `me-v2` para refrescar UI

Si el otro chat elige B, avísale que use el mismo `secret HMAC` que ya usan los demás (`FzJCOMB4rVsl...`, 64 chars). Yo puedo crearlo cuando me digan.

### Custom Field IDs (GHL locationId `0hGSRrhxkdywVQxCsNOi`)

| Preferencia | Custom Field ID | Valores válidos |
|---|---|---|
| Presión preferida | `rHdSeHlHubNzMbp2DBdS` | `Suave` \| `Media` \| `Fuerte` |
| Aromas | `4YZAwSfeUlJwBS45MfSs` | `Sin aromas` \| `Aromas suaves` \| `Cualquier aroma` |
| Género terapeuta | `Ufj0CBEGwYouDqvcwPXD` | `Mujer` \| `Hombre` \| `Sin preferencia` |
| Notas libres | `iNwalR0HFqAD9mZwy1Y0` | texto |
| Terapeuta favorita | `8NF4Fr2eBbyNZOZD5qjr` | texto |

---

## 4) Mis Datos · editar teléfono (ya existe)

**Endpoint**: `POST /webhook/exentia-update-phone`

Body:
```json
{ "jwt": "<jwt del cliente>", "phone": "+529981234567" }
```

Verifica JWT, hace PUT a GHL `/contacts/{id}` con el nuevo phone y UPDATE a Supabase `exentia.bookings` para actualizar `cliente_telefono` en cualquier booking futura.

Ya está en `EXENTIA_CONFIG.WEBHOOK_UPDATE_PHONE` (L6561 del HTML). Falta wirear la UI de "Mis datos" al botón + form.

**Para editar nombre/email**: no hay workflow todavía. Si Victor lo quiere, decir para agregar `exentia-update-name` y `exentia-update-email` con mismo patrón (PUT GHL + UPDATE Supabase donde aplique).

---

## 5) Cancelar / Reagendar cita desde "Mis citas"

Ya existe:
- `POST /webhook/exentia-cancelar-cliente` — cancela con token. RPC devuelve `ghl_appointment_ids[]` y borra en GHL automáticamente.
- Para reagendar cliente-side no hay workflow — hoy solo puede desde el panel admin. Si Victor lo quiere, decir para agregar.

---

## 6) Session note (por si aparece)

`exentia-cliente-me` (viejo, id `Sd5Fi6yQU6edT1wI`) sigue activo con path distinto. Ignorarlo. **Solo usar `exentia-cliente-me-v2`.**

---

## Checklist para el otro chat

- [ ] Reemplazar cualquier `new Date(fecha_agendada)` por `parseLocalDate()` — fixea el "un día menos" en Inicio y Mis citas
- [ ] Reemplazar cualquier `new Date(hora_agendada)` por `.slice(0,5)` — evita mismo shift en el render de hora
- [ ] En "Mi Cuenta" reemplazar cache localStorage por `fetch('/webhook/exentia-cliente-me-v2')` en cada abrir/cambio de tab
- [ ] Renderizar preferencias desde `data.cliente.preferencias` (ya viene de GHL vivo)
- [ ] Wirear "Editar teléfono" → `POST /webhook/exentia-update-phone`
- [ ] (Opcional) Pedir a Victor si quiere workflow para editar preferencias / nombre / email
