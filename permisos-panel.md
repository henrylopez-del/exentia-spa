# Permisos del panel por rol

Cómo se controla qué ve cada rol en el panel de Exentia, y dónde tocar cuando haya que
agregar una restricción nueva.

**Última actualización:** 2026-08-26

---

## Los dos roles

| Rol | Quién | Workflow que le responde |
|---|---|---|
| `masajista` | Las terapeutas | `exentia-panel-citas` |
| `admin` | Yazmin | `exentia-panel-admin-citas` |

Son **workflows separados**, y esa separación es la base de todo el esquema: el panel de
administrador no pasa por el filtro, así que ve todo sin que haya que programarle excepciones.

El rol viene firmado dentro del JWT de sesión. El panel de terapeutas rechaza cualquier token
que no diga `masajista`, así que un admin no puede entrar por esa puerta ni al revés.

---

## Dónde se controla

Un solo lugar: el nodo **`Ensamblar respuesta`** de `exentia-panel-citas`, arriba del todo.

```js
const ROL = 'masajista';
const CAMPOS_RESTRINGIDOS = {
  masajista: ['cliente_telefono', 'cliente_email']
};

function aplicarPermisos(item) {
  const ocultar = CAMPOS_RESTRINGIDOS[ROL] || [];
  if (!ocultar.length || !item || typeof item !== 'object') return item;
  const visible = Object.assign({}, item);
  ocultar.forEach(function (campo) { delete visible[campo]; });
  return visible;
}
```

Se aplica al final, justo antes de responder:

```js
const pool = poolRows.map(mapPoolSlot).filter(...).map(aplicarPermisos);
const mias = miasRows.map(mapMiaSlot).map(aplicarPermisos);
const ocupadas_ajenas = busyRows.map(mapBusy).map(aplicarPermisos);
```

**Para agregar una restricción:** mete el nombre del campo en la lista. Nada más.
**Para levantarla:** quítalo.

Como el filtro corre al final y cubre las tres listas, no hay que tocar los mapeos ni
acordarse de replicar la regla en cada uno.

---

## Por qué se filtra en el servidor y no en el navegador

Si el dato se ocultara solo con CSS o JavaScript en el panel, seguiría viajando en la respuesta
y cualquiera podría verlo abriendo las herramientas del navegador. Al borrarlo antes de
responder, el dato **nunca sale del servidor**.

El panel ya maneja el caso de que el campo no venga, así que quitarlo no rompe nada.

---

## Qué está restringido hoy

| Dato | Terapeuta | Administración |
|---|---|---|
| Nombre del cliente | Sí lo ve | Sí |
| **Teléfono** | **No** | Sí |
| **Correo** | **No** | Sí |
| Dirección y mapa | Sí lo ve | Sí |
| Notas del cliente | Sí lo ve | Sí |
| Servicios, precio, horario | Sí lo ve | Sí |

La dirección se deja visible a propósito: sin ella no podría llegar a una cita a domicilio.

En el panel, donde antes iba el teléfono y el correo ahora dice *"Solo visible para
administración"*, en vez de un guion que parecería un dato faltante.

---

## Los avisos de WhatsApp al equipo

**Regla:** un aviso al equipo **no lleva datos de contacto del cliente**: ni su teléfono, ni su
correo, ni enlaces a su WhatsApp.

**El nombre del cliente sí se muestra**, autorizado por Yaz el 2026-08-26, y es lo que
identifica la cita en los mensajes. El código de reserva (`EX-XXXXXXXX`) se quedó solo en el
panel y en el enlace; en el texto del mensaje no aparece, porque para el equipo el nombre dice
más que un código.

La distinción es entre **identificar** y **contactar**: el nombre sirve para saber de qué cita
se habla; el teléfono y el correo permitirían contactar al cliente por fuera, y eso es lo que
se restringe.

**El nombre de la masajista sí se muestra.** El equipo necesita saber quién tomó o liberó cada
cita para coordinarse. La restricción es sobre el cliente, no sobre ellas.

Siete flujos llevaban datos personales en sus avisos y se corrigieron:

| Workflow | Qué llevaba |
|---|---|
| `exentia-panel-assignment-sequence` | Nombre del cliente y enlace a su WhatsApp |
| `exentia-panel-release` | Nombre del cliente |
| `exentia-page-agendar-cita` | Enlace al WhatsApp del cliente |
| `exentia-cita-creada` | Enlace al WhatsApp del cliente |
| `exentia-reserva` | Enlace al WhatsApp del cliente |
| `exentia-panel-incomplete-digest` | Nombre y teléfono de hasta 15 clientes por resumen |
| `exentia-panel-cron-assignment-reminders` | Enlace al WhatsApp del cliente |

**Lo que sí conserva nombres, a propósito:** los mensajes y correos dirigidos **al cliente**
(`Formato SMS cliente`, `Build email cliente`, `Prep mensaje cliente`). Ahí su nombre es
necesario y no hay a quién exponérselo. No confundir unos con otros al revisar.

`exentia-panel-admin-actions` menciona el nombre de la masajista, pero solo dentro de un
registro interno de errores, no en un mensaje enviado. No es fuga.

---

## Los otros flujos del panel, revisados

| Workflow | Situación |
|---|---|
| `exentia-panel-release` | No devuelve datos de contacto |
| `exentia-panel-slot-status` | No devuelve datos de contacto |
| `exentia-panel-cancel-booking` | No devuelve datos de contacto |
| `exentia-panel-claim` | Los tiene, pero para mandarle correo **al cliente**, no para responder al panel |
| `exentia-panel-view-as` | Exige rol `admin` para impersonar |

Ninguno abre una puerta por atrás.

---

## Si mañana hacen falta más roles

Hoy `ROL` está fijo en `'masajista'` porque este workflow solo sirve a ese panel. Si en algún
momento un mismo workflow tuviera que atender a varios roles, basta con leer el rol del JWT:

```js
const ROL = ($('Verificar JWT').item.json.role) || 'masajista';
```

y agregar la entrada correspondiente en `CAMPOS_RESTRINGIDOS`. El resto del esquema no cambia.

**Regla de seguridad:** si el rol llegara vacío o desconocido, el filtro debe caer en el más
restrictivo, nunca en el más permisivo. Por eso el valor por defecto es `masajista` y no `admin`.

---

## Respaldos

Estado previo a estos cambios, en `exentia/respaldos/`:

- `wf-panel-citas-antes-permisos.json`
- `wf-assignment-antes-permisos.json`
- `panel-index-antes-permisos.html`
