// ML → Isla de Pascua: parte en segundo plano.
// Descarga la ficha de un producto con la sesión del usuario para saber si
// Mercado Libre le ofrece el envío gratis a su dirección. La página de resultados
// no puede hacerlo por sí misma (el navegador bloquea pedir otra parte de
// mercadolibre.cl), pero la extensión sí, gracias a sus permisos de sitio.

const ext = typeof browser !== "undefined" ? browser : chrome;

// Frase principal de envío de la ficha: "Retira gratis entre…", "Llega gratis mañana",
// "Retira entre el 17 y el 20/nov…". Las recomendaciones de abajo dicen
// "Envío gratis" y no se confunden con esta frase.
const PROMISE_RE = /\b(Retira|Llega)\s+(gratis\s+)?(entre|el|hoy|mañana|ma\\u00f1ana|en|antes|a partir)\b/i;

async function pdpShipping(id) {
  const url = "https://articulo.mercadolibre.cl/" + id.replace(/^MLC-?/i, "MLC-");
  const res = await fetch(url, { credentials: "include", redirect: "follow" });
  if (!res.ok) return { free: null, reason: "http " + res.status };
  const html = await res.text();
  const m = html.match(PROMISE_RE);
  if (!m) return { free: null, reason: "sin frase de envío" }; // p. ej. página de verificación
  return { free: !!m[2] };
}

// Plan meli+ del usuario: www.mercadolibre.cl/melimas dice "Eres Meli+ Total" a los socios
async function meliPlan() {
  const res = await fetch("https://www.mercadolibre.cl/melimas", { credentials: "include" });
  if (!res.ok) return null;
  const html = await res.text();
  const m = html.match(/Eres Meli\+\s*(Esencial|Total|Mega)/i);
  if (m) return { member: true, plan: m[1].toLowerCase() };
  // Sin sesión, ML redirige a verificación de cuenta: no se puede saber
  if (/account-verification|captcha/i.test(res.url)) return null;
  if (/Suscr[ií]bete a Meli\+/i.test(html)) return { member: false, plan: "none" };
  return null;
}

// Calculadora de envíos de la ficha: cotiza con la sesión para la dirección elegida
// en la cuenta. Se devuelve el HTML a la pestaña, que lo lee (content.js, parseCalc).
async function calcHtml(id) {
  const url =
    `https://www.mercadolibre.cl/gz/shipping-calculator?item_id=${id}&new_version=true&modal=true&informative=true&page_context=vpp&location=true&quantity=1`;
  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) return null;
  return { html: await res.text() };
}

ext.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg && msg.type === "ipc-calc" && /^MLC\d{6,}$/.test(msg.id || "")) {
    calcHtml(msg.id).then(sendResponse).catch(() => sendResponse(null));
    return true;
  }
  if (msg && msg.type === "ipc-meli") {
    meliPlan().then(sendResponse).catch(() => sendResponse(null));
    return true;
  }
  if (!msg || msg.type !== "ipc-pdp-shipping" || !/^MLC-?\d{8,}$/i.test(msg.id || "")) return false;
  pdpShipping(msg.id)
    .then(sendResponse)
    .catch((e) => sendResponse({ free: null, reason: String(e && e.message || e) }));
  return true; // respuesta asíncrona
});
