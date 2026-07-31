# 🚀 EndeavourOS – Scripts d’installation et de post‑installation

Ce dépôt regroupe plusieurs scripts pour préparer, configurer et compléter une installation EndeavourOS/Arch Linux : optimisation de `pacman`, installation des paquets (officiels et AUR), applications Flatpak, configuration de Zsh et des alias, activation de services systemd, et mise en place de ZRAM.

## 📁 Dossiers et contenus

- 🛠️ `Modification de Pacman/`
  - Script : `mod_pacman.sh`
  - Objet : consulter/modifier/désactiver `ParallelDownloads` dans `/etc/pacman.conf` avec sauvegarde, restauration et validation automatiques.

- 📦 `Installation de logiciels/`
  - Scripts : `installation_Logiciels.sh`, `installation_flatpak.sh`
  - Objet : installation automatisée des paquets systèmes (Pacman + AUR via Yay) et des applications Flatpak (Flathub, liste d’apps essentielles, mode dry‑run, logs).

- 🐚 `Installation et configuration ZSH/`
  - Script : `installation_zsh.sh`
  - Objet : installer et configurer Zsh + Zinit + Oh My Posh (thème Catppuccin), plugins utiles, police Nerd Font, et commutation du shell par défaut.

- ⚙️ `Configuration Shell/`
  - Fichiers : `ajout_alias.sh`, `mes_alias_bashzsh.sh`
  - Objet : gestion centralisée d’un fichier d’alias et insertion contrôlée dans `~/.bashrc`, `~/.zshrc` ou `~/.config/fish/config.fish` (sauvegarde, validation, modes interactifs).

- 🧩 `Services Systemd/`
  - Script : `activation_services.sh`
  - Objet : activer et vérifier des services/timers systemd clés (ex. `bluetooth.service`, `ufw.service`, `fstrim.timer`, `paccache.timer`).

- 🧠 `Activation_zram/`
  - Scripts : `Activation_zram.sh`, `Activation_zram_improved.sh`
  - Objet : installation et configuration de ZRAM avec paramètres prédéfinis; deux variantes à tester.

## ✅ Ordre d’exécution recommandé

1. 🛠️ Modification de Pacman → `mod_pacman.sh` (optimise `ParallelDownloads` avant toute grosse installation)
2. 🧠 Activation ZRAM → `Activation_zram_improved.sh` (ou `Activation_zram.sh`) et redémarrage si nécessaire
3. 🧩 Services Systemd → `activation_services.sh` (activer services/timers utiles)
4. 📦 Installation de logiciels → `installation_Logiciels.sh` (paquets de base, environnements, AUR)
5. 📦 Installation de logiciels → `installation_flatpak.sh` (applications Flatpak, après configuration de Flathub)
6. 🐚 Installation et configuration ZSH → `installation_zsh.sh` (shell et prompt modernes)
7. ⚙️ Configuration Shell → `ajout_alias.sh` puis rechargement du shell (aliases communs)

Astuce : vous pouvez exécuter certains scripts en mode simulation (`--dry-run`) pour valider les actions avant application.

## 🧩 Prérequis généraux

- Système basé sur Arch/EndeavourOS avec `pacman` et `systemd`.
- Accès administrateur (`sudo`) pour les scripts qui modifient le système.
- Connexion Internet active.

## ⚡ Exécution rapide (exemples)

```bash
# 0) Rendre exécutables les scripts nécessaires (exemples)
chmod +x "Modification de Pacman/mod_pacman.sh"
chmod +x "Installation de logiciels/installation_Logiciels.sh" "Installation de logiciels/installation_flatpak.sh"
chmod +x "Installation et configuration ZSH/installation_zsh.sh"
chmod +x "Configuration Shell/ajout_alias.sh"
chmod +x "Services Systemd/activation_services.sh"
chmod +x "Activation_zram/Activation_zram_improved.sh"

# 1) Pacman
sudo "Modification de Pacman/mod_pacman.sh" --auto

# 2) ZRAM (choisir une variante)
sudo "Activation_zram/Activation_zram_improved.sh"

# 3) Services et timers systemd
sudo "Services Systemd/activation_services.sh"

# 4) Paquets système (menu interactif ou options)
sudo "Installation de logiciels/installation_Logiciels.sh"

# 5) Applications Flatpak
sudo "Installation de logiciels/installation_flatpak.sh"

# 6) Zsh + Oh My Posh
sudo "Installation et configuration ZSH/installation_zsh.sh" --theme mocha

# 7) Alias (mode par défaut ou interactif)
"Configuration Shell/ajout_alias.sh" --validate
```

## Avertissements

- Certains scripts modifient des fichiers système (ex. `/etc/pacman.conf`) ou vos fichiers de configuration utilisateur (`~/.zshrc`, etc.). Des sauvegardes sont prévues par les scripts, vérifiez-les avant restauration.
- Testés sur EndeavourOS/Arch : d’autres distributions peuvent différer.