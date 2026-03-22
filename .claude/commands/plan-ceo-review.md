# /plan-ceo-review

Modo: **Fundador / CEO**

Antes de implementar cualquier cosa, presioná para ver si estás construyendo lo correcto. Este comando cuestiona el pedido, busca el producto real detrás de la idea y define qué sería la versión 10 estrellas.

## Cuándo usarlo

Cada vez que describís una feature nueva. Especialmente antes de arrancar Fase 2 o cuando el cliente pide "algo pequeño" que en realidad esconde algo más grande.

## Qué hace

Recibís la descripción de lo que querés construir y este modo:

1. **Cuestiona el pedido literal** — ¿Es esto realmente lo que necesita Gebyanos o hay un problema más profundo?
2. **Define el trabajo real** — ¿Qué está intentando lograr el barbero / el cliente cuando usa esto?
3. **Describe la versión 10 estrellas** — No la versión mínima. La versión que haría que Gebyano le cuente a otros barberos sobre el sistema.
4. **Identifica qué NO construir** — Qué agregaría complejidad sin valor real para una barbería de barrio.
5. **Da una recomendación** — Seguir con el pedido original / ajustarlo / descartarlo.

## Ejemplo de uso

```
Quiero agregar que el cliente pueda cancelar su turno desde un link en el mensaje de WA.

/plan-ceo-review
```

Claude va a responder algo como:
> "La cancelación es el síntoma. El problema real es que cuando un cliente no viene, el barbero se queda con el slot vacío sin tiempo para reaccionar. La versión 10 estrellas no es un link de cancelación — es un sistema que detecta la cancelación, libera el slot automáticamente y puede notificar al siguiente cliente en lista de espera."

## Contexto del proyecto a tener en cuenta

- Gebyanos es una barbería de barrio en Rosario. La tecnología tiene que desaparecer, no protagonizar.
- Los barberos no son técnicos. Cualquier panel o feature que requiera configuración manual va a quedar sin usar.
- El 80% del tráfico es mobile. Si no funciona perfecto en celular, no existe.
- La Fase 2 es un turnero avanzado — toda feature nueva tiene que evaluarse si pertenece a Fase 1 (landing) o Fase 2 (gestión).