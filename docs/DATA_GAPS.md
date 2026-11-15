# Data gaps (data v4, 15 Nov 2026, 19:00 MSK)

Blocks with missing data are hidden in the UI. Known gaps, from `npm test` warnings:

- Dossier sources (`source_1..3`) are empty for e_meteor, e_maunakea, e_lanzarote, e_ries and both negative controls; the dossier then lists only the sources of the rock/ice classes.
- ru_tolbachik: centre on the lava plateau, awaiting an imagery check.
- Rock similarity matrix and all record statuses are drafts.

Fixed in data v3:
- e_mcmurdo: missing DEM tile S78_E163 added; relief now covers the whole circle.
- e_neg_amazon: the old centre (-3.0, -60.0) was in the city of Manaus, not in rainforest (seen on the Sentinel-2 image). Moved to undisturbed forest at the LBA K34 tower (-2.609, -60.209); relief recomputed.
