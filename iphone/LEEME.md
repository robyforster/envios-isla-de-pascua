# Envíos a Isla de Pascua en el iPhone

Funciona en **Safari del iPhone**. En la app de Mercado Libre no funciona, porque Apple no permite extensiones dentro de otras apps.

El archivo `envios-isla-de-pascua.user.js` es la misma extensión empaquetada para la app gratuita **Userscripts**.

## Instalar (una sola vez)

1. **Instala la app "Userscripts"** desde la App Store. Es gratis; el desarrollador es Justin Wasack.
2. **Abre la app Userscripts** y toca **"Set Userscripts Directory"**. Elige una carpeta, por ejemplo una nueva llamada `Userscripts` en **iCloud Drive**.
3. **Copia el archivo** `envios-isla-de-pascua.user.js` a esa carpeta:
   - Desde el Mac: arrástralo a iCloud Drive → Userscripts.
   - O mándatelo por AirDrop y, en el iPhone, guárdalo en esa carpeta con "Guardar en Archivos".
4. **Activa la extensión en Safari:** Ajustes → Apps → Safari → Extensiones → **Userscripts**. Actívala y, en "Permisos", elige **Permitir** para todos los sitios web, o al menos para mercadolibre.cl.
5. **Abre Safari** en `listado.mercadolibre.cl` e **inicia sesión** en Mercado Libre, para que se apliquen los beneficios meli+ y tu dirección.
6. Toca el botón **aA** (o el ícono de extensiones) en la barra de direcciones → **Userscripts**. Revisa que "Envíos a Isla de Pascua" esté activado. La primera vez, Safari puede pedir permiso para mercadolibre.cl: elige **Permitir siempre**.

## Usarla

- Busca algo en Mercado Libre desde Safari. Debajo de cada producto aparece una etiqueta ✅, ❌ o ⚪.
- El panel 🗿 aparece abajo a la derecha. Tiene "Ocultar los que no llegan" y "Mi plan", que viene en Automático.
- En los productos dudosos, la etiqueta dice "revisando la ficha…" unos segundos. En ese tiempo se carga la ficha del producto de forma invisible para ver si el envío es gratis para tu cuenta.

## Actualizar

Cuando haya una versión nueva, reemplaza el archivo `.user.js` en la carpeta de Userscripts y recarga la página.

En el Mac, el archivo se genera desde el código de la extensión con:

    python3 build-userscript.py
