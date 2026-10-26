# Conservar exclusivamente la identidad autenticada de demostración en SecureStore
Estado: aceptada por requisito del solicitante. Fecha: 2026-10-26. Requisitos: R1.

## Contexto
El técnico debe seguir autenticado al reiniciar sin guardar su contraseña en almacenamiento general. Las credenciales predefinidas son un mecanismo académico, no un servicio de autenticación.

Esta decisión ya estaba documentada **antes de implementar** en ADR-003, commit f08c8c4. Este documento la separa durante la revisión final; no se reescribe el historial ni se presenta este archivo como parte de aquel commit.

## Alternativas
- AsyncStorage con identidad y contraseña: implementación simple, pero exposición de secretos en almacenamiento no cifrado y contrario al requisito.
- SecureStore sólo con código de sesión: cifrado mediante almacenamiento del sistema y menor información persistida; requiere módulo nativo y no valida identidad contra servidor.
- Token de backend autenticado: revocable y autorizado remotamente, pero exige un backend fuera de los recursos MockAPI de la prueba.

## Decisión y justificación
Usar SecureStore para el código autenticado EMP-001 y no persistir la contraseña. Comparar las credenciales de demostración al iniciar sesión y borrar la entrada antes de completar el cierre. Guardas de Expo Router protegen las pantallas durante la sesión local.

## Consecuencias
Positivas: contraseña nunca almacenada en AsyncStorage y sesión durable. Negativas: código cliente puede inspeccionarse y la sesión no es revocable por servidor.
## Riesgos o limitaciones
El acceso público a MockAPI no incorpora autorización. No usar credenciales académicas ni este mecanismo en producción; se requiere autenticación real, tokens y permisos servidor.
## Verificación
Typecheck, revisión del único valor escrito y del borrado de SecureStore. Persistencia física tras reinicio y cierre de sesión deben comprobarse en Android; no se atribuyen pruebas de dispositivo al estudiante.
## Uso de IA
SecureStore y credenciales proporcionados por solicitante. Comparación técnica, implementación y separación editorial de la decisión elaboradas por IA.
