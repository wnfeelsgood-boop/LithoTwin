# AI disclosure

LithoTwin was built during NASA Space Apps Challenge 2026 (14–15 November 2026) with substantial help from AI. This page says plainly what was done by AI and what by people.

## What AI did

- **Code.** All application code in this repository was written by Claude Code (Anthropic, model Claude Opus) from a build brief written for it (`CLAUDE.md`), under the direction of the team lead. Every milestone was submitted as a pull request for review by a team member (Damir Kudyakov).
- **Relief features and scores.** Claude computed the relief features (slopes, flat share, roughness, local relief) from public elevation models (Copernicus DEM GLO-90, LRO LOLA, MGS MOLA) and the similarity and suitability scores, using the scripts in `/tools` (`relief.py`, `compute_scores.py`, `build_sites.py`).
- **Method design support.** Claude proposed the scoring method, tolerances and validation check (negative controls, weight perturbation); the team reviewed and approved each choice.
- **Design concept.** The visual concept of the site was drafted with Claude.
- **Translation and editing.** Claude helped translate and edit English texts.

## What people did

- **German Rajkov** (team lead): problem framing, choice of targets and tasks, method decisions, direction of all AI work.
- **Nikolai Shveshkeev, Murat Arifullin** (geology): choice of Earth sites, rock, ice, bare-ground and access classes, site coordinates, dossier texts and literature sources, review of the rock similarity matrix.
- **Damir Kudyakov** (code review): review of every pull request against the acceptance checklist in `CLAUDE.md`.
- **Andrey Sat**: geology.

## Limits

AI output can be wrong. Numbers in this app are reproducible from the public data with the scripts in `/tools`; dossier texts and class assignments are drafts and should be checked against the cited sources before any real mission planning.
