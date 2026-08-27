# Estado de conexiones de terapeutas

Avance del alta de las 8 terapeutas de Exentia en el CRM y la conexión de su calendario.

**Última actualización:** 2026-08-26

---

## Estado actual

| # | Terapeuta | Estado | Conexión calendario |
|---|---|---|---|
| 1 | Christian De León Domínguez | Inició sesión en el CRM | No conectado |
| 2 | María del Rosario Aragón Tuyú | Inició sesión en el CRM | No conectado |
| 3 | Naivy Buenfil Guerrero | Inició sesión en el CRM | No conectado |
| 4 | Erik Andrey Acquart Arenas | Inició sesión en el CRM | **Conectado** |
| 5 | Verónica Viridiana Lara Montoya | Inició sesión en el CRM | No conectado |
| 6 | Josefina Vaca Dávalos | Inició sesión en el CRM | No conectado |
| 7 | Aurelia García Ávalos | Correo enviado, pendiente | No conectado |
| 8 | Iber Dinora Hernández Ramírez | Correo enviado, pendiente de que confirmen en la reunión | No conectado |

**Resumen:** 6 de 8 dentro del CRM · 1 de 8 con calendario conectado.

Son dos pasos distintos: entrar al CRM es aceptar la invitación y poner contraseña; conectar el
calendario es autorizar Google para que las citas se sincronicen. Una terapeuta puede haber hecho
el primero y no el segundo.

---

## Datos de contacto

| Terapeuta | Teléfono | Correo | Usuario en el CRM |
|---|---|---|---|
| Aurelia García Ávalos | +52 998 300 5586 | aureliag273@gmail.com | `RAWVk0iuhNYRYNc1vq3x` |
| Christian De León Domínguez | +52 998 151 0032 | nein84chris@gmail.com | `1wWOSjax6tcg36ItMzKj` |
| Erik Andrey Acquart Arenas | +52 998 433 0542 | acquarte@gmail.com | `lAO31U9uFzT87gM4wKTZ` |
| Iber Dinora Hernández Ramírez | +52 998 134 0407 | ibergemela@gmail.com | `Gru9RXpfx8NfuLiXWomk` |
| Josefina Vaca Dávalos | +52 998 160 9980 | josydavalos@gmail.com | `lVKTUqbXpqOU6X4Mta1U` |
| María del Rosario Aragón Tuyú | +52 998 164 8776 | stormforever4you@gmail.com | `wquQ3wtVPflRd0lBnJGG` |
| Naivy Buenfil Guerrero | +52 998 192 9433 | naivy_buenfil@outlook.es | `n8JvmQ7zxmhcXKaquqrT` |
| Verónica Viridiana Lara Montoya | +52 998 399 1173 | profra.verolara@gmail.com | `drBEwwfY4KB6FYOD7Fde` |

Las ocho tienen rol `user`, que es el correcto para terapeutas. La única administradora es
Yazmin Agis (`Kmf717z48Z8f7akoBnz7`).

---

## Lo que falta para que el sistema las reconozca

Tener usuario en el CRM no basta. Para que reciban avisos y aparezcan en el panel hace falta:

**Registrarlas en la tabla del panel** (`exentia.terapeutas`). Ahí solo existen las dos cuentas
de prueba, así que el sistema todavía no sabe que estas ocho existen.

**Crearles contacto en el CRM.** El usuario y el contacto son cosas distintas: los avisos se
mandan a un *contacto*, no a un usuario. Christian y María del Rosario ya lo tienen con el tag
`masajista`; las otras seis no.

**Capturar su sexo.** El panel filtra las citas según lo que pidió el cliente, así que sin ese
dato no verían las citas que sí les corresponden.

---

## Permisos en el CRM

Para que cada terapeuta vea **solo lo que se le asignó** y no toda la base de contactos, la
combinación es:

| Ajuste | Valor |
|---|---|
| Contactos | Encendido |
| Conversaciones | Encendido |
| **Solo datos asignados** (`assignedDataOnly`) | **Encendido** |
| Acciones masivas | Apagado |
| Configuración | Apagado |

Encender Contactos parece contradictorio, pero es necesario: la conversación necesita leer el
contacto para mostrar de quién es. El filtro de datos asignados es lo que impide que vea los
demás.

**Dos cosas que hacen que parezca que no funciona:**

Los permisos viven en la sesión. Si no cierra sesión y vuelve a entrar, sigue viendo lo de antes.

El filtro depende de que el contacto tenga dueño asignado. Si una cita llega sin asignar, no
aparece para nadie.

Christian ya quedó configurado así, como prueba. Falta replicarlo en las otras siete.
