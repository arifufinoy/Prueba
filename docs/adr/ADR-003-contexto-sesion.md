# Compartir registro con Context y sesión con SecureStore
Estado: aceptada por requisito del solicitante. Fecha: 2026-10-26. Requisitos: R1, R8.
## Contexto
Cinco pantallas necesitan recuperar borrador antes de navegar.
## Alternativas
Redux ofrece herramientas pero añade dependencia; Context está incluido aunque exige persistencia explícita.
## Decisión y justificación
Context para estado transitorio, SQLite para cada cambio, SecureStore para código autenticado sin contraseña. Expo Router usa src/app existente.
## Consecuencias
Positivas: sin gestor adicional. Negativas: coordinación de escrituras y renderizados.
## Riesgos o limitaciones
Credenciales embebidas sólo son demostración, no autenticación segura de producción.
## Verificación
Typecheck y guardas; reapertura pendiente de Android.
## Uso de IA
Dependencias impuestas por solicitante; arquitectura concreta y código por IA.
