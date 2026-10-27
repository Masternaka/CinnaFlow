#!/usr/bin/env bash
# Contrôles statiques et simulation de CinnaFlow.
# Usage : bash scripts/check.sh   (lancé aussi par la CI)
set -euo pipefail

cd "$(dirname "$0")/.."

fail=0
ok()   { printf '  OK   %s\n' "$*"; }
ko()   { printf '  FAIL %s\n' "$*"; fail=1; }
skip() { printf '  SKIP %s\n' "$*"; }

echo "== Syntaxe JavaScript =="
if command -v node >/dev/null 2>&1; then
    for file in extension.js lib/*.js; do
        if node --check "$file"; then
            ok "$file (node)"
        else
            ko "$file"
        fi
    done
elif command -v osascript >/dev/null 2>&1; then
    # Repli macOS sans Node : JavaScriptCore compile la source sans l'exécuter.
    result=$(osascript -l JavaScript -e 'ObjC.import("Foundation"); var s = $.NSString.stringWithContentsOfFileEncodingError("extension.js", $.NSUTF8StringEncoding, null).js; try { new Function(s); "OK"; } catch (e) { "KO: " + e.message; }') || result="KO: osascript indisponible"
    case "$result" in
        OK) ok "extension.js (JavaScriptCore)" ;;
        *)  ko "extension.js : $result" ;;
    esac
    echo "       modules lib/*.js : compilés par la simulation ci-dessous"
else
    skip "extension.js et lib/*.js : ni node ni osascript"
fi

echo "== JSON =="
check_json() {
    local file="$1"
    if command -v jq >/dev/null 2>&1; then
        if jq empty "$file" >/dev/null 2>&1; then ok "$file"; else ko "$file"; fi
    elif command -v python3 >/dev/null 2>&1; then
        if python3 -m json.tool "$file" >/dev/null 2>&1; then ok "$file"; else ko "$file"; fi
    else
        skip "$file : ni jq ni python3"
    fi
}
check_json settings-schema.json
check_json metadata.json

echo "== Simulation de la logique =="
# Le script charge extension.js avec un système de fichiers en mémoire.
# Il ne remplace pas la recette Cinnamon/X11.
if command -v node >/dev/null 2>&1; then
    if node scripts/simulation.js; then
        ok "dispositions, import/export, état, bords et drag (node)"
    else
        ko "simulation (node)"
    fi
elif command -v osascript >/dev/null 2>&1; then
    if osascript -l JavaScript scripts/simulation.js; then
        ok "dispositions, import/export, état, bords et drag (JavaScriptCore)"
    else
        ko "simulation (JavaScriptCore)"
    fi
else
    skip "simulation : ni node ni osascript"
fi

echo "== Cycle de vie Cinnamon =="
# Cinnamon exige init/enable/disable au niveau module : une régression ici
# empêche l'extension de se charger (cf. étape 0 du plan).
for fn in init enable disable; do
    if grep -qE "^function ${fn}\(" extension.js; then
        ok "fonction module ${fn}()"
    else
        ko "fonction module ${fn}() manquante dans extension.js"
    fi
done

echo
if [ "$fail" -ne 0 ]; then
    echo "Echec : corriger les points ci-dessus."
    exit 1
fi
echo "Toutes les vérifications sont passées."
