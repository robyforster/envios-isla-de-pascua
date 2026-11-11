# Envíos a Isla de Pascua

Extensión para navegador (Edge, Chrome y Safari) y userscript para iPhone que marca, en **Mercado Libre Chile**, qué productos se pueden enviar a **Isla de Pascua (Rapa Nui)** y cuánto cuesta el envío.

> Proyecto independiente: no está afiliado a Mercado Libre ni lo respalda Mercado Libre.

## Qué hace

- En cada resultado de búsqueda muestra una etiqueta:
  - ✅ **Llega a Isla de Pascua**: dice si es a domicilio o con retiro en agencia, el costo y la fecha estimada.
  - ❌ **No envía a Isla de Pascua**, o no hay stock.
  - ⚪ **Sin dato**.
- Muestra un panel con contadores, la opción **"Ocultar los que no llegan"** y **"Mi plan"** (automático, sin meli+, meli+ Esencial o meli+ Total).
- Calcula el envío con los beneficios **meli+**:
  - Productos desde $9.990: meli+ cubre hasta $8.000 del envío.
  - Productos más baratos: descuento en el envío.
  - En los casos dudosos, revisa la ficha del producto para ver si Mercado Libre ofrece el envío gratis a tu cuenta y dirección.
- En la página de cada producto muestra el mismo aviso sobre el título.

Usa la cotización pública de envíos de Mercado Libre (`api.mercadolibre.com/items/{ID}/shipping_options`), con la comuna de Isla de Pascua como destino, y las propias páginas de Mercado Libre. No recopila ni envía datos personales.

## Instalar

| Dónde | Cómo |
|---|---|
| **Microsoft Edge** | Desde la tienda: https://microsoftedge.microsoft.com/addons/detail/ekejcmkohhnpalpjchgicjjoclemecoa |
| **Chrome** (modo desarrollador) | `chrome://extensions` → Modo de desarrollador → "Cargar descomprimida" → carpeta `ml-isla-de-pascua` |
| **iPhone** (Safari) | App gratuita **Userscripts** + [`iphone/envios-isla-de-pascua.user.js`](iphone/envios-isla-de-pascua.user.js). Ver [`iphone/LEEME.md`](iphone/LEEME.md). Se actualiza sola desde este repositorio. |
| **Safari en Mac** | Requiere Xcode: `xcrun safari-web-extension-converter ml-isla-de-pascua --macos-only` |

## Estructura

- `ml-isla-de-pascua/`: la extensión (Manifest V3).
- `iphone/`: el userscript para la app Userscripts, generado desde la extensión.
- `build-userscript.py`: regenera `iphone/envios-isla-de-pascua.user.js` desde `ml-isla-de-pascua/`.

## Publicar una versión nueva

1. Cambia el código en `ml-isla-de-pascua/` y sube `version` en `manifest.json`.
2. Ejecuta `python3 build-userscript.py`.
3. Haz commit y push. Los iPhone con el userscript se actualizan solos.
4. Para Edge, sube el .zip de la extensión en Partner Center.
