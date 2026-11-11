# 🗿 Envíos a Isla de Pascua

Extensión para **Mercado Libre Chile** que muestra, en cada producto, si **llega a Isla de Pascua (Rapa Nui)**, cuánto cuesta el envío **con tu cuenta** (incluidos los beneficios **meli+**) y cuándo llega. Permite ocultar con un clic los productos que no se envían a la isla.

Funciona en **Microsoft Edge**, **Chrome**, **Safari en Mac** y **Safari en iPhone**.

> Proyecto independiente: no está afiliado a Mercado Libre ni lo respalda Mercado Libre.

---

## 🔗 Enlaces para compartir

| Para… | Enlace |
|---|---|
| **Instalar en Microsoft Edge** (computador) | https://microsoftedge.microsoft.com/addons/detail/ekejcmkohhnpalpjchgicjjoclemecoa |
| **Instalar en iPhone** (Safari + app Userscripts) | https://raw.githubusercontent.com/robyforster/envios-isla-de-pascua/main/iphone/envios-isla-de-pascua.user.js |
| **App Userscripts** (gratis, necesaria en iPhone) | Busca **"Userscripts"** de Justin Wasack en la App Store |
| **Este proyecto** (código, instrucciones, novedades) | https://github.com/robyforster/envios-isla-de-pascua |

**Mensaje listo para WhatsApp:**

> 🗿 ¿Compras en Mercado Libre desde Rapa Nui? Esta extensión te muestra en cada producto si **llega a Isla de Pascua**, cuánto cuesta el envío (con meli+ incluido) y te deja ocultar los que no llegan.
> 💻 Edge: https://microsoftedge.microsoft.com/addons/detail/ekejcmkohhnpalpjchgicjjoclemecoa
> 📱 iPhone: instala la app gratis "Userscripts" y abre en Safari https://raw.githubusercontent.com/robyforster/envios-isla-de-pascua/main/iphone/envios-isla-de-pascua.user.js
> Instrucciones: https://github.com/robyforster/envios-isla-de-pascua

---

## Qué hace

**En los resultados de búsqueda**, cada producto recibe una etiqueta:

- ✅ **Llega a Isla de Pascua**: dice si es a domicilio o con retiro en agencia, el costo del envío y la fecha estimada.
- ❌ **No envía a Isla de Pascua**, o no hay stock.
- ⚪ **Sin dato**: por ejemplo, fichas de catálogo con varias opciones de compra.

**Un panel 🗿** abajo a la derecha muestra cuántos productos llegan y tiene:

- **Ocultar los que no llegan** y **Ocultar sin dato**.
- **Mi plan:** *Automático* (recomendado), *Sin meli+*, *meli+ Esencial* o *meli+ Total*. En automático, la extensión detecta tu plan sola si tienes la sesión iniciada en Mercado Libre.

**En la página de cada producto** aparece el mismo aviso arriba del título.

### Cómo calcula el envío

1. Consulta la **cotización pública de envíos** de Mercado Libre con la comuna de Isla de Pascua como destino. Así sabe si el producto llega, el tipo de entrega, la fecha y el precio de lista del envío.
2. Si tienes **meli+** (Esencial y Total tienen las mismas reglas de envío), aplica sus beneficios:
   - **Productos desde $9.990** con etiqueta meli+: meli+ cubre hasta **$8.000** del envío y pagas la diferencia. Ejemplo comprobado: un envío de $27.490 queda en $19.490.
   - **Productos bajo $9.990:** descuento en el envío. Ejemplo comprobado: $9.090 queda en $6.090. La etiqueta lo marca con "≈".
3. En los **casos dudosos**, revisa la **ficha del producto** con tu sesión para ver si Mercado Libre dice "Retira gratis" o "Llega gratis" para tu dirección. Si lo dice, muestra **"envío gratis con tu cuenta"**. Esto existe porque el "Envío gratis" de las tarjetas es genérico y a veces no aplica a la isla.

Los resultados se guardan unas horas para no repetir consultas.

### Privacidad

- No recopila, guarda ni envía datos personales, y no tiene analítica.
- Solo se comunica con **Mercado Libre**: su cotización pública de envíos (`api.mercadolibre.com`) y sus propias páginas (`mercadolibre.cl`), usando tu sesión para ver los mismos precios que verías tú.

---

## Instalar

### Microsoft Edge (Windows o Mac)

Abre el [enlace de la tienda](https://microsoftedge.microsoft.com/addons/detail/ekejcmkohhnpalpjchgicjjoclemecoa) y haz clic en **Obtener**. Se actualiza sola.

### iPhone (Safari)

1. Instala la app gratuita **Userscripts** desde la App Store (de Justin Wasack).
2. En **Ajustes → Apps → Safari → Extensiones → Userscripts**, actívala y permite **mercadolibre.cl**.
3. En **Safari**, abre el [enlace del script](https://raw.githubusercontent.com/robyforster/envios-isla-de-pascua/main/iphone/envios-isla-de-pascua.user.js).
4. Toca **aA** (o el ícono de extensiones) → **Userscripts** → **Install**.
5. Abre `listado.mercadolibre.cl` en Safari con tu sesión iniciada.

**Actualizar:** en el menú de Userscripts, toca la **nube con flecha** ☁️↓.

Funciona en **Safari**, no en la app de Mercado Libre. Si al tocar un producto se abre la app, toca **"mercadolibre.cl ›"** en la esquina superior derecha para volver a Safari: iOS lo recuerda. También puedes mantener presionado el enlace y elegir **Abrir**.

Más detalles en [`iphone/LEEME.md`](iphone/LEEME.md).

### Chrome (modo desarrollador)

1. Descarga este repositorio con **Code → Download ZIP** y descomprímelo.
2. Abre `chrome://extensions`, activa **Modo de desarrollador** y haz clic en **Cargar descomprimida**.
3. Elige la carpeta `ml-isla-de-pascua`.

### Safari en Mac

Requiere Xcode, que es gratis en la App Store:

```bash
xcrun safari-web-extension-converter ml-isla-de-pascua --macos-only --app-name "Envios Isla de Pascua"
```

Ejecuta el proyecto en Xcode y activa la extensión en Safari → Ajustes → Extensiones. Si no está firmada, hay que activar **"Permitir extensiones sin firmar"** en Ajustes → Desarrollador cada vez que se abre Safari.

---

## Estado y versiones

| Versión | Novedades | Edge | iPhone (GitHub) |
|---|---|---|---|
| **1.1.2** | Detección de envío por texto (sitio móvil). Detecta tu plan meli+ desde tu página de suscripción. | Lista para subir | ✅ Publicada |
| **1.1.1** | Costo de envío con meli+. Revisa la ficha en los casos dudosos. Las etiquetas ya no se montan sobre otras tarjetas. Ignora los enlaces de categorías. | En revisión | — |
| **1.1.0** | Primera versión en la tienda de Edge (visibilidad oculta). | ✅ Publicada | — |

---

## Para desarrolladores

### Estructura

- `ml-isla-de-pascua/`: la extensión (Manifest V3).
  - `content.js`: etiquetas, panel, reglas meli+ y revisión de fichas.
  - `background.js`: consulta fichas y plan meli+ con la sesión (Chrome y Edge).
  - `content.css`: estilos.
- `iphone/envios-isla-de-pascua.user.js`: el userscript para iPhone. **Se genera**; no se edita a mano.
- `build-userscript.py`: genera el userscript desde `ml-isla-de-pascua/`.

### Publicar una versión nueva

1. Cambia el código en `ml-isla-de-pascua/` y sube `version` en `manifest.json`.
2. Genera el userscript:
   ```bash
   python3 build-userscript.py
   ```
3. Haz commit y push. Los iPhone la reciben al tocar ☁️↓ en Userscripts.
4. **Edge:** empaqueta la carpeta en un .zip y súbelo en Partner Center → Packages → Replace.
5. **Safari en Mac:** copia los archivos al proyecto de Xcode y vuelve a compilar.

### Notas técnicas

- La cotización pública solo entrega el **precio de lista**. Lo que ve cada usuario (meli+, promociones) solo aparece en la ficha y en el checkout.
- En **Safari**, las consultas en segundo plano de una extensión **no llevan la sesión del usuario**. Por eso, ahí la ficha se revisa en un **marco invisible del mismo sitio** (`#ipc-probe=ID`), y el plan meli+ se lee igual (`/melimas#ipc-meli`).
- El sitio móvil de Mercado Libre usa otros nombres de clase. Por eso la frase de envío ("Retira/Llega … entre/el/mañana…") se busca por texto.
