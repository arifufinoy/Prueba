# Validar en el campo del código si el medidor ya tiene lectura en el período

Estado: aceptada. Fecha: 2026-10-27. Requisitos: R2, R10; corrección solicitada en documento adjunto.

## Contexto

La identidad `codigoMedidor + periodo` ya se protegía con UNIQUE en SQLite y con una comprobación antes de guardar, pero el error aparecía tarde. El solicitante pidió validar si el código ya está utilizado directamente en el campo «Código de medidor».

## Alternativas

- Mantener sólo la validación al guardar: conserva la integridad, pero obliga a recorrer el formulario para descubrir el duplicado.
- Validar sólo en SQLite: es inmediato y funciona sin red, pero no detecta una lectura creada en otro dispositivo.
- Validar en SQLite y, con conexión, en MockAPI por código/período exactos, excluyendo el `clientId` en edición: detecta ambos casos y mantiene R2.

## Decisión y justificación

Cuando el código tiene formato válido y la fecha es válida, el paso 1 consulta la identidad local y, si hay conexión, la remota por `codigoMedidor` y `periodo` exactos. Si existe otra lectura, muestra el mensaje bajo el campo y deshabilita Continuar. Se excluye el registro en edición por `clientId`. La comprobación se repite de forma definitiva en `Summary` y en la sincronización; un fallo de red en la comprobación inline no bloquea el guardado, porque la validación final sigue vigente.

## Consecuencias

Positivas: el duplicado se ve en el mismo campo, antes de avanzar; funciona offline con SQLite y online con MockAPI. Negativas: un código válido puede generar una consulta remota adicional y la comprobación remota puede fallar sin conexión.

## Riesgos o limitaciones

MockAPI no ofrece unicidad transaccional: dos dispositivos podrían pasar la comprobación a la vez. Producción requiere restricción única en servidor. La validación inline no sustituye el UNIQUE local ni la comprobación final.

## Verificación

Prueba SQLite de identidad por código/período excluyendo el registro en edición; pruebas de formato; `npx tsc --noEmit` y `npx expo lint`.
