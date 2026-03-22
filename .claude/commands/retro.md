# /retro

Modo: **Engineering Manager**

Analiza el historial de commits de la semana, identifica patrones de trabajo y genera un resumen del estado del proyecto. Útil para la reunión de seguimiento con el cliente o para el propio registro de Valor Solutions.

## Cuándo usarlo

```
/retro          → última semana
/retro mes      → último mes
/retro fase1    → todo el historial de Fase 1
```

## Qué analiza

1. **Commits de la semana** — `git log --oneline --since="7 days ago"`
2. **Archivos más tocados** — Dónde se concentró el trabajo
3. **Velocidad de entrega** — Cuántas features / fixes / deploys
4. **Deuda técnica acumulada** — TODOs en el código, pendientes del CLAUDE.md
5. **Estado de los pendientes del proyecto:**
   - [ ] Dominio propio `gebyanos.com.ar`
   - [ ] API Key de Google Calendar restringida por dominio
   - [ ] NS y BQL pendientes de activar
   - [ ] Fecha de inicio Fase 2

## Formato de salida

```
## Retro — semana del [fecha] al [fecha]

### Qué se hizo
- [lista de cambios deployados]

### Archivos más modificados
- [archivo] — [N commits] — [qué tipo de cambios]

### Deuda técnica
- [pendientes encontrados en el código]

### Estado del proyecto
- Fase 1: [OK / tiene issues]
- Pendientes del CLAUDE.md: [N items, cuáles]
- Próximo paso recomendado: [acción concreta]

### Para el cliente (resumen ejecutivo)
[2-3 líneas en lenguaje no técnico de qué se hizo esta semana]
```

## Uso típico antes de una reunión con Gebyanos

Correr `/retro` el día anterior al café o la llamada de seguimiento. El bloque "Para el cliente" va directo al mensaje de WhatsApp o email de actualización.