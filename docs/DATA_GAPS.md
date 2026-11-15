# Data gaps (data v1, 15 Nov 2026)

Blocks with missing data are hidden in the UI. Known gaps, from `npm test` warnings:

- `dossier.intro` is null for 11 records: e_mcmurdo, e_deathvalley, e_askja, e_meteor, e_maunakea, e_lanzarote, e_ries, e_neg_amazon, e_neg_farmland, ru_batagaika, ru_chara.
- No English dossier texts yet; Russian is shown with an "RU" tag.
- e_mcmurdo: relief computed on part of the 3 km circle (one DEM tile missing).
- ru_tolbachik: centre moved to the lava plateau, awaiting imagery check.
