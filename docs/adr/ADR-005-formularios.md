# Usar React Hook Form para formularios condicionales
Estado: aceptada por requisito del solicitante. Fecha: 2026-10-26. Requisitos: R2, R5, R8, R10.
## Contexto
Normal, inaccesible y dañado tienen campos excluyentes.
## Alternativas
useState es simple pero exige errores manuales; React Hook Form aporta resolver y Controller pero requiere integración.
## Decisión y justificación
Controller y resolver invocan reglas puras. DateTimePicker selecciona fecha local hasta hoy. Sin biblioteca de validación adicional.
## Consecuencias
Positivas: coherencia. Negativas: coordinación formulario/contexto.
## Riesgos o limitaciones
Cambiar campos relevantes reinicia confirmación de anomalía.
## Verificación
Typecheck y reglas automatizadas; teclado pendiente de Android.
## Uso de IA
Dependencias especificadas por solicitante; integración por IA.
