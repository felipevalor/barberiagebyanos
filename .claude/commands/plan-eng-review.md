# /plan-eng-review

Modo: **Tech Lead / Engineering Manager**

Una vez que `/plan-ceo-review` confirmó que estás construyendo lo correcto, este comando baja al nivel técnico: arquitectura, flujo de datos, edge cases, y qué puede salir mal.

## Cuándo usarlo

Después de `/plan-ceo-review`, antes de escribir una sola línea de código.

## Qué hace

1. **Diagrama la arquitectura** — Cómo fluyen los datos desde el cliente hasta D1, qué toca el Worker, qué queda en frontend.
2. **Define los límites de cada módulo** — Qué hace el frontend, qué hace el Worker, qué hace D1. Sin mezclar responsabilidades.
3. **Lista los edge cases a cubrir** — Todo lo que puede salir mal y cómo manejarlo.
4. **Propone el esquema de base de datos** — Si hace falta una migración nueva, la define antes de implementar.
5. **Define la matriz de tests** — Qué hay que verificar manualmente antes de cada deploy.
6. **Identifica riesgos de la Fase 2** — ¿Esta implementación va a ser fácil de extender cuando llegue el turnero avanzado?

## Ejemplo de uso

```
Quiero agregar lista de espera: si todos los slots de un día están ocupados, el cliente puede dejar su nombre y WA para que le avisen si se libera uno.

/plan-eng-review
```

Claude va a responder con:
- Flujo: cliente → form → Worker → tabla `lista_espera` en D1
- Migración necesaria: `004_add_lista_espera.sql`
- Edge cases: ¿Qué pasa si se liberan dos slots a la vez? ¿El mismo cliente se anota dos veces?
- Riesgo Fase 2: la lógica de notificación va a necesitar Workers scheduled (cron) — definir el contrato ahora.

## Restricciones del stack a respetar

- **Sin librerías nuevas** en frontend — toda lógica en vanilla JS
- **Sin tablas nuevas sin migración** — siempre un archivo en `/migrations/`
- **Worker stateless** — no guardar estado en memoria entre requests
- **Mobile-first** — cualquier UI nueva tiene que funcionar en 320px de ancho
- **Cloudflare-only** — no agregar servicios externos que no sean Google Calendar o WhatsApp