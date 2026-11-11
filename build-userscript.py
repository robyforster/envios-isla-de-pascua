#!/usr/bin/env python3
"""Genera la versión para iPhone (app "Userscripts" en Safari) desde el código
de la extensión: ml-isla-de-pascua/{manifest.json, content.js, content.css}
-> iphone/envios-isla-de-pascua.user.js

Uso:  python3 build-userscript.py
"""
import json
import pathlib

ROOT = pathlib.Path(__file__).resolve().parent
EXT = ROOT / "ml-isla-de-pascua"
OUT = ROOT / "iphone" / "envios-isla-de-pascua.user.js"

manifest = json.loads((EXT / "manifest.json").read_text(encoding="utf-8"))
content_js = (EXT / "content.js").read_text(encoding="utf-8")
content_css = (EXT / "content.css").read_text(encoding="utf-8")

header = f"""// ==UserScript==
// @name         {manifest["name"]}
// @description  {manifest["description"]}
// @version      {manifest["version"]}
// @namespace    https://github.com/robyforster/envios-isla-de-pascua
// @homepageURL  https://github.com/robyforster/envios-isla-de-pascua
// @updateURL    https://raw.githubusercontent.com/robyforster/envios-isla-de-pascua/main/iphone/envios-isla-de-pascua.user.js
// @downloadURL  https://raw.githubusercontent.com/robyforster/envios-isla-de-pascua/main/iphone/envios-isla-de-pascua.user.js
// @match        *://*.mercadolibre.cl/*
// @run-at       document-end
// @inject-into  content
// @grant        GM.getValue
// @grant        GM.setValue
// ==/UserScript==
"""

# Reemplazos de lo que en la extensión da el navegador:
# - browser.storage.local: las opciones del panel (ipcPrefs) van al almacenamiento de
#   la app Userscripts, que se comparte entre listado.mercadolibre.cl y la ficha.
#   La caché de resultados (ipc:/pdp:) va a sessionStorage, para que no crezca sin fin.
# - browser.runtime.sendMessage: no hay parte en segundo plano; se responde "sin dato"
#   y la extensión revisa la ficha con el marco invisible (lo mismo que en Safari).
shim = r"""
(() => {
  // Estilos de la extensión
  const css = %CSS%;
  const addStyle = () => {
    const s = document.createElement("style");
    s.textContent = css;
    (document.head || document.documentElement).appendChild(s);
  };
  addStyle();

  const gm = typeof GM !== "undefined" && GM && GM.getValue ? GM : null;
  const isCacheKey = (k) => /^(ipc|pdp):/.test(k);
  const parse = (v) => { try { return v == null ? undefined : JSON.parse(v); } catch (_) { return undefined; } };

  const browser = {
    runtime: { sendMessage: async () => ({ free: null }) },
    storage: {
      local: {
        async get(k) {
          let raw;
          try {
            if (isCacheKey(k)) raw = sessionStorage.getItem("ipc-us:" + k);
            else raw = gm ? await gm.getValue(k) : localStorage.getItem("ipc-us:" + k);
          } catch (_) {}
          return { [k]: parse(raw) };
        },
        async set(obj) {
          for (const [k, v] of Object.entries(obj)) {
            const raw = JSON.stringify(v);
            try {
              if (isCacheKey(k)) sessionStorage.setItem("ipc-us:" + k, raw);
              else if (gm) await gm.setValue(k, raw);
              else localStorage.setItem("ipc-us:" + k, raw);
            } catch (_) {}
          }
        },
      },
    },
  };
  const chrome = browser;

%CONTENT%
})();
"""

body = shim.replace("%CSS%", json.dumps(content_css, ensure_ascii=False)).replace(
    "%CONTENT%", "\n".join("  " + line if line else "" for line in content_js.splitlines())
)

OUT.parent.mkdir(parents=True, exist_ok=True)
OUT.write_text(header + body, encoding="utf-8")
print(f"OK {OUT.relative_to(ROOT)} (versión {manifest['version']}, {OUT.stat().st_size} bytes)")
