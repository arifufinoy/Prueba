# Centralizar HTTP con Axios y caché con TanStack Query
Estado: aceptada por requisito del solicitante. Fecha: 2026-10-26. Requisitos: R2, R3, R9, R10.
## Contexto
Filtros parciales de MockAPI y consultas repetidas offline.
## Alternativas
fetch con estado manual reduce dependencias pero obliga a gestionar timeout/caché; Axios y Query separan responsabilidades con mayor tamaño.
## Decisión y justificación
Axios con timeout y comprobación exacta; claves jerárquicas Query y vigencia de jornada, respaldo SQLite. La caché no es la cola.
## Consecuencias
Positivas: errores y cargas centralizados. Negativas: dos niveles de caché.
## Riesgos o limitaciones
Datos locales desactualizados; sincronizar vuelve a verificar.
## Verificación
GET reales de ambos recursos respondieron [] el 2026-10-26. Revisar validación antes de red.
## Uso de IA
Selección por solicitante, argumentos e implementación por IA; sin ensayos de campo atribuidos.
