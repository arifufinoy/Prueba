# Separar alta pendiente de revisión de la lectura

Estado: aceptada. Fecha: 2026-10-28. Origen: solicitud explícita del usuario.

## Decisión

El alta sólo persiste código y fecha. `workflow=pending` identifica un registro incompleto; mientras no se confirme el envío se muestra En cola, y tras confirmación se muestra Pendiente. Estado observado y lectura permanecen null. Desde el pendiente se abre un formulario separado que exige estado, lectura y evidencia según las reglas existentes; su guardado establece `workflow=reviewed`. Una revisión offline permanece local con el transporte por enviar.

## Justificación

Un único estado de cola no distingue un registro recibido pero incompleto de una lectura terminada. Se rechazó renombrar `sent` como Revisado: un alta enviada todavía no tiene estado ni lectura. Se conserva el estado técnico existente y se añade workflow al JSON local/remoto, sin destruir tablas ni registros anteriores.

## Consecuencias

Pendientes enviados son editables; revisados enviados, inmutables. El mismo ID se completa por PUT, nunca con un segundo POST. Se mantiene una lectura por mes y medidor. Los registros anteriores sin workflow son lecturas completas. Configurar en MockAPI el campo string `workflow` (pending/reviewed) y permitir null en estadoMedidor y lecturaActual. La app mantiene la etapa local aun si el servidor elimina campos, pero compartir la etapa entre dispositivos requiere ese modelo remoto.

## Verificación y límites

Tests automatizados de alta mínima, reconexión, revisión por PUT, ausencia de catastro, POST interrumpido, unicidad mensual y edición de fecha. Typecheck y lint. Sin ejecución en teléfono; MockAPI sigue sin ofrecer idempotencia transaccional absoluta.
