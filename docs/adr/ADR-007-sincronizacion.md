# Serializar envíos y reconciliar incertidumbre sin repetir POST
Estado: aceptada. Fecha: 2026-10-26. Requisitos: R4, R6, R9, R10.
## Contexto
Un timeout no demuestra ausencia remota; MockAPI carece de idempotencia transaccional.
## Alternativas
Reintento ciego mejora disponibilidad pero duplica; reconciliación conservadora protege identidad pero puede retener registros.
## Decisión y justificación
NetInfo enlaza onlineManager; inicio, reconexión, primer plano y temporizador ejecutan mutex. SQLite reclama filas. Buscar clientId y código/período exactos antes de POST. sending recuperado pasa a unknown_remote_result. Incertidumbre sólo consulta, nunca repite POST automáticamente aunque GET esté vacío.
## Consecuencias
Positivas: sin reenvío ciego. Negativas: retención si POST nunca llegó; exige resolución administrativa futura.
## Riesgos o limitaciones
No garantiza exactly-once entre dispositivos; backend real necesita clave idempotente y unicidad. App terminada no ejecuta JS: reanuda al abrir.
## Verificación
Pruebas de mutex, ambigüedad y coincidencias exactas; red física pendiente.
## Uso de IA
Cola y NetInfo impuestos por solicitante; política conservadora y código propuestos por IA.
