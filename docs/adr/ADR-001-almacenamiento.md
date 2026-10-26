# Usar SQLite como fuente durable local
Estado: aceptada por requisito del solicitante. Fecha: 2026-10-26. Requisitos: R3, R4, R8–R10.

## Contexto
Las visitas duran días sin red y requieren identidad mensual única.
## Alternativas
AsyncStorage es simple pero no ofrece restricciones ni transacciones; SQLite ofrece ambas y requiere migraciones.
## Decisión y justificación
expo-sqlite guarda lecturas y cola en una misma fila, borradores y medidores. WAL, esquema versionado y UNIQUE(codigo,periodo). AsyncStorage sólo conserva preferencias.
## Consecuencias
Positivas: atomicidad y durabilidad. Negativas: SQL y datos locales no cifrados.
## Riesgos o limitaciones
Desinstalación elimina datos; almacenamiento local no es respaldo externo.
## Verificación
Comprobar esquema y unicidad automáticamente; reinicio requiere dispositivo.
## Uso de IA
Tecnologías impuestas por solicitante; comparación y código propuestos por IA. No se atribuyen ensayos al estudiante.
