#!/usr/bin/env python3
"""Valider le tag et produire l'archive installable de CinnaFlow."""

import argparse
import json
from pathlib import Path
import zipfile


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("tag", help="Tag vN correspondant à metadata.json")
    parser.add_argument("--output-dir", type=Path, required=True)
    args = parser.parse_args()
    root = Path(__file__).resolve().parent.parent
    metadata = json.loads((root / "metadata.json").read_text(encoding="utf-8"))
    version = metadata["version"]
    if type(version) is not int or version < 1 or args.tag != f"v{version}":
        parser.error("Le tag doit être vN, où N est la version entière positive de metadata.json.")
    uuid = metadata["uuid"]
    if not isinstance(uuid, str) or uuid in ("", ".", "..") or "/" in uuid or "\\" in uuid:
        parser.error("UUID invalide pour le dossier de l'archive.")
    files = ["extension.js", "metadata.json", "settings-schema.json", "stylesheet.css", "LICENSE"]
    lib_dir = root / "lib"
    if not lib_dir.is_dir():
        parser.error("Le dossier lib/ des modules GJS est absent.")
    lib_files = sorted(path.relative_to(root).as_posix() for path in lib_dir.rglob("*.js"))
    if not lib_files:
        parser.error("Aucun module JavaScript dans lib/.")
    files.extend(lib_files)
    # Lire tous les fichiers avant de créer l'archive pour éviter un ZIP incomplet.
    contents = {name: (root / name).read_bytes() for name in files}
    args.output_dir.mkdir(parents=True, exist_ok=True)
    archive = args.output_dir / f"CinnaFlow-{args.tag}.zip"
    with zipfile.ZipFile(archive, "w", compression=zipfile.ZIP_DEFLATED) as package:
        for name, data in contents.items():
            entry = zipfile.ZipInfo(f"{uuid}/{name}")
            entry.create_system = 3
            entry.external_attr = 0o100644 << 16
            package.writestr(entry, data, compress_type=zipfile.ZIP_DEFLATED)
    print(archive)


if __name__ == "__main__":
    main()
