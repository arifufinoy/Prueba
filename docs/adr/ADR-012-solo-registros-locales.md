# Mostrar sólo registros locales y no listas de lecturas de MockAPI

Estado: aceptada. Fecha: 2026-10-27. Requisitos: R1, R9, R10; corrección solicitada en documento adjunto.

## Contexto

La pantalla principal y Registros mostraban lecturas obtenidas de `/lecturas`, incluidas filas malformadas creadas manualmente en MockAPI. El solicitante indicó que los registros de MockAPI no deben ponerse dentro de la app: la app debe trabajar con sus propios registros y mostrar el catastro consultado mediante campos.

## Alternativas

- Mantener la lista remota: mostraba datos ajenos y filas inválidas que confundían la cola local.
- Embeber ejemplos o fixtures: contradice el requisito y oculta la fuente real.
- Mostrar sólo registros locales y consultar el medidor por código exacto: reduce confusión y conserva R3.

## Decisión y justificación

La app muestra exclusivamente las lecturas guardadas en SQLite. Inicio muestra el flujo Registros → Pendientes → Enviándose con contadores locales; Registros lista sólo datos del dispositivo; Pendientes muestra la cola. No se solicita `GET /lecturas` para pintar pantallas ni se incluye el catálogo completo de medidores como lista: el técnico escribe un código válido y ve los siete campos del medidor consultado. MockAPI sigue siendo el destino de POST/PUT y la fuente del catastro por código exacto.

## Consecuencias

Positivas: no se muestran filas Faker ni registros de otros empleados; la interfaz coincide con la cola real; menos peticiones y menos confusión. Negativas: no hay una vista de supervisión remota dentro de la app; para revisar el servidor se usa el panel de MockAPI.

## Riesgos o limitaciones

La lectura remota sigue siendo necesaria para la sincronización y la reconciliación por `clientId`, pero no se presenta como registro local. La verificación visual en un dispositivo no forma parte de esta decisión.

## Verificación

`npm test`, `npx tsc --noEmit`, `npx expo lint` y revisión de que las pantallas no importan listas remotas. La app conserva la consulta exacta de medidor y la cola SQLite.
