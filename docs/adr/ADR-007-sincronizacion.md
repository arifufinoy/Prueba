# Serializar envíos y reconciliar incertidumbre sin repetir POST a ciegas
Estado: aceptada para reconciliación e idempotencia cliente; política de catastro previo sustituida por ADR-011. Revisión de reintento verificado: 2026-10-27. Fecha original: 2026-10-26. Requisitos: R4, R6, R9, R10.
## Contexto
Un timeout no demuestra ausencia remota; MockAPI carece de idempotencia transaccional.
## Alternativas
Reintento ciego mejora disponibilidad pero duplica; reconciliación conservadora protege identidad pero puede retener registros indefinidamente.
## Decisión y justificación
NetInfo enlaza onlineManager; inicio, reconexión, primer plano y temporizador ejecutan mutex. SQLite reclama filas. Buscar clientId y código/período exactos antes de POST. `sending` recuperado pasa a `unknown_remote_result`. Ante incertidumbre se consulta por `clientId`: si la fila existe, se reconcilia sin otro POST; si el GET confirma ausencia, se reintenta **la creación con el mismo clientId**. No hay reintento ciego: cada POST va precedido por esa comprobación. La actualización de una fila ya creada sigue siendo PUT sobre el mismo ID.
## Consecuencias
Positivas: una petición que no llegó puede recuperarse y una respuesta perdida se reconcilia sin duplicar. Negativas: si MockAPI confirmara una escritura después de un GET que aún no la muestra, el reintento podría duplicar; se requiere consistencia inmediata y, en producción, idempotencia de servidor.
## Riesgos o limitaciones
No garantiza exactly-once entre dispositivos; backend real necesita clave idempotente y unicidad. App terminada no ejecuta JS: reanuda al abrir.
## Verificación
Pruebas de mutex, timeout con reconciliación, timeout con ausencia confirmada y reintento del mismo clientId, y coincidencias exactas; red física pendiente.
## Uso de IA
Cola y NetInfo impuestos por solicitante; política de reconciliación y código propuestos por IA.
