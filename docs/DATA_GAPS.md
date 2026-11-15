# Data gaps (data v2, 15 Nov 2026, 14:30 MSK)

Blocks with missing data are hidden in the UI. Known gaps, from `npm test` warnings:

- `dossier.intro` is still empty for 6 records: e_meteor, e_maunakea, e_lanzarote, e_ries, e_neg_amazon, e_neg_farmland.
- Dossier sources (`source_1..3`) are empty for e_meteor, e_maunakea, e_lanzarote, e_ries and both negative controls; the dossier then lists only the sources of the rock/ice classes.
- e_mcmurdo: relief computed on part of the 3 km circle (one DEM tile is missing).
- ru_tolbachik: centre moved to the lava plateau, awaiting an imagery check.
- Rock similarity matrix and all record statuses are drafts.
