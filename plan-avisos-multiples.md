# Plan · un mismo aviso a varias terapeutas

Cómo pasar los avisos de "un mensaje a un número" a "el mismo mensaje a cada terapeuta
que corresponda", filtrando por sexo.

**Fecha:** 2026-08-27
**Respaldo previo:** `exentia/respaldos/avisos-multiples-2026-08-27/` (11 flujos)

---

## La idea en una frase

En n8n, **un nodo se ejecuta una vez por cada fila que recibe**. Entonces no hace falta
programar un ciclo: basta con que al nodo que envía le lleguen N filas en vez de una.

```
Hoy:   [arma mensaje] → 1 fila → [enviar] → 1 mensaje al número fijo
Nuevo: [consulta terapeutas] → [arma mensaje] → N filas → [enviar] → N mensajes
```

---

## Los tres cambios por flujo

### 1. Un nodo nuevo de consulta: "Terapeutas a avisar"

Se inserta justo antes del nodo que arma el mensaje. Devuelve una fila por terapeuta:

```sql
SELECT nombre, sexo, ghl_contact_avisos AS contact_id
FROM exentia.terapeutas
WHERE activo = true
  AND ghl_contact_avisos IS NOT NULL
ORDER BY nombre;
```

Sin parámetros ni filtros: trae a todas las activas. El filtro por sexo se aplica en el
paso siguiente, para no chocar con el problema conocido de los parámetros de Postgres
en n8n.

### 2. El nodo que arma el mensaje: recorre las filas y filtra

Cambia de devolver un mensaje a devolver una lista. El texto se arma igual que hoy, solo
que se repite por cada terapeuta que pase el filtro.

```js
const terapeutas = $input.all().map(i => i.json);
const cita = $('Revisar cupos 1').first().json;   // el nodo que traía la cita

function normSexo(v) {
  const s = (v || '').toString().toLowerCase().trim();
  if (s === 'f' || s === 'femenino' || s === 'mujer')  return 'mujer';
  if (s === 'm' || s === 'masculino' || s === 'hombre') return 'hombre';
  return '';                       // indistinto, mixto o vacío
}

const pedido = normSexo(cita.preferencia_sexo);
const texto  = /* el mismo texto que ya se armaba hoy */;

return terapeutas
  .filter(t => {
    if (!pedido) return true;                    // la cita no pide sexo → todas
    if (!normSexo(t.sexo)) return true;          // terapeuta sin sexo → recibe todo
    return normSexo(t.sexo) === pedido;
  })
  .map(t => ({ json: { contact_id: t.contact_id, nombre: t.nombre, message: texto } }));
```

### 3. El nodo que envía: usa el contacto de cada fila

```diff
- "contactId": "l3XxNhQvAK7eWxFJcTGj"
+ "contactId": {{ JSON.stringify($json.contact_id) }}
```

Nada más. El resto del nodo queda igual.

---

## Cómo queda el filtro por sexo

| La cita pide | Reciben el aviso |
|---|---|
| mujer | solo las terapeutas mujer |
| hombre | solo los terapeutas hombre |
| indistinto, mixto o vacío | todas |

Una terapeuta sin sexo capturado recibe todo. Es a propósito: es preferible que le llegue
un aviso de más a que se quede sin trabajo por un dato faltante. Es la misma regla que ya
usa el panel para decidir qué citas mostrarle a cada quien.

**Ejemplo.** Cita de mujer, con Calendario Dos (mujer) y Vez Test (hombre) activos:
la consulta devuelve 2 filas, el filtro deja 1, y sale 1 mensaje. Si la cita fuera
indistinta, saldrían 2.

**De dónde sale el dato:** `bookings.preferencia_sexo`, y en citas de varias personas
también `booking_slots.preferencia_sexo` (cada persona puede pedir distinto). Donde la
consulta de la cita todavía no lo traiga, hay que agregarlo al `SELECT`.

---

## En qué flujos aplica

**Avisos de cita disponible — van a todas las que pasen el filtro:**

| Flujo | Qué avisa |
|---|---|
| `exentia-panel-assignment-sequence` | Recordatorios de cita sin cubrir (4 rondas) |
| `exentia-reserva` | Reserva nueva pagada |
| `exentia-cita-creada` | Cita creada desde el CRM |
| `exentia-page-agendar-cita` | Cita agendada desde la página |
| `exentia-panel-release` | Alguien soltó una cita |
| `exentia-panel-admin-create-cita` *(apagado)* | Cita creada por la administradora |
| `exentia-panel-cron-assignment-reminders` *(apagado)* | Recordatorio de citas sin cubrir |

**Van a una sola persona — no llevan filtro de sexo, solo cambia el destinatario:**

| Flujo | A quién |
|---|---|
| `exentia-panel-claim` | A todas, como confirmación de que la cita se ocupó |
| `exentia-panel-admin-actions` | A la terapeuta afectada por el cambio |
| `exentia-prep-complete` | A la terapeuta asignada |
| `exentia-panel-incomplete-digest` | A Yaz: es información de gestión, no una oferta de trabajo |

---

## Antes de empezar: dos arreglos

**El contacto de Vez Test para entrar al panel ya no existe.** En la tabla apunta a
`AFu2iJz7W5nSClMwRCtY`, que se borró. Recibiría los avisos pero no podría entrar: error 403.
Se corrige apuntándolo a `wthwMBssydZu3bMcTfel`, el mismo que ya usa para avisos.

**Las esperas están en 1 minuto y deberían ser 15.** Se bajaron para poder probar sin
esperar una hora. Con el envío múltiple el efecto se multiplica: cada terapeuta recibiría
cuatro avisos en cuatro minutos.

---

## Las dos de prueba

| Nombre | Sexo | Teléfono | Correo | Contacto de avisos |
|---|---|---|---|---|
| calendario dos | mujer | +52 998 300 7969 | ceprintdo@gmail.com | `7ALCJAIKXW4HF3cvIUFL` |
| vez test | hombre | +52 998 828 4498 | vrodriguezpoot98@gmail.com | `wthwMBssydZu3bMcTfel` |

Sirven para probar el filtro completo: una de cada sexo.
