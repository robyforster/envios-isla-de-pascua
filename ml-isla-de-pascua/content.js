// ML → Isla de Pascua
// Consulta la API pública de envíos de Mercado Libre para cada producto visible
// usando como destino la ciudad "Isla De Pascua" (id TUxDQ0lTTDQ1NjI3) y
// marca / oculta los que no llegan.

(() => {
  "use strict";

  const CITY_ID = "TUxDQ0lTTDQ1NjI3"; // Isla De Pascua, Región de Valparaíso
  const API = (id) =>
    `https://api.mercadolibre.com/items/${id}/shipping_options?city_to=${CITY_ID}`;
  const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 horas
  const MAX_PARALLEL = 4;

  const ext = typeof browser !== "undefined" ? browser : chrome;
  const store = ext?.storage?.local;

  // ---------- estado ----------
  let hideNo = false;
  let hideUnknown = false;
  // Plan meli+ del usuario. Reglas de envío de mercadolibre.cl/melimas (nov 2026):
  // - Carritos desde $9.990 en productos con etiqueta meli+: envío gratis; si el
  //   envío cuesta más de $8.000, se paga la diferencia.
  // - Bajo $9.990: descuento observado en checkout de $3.000 ($9.090 -> $6.090).
  // Hoy Esencial y Total tienen las mismas reglas de envío; quedan separadas
  // por si Mercado Libre las cambia.
  const PLANS = {
    none: { name: "Sin meli+" },
    // Detectado automáticamente: se sabe que es socio, no si es Esencial o Total
    // (para envíos da lo mismo: las reglas son iguales)
    meliplus: { name: "meli+", threshold: 9990, freeCap: 8000, underDiscount: 3000 },
    esencial: { name: "meli+ Esencial", threshold: 9990, freeCap: 8000, underDiscount: 3000 },
    total: { name: "meli+ Total", threshold: 9990, freeCap: 8000, underDiscount: 3000 },
  };
  let plan = "auto"; // "auto" | "none" | "esencial" | "total"

  // ¿El usuario con sesión iniciada es socio meli+? El menú de la cuenta (en todas
  // las páginas de ML) muestra a los socios una insignia "…beneficios por ser Meli más".
  function detectMeliPlus() {
    // La clase cambia según la página (búsqueda, ficha…); la imagen de meli+ y su texto no
    for (const img of document.querySelectorAll("img[src*='meliplus'], .user-menu__user-pill-image, [class*='user-pill'] img")) {
      if (/por ser meli\s*(\+|m[aá]s)/i.test(img.alt || "")) return true;
    }
    // En el sitio móvil la insignia no siempre está: se usa lo leído de /melimas
    return !!(meliInfo && meliInfo.member);
  }
  function effectivePlan() {
    if (plan !== "auto") return plan;
    if (meliInfo && meliInfo.member && PLANS[meliInfo.plan]) return meliInfo.plan;
    return detectMeliPlus() ? "meliplus" : "none";
  }

  // ---------- plan meli+ leído de www.mercadolibre.cl/melimas ----------
  // Esa página dice "Eres Meli+ Total" (o Esencial) a los socios. Se lee cada 12 horas
  // y se guarda, así sirve también en páginas donde la insignia no aparece (iPhone).
  const MELI_TTL_MS = 12 * 60 * 60 * 1000;
  let meliInfo = null; // { member: bool, plan: "esencial"|"total"|…, t }
  function parseMeli(html) {
    if (!html) return null;
    const m = String(html).match(/Eres Meli\+\s*(Esencial|Total|Mega)/i);
    if (m) return { member: true, plan: m[1].toLowerCase() };
    if (/Suscr[ií]bete a Meli\+/i.test(html) && !/account-verification|captcha/i.test(html.slice(0, 5000))) return { member: false, plan: "none" };
    return null;
  }

  // ¿Mercado Libre ya dice "gratis" para la cuenta y dirección del usuario?
  // Ese texto lo calcula ML con la sesión (incluye meli+), la API pública no.
  const FREE_RE = /(env[ií]o|llega|retira)\s+gratis/i;
  function textWithoutOurs(el) {
    if (!el) return "";
    let t = el.innerText || el.textContent || "";
    el.querySelectorAll(".ipc-badge, .ipc-pdp").forEach((b) => { t = t.replace(b.innerText || b.textContent || "", ""); });
    return t;
  }
  const memCache = new Map(); // id -> result
  const queue = [];
  let running = 0;
  const counts = { ok: 0, no: 0, unknown: 0, pending: 0 };

  // ---------- caché ----------
  async function cacheGet(id) {
    if (memCache.has(id)) return memCache.get(id);
    if (!store) return null;
    try {
      const key = "ipc:" + id;
      const got = await store.get(key);
      const v = got?.[key];
      if (v && Date.now() - v.t < CACHE_TTL_MS) {
        memCache.set(id, v.r);
        return v.r;
      }
    } catch (_) {}
    return null;
  }
  function cacheSet(id, r) {
    memCache.set(id, r);
    if (!store || r.status === "unknown") return;
    try { store.set({ ["ipc:" + id]: { t: Date.now(), r } }); } catch (_) {}
  }

  // ---------- consulta ----------
  async function check(id) {
    const cached = await cacheGet(id);
    if (cached) return cached;
    let r;
    try {
      let res;
      // Reintenta errores temporales (424, 429, 5xx) hasta 2 veces
      for (let attempt = 0; attempt < 3; attempt++) {
        res = await fetch(API(id), { credentials: "omit" });
        if (![424, 429, 500, 502, 503, 504].includes(res.status)) break;
        await new Promise((ok) => setTimeout(ok, 800 * (attempt + 1)));
      }
      const body = await res.json().catch(() => ({}));
      if (res.ok && Array.isArray(body.options) && body.options.length) {
        const best = body.options.reduce((a, b) => ((b.cost ?? 1e12) < (a.cost ?? 1e12) ? b : a));
        r = {
          status: "ok",
          cost: best.cost,
          type: best.shipping_option_type, // "address" (a domicilio) | "agency" (retiro en agencia)
          date: best.estimated_delivery_time?.date || null,
          dateTo: best.estimated_delivery_time?.offset?.date || null,
        };
      } else {
        const detail = JSON.stringify(body.cause || body.message || "");
        if (/stock out/i.test(detail)) r = { status: "no", reason: "Sin stock" };
        else if (/route|restricted/i.test(detail)) r = { status: "no", reason: "No envía a Isla de Pascua" };
        else if (res.ok) r = { status: "no", reason: "Sin opciones de envío" };
        else if (res.status === 404 && /NSOPublicAPI/i.test(body.message || "") && !/not found/i.test(detail))
          // Otros rechazos del cotizador de envíos: tampoco hay forma de que llegue
          r = { status: "no", reason: "No envía a Isla de Pascua" };
        else r = { status: "unknown", reason: `Sin dato (${res.status})` };
      }
    } catch (e) {
      r = { status: "unknown", reason: "Error de red" };
    }
    cacheSet(id, r);
    return r;
  }

  function pump() {
    while (running < MAX_PARALLEL && queue.length) {
      const { id, card } = queue.shift();
      running++;
      check(id)
        .then((r) => apply(card, r))
        .finally(() => {
          running--;
          counts.pending--;
          renderPanel();
          pump();
        });
    }
  }

  // ---------- DOM: encontrar productos ----------
  const CARD_SELECTORS = [
    "li.ui-search-layout__item",
    ".ui-search-result",
    ".poly-card",
    ".andes-card",
    ".promotion-item",
    "li",
  ];

  function idFromHref(href) {
    if (!href) return null;
    // Los avisos (Ad) pasan por enlaces de seguimiento con la URL real codificada adentro
    let s = href;
    for (let i = 0; i < 3; i++) {
      try { const d = decodeURIComponent(s); if (d === s) break; s = d; } catch (_) { break; }
    }
    // id real de la publicación (las fichas de catálogo lo traen en wid / item_id)
    let m = s.match(/(?:[?&#]|\b)(?:wid|item_id)[=:](MLC-?\d{8,})/i);
    if (m) return m[1].replace("-", "").toUpperCase();
    // URL de publicación: articulo.mercadolibre.cl/MLC-123..., sin contar /p/MLC (catálogo) ni MLCU
    m = s.match(/(?<!\/p\/)(?<![A-Z])MLC-?(\d{8,})/i);
    if (m && !/\/p\/MLC-?\d+$/i.test(s.slice(0, m.index + m[0].length))) return "MLC" + m[1];
    return null;
  }

  function findCard(a) {
    for (const sel of CARD_SELECTORS) {
      const c = a.closest(sel);
      if (c) return c;
    }
    return null;
  }

  function register(card, id) {
    card.dataset.ipcId = id || "none";
    card.classList.add("ipc-card");
    if (!id) {
      // Ficha de catálogo con varias opciones de compra: no hay una sola publicación que revisar
      apply(card, { status: "unknown", reason: "Varias opciones de compra: abre el producto para ver" });
      return;
    }
    card.classList.add("ipc-pending");
    addBadge(card, "⏳ Revisando envío a Isla de Pascua…", "pending");
    counts.pending++;
    queue.push({ id, card });
  }

  function scan() {
    // Página de un producto individual: solo un aviso arriba del título, sin marcar enlaces
    const isItemPage =
      document.querySelector(".ui-pdp-container, .ui-pdp, .ui-pdp-header") ||
      /articulo\.mercadolibre\.cl|\/p\/MLC|\/up\/MLCU/i.test(location.href);
    if (isItemPage) { scanItemPage(); return; }

    // 1) Tarjetas de resultados de búsqueda: se revisan todos sus enlaces
    for (const card of document.querySelectorAll("li.ui-search-layout__item, .ui-search-layout > li")) {
      if (card.dataset.ipcId) continue;
      const links = [...card.querySelectorAll("a[href]")];
      if (!links.length) continue;
      let id = null;
      for (const a of links) if ((id = idFromHref(a.href))) break;
      register(card, id);
    }

    // 2) Otras páginas (ofertas, tiendas…): por enlace
    for (const a of document.querySelectorAll('a[href*="MLC"]')) {
      const card = findCard(a);
      if (!card || card.dataset.ipcId || card.closest("#ipc-panel") || card.closest(".ipc-card")) continue;
      // Filtros, categorías, menús y migas de pan no son productos
      if (a.closest(".ui-search-sidebar, aside, nav, header, footer, .andes-breadcrumb, [class*='filter'], [class*='breadcrumb']")) continue;
      const id = idFromHref(a.href);
      if (id) register(card, id);
    }
    renderPanel();
    pump();
  }

  // Mercado Libre vuelve a dibujar la ficha después de cargar (y al cambiar de vendedor),
  // lo que borra el aviso. Por eso se guarda el resultado y el aviso se repone cada vez
  // que desaparece.
  const pdp = { id: null, result: null, box: null };

  function scanItemPage() {
    // El id de la publicación que se está viendo (en fichas de catálogo cambia según el vendedor elegido)
    const inputId = (document.querySelector('input[name="item_id"]')?.value || "").toUpperCase();
    const id = (/^MLC\d+$/.test(inputId) && inputId) || idFromHref(location.href);
    if (!id) return;
    const header = document.querySelector(".ui-pdp-header") || document.querySelector("h1");
    if (!header || !header.parentElement) return;

    if (id !== pdp.id) {
      pdp.id = id;
      pdp.result = null;
      check(id).then((r) => {
        if (pdp.id !== id) return; // cambió de publicación mientras tanto
        pdp.result = r;
        paintPdp();
      });
    }

    if (!pdp.box) {
      pdp.box = document.createElement("div");
      pdp.box.className = "ipc-pdp";
    }
    if (!pdp.box.isConnected || pdp.box.nextElementSibling !== header) {
      header.parentElement.insertBefore(pdp.box, header);
    }
    paintPdp();
  }

  // Frase principal de envío de la ficha: "Retira gratis entre…", "Llega gratis mañana",
  // "Retira entre el 17 y el 20/nov…". Se busca en el texto de la página y no por nombres
  // de clase, porque el sitio móvil (iPhone) usa otros. Se saltan las recomendaciones
  // (tarjetas "poly" y carruseles), la descripción del vendedor y nuestras etiquetas.
  const PROMISE_RE = /\b(Retira|Llega)\s+(gratis\s+)?(entre|el|hoy|mañana|en|antes|a partir)\b/i;
  const NOT_PRODUCT = ".ipc-pdp, .ipc-badge, #ipc-panel, [class*='poly-'], [class*='recommendation'], [class*='carousel'], [class*='description'], [class*='questions'], [class*='reviews'], footer, header, nav, script, style, noscript";

  function pdpPromise() {
    const root = document.querySelector("main, #root-app, .ui-pdp-container") || document.body;
    if (!root) return null;
    const walker = document.createTreeWalker(root, 1 /* NodeFilter.SHOW_ELEMENT */);
    let el;
    while ((el = walker.nextNode())) {
      // Elementos "hoja" de texto: el más chico que contiene la frase completa
      if (el.children.length > 4) continue;
      const t = el.textContent || "";
      if (t.length > 200 || !PROMISE_RE.test(t)) continue;
      if (el.closest(NOT_PRODUCT)) continue;
      const m = t.match(PROMISE_RE);
      return { el, free: !!m[2] };
    }
    return null;
  }

  function pdpSaysFree() {
    const p = pdpPromise();
    return !!(p && p.free);
  }

  function paintPdp() {
    if (!pdp.box) return;
    const text = pdp.result
      ? labelFor(pdp.result, pdpSaysFree(), pdpPrice(), pdpHasMeliTag())
      : "⏳ Revisando envío a Isla de Pascua…";
    const status = pdp.result ? pdp.result.status : "pending";
    if (pdp.box.textContent !== text) pdp.box.textContent = text;
    if (pdp.box.dataset.status !== status) pdp.box.dataset.status = status;
  }

  // ---------- DOM: marcar ----------
  const fmtCLP = (n) => "$" + Math.round(n).toLocaleString("es-CL");
  const fmtDate = (s) => {
    // Usar la fecha tal como la entrega ML (hora continental), no convertida
    // a la zona horaria del equipo (en la isla correría un día hacia atrás).
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s || "");
    if (!m) return "";
    const d = new Date(+m[1], +m[2] - 1, +m[3]);
    return d.toLocaleDateString("es-CL", { day: "numeric", month: "short" });
  };

  // Precio de la ficha: el que la página declara oficialmente (meta itemprop=price);
  // los demás números de la ficha incluyen cuotas, variantes y recomendaciones.
  function pdpPrice() {
    const meta = document.querySelector('meta[itemprop="price"]');
    if (meta && +meta.content) return +meta.content;
    return priceOf(document.querySelector(".ui-pdp-price__second-line") || document.querySelector(".ui-pdp-price"));
  }

  // Sello rosado "meli+" (ícono con aria-label "Meli Más") junto al envío
  const MELI_TAG_SEL = "svg[aria-label='Meli Más'], svg[aria-label='Meli más'], use[href*='meli_plus']";
  function pdpHasMeliTag() {
    // El sello meli+ va junto a la frase de envío: se busca cerca de ella
    const p = pdpPromise();
    let box = p && p.el;
    for (let i = 0; box && i < 4; i++) {
      if (box.querySelector(MELI_TAG_SEL)) return true;
      box = box.parentElement;
    }
    for (const el of document.querySelectorAll(MELI_TAG_SEL)) {
      if (el.closest("[class*='xprod-lib-shipping'], [class*='ui-pdp-shipping'], [class*='ui-pdp-pickup']") &&
          !el.closest(NOT_PRODUCT)) return true;
    }
    return false;
  }

  // Precio del producto en la tarjeta o en la ficha (el actual, no el tachado)
  function priceOf(el) {
    if (!el) return null;
    const meta = el.querySelector?.('meta[itemprop="price"]');
    if (meta && +meta.content) return +meta.content;
    for (const f of el.querySelectorAll(".andes-money-amount__fraction")) {
      if (f.closest("s, del, [class*='previous'], [class*='original'], .ipc-badge, .ipc-pdp")) continue;
      const n = +String(f.textContent).replace(/\D/g, "");
      if (n) return n;
    }
    return null;
  }

  function costText(r, freeForUser, price, tagged) {
    if (freeForUser) return "envío gratis con tu cuenta";
    if (r.cost === 0) return "envío gratis";
    if (r.cost == null) return "";
    const p = PLANS[effectivePlan()];
    if (!p || !p.threshold) return `${fmtCLP(r.cost)} (precio de lista)`;
    const list = fmtCLP(r.cost);
    if (price != null && price >= p.threshold) {
      // Desde el umbral: meli+ cubre hasta el tope ($8.000) y se paga el resto
      // (confirmado en checkout: rack $27.490 -> $19.490)
      const rest = Math.max(0, r.cost - p.freeCap);
      // Con el sello meli+ en la tarjeta se sabe que aplica; sin él, solo "si aplica"
      const how = tagged ? `con ${p.name}` : `si aplica ${p.name}`;
      return `${rest === 0 ? "gratis" : fmtCLP(rest)} ${how} (lista ${list})`;
    }
    const withPlan = Math.max(0, r.cost - p.underDiscount);
    return `≈ ${withPlan === 0 ? "gratis" : fmtCLP(withPlan)} con ${p.name} (lista ${list})`;
  }

  function labelFor(r, freeForUser = false, price = null, tagged = false, note = "") {
    if (r.status === "ok") {
      const cost = costText(r, freeForUser, price, tagged);
      const how = r.type === "agency" ? "retiro en agencia" : "a domicilio";
      const when = r.date ? ` · llega ${fmtDate(r.date)}${r.dateTo && r.dateTo !== r.date ? "–" + fmtDate(r.dateTo) : ""}` : "";
      return `✅ Llega a Isla de Pascua · ${how}${cost ? " · " + cost : ""}${when}${note ? " · " + note : ""}`;
    }
    if (r.status === "no") return `❌ ${r.reason}`;
    return `⚪ ${r.reason}`;
  }

  function addBadge(card, text, status) {
    let b = card.querySelector(".ipc-badge");
    if (!b) {
      b = document.createElement("div");
      b.className = "ipc-badge";
      // Dentro de la tarjeta blanca, bajo el precio/envío
      const host =
        card.querySelector(".poly-card__content, .ui-search-result__content-wrapper, .ui-search-result__content") ||
        card.querySelector(".poly-card, .andes-card") ||
        card;
      host.appendChild(b);
    }
    b.textContent = text;
    b.dataset.status = status;
  }

  function paintCard(card) {
    const r = card._ipcR;
    if (!r) return;
    const note = card._ipcPdp === "checking" ? "revisando la ficha…" : "";
    addBadge(card, labelFor(r, card._ipcPdp === true, card._ipcPrice, card._ipcTagged, note), r.status);
  }

  function apply(card, r) {
    card.classList.remove("ipc-pending");
    card.classList.add("ipc-" + r.status);
    counts[r.status]++;
    card._ipcR = r;
    // El "Envío gratis" de las tarjetas es genérico: no considera el costo real a la
    // isla ni el tope de meli+ (un rack decía "gratis" y en el checkout costaba $19.490,
    // y una raqueta con el mismo sello salió gratis). Por eso, en los casos dudosos se
    // revisa la ficha del producto, que sí lo calcula para la cuenta y dirección.
    card._ipcFree = false;
    card._ipcPrice = priceOf(card);
    card._ipcTagged = !!card.querySelector(MELI_TAG_SEL);
    card._ipcPdp = undefined;
    if (needsPdpCheck(card, r)) {
      card._ipcPdp = "checking";
      pdpQueue.push(card);
      pumpPdp();
    }
    paintCard(card);
    updateVisibility(card);
  }

  // ---------- revisión de la ficha (casos dudosos) ----------
  // Dudoso = llega, el envío tiene costo según la API, y además la tarjeta dice
  // "Envío gratis" o el plan meli+ podría cubrirlo (precio desde el umbral y envío
  // sobre el tope). Suelen ser pocos por página.
  function needsPdpCheck(card, r) {
    if (r.status !== "ok" || !(r.cost > 0) || !card.dataset.ipcId || card.dataset.ipcId === "none") return false;
    if (FREE_RE.test(textWithoutOurs(card))) return true;
    const p = PLANS[effectivePlan()];
    return !!(p && p.threshold && card._ipcPrice != null && card._ipcPrice >= p.threshold && r.cost > p.freeCap);
  }

  const PDP_PARALLEL = 2;
  const pdpQueue = [];
  const pdpMem = new Map();
  let pdpRunning = 0;

  async function pdpCheck(id) {
    if (pdpMem.has(id)) return pdpMem.get(id);
    const key = "pdp:" + id;
    try {
      const got = (await store?.get(key))?.[key];
      if (got && Date.now() - got.t < CACHE_TTL_MS) { pdpMem.set(id, got.free); return got.free; }
    } catch (_) {}
    let free = null;
    try {
      const resp = await ext.runtime.sendMessage({ type: "ipc-pdp-shipping", id });
      free = resp && typeof resp.free === "boolean" ? resp.free : null;
    } catch (_) {}
    // Safari no envía la sesión en la consulta en segundo plano: se abre la ficha
    // en un marco invisible del mismo sitio (que sí la lleva) y se lee desde ahí.
    if (free === null) free = await framedProbe(id);
    pdpMem.set(id, free);
    if (free !== null) { try { store?.set({ [key]: { t: Date.now(), free } }); } catch (_) {} }
    return free;
  }

  function pumpPdp() {
    while (pdpRunning < PDP_PARALLEL && pdpQueue.length) {
      const card = pdpQueue.shift();
      if (!card.isConnected) continue;
      pdpRunning++;
      pdpCheck(card.dataset.ipcId)
        .then((free) => { card._ipcPdp = free; paintCard(card); })
        .finally(() => { pdpRunning--; pumpPdp(); });
    }
  }

  function updateVisibility(card) {
    const hide =
      (hideNo && card.classList.contains("ipc-no")) ||
      (hideUnknown && card.classList.contains("ipc-unknown"));
    card.classList.toggle("ipc-hidden", hide);
  }

  // ---------- panel flotante ----------
  let panel;
  function renderPanel() {
    if (!document.querySelector(".ipc-card")) return;
    if (!panel) {
      panel = document.createElement("div");
      panel.id = "ipc-panel";
      panel.innerHTML = `
        <div class="ipc-title">🗿 Isla de Pascua</div>
        <div class="ipc-stats"></div>
        <label><input type="checkbox" data-k="no"> Ocultar los que no llegan</label>
        <label><input type="checkbox" data-k="unknown"> Ocultar sin dato</label>
        <label class="ipc-plan">Mi plan:
          <select data-k="plan">
            <option value="auto">Automático</option>
            <option value="none">Sin meli+</option>
            <option value="esencial">meli+ Esencial</option>
            <option value="total">meli+ Total</option>
          </select>
        </label>`;
      document.body.appendChild(panel);
      panel.querySelectorAll("input, select").forEach((inp) => {
        const k = inp.dataset.k;
        if (k === "plan") { const o = inp.querySelector(`option[value="${plan}"]`); if (o) o.selected = true; }
        else inp.checked = k === "no" ? hideNo : hideUnknown;
        inp.addEventListener("change", () => {
          if (k === "no") hideNo = inp.checked;
          else if (k === "unknown") hideUnknown = inp.checked;
          else plan = inp.value === "auto" || PLANS[inp.value] ? inp.value : "auto";
          showDetected();
          try { store?.set({ ipcPrefs: { hideNo, hideUnknown, plan } }); } catch (_) {}
          document.querySelectorAll(".ipc-card").forEach((c) => {
            updateVisibility(c);
            if (k === "plan" && c._ipcR) {
              // Cambió el plan: puede que ahora haga falta revisar la ficha
              if (c._ipcPdp === undefined && needsPdpCheck(c, c._ipcR)) { c._ipcPdp = "checking"; pdpQueue.push(c); pumpPdp(); }
              paintCard(c);
            }
          });
        });
      });
    }
    showDetected();
    // Contar lo que hay en pantalla (si ML redibuja tarjetas, no se cuentan dos veces)
    const n = (s) => document.querySelectorAll(".ipc-card.ipc-" + s).length;
    const pending = n("pending");
    panel.querySelector(".ipc-stats").textContent =
      `✅ ${n("ok")}  ❌ ${n("no")}  ⚪ ${n("unknown")}` + (pending > 0 ? `  ⏳ ${pending}` : "");
  }

  function showDetected() {
    if (!panel) return;
    let d = panel.querySelector(".ipc-detected");
    if (!d) {
      d = document.createElement("div");
      d.className = "ipc-detected";
      panel.appendChild(d);
    }
    const cap = (x) => x.charAt(0).toUpperCase() + x.slice(1);
    const t = plan !== "auto" ? ""
      : meliInfo && meliInfo.member && meliInfo.plan ? `Detectado: meli+ ${cap(meliInfo.plan)}`
      : detectMeliPlus() ? "Detectado: socio meli+" : "Detectado: sin meli+";
    if (d.textContent !== t) d.textContent = t;
  }

  // ---------- inicio ----------
  async function init() {
    try {
      const p = (await store?.get("ipcPrefs"))?.ipcPrefs;
      if (p) {
        hideNo = !!p.hideNo;
        hideUnknown = !!p.hideUnknown;
        plan = p.plan === "auto" || PLANS[p.plan] ? p.plan : "auto";
      }
      const mi = (await store?.get("ipcMeli"))?.ipcMeli;
      if (mi && typeof mi.member === "boolean") meliInfo = mi;
    } catch (_) {}
    scan();
    refreshMeli();
    let t;
    new MutationObserver(() => {
      clearTimeout(t);
      t = setTimeout(scan, 400);
    }).observe(document.body, { childList: true, subtree: true });
  }

  async function refreshMeli() {
    if (meliInfo && Date.now() - (meliInfo.t || 0) < MELI_TTL_MS) return;
    let info = null;
    try {
      if (location.hostname === "www.mercadolibre.cl") {
        // Misma página del sitio: se descarga directo con la sesión
        const r = await fetch("/melimas", { credentials: "include" });
        if (r.ok) info = parseMeli(await r.text());
      } else {
        const resp = await ext.runtime.sendMessage({ type: "ipc-meli" }).catch(() => null);
        if (resp && typeof resp.member === "boolean") info = resp;
        if (!info) info = await framedMeli(); // Safari / iPhone
      }
    } catch (_) {}
    if (!info) return;
    meliInfo = { ...info, t: Date.now() };
    try { store?.set({ ipcMeli: meliInfo }); } catch (_) {}
    repaintAll();
  }

  function repaintAll() {
    document.querySelectorAll(".ipc-card").forEach((c) => {
      if (!c._ipcR) return;
      if (c._ipcPdp === undefined && needsPdpCheck(c, c._ipcR)) { c._ipcPdp = "checking"; pdpQueue.push(c); pumpPdp(); }
      paintCard(c);
    });
    paintPdp();
    showDetected();
  }

  // ---------- ficha en un marco invisible ----------
  // La página de resultados abre articulo.mercadolibre.cl/MLC-… (redirige a la ficha)
  // en un marco oculto con "#ipc-probe=ID". Esta misma extensión corre dentro del
  // marco, espera a que aparezca la frase de envío y avisa al marco padre.
  const PROBE_TIMEOUT_MS = 20000;
  let probeChain = Promise.resolve();

  function framedProbe(id) {
    const run = () => new Promise((resolve) => {
      const f = document.createElement("iframe");
      f.setAttribute("aria-hidden", "true");
      f.tabIndex = -1;
      f.style.cssText =
        "position:fixed;left:-10000px;top:0;width:1024px;height:800px;opacity:0;pointer-events:none;border:0";
      let done = false;
      const finish = (free) => {
        if (done) return;
        done = true;
        window.removeEventListener("message", onMsg);
        clearTimeout(timer);
        f.remove();
        resolve(free);
      };
      const onMsg = (ev) => {
        if (!/(^|\.)mercadolibre\.cl$/.test(new URL(ev.origin).hostname)) return;
        const d = ev.data;
        if (d && d.ipcProbe === true && d.id === id) finish(typeof d.free === "boolean" ? d.free : null);
      };
      const timer = setTimeout(() => finish(null), PROBE_TIMEOUT_MS);
      window.addEventListener("message", onMsg);
      f.src = "https://articulo.mercadolibre.cl/" + id.replace(/^MLC-?/i, "MLC-") + "#ipc-probe=" + id;
      document.body.appendChild(f);
    });
    // De a una ficha a la vez, para no cargar de más la página
    const p = probeChain.then(run, run);
    probeChain = p.catch(() => {});
    return p;
  }

  // /melimas en un marco invisible (mismo mecanismo que las fichas)
  function framedMeli() {
    return new Promise((resolve) => {
      if (!document.body) return resolve(null);
      const f = document.createElement("iframe");
      f.setAttribute("aria-hidden", "true");
      f.tabIndex = -1;
      f.style.cssText =
        "position:fixed;left:-10000px;top:0;width:1024px;height:800px;opacity:0;pointer-events:none;border:0";
      let done = false;
      const finish = (v) => {
        if (done) return;
        done = true;
        window.removeEventListener("message", onMsg);
        clearTimeout(timer);
        f.remove();
        resolve(v);
      };
      const onMsg = (ev) => {
        if (!/(^|\.)mercadolibre\.cl$/.test(new URL(ev.origin).hostname)) return;
        const d = ev.data;
        if (d && d.ipcMeli === true) finish(d.info && typeof d.info.member === "boolean" ? d.info : null);
      };
      const timer = setTimeout(() => finish(null), PROBE_TIMEOUT_MS);
      window.addEventListener("message", onMsg);
      f.src = "https://www.mercadolibre.cl/melimas#ipc-meli";
      document.body.appendChild(f);
    });
  }

  // Dentro del marco de /melimas: leer el plan y responder
  function runMeliProbe() {
    const started = Date.now();
    const tick = () => {
      const html = document.documentElement ? document.documentElement.innerHTML : "";
      const info = /Eres Meli\+/i.test(html) || Date.now() - started > 6000 ? parseMeli(html) : null;
      if (info || Date.now() - started > PROBE_TIMEOUT_MS - 2000) {
        window.parent.postMessage({ ipcMeli: true, info }, "*");
        return;
      }
      setTimeout(tick, 500);
    };
    tick();
  }

  // Dentro del marco: leer la frase de envío de la ficha y responder
  function runProbe() {
    const id = (location.hash.match(/ipc-probe=(MLC\d+)/i) || [])[1];
    if (!id) return;
    const started = Date.now();
    const tick = () => {
      const p = pdpPromise();
      if (p || Date.now() - started > PROBE_TIMEOUT_MS - 2000) {
        window.parent.postMessage({ ipcProbe: true, id, free: p ? p.free : null }, "*");
        return;
      }
      setTimeout(tick, 500);
    };
    tick();
  }

  const inFrame = (() => {
    try { return !!window.top && window.top !== window.self; } catch (_) { return true; }
  })();
  if (inFrame) {
    // En marcos solo actúa si es nuestro marco de revisión; en otros (avisos, etc.) nada
    if (/#ipc-probe=/i.test(location.href)) runProbe();
    else if (/#ipc-meli\b/i.test(location.href)) runMeliProbe();
  } else {
    init();
  }
})();
