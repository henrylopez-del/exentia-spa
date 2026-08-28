# Plan · que la página no sobrescriba los datos del equipo

Evitar que una reserva hecha desde la página pública cambie el correo, el nombre o el
teléfono de alguien del equipo, y con eso le tumbe el acceso al panel.

**Fecha:** 2026-08-28
**Alcance:** un solo flujo de n8n, `exentia-reserva`. No se toca la página ni el panel.

---

## El problema

Al reservar, la página llama a `POST /contacts/upsert` mandando nombre, correo y teléfono.
GHL identifica a la persona **por teléfono o por correo** y **sobrescribe** esos campos.

Si una terapeuta reserva con su teléfono de siempre pero escribe otro correo, su contacto
queda con ese correo nuevo. Ahí se rompen dos cosas:

- **El acceso al panel.** El login busca el correo entre los contactos con tag `masajista`
  o `admin`. Si el correo cambió, ya no la encuentra.
- **Los correos que le mandamos**, que salen a la dirección nueva.

Los avisos por WhatsApp no se rompen: van por el identificador del contacto, que no cambia.

Ya pasó dos veces durante las pruebas, y el contacto `victor google` quedó con el tag
`agendo-cita` encima del de `masajista`.

---

## La regla

> Si el contacto trae `staff`, `masajista` o `admin`, la reserva **no le escribe nada**.
> Usa el contacto que ya existe y sigue de largo.

Lo que la persona escriba en el formulario **sí se guarda en la cita**. Lo único protegido
es su ficha del CRM. Es la opción A de las dos que se plantearon: no se pierde información,
y en el panel se ve lo que la persona capturó.

---

## Cómo queda el flujo

Hoy:

```
Normalize → ¿tiene datos cliente? → Upsert Contact GHL → Merge GHL ID → Postgres
```

Después:

```
Normalize → ¿tiene datos cliente? → Buscar contacto existente → ¿es del equipo?
                                                                  ├── sí → Merge GHL ID
                                                                  └── no → Upsert Contact GHL → Merge GHL ID
```

Dos nodos nuevos. El resto no se mueve.

---

## Los nodos

### 1. `Buscar contacto existente` — HTTP Request, GET

```
https://services.leadconnectorhq.com/contacts/search/duplicate
  ?locationId=0hGSRrhxkdywVQxCsNOi
  &number={{ telefono }}
  &email={{ correo }}
```

Headers: `Authorization: Bearer <API key Exentia>` y `Version: 2021-07-28`.

Devuelve `contact` con sus `tags`, o `contact: null` si no existe. Es el mismo criterio de
coincidencia que usa el upsert, así que no hay forma de que uno encuentre a la persona y el
otro no.

Va con **`onError: continueRegularOutput`**: si la consulta falla, la reserva debe seguir,
no quedarse trabada.

Probado contra la cuenta real: encuentra por teléfono y por correo, y trae los tags.

### 2. `¿es del equipo?` — IF

```js
{{ (($json.contact && $json.contact.tags) || [])
     .map(t => String(t).toLowerCase().trim())
     .some(t => ['staff','masajista','admin'].includes(t)) }}
```

- **Verdadero** → directo a `Merge GHL ID`
- **Falso** → a `Upsert Contact GHL`, como hoy

### 3. `Merge GHL ID` — ajuste de una línea

Hoy lee el id del resultado del upsert. Tiene que aceptar también el de la búsqueda:

```js
const upsertId = ghlResp?.contact?.id || ghlResp?.contactId || null;
```

Esa línea ya sirve para los dos casos, porque la búsqueda de duplicados devuelve la
respuesta con la misma forma (`contact.id`). **Conviene verificarlo en la primera prueba**
antes de darlo por hecho.

---

## Qué cambia para cada quien

| Quién | Qué pasa |
|---|---|
| Cliente normal | Nada. Se crea o actualiza su contacto igual que hoy |
| Alguien del equipo | Su cita se guarda completa y vinculada. Su ficha no se toca |

La persona del equipo **sigue recibiendo la confirmación de su cita**, pero al correo que
tiene registrado, no al que escribió. Que es lo correcto.

**Lo que se deja de actualizar para el equipo:** unos campos de marketing en su ficha
(servicio elegido, zona, origen de la visita). Son para campañas y no aplican a alguien
que trabaja ahí. La cita no pierde nada: todo eso se guarda completo en la base.

---

## Cómo probarlo

1. **Cliente nuevo.** Reservar con un correo y teléfono que no existan. Debe crearse el
   contacto y llegar la confirmación. Sin cambios respecto a hoy.
2. **Alguien del equipo.** Reservar con el teléfono de una terapeuta pero escribiendo otro
   correo. Revisar que su contacto **conserve** su correo original y que la cita quede
   guardada y vinculada a ella.
3. **Acceso al panel.** Después de esa reserva, entrar al panel con su correo de siempre.
   Debe funcionar. Hoy fallaría.
4. **Al revés.** Reservar con su correo pero otro teléfono. Su teléfono debe quedar intacto.

Para las pruebas usar el teléfono de Victor, `+52 998 346 3802`, según la regla del proyecto.

---

## Lo que esto no resuelve

Si una terapeuta cambia de correo de verdad, el sistema ya no lo aprende solo desde la
página: alguien tiene que actualizarlo en el CRM. Es a propósito.

Y el acceso al panel **sigue dependiendo del contacto de GHL**. Este plan evita que se
altere, pero el arreglo de fondo es mover la identidad a `exentia.terapeutas`, que nadie
puede escribir desde la página pública. Eso queda como segundo paso.

---

## Respaldo

El estado actual del flujo está en
`exentia/respaldos/avisos-multiples-2026-08-27/exentia-reserva.json`.

Para revertir: `PATCH /rest/workflows/vd8O2EZPPvsbxh99` con `{name, nodes, connections,
settings}`, y como está activo, desactivar y volver a activar con el `versionId` en el body.
