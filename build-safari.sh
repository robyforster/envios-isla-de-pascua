#!/bin/bash
# Genera, compila y abre la extensión para Safari en Mac desde ml-isla-de-pascua/.
#
# Uso:   ./build-safari.sh
# Requiere Xcode (gratis en la App Store).
#
# Cada vez regenera el proyecto de Xcode en safari-app/ desde el código, así nunca
# queda desactualizado. El nombre y el identificador de la app se mantienen, para que
# Safari la reconozca como la misma extensión. Se pueden cambiar con variables:
#   APP_NAME="Mi nombre" BUNDLE_ID="com.ejemplo.envios" ./build-safari.sh

set -euo pipefail
cd "$(dirname "$0")"

APP_NAME="${APP_NAME:-ML Isla de Pascua}"
BUNDLE_ID="${BUNDLE_ID:-cl.roby.ml-isla-de-pascua}"
EXT_DIR="$PWD/ml-isla-de-pascua"
OUT_DIR="$PWD/safari-app"
PROJECT_DIR="$OUT_DIR/$APP_NAME"
DERIVED="$OUT_DIR/build"

if ! xcrun --find safari-web-extension-converter >/dev/null 2>&1; then
  echo "❌ Falta Xcode. Instálalo desde la App Store y ejecuta:"
  echo "   sudo xcode-select -s /Applications/Xcode.app/Contents/Developer"
  exit 1
fi

VERSION=$(python3 -c "import json,sys; print(json.load(open(sys.argv[1]))['version'])" "$EXT_DIR/manifest.json")
echo "▶ Extensión versión $VERSION → $APP_NAME ($BUNDLE_ID)"

# 1) Proyecto de Xcode nuevo desde el código (el anterior se reemplaza)
rm -rf "$PROJECT_DIR"
mkdir -p "$OUT_DIR"
xcrun safari-web-extension-converter "$EXT_DIR" \
  --macos-only \
  --app-name "$APP_NAME" \
  --bundle-identifier "$BUNDLE_ID" \
  --project-location "$OUT_DIR" \
  --copy-resources --no-open --no-prompt >/dev/null

# 2) El convertidor arma el identificador de la app a partir del nombre (con mayúsculas)
#    y el de la extensión a partir de BUNDLE_ID; Xcode exige que el de la extensión
#    empiece con el de la app. Se dejan coherentes.
python3 - "$PROJECT_DIR" "$BUNDLE_ID" <<'PY'
import pathlib, re, sys
project_dir, bundle = pathlib.Path(sys.argv[1]), sys.argv[2]
files = list(project_dir.glob("*.xcodeproj/project.xcproj")) + list(project_dir.glob("*.xcodeproj/project.pbxproj"))
if not files:
    sys.exit("No se encontró el archivo del proyecto de Xcode")
for f in files:
    s = f.read_text(encoding="utf-8")
    # Formato nuevo:  "PRODUCT_BUNDLE_IDENTIFIER": "x"   |   formato clásico:  PRODUCT_BUNDLE_IDENTIFIER = x;
    def fix(m):
        value = m.group(2)
        new = bundle + ".Extension" if value.lower().endswith(".extension") else bundle
        return m.group(1) + new + m.group(3)
    s2 = re.sub(r'("PRODUCT_BUNDLE_IDENTIFIER":\s*")([^"]+)(")', fix, s)
    s2 = re.sub(r'(PRODUCT_BUNDLE_IDENTIFIER\s*=\s*"?)([^";]+)("?;)', fix, s2)
    f.write_text(s2, encoding="utf-8")
PY

# 3) Compilar (sin firma: sirve en este Mac con "Permitir extensiones sin firmar")
echo "▶ Compilando…"
XCODEPROJ=$(ls -d "$PROJECT_DIR"/*.xcodeproj | head -1)
xcodebuild -project "$XCODEPROJ" -scheme "$APP_NAME" -configuration Debug \
  -derivedDataPath "$DERIVED" CODE_SIGN_IDENTITY="-" CODE_SIGNING_REQUIRED=NO DEVELOPMENT_TEAM="" \
  build 2>&1 | grep -E "error:|BUILD (SUCCEEDED|FAILED)" || true

APP="$DERIVED/Build/Products/Debug/$APP_NAME.app"
if [ ! -d "$APP" ]; then
  echo "❌ No se pudo compilar. Revisa los errores de arriba."
  exit 1
fi

# 4) Registrar esta copia en macOS y abrirla
LSREGISTER=/System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister
"$LSREGISTER" -f "$APP" >/dev/null 2>&1 || true
pluginkit -a "$APP/Contents/PlugIns/$APP_NAME Extension.appex" >/dev/null 2>&1 || true
open "$APP"

echo "✅ Listo: $APP_NAME $VERSION"
echo "   En Safari: Ajustes → Desarrollador → \"Permitir extensiones sin firmar\" y"
echo "   Ajustes → Extensiones → activa \"$APP_NAME\". Luego recarga Mercado Libre."
