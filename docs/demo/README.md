# Carga manual no destructiva en MockAPI

Este procedimiento es únicamente **manual** para quien necesite poblar el catastro de prueba desde el panel. La app no ofrece diagnóstico ni carga de ejemplos; permite enviar visitas aunque `/medidores` esté vacío, sin inventar detalles de medidores.

Inspección inicial real (2026-10-26): `GET /medidores` y `GET /lecturas` devolvieron `[]`. No se enviaron POST durante el desarrollo. No es posible deducir el esquema configurado desde una colección vacía.

1. En el panel del proyecto MockAPI configura recursos raíz `medidores` y `lecturas` si faltan (plural exacto; sin `/api/v1` salvo que cambies la URL base).
2. Configura los campos del modelo del README: strings, numbers y booleans reales, no números como texto. Para nullable conserva null en los POST; no uses Faker para cambiar campos durante una creación. `id` es el ID automático de MockAPI, nunca el código MED.
3. Consulta primero cada colección. Por cada objeto de `medidores.json`, busca **coincidencia exacta** por `codigo`. Sólo si falta, copia ese objeto individual y envía `POST /medidores`. No pegues un array como un único objeto. El ID lo genera MockAPI. No uses operaciones de reemplazo total, PUT sobre datos existentes ni DELETE.
4. Para `lecturas.json`, ajusta `periodo`, `fechaVisita`, `fechaRegistro` y el sufijo de `clientId` al mes local actual. La visita no debe ser futura. Consulta primero `lecturas` y omite la inserción si ya existe el mismo clientId **o** código/período exactos. Envía sólo el objeto que falte con `POST /lecturas`.
5. Vuelve a consultar y verifica que los campos enviados se conservan, incluido clientId. Si MockAPI elimina campos, corrige su configuración antes de usar la app.

Los archivos intencionadamente no incluyen `id`: son cuerpos de creación con el modelo exacto; los GET añaden el ID generado.

## Casos reproducibles
| Código | Acción y resultado esperado |
|---|---|
| MED-000001 | Actual 120 → consumo 20, sin anomalía. |
| MED-000002 | Actual 231 → consumo 31 > 3×10, exige foto y revisión. Actual 230 no es anomalía. Actual 199 bloquea por inconsistencia. |
| MED-000003 | Seleccionar inaccesible, indicar motivo, no guardar lectura numérica. |
| MED-000004 | Seleccionar dañado, describir daño y capturar foto. Lectura opcional. |
| MED-000005 | No consultar antes: activar modo avión, registrar 530, guardar en SQLite. Al reconectar consulta medidor y verifica 500 y promedio 25 antes de enviar. Si no existe todavía en catastro, envía la visita con valores anteriores null. |
| MED-000006 | Con el ejemplo de lectura del mes cargado, impedir segunda creación para ese mes. |

No cambies una lectura enviada para repetir pruebas: utiliza otro medidor o período válido y ajusta la fecha previa. Los ejemplos no se importan automáticamente ni simulan una sincronización exitosa.
