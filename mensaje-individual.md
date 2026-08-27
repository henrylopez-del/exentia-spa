# Avisos individuales por terapeuta

Plan para dejar de mandar los avisos de Exentia a un grupo de WhatsApp y mandarlos a cada
terapeuta por separado.

**Estado:** hecho en dos flujos, pendiente en ocho.
**Fecha:** 2026-08-26

---

## Por qué

El sistema mandaba todos sus avisos a un único contacto del CRM llamado *Group: Citas*
(`6TUyfgsNz0SEWyJwTHlP`, +1 305 555 7156), que representaba el grupo de WhatsApp del equipo.
Se decidió eliminar ese grupo, así que cada terapeuta debe recibir su propio mensaje.

Existe un segundo contacto de grupo más viejo, *Avisos Panel* (`l3XxNhQvAK7eWxFJcTGj`), que
todavía usa un flujo.

---

## Cómo se implementa

No hace falta agregar nodos ni bucles explícitos. En n8n **un nodo se ejecuta una vez por
cada fila que recibe**, así que basta con hacer que lleguen más filas.

**1. La consulta multiplica por terapeuta.** Se le agrega al final:

```sql
JOIN exentia.terapeutas t
  ON t.activo = true
 AND t.ghl_contact_id IS NOT NULL
```

La misma cita sale repetida una vez por terapeuta activa, y cada copia trae pegado el
contacto de esa persona.

**2. El envío usa el contacto de cada fila** en lugar del fijo:

```
"contactId": {{ JSON.stringify($json.terapeuta_contact_id) }}
```

**3. El nodo que arma el mensaje debe recorrer todas las filas.** Este es el punto donde
falló la primera versión: usaba `$input.first()`, que se queda solo con la primera fila y
descarta el resto, así que los mensajes se iban todos al mismo contacto. Tiene que ser:

```js
const filas = $input.all();
return filas.map(function(item){ ... });
```

**4. Lo mismo aplica al nodo que interpreta la respuesta del envío.** Con `$input.first()`
solo registra uno; debe usar `$input.item`.

### Cuidado con los saltos de línea

Al escribir el código JavaScript desde un script de Python, los backslashes se escapan de
más y el mensaje llega con `\n` literal en vez de saltos de línea, y las fechas sin
formatear. La forma segura es evitar backslashes por completo:

```js
const NL = String.fromCharCode(10);           // en vez de '\n'
const t = String(fecha).slice(0,10).split('-'); // en vez de una expresión regular
```

---

## Los diez flujos que apuntaban al grupo

### Avisos de cita disponible — van a todas las terapeutas

| Flujo | Qué avisa | Estado |
|---|---|---|
| `exentia-panel-assignment-sequence` | Recordatorios de cita sin cubrir (4 rondas) | **hecho** |
| `exentia-reserva` | Reserva nueva pagada | pendiente |
| `exentia-cita-creada` | Cita creada desde el CRM | pendiente |
| `exentia-page-agendar-cita` | Cita agendada desde la página | pendiente |
| `exentia-panel-cron-assignment-reminders` *(inactivo)* | Recordatorio de citas sin cubrir | pendiente |
| `exentia-panel-admin-create-cita` *(inactivo)* | Cita creada por la admin | pendiente |

Todos son el mismo caso y se resuelven con el patrón de arriba.

### Confirmación a quien toma la cita

| Flujo | Qué avisa | Estado |
|---|---|---|
| `exentia-panel-claim` | Alguien tomó la cita | **hecho** |

Se cambió de aviso al grupo en tercera persona a confirmación personal:

```
Listo Calendario, la cita de las 12:00 am es tuya.

Puedes verla en el panel:
https://exentiaspabeauty.com/panel?b=EX-PRUEBA1
```

Cuando la cita es de varias personas y aún faltan lugares, avisa cuántas compañeras faltan.

### Cambios de estado — falta decidir el destinatario

| Flujo | Qué avisa | Propuesta |
|---|---|---|
| `exentia-panel-release` | Alguien soltó una cita | A las demás terapeutas, para que puedan tomarla |
| `exentia-panel-admin-actions` | La admin reagendó o canceló | A la terapeuta afectada |
| `exentia-prep-complete` | El cliente llenó su formulario previo | A la terapeuta asignada |

**Decisión pendiente:** cuando alguien libera una cita o la admin cancela, ¿se enteran las
demás terapeutas, solo la afectada, o Yaz? Cambia a quién le suena el teléfono.

### Resumen administrativo — a Yaz

| Flujo | Qué avisa | Propuesta |
|---|---|---|
| `exentia-panel-incomplete-digest` | Resumen diario de citas sin cubrir | Al contacto de Yaz |

No debe ir a las terapeutas: es información de gestión, no una oferta de trabajo.

---

## Hallazgos aparte

**El código de acceso al panel no llega a quien lo pide.** `exentia-cliente-otp-request`
manda el OTP al contacto de avisos con el número de Victor, con el texto *"OTP Exentia para
{correo}: {código}"*. Parece dejado así a propósito para poder probar, pero en producción
ninguna terapeuta podría entrar por esa vía. Hay que apuntarlo al contacto que lo solicita.

**La espera de los recordatorios quedó en 1 minuto.** El original era 15. Se bajó para poder
probar sin esperar una hora. Tal como está, las terapeutas recibirían cuatro avisos en cuatro
minutos. **Hay que devolverlo a 15 antes de producción** (TASK-212).

Los nodos se llaman "Esperar minuto 1", "minuto 2", etc., pero eso es solo el nombre: el
valor real siempre fue 15 minutos. Confunde y vale la pena renombrarlos.

**Nadie se entera de que una cita se ocupó.** Con el grupo eliminado, esa función se perdió.
Hoy solo le llega confirmación a quien la tomó. Si Yaz necesita visibilidad, hay que decidirlo.

---

## Datos de referencia

**Terapeutas en la tabla del panel** (`exentia.terapeutas`):

| Nombre | Teléfono | Contacto CRM | Activo |
|---|---|---|---|
| Calendario Dos | +52 998 346 3802 | `O8zNg34waZ6DD6IyH1os` | sí |
| Test Victor | +52 998 828 4498 | `wthwMBssydZu3bMcTfel` | no |

Las ocho terapeutas reales tienen usuario en el CRM con su teléfono, pero **no están en esta
tabla**, así que el sistema no les manda nada todavía (TASK-213). Solo dos de ellas tienen
contacto creado en el CRM.

**Roles del panel.** El panel hereda el rol de GHL: `admin` entra como administrador,
`user` como masajista. Para hacer admin a alguien basta cambiarle el rol en el CRM. Hoy la
única admin es Yazmin.

**Link del panel:** `https://exentiaspabeauty.com/panel?b=CÓDIGO`
(antes apuntaba a GitHub Pages, ya corregido en los flujos tocados)

**Respaldos** de los dos workflows modificados, por si hay que revertir:
`/tmp/wf-assign-BACKUP.json` y `/tmp/wf-claim-BACKUP.json`
