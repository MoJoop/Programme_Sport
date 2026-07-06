# 💪 Programme Sport

Plateforme d'entraînement personnelle : planifie tes séances, suis ta progression et travaille chaque partie du corps.

**➡️ Site en ligne :** https://mojoop.github.io/Programme_Sport/

## Fonctionnalités

- **Tableau de bord** — séance du jour, équilibre de la semaine, carte d'activité (heatmap).
- **Bibliothèque** — 38 séances / 410 exercices issus des programmes *Triformance* (foot) et *Dig Deeper*, filtrables par type (Force, Pliométrie, Vitesse, Agilité, Mobilité, Récupération) et par groupe musculaire.
- **Planificateur** — calendrier hebdomadaire, glisse tes séances sur les jours, visualise la couverture des groupes musculaires, applique des modèles de programme équilibrés.
- **Journal** — enregistre chaque séance avec date, charge/répétitions par exercice, RPE et notes.
- **Progression** — séances par semaine, répartition par type, groupes musculaires travaillés, et **courbe de progression par exercice** (charge/reps dans le temps).

## Technique

Site 100 % statique (HTML/CSS/JS, sans dépendance), hébergé sur **GitHub Pages**. Les données sont stockées **localement** dans le navigateur (`localStorage`). Boutons *Exporter / Importer* pour sauvegarder ou transférer tes données.

| Fichier | Rôle |
|---|---|
| `index.html` | structure de la page |
| `styles.css` | design (thème clair/sombre) |
| `app.js` | logique (vues, planning, journal, graphiques) |
| `data.js` | bibliothèque d'exercices (généré depuis les définitions de séances) |

## Confidentialité

Aucune vidéo n'est publiée : la plateforme ne référence que les **noms d'exercices et les schémas de séries** (usage personnel). Les vidéos restent en local.
