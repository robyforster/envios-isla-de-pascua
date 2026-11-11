# Envíos a Isla de Pascua en el iPhone

Funciona en **Safari del iPhone**. En la app de Mercado Libre no funciona, porque Apple no permite extensiones dentro de otras apps.

El archivo `envios-isla-de-pascua.user.js` es la misma extensión empaquetada para la app gratuita **Userscripts**. Se instala y se actualiza desde GitHub.

## Instalar (una sola vez)

1. **Instala la app "Userscripts"** desde la App Store. Es gratis; el desarrollador es Justin Wasack. Ábrela una vez. Puedes dejar la carpeta que trae por defecto ("Userscripts App Documents").
2. **Activa la extensión en Safari:** Ajustes → Apps → Safari → Extensiones → **Userscripts**. Actívala y, en "Permisos", elige **Permitir** para mercadolibre.cl o para todos los sitios.
3. **Abre en Safari** este enlace:
   https://raw.githubusercontent.com/robyforster/envios-isla-de-pascua/main/iphone/envios-isla-de-pascua.user.js
   Verás el código como texto; es normal.
4. Toca **aA** (o el ícono de extensiones) en la barra de direcciones → **Userscripts** → **Install**.
5. Abre `listado.mercadolibre.cl` en Safari e **inicia sesión** en Mercado Libre, para que se apliquen tu plan meli+ y tu dirección.

## Usarla

- Busca algo en Mercado Libre desde Safari. Debajo de cada producto aparece una etiqueta ✅, ❌ o ⚪.
- El panel 🗿 aparece abajo a la derecha. Tiene "Ocultar los que no llegan" y "Mi plan", que viene en Automático y debería decir "Detectado: meli+ …" si eres socio.
- En los productos dudosos, la etiqueta dice "revisando la ficha…" unos segundos. En ese tiempo se carga la ficha del producto de forma invisible para ver si el envío es gratis para tu cuenta.

## Actualizar

En Safari, abre el menú de **Userscripts** y toca la **nube con flecha** ☁️↓. La versión nueva se descarga desde GitHub.

## Si se abre la app de Mercado Libre

iOS abre los enlaces de Mercado Libre en su app. Para quedarte en Safari:

- Cuando se abra la app, toca **"mercadolibre.cl ›"** en la esquina superior derecha. Vuelves a Safari, e iOS lo recuerda para ese sitio.
- O mantén presionado el enlace del producto y elige **Abrir**.
- Las direcciones escritas a mano en la barra de Safari nunca abren la app.
