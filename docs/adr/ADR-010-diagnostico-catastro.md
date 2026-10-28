# Distinguir conectividad de catastro ausente y cargar ejemplos sólo por confirmación
> Decisión histórica sustituida: la aplicación actual ya no muestra diagnóstico/carga y sí admite envíos sin medidor previo. Véase ADR-011.
Estado: sustituida por ADR-011 a petición del solicitante. Fecha: 2026-10-27. Requisitos: R3, R4, R9 y datos de demostración.

## Contexto
Las capturas muestran Internet activo, pero ambos recursos tienen cero filas. Los GET reales del 2026-10-27 también devuelven []. La aplicación confundía en sus mensajes «sin datos previos» con «sin conexión». Un medidor ausente impide verificar la lectura, aunque el servidor responda correctamente.
## Alternativas
- Enviar sin comprobar el catastro: permite POST inmediato, pero incumple la verificación y puede omitir anomalías.
- Poblar automáticamente en cada arranque: oculta la causa y mezcla ejemplos con datos reales sin autorización.
- Diagnóstico visible y carga manual confirmada de ejemplos faltantes: conserva las reglas y hace explícita la configuración; requiere una acción inicial de preparación.
## Decisión y justificación
Mostrar por separado conexión, respuesta HTTP y cantidad real de registros. Ofrecer en Perfil una carga explícita de los medidores de docs/demo, con confirmación. Consultar cada código exacto antes de insertar, conservar existentes y detener ante respuesta ambigua sin reintento automático de POST. No crear lecturas de ejemplo ni marcar pendientes como enviadas. Tras cargar catastro, invalidar resultados vacíos y despertar únicamente verificaciones pendientes, conservando clientId y protecciones de duplicados.
## Consecuencias
Positivas: diagnóstico accionable y envío real tras preparar la API. Negativas: más UI de configuración académica; la carga no es transaccional entre dispositivos.
## Riesgos o limitaciones
Los ejemplos sólo son apropiados para el proyecto académico. Catastros reales deben cargarse desde la fuente autorizada. MockAPI no garantiza unicidad entre clientes. Un fallo puede dejar una carga parcial; la siguiente acción consulta antes de insertar. Los envíos de lecturas inciertos no se desbloquean ni se repiten.
## Verificación
Pruebas de API vacía, omisión de códigos existentes, carga parcial y posterior envío de la misma lectura sin recrearla. Tipos y lint. No se considera probado un dispositivo ni una escritura remota por usar transporte controlado en tests.
## Uso de IA
Diagnóstico basado en capturas del solicitante y GET reales. Diseño y código propuestos por IA. Sin dependencias nuevas ni modificación de datos remotos durante la corrección.
