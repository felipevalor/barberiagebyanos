# /ship

Modo: **Release Engineer**

Para una rama lista. No para decidir qué construir — eso ya está resuelto. Este comando ejecuta el checklist de deploy de Gebyanos de forma sistemática.

## Cuándo usarlo

Cuando el código está listo y los agentes `bug-reviewer`, `code-quality` y `performance-analyzer` dieron luz verde.

## Qué hace

1. **Verifica el estado de la rama** — Que no haya cambios sin commitear
2. **Corre el checklist de pre-deploy:**
   - ¿Hay migraciones nuevas pendientes de aplicar en remoto?
   - ¿La API Key de Google Calendar está en el código o en variable de entorno?
   - ¿El `wrangler.toml` tiene el `database_id` correcto?
   - ¿El Worker responde correctamente a `OPTIONS` (CORS preflight)?
3. **Ejecuta las migraciones remotas** si hay archivos nuevos en `/migrations/`
4. **Deploy del Worker:** `wrangler deploy`
5. **Deploy del frontend:** `wrangler pages deploy ./public --project-name=barberia`
6. **Verifica el sitio live** — Hace un request a `https://barberia-d8q.pages.dev/` y confirma que responde 200
7. **Reporta** — Qué se deployó, qué versión, si todo está OK o qué falló

## Checklist de pre-deploy (manual, antes de /ship)

```
[ ] bug-reviewer → sin issues CRÍTICOS
[ ] code-quality → aprobado para deploy
[ ] performance-analyzer → 🟢 o 🟡 aceptable
[ ] Migraciones testeadas en --local antes de --remote
[ ] Cambios verificados en mobile (Chrome DevTools o dispositivo real)
[ ] Precios actualizados si el cliente los modificó
```

## Lo que NO hace

- No decide si el código está listo — eso es tu responsabilidad y la de los agentes de review
- No hace rollback automático — si algo falla en producción, hay que revertir manualmente
- No toca DNS ni configuración de dominio