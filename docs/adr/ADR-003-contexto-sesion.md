# Compartir el registro transitorio con React Context
Estado: aceptada por requisito del solicitante. Fecha: 2026-10-26. Requisitos: R1, R8.
## Contexto
Cinco pantallas necesitan recuperar borrador antes de navegar.
## Alternativas
Redux ofrece herramientas pero añade dependencia; Context está incluido aunque exige persistencia explícita.
## Decisión y justificación
Context para estado transitorio y SQLite para cada cambio. Expo Router usa src/app existente. La decisión de sesión SecureStore, documentada aquí antes de implementar en f08c8c4, se separó en ADR-009 durante la revisión para registrar una única decisión por ADR.
## Consecuencias
Positivas: sin gestor adicional. Negativas: coordinación de escrituras y renderizados.
## Riesgos o limitaciones
Context no sobrevive a un cierre; sólo se navega al borrador después de recuperar SQLite.
## Verificación
Typecheck y guardas; reapertura pendiente de Android.
## Uso de IA
Dependencias impuestas por solicitante; arquitectura concreta y código por IA.
