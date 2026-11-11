# ML → Isla de Pascua (extensión para Safari)

Marca cada producto de Mercado Libre Chile según si se puede enviar a Isla de Pascua y,
si quieres, oculta los que no llegan.

## Cómo funciona
Por cada publicación visible consulta la API pública de envíos de Mercado Libre:

    https://api.mercadolibre.com/items/{ID}/shipping_options?city_to=TUxDQ0lTTDQ1NjI3

(`TUxDQ0lTTDQ1NjI3` es la ciudad "Isla De Pascua" en Mercado Libre). Es la misma cotización
que ve el comprador al elegir esa dirección, así que no depende de la ubicación que tengas
configurada en tu cuenta.

- ✅ Llega: muestra si es a domicilio o con retiro en agencia, el costo y la fecha estimada.
- ❌ No envía a Isla de Pascua / Sin stock.
- ⚪ Sin dato: la API no respondió. Revisa el producto a mano.

Un panel abajo a la derecha tiene las opciones "Ocultar los que no llegan" y "Ocultar sin dato".
Las respuestas se guardan 6 horas.

## Instalar en Safari

### Opción A: sin Xcode (extensión temporal)
1. Safari → Ajustes → Avanzado → activa "Mostrar funciones para desarrolladores web".
2. Safari → Ajustes → Desarrollador → activa "Permitir extensiones sin firmar".
3. En esa misma pestaña, usa "Añadir extensión temporal…" y elige esta carpeta.
4. Dale permiso en mercadolibre.cl y api.mercadolibre.com cuando Safari lo pida.

Las extensiones temporales se quitan al cerrar Safari, así que tendrás que repetir el paso 3.

### Opción B: permanente (requiere Xcode, gratis en la App Store)
    xcrun safari-web-extension-converter ./ml-isla-de-pascua --macos-only --app-name "ML Isla de Pascua"
Después, en Xcode, ejecuta el proyecto (⌘R) y activa la extensión en Safari → Ajustes → Extensiones.
Si no la firmas con una cuenta de desarrollador, "Permitir extensiones sin firmar" se desactiva
cada vez que reinicias Safari.
