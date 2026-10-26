# Copiar fotografías a documentos antes de asociarlas
Estado: aceptada por requisito del solicitante. Fecha: 2026-10-26. Requisitos: R6–R8.
## Contexto
La URI temporal de Image Picker puede desaparecer.
## Alternativas
Caché es rápida pero descartable; documentos privados son durables pero consumen espacio.
## Decisión y justificación
Image Picker con permiso contextual y FileSystem con copia esperada a documentos, nombre clientId/versionado, URI en SQLite. fotoUrl remoto null, tieneFoto indica evidencia local.
## Consecuencias
Positivas: evidencia offline. Negativas: no compartida entre dispositivos y posibles archivos huérfanos conservados ante fallos.
## Riesgos o limitaciones
Desinstalación elimina fotos; subida externa es integración futura, no simulada.
## Verificación
Revisión de await en copia SDK57; cámara y reinicio pendientes de dispositivo.
## Uso de IA
Tecnologías requeridas por solicitante; estrategia concreta propuesta por IA.
