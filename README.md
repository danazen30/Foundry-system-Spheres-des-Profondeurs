# Spheres of the Depths — Foundry VTT

Système de jeu pour **Sphères des Profondeurs** sur Foundry Virtual Tabletop v13.

- **ID système :** `sdp`
- **Auteur :** Danazen
- **Licence :** MIT

## Prérequis

- [Foundry Virtual Tabletop](https://foundryvtt.com/) **v13**
- Module **[socketlib](https://foundryvtt.com/packages/module/socketlib)** (dépendance obligatoire)

## Installation

Le système s’installe via l’URL du manifest GitHub (pas besoin du catalogue officiel Foundry).

1. Ouvrir l’écran **Configuration** de Foundry (Setup).
2. Aller dans l’onglet **Game Systems**.
3. Cliquer **Install System**.
4. Coller l’URL du manifest en bas de la fenêtre :

```
https://github.com/danazen30/Foundry-system-Spheres-des-Profondeurs/releases/latest/download/system.json
```

5. Cliquer **Install** et attendre la fin du téléchargement.
6. Installer **socketlib** : onglet **Add-on Modules** → **Install Module** → rechercher *socketlib*.
7. Créer un monde en choisissant **Sphères des Profondeurs**.

### Mise à jour

1. Setup → **Game Systems** → **Check for System Updates** (ou **Update** sur la ligne SDP).
2. Foundry télécharge la dernière release depuis GitHub automatiquement.

## Journaux

Le compendium **SDP Journaux** (`sdp.journals`) contient les journaux de référence (carrières, règles, etc.). Pour les ajouter à un monde, glisser-déposer les entrées depuis le compendium vers l’onglet **Journal**.

## Compendiums inclus

- Blessures, Talents, Compétences, Espèces, Carrières, Signes, Corruptions, Tables aléatoires, Journaux

## Publication / mise à jour (mainteneur)

### 1. Préparer une version

1. Mettre à jour `"version"` dans `system.json`.
2. Mettre à jour `"download"` avec la nouvelle version :

```json
"download": "https://github.com/danazen30/Foundry-system-Spheres-des-Profondeurs/releases/download/0.1.0/sdp-0.1.0.zip"
```

3. Commiter et pousser sur GitHub.
4. **Fermer Foundry** avant de créer l’archive (évite les fichiers de compendiums verrouillés).

### 2. Créer la release GitHub

**Automatique (recommandé)** — tag correspondant à la version :

```powershell
git tag v0.1.0
git push origin v0.1.0
```

Le workflow `.github/workflows/release.yml` crée le zip et attache `system.json` à la release.

**Manuel** — tester l’archive en local :

```powershell
.\scripts\build-release.ps1
```

Puis créer une release GitHub et y joindre `sdp-x.y.z.zip` + `system.json`.

> Le tag (`v0.1.0`) doit correspondre à `"version"` dans `system.json` (`0.1.0`).

Les utilisateurs n’ont pas à télécharger le zip eux-mêmes : Foundry le récupère via le manifest lors de l’installation ou de la mise à jour.

## Structure du dépôt

```
sdp/
├── system.json          # Manifest Foundry
├── template.json        # Modèle de données
├── module/              # Code JavaScript
├── templates/           # Handlebars
├── styles/              # CSS
├── lang/                # fr.json, en.json
├── packs/               # Compendiums
└── assets/              # Icônes et médias
```

## Support

- Dépôt : [github.com/danazen30/Foundry-system-Spheres-des-Profondeurs](https://github.com/danazen30/Foundry-system-Spheres-des-Profondeurs)
- Problème d’installation : vérifier Foundry v13, socketlib installé, et que l’URL du manifest est accessible (dépôt public, release publiée).
