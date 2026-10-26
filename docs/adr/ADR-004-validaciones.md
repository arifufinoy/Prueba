# Centralizar reglas en funciones TypeScript puras
Estado: aceptada por requisito del solicitante. Fecha: 2026-10-26. Requisitos: R2, R5, R6, R10.
## Contexto
Guardar y sincronizar necesitan las mismas reglas y límites.
## Alternativas
Zod ofrece esquemas pero añade dependencia; funciones puras son comprobables sin nativos y requieren errores manuales.
## Decisión y justificación
Funciones de consumo, anomalía, campos condicionales y período local; desconocido nunca se convierte en cero.
## Consecuencias
Positivas: reutilización. Negativas: mantenimiento explícito.
## Riesgos o limitaciones
No se resuelve rollover automáticamente; lectura menor exige corrección.
## Verificación
Pruebas automatizadas de límites, incluyendo exactamente triple, cero y desconocido.
## Uso de IA
Reglas del solicitante; implementación y pruebas propuestas por IA.
