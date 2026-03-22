# /browse

Modo: **QA Engineer**

Le da ojos al agente. Navega el sitio real, completa el flujo de reserva, toma screenshots, detecta errores visuales y de consola. QA completo en lugar de revisar el código a ciegas.

## Cuándo usarlo

```
/browse https://barberia-d8q.pages.dev — testear el flujo de reserva completo
/browse https://barberia-d8q.pages.dev — verificar los cambios de este deploy
/browse https://barberia-d8q.pages.dev — QA en mobile (viewport 390px)
```

## Setup requerido

Playwright via CLI (no MCP):

```bash
npm install -g playwright
npx playwright install chromium
```

## Qué testea — flujo estándar

### 1. Carga inicial
- La página responde 200
- El hero carga con la imagen de fondo
- El text scramble arranca (esperar 2 segundos)
- No hay errores en consola

### 2. Navegación
- Los links del navbar scrollean a la sección correcta
- El navbar se vuelve opaco al hacer scroll (clase `scrolled`)

### 3. Sección Servicios
- Se renderizan los 6 servicios con nombre y precio
- Se renderizan las 3 promos
- El hover funciona en desktop

### 4. Flujo de reserva (el más importante)
- El custom select de servicio abre y cierra
- Se puede seleccionar un servicio → el botón sigue deshabilitado
- Las cards de barbero se renderizan (Gebyano y Lobo activos, NS y BQL con badge)
- Al seleccionar barbero → aparece el day picker
- Al seleccionar día → aparece el slot picker con horarios
- Los slots ocupados aparecen deshabilitados (gris)
- Al completar nombre + servicio + barbero + día + hora → el botón se habilita
- Al clickear "Ir al WhatsApp" → se abre WA con el mensaje pre-armado correcto

### 5. Mobile (viewport 390x844)
- El cursor personalizado no aparece
- El navbar oculta los links (solo logo)
- El grid de servicios colapsa a 1 columna
- El grid de barberos colapsa a 2 columnas
- El formulario es usable con el teclado virtual

### 6. Footer
- Los links de WA de Gebyano y Lobo tienen el número correcto
- El link de Instagram apunta a `@gebyanos`

## Formato de salida

```
## QA Report — [fecha] — [URL]

### ✅ Pasó
- [lista de checks OK]

### ❌ Falló
- [descripción + screenshot path + cómo reproducirlo]

### ⚠️ Observaciones
- [cosas que funcionan pero llaman la atención]

### Veredicto
APROBADO / RECHAZADO — [razón si es rechazado]
```