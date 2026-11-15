# LithoTwin: build brief for Claude Code

Read this whole file before writing any code. It is the single source of truth for the app.
Reviewer of every change: Damir (human). Team lead and the person typing prompts: German.

## 0. What we are building

LithoTwin is a web app for NASA Space Apps Challenge 2026, challenge #9 (Earth analogs for a Moon base and Mars).
It answers one question: **"Where on Earth should we rehearse this specific Moon or Mars mission?"**

- The user picks a **target × task pair** (5 pairs, see §3).
- The app ranks 19 Earth sites by **similarity** to the target (0–100) and shows **suitability** as a separate traffic light (pass / warn / fail).
- Every site has a **dossier** page: why the number is what it is (feature contributions), relief figures next to the target's, suitability rules, text and sources.
- A **Russia mode** shows only the 7 Russian candidates and their world rank.

All numbers are precomputed in `public/data/*.json`. The app only reads, filters, sorts and draws. **No backend, no runtime computation of scores.**

## 1. Hard rules (hackathon + review)

1. **Write all code fresh in this repo.** Do not copy code from anywhere in `_reference/` (design files are for look and layout only). Nothing in `_reference/` is committed: it is in `.gitignore`.
2. **Everything committed is in English**: UI, code, comments, README, commit messages. Russian appears only as data text (the RU language toggle and dossier texts that have no EN yet).
3. **Open source**: MIT license in `LICENSE`. All dependencies must be open-source licensed.
4. **Static site** deployable to GitHub Pages (`vite build` → `dist/`, base path configurable). Must also open from `npx vite preview` without network access except map tiles we bundle ourselves (we bundle everything; see §6).
5. **Never change data codes** (`e_haughton`, `mars_drill`, `pass`, `impact_breccia` …). Display labels come only from `labels.json`.
6. **Text fallback**: `t(obj) = obj?.[lang] ?? obj?.ru ?? obj?.en ?? null`. A `null` text hides its block; it never renders "null", "undefined" or an empty card.
7. **Similarity and suitability are never merged into one number.** Sort by similarity, colour by suitability.
8. Small commits, one feature each, message format `feat: …` / `fix: …` / `chore: …`. After each milestone, stop and print a short summary for Damir: what changed, how to check it, anything uncertain.
9. Do not invent data. If a field is missing, hide the block and log it in `docs/DATA_GAPS.md`.
10. **Deadline**: feature freeze 20:00 MSK, submission 23:00 MSK on 15 Nov 2026. If a milestone runs long, ship the simpler version described in it and move on.

## 2. Repo layout to create

```
/                    package.json, vite.config.js, index.html, LICENSE (MIT), README.md, .gitignore
/src/                main.js, router.js, state.js, i18n.js, data.js, format.js
/src/views/          globe.js, ranking.js, russia.js, dossier.js, about.js
/src/components/     pentagon.js, contribBars.js, featureTable.js, rulesList.js, filterBar.js, pairPicker.js
/src/styles/         tokens.css, base.css, components.css
/public/data/        *.json from LithoTwin_data/data/ (copied as-is)
/public/maps/        *.png from LithoTwin_data/maps/ (copied as-is)
/public/geo/         countries topojson (from npm world-atlas, copied at build or committed)
/tools/              compute_scores.py, build_sites.py, relief.py (copied as-is) + check_data.mjs (new)
/docs/               DATA_GAPS.md, AI_DISCLOSURE.md, screenshots/
/_reference/         design PNGs and design HTML: NOT committed
```

First step: copy `_incoming/LithoTwin_data/data/*` → `public/data/`, `maps/*` → `public/maps/`, `scripts/*` → `tools/`. When the team sends data v2, the same copy replaces files one to one; the app must not need code changes.

## 3. Data contract (read `_incoming/LithoTwin_data/README.md` too)

Join key everywhere: site `id`.

### `sites.json` → `{ schema_version, status, exported_from, sites: Site[] }` (22 = 19 sites + 3 targets)

```js
Site = {
  id: "ru_batagaika", kind: "site" | "target", body: "earth" | "moon" | "mars",
  group: "control" | "negative" | "ru_candidate" | "target",
  center: { lat, lon }, aoi_radius_km: 3,
  object_at_center_ru: string,
  material_class, ice_class (0–3), bare_class ("high"|"medium"|"low"|null), access ("open"|"restricted"|"closed"|null),
  class_sources: string[], review_status: "draft"|…,
  name: { ru, en },
  dossier: {
    intro: {ru,en}|null,            // headline under the name, ≤200 chars
    summary: {ru,en}|null,          // "What it is"
    similar: {ru,en}[], differs: {ru,en}[], use: {ru,en}[],
    novelty: string|null, sources: string[], status: string
  },
  map: "maps/<id>.png"              // 10×10 km hillshade, dashed circle = 3 km analysis area, 2 km scale bar
}
```
Targets: `moon_shackleton`, `mars_arcadia`, `mars_jezero`. Targets have no `bare_class`, `access`, scores or dossier lists.
Sources can be a URL or a plain citation string: render URLs as links, others as text.

### `scores.json` → `{ schema_version, status, aoi_radius_km, method_check[], scores: Score[] }` (95 = 19 × 5)

```js
Score = {
  site_id, target_id, task, similarity (0–100, 1 decimal), completeness (0–1), rank (1 = best of 19),
  suitability: "pass"|"warn"|"fail",
  suitability_rules: { bare_ground?, access?, flat_area?, slope_p90?, drill_target? : "pass"|"warn"|"fail" },
  rank_stability: "high"|"medium"|"low", rank_range: [min, max],
  contrib: { slope_p50, slope_p90, flat_frac, roughness_rms, local_relief, material, ice, exposure }  // sums to similarity
}
method_check[] = { target_id, task, analog_median, best_negative, pass, robust_runs, runs }
```
Maximum of each contribution bar: `0.8 × 100 × w_k·q_k / Σ(w·q)`, where `q` = relief `valid_fraction` for relief features and 1 for material/ice; `20` for `exposure`. With full coverage this is `0.8 × 100 × weight` (drill: material 32, ice 28). Implemented in `data.contribMax`.

### `features.json` → `{ features: Feature[] }` (22 × 7)
`{ site_id, feature, value, unit, source, native_resolution_m, analysis_resolution_m, valid_fraction, status }`.
Features: `slope_p50` (deg), `slope_p90` (deg), `flat_frac` (0–1 → show %), `roughness_rms` (m), `local_relief` (m), `elev_median` (m), `exposure` (0 / 0.5 / 1, expert estimate, `status: "qualitative"`; show as High / Medium / Low). Show `valid_fraction < 1` as "data covers N% of the circle".

### `missions.json`
`tasks`, `pairs` (5 × `[target_id, task]`), `weights`, `exposure`, `tolerance`, `suitability.rules`, `validation.known_analogs`, `validation.negatives`. Use it for: the pair picker, contribution maxima, the "How it works" page.

### `labels.json`
`material_class`, `ice_class`, `bare_class`, `access`, `group`, `task`, `suitability` (+ `color`), `suitability_rule`, `feature` (+ `unit`). All `{ru, en}`.

### `material_matrix.json`
7×7 similarity of rock classes. Shown on the "How it works" page as a small heatmap table.

### The 5 pairs (picker order and EN labels)
1. Shackleton rim · Moon base (`moon_shackleton`, `moon_base`)
2. Arcadia Planitia · Rover & EVA (`mars_arcadia`, `mars_rover_eva`)
3. Jezero crater · Rover & EVA (`mars_jezero`, `mars_rover_eva`)
4. Arcadia Planitia · Drilling (`mars_arcadia`, `mars_drill`)
5. Jezero crater · Drilling (`mars_jezero`, `mars_drill`)

Build pair labels from `sites[target].name` + `labels.task`, not hard-coded strings.

### `tools/check_data.mjs` (write it first, run in `npm test`)
Fail loudly if: any score/feature `site_id` not in sites; not exactly 95 scores; a pair has ≠ 19 scores; `|sum(contrib) − similarity| > 0.4` (each part is rounded separately); ranks in a pair are not 1..19 or similarity rises with rank (equal rounded values may swap); a `map` file is missing; a code has no label in `labels.json`. Print a warning list (not failure) for `null` intros, EN gaps, `completeness < 1`.

## 4. Screens

Routing by hash: `#/` globe (default), `#/russia`, `#/site/<id>`, `#/about`. Pair and filter live in the hash query too (`#/?pair=3&f=nored`) so links are shareable.

### 4.1 Top bar (all screens)
Logo (pentagon + "LithoTwin"), subtitle "Earth analogs for the Moon and Mars", segmented switch **World / Russia**, button **Method & data** (→ `#/about`), language toggle **EN · RU** (default EN, remembered in localStorage inside try/catch).

### 4.2 World screen `#/` (design: `_reference/design/design_globe.png`)
Left ~62%: **3D Earth globe**. Right ~38%: **ranking panel**.

Above both: **pair picker** (5 chips, see §3) and **filter**: `All` / `No red` (default) / `Green only`.

Globe:
- Library: `globe.gl` (MIT, three.js). Dark sphere with country polygons from `world-atlas` 110m (no raster texture needed; fits the dark style). Slow auto-rotate that stops on first interaction.
- One **pentagon marker** per site (`htmlElementsData`, inline SVG):
  - size ∝ similarity (min 18 px at 0, max 44 px at 100),
  - fill colour = suitability (pass `#3DD68C`, warn `#F2C14E`, fail `#F26D6D`),
  - number inside = rank,
  - negatives: no fill, dashed grey outline `#93A0B4`, rank in grey,
  - filtered-out sites: hidden (filter applies to globe and list alike).
- Hover: tooltip with name, similarity, suitability label. Click: fly to the site and highlight its row; second click or "Open dossier" → `#/site/<id>`.
- Targets are not on the Earth globe. Show the current target as a small card above the ranking: target name, body (Moon/Mars, coloured dot: Moon `#C9CED6`, Mars `#B07A52`), its map thumbnail `maps/<target>.png`, `object_at_center_ru` via `t`.

Ranking panel:
- Rows sorted by similarity desc. Each row: rank, pentagon icon (suitability colour), name (`t(name)`), group badge (Known analog / Russian candidate / Negative control), similarity in mono font, a thin bar.
- Negatives: grey text + "negative control" badge, always shown in "All", hidden by "No red" only if their suitability is fail.
- Footer line of the panel: method check for this pair from `method_check`: "Method check: best negative control 11.6 < analog median 46.0 · stable in 50/50 weight perturbations" (green tick if `pass`).
- Clicking a row = clicking the marker.

Fallback if globe.gl fails (WebGL off): the ranking still works full-width, and a flat SVG world map (d3-geo, `geoNaturalEarth1`) shows the same pentagons. Build the flat fallback only if time allows (M6); the ranking must never depend on the globe.

### 4.3 Russia screen `#/russia` (design: `_reference/design/design_russia.png`)
- Heading: "Where in Russia to rehearse the Moon and Mars". Subtitle: "7 sites from Dagestan to Chukotka. The number on the pentagon is the place in the world ranking out of 19."
- Same pair picker. Badge computed from data: "Russia in world top-3: N of 5 tasks" (count pairs where the best `ru_candidate` rank ≤ 3).
- Map: flat SVG with `d3-geo` (`geoConicEqualArea`, rotate `[-100, 0]`, parallels `[50, 70]` or similar), graticule, Russia filled and highlighted (`#1A2230` fill, `#5CC8FF` 1.5 px border), other countries dim. Pentagons for the 7 Russian candidates only, same encoding, label = name, number = **world rank**.
- Right column: "Best Russian candidate per task": one card per pair with the best `ru_candidate`: pair label, name, similarity, suitability, "#N in the world". Click → dossier.
- Bottom-right note card "What holds Russian sites back": static EN text: "Sites are unique but small: taiga around Batagaika and Uzon, steppe around Sarykum. Many get yellow or red for bare ground even when rock and ice match."

### 4.4 Dossier `#/site/<id>` (design: `_reference/design/design_dossier.png`, the most important reference)
Context = current pair from the hash (default: the pair where this site ranks best). Breadcrumb: "← Ranking / <pair label> / <site name>".

Header (left): group badge, coordinates in mono (`67.5800° N · 134.7707° E`), dossier status badge ("dossier: draft"), name (H1), `intro` with prefix in accent: "For a Moon base:" (moon_base) or "For Mars exploration:" (Mars tasks). Hide the intro block if `null`.

Score card (right): target body dot + "Similarity to <target> · task <task>", big number (Space Grotesk, `#F2A93B`), "of 100", three small stats: **Rank** "3 of 19", **Under weight shifts** "3–4" (`rank_range`), **Data coverage** "100%" (`completeness`). Below: suitability pill with the worst rule names ("With caveats · access and bare ground").

Row 2: two map tiles side by side: site map and target map (`maps/<id>.png`), captions "<name> · Copernicus DEM" and "<target> · LOLA/MOLA". Note under them: "10 × 10 km square, dashed circle = 3 km analysis area, scale bar 2 km." Mars maps look pixelated: MOLA is ~463 m per pixel; say so in the caption.

Row 2 right: **"What makes up 67.2"**: one bar per contribution key in this order: material, ice, exposure, slope_p50, flat_frac, slope_p90, roughness_rms, local_relief. Bar track = max (see §3), fill = value, numbers "32.0 / 32" in mono. Explanation under bars: "Light part = what a feature could add, bright part = what it added."

Row 3 left: **"Numbers next to the target"**: table Feature | Site | Target, for the 5 relief features + rock class + ice class. Units from `labels.feature`. Target column in accent colour.

Row 3 right: **"Suitability by rules"**: one card per key in `suitability_rules`: pentagon in rule colour, rule label (`labels.suitability_rule`) + verdict label, one-line reason built from the class (e.g. bare_ground low → "< 40% bare ground"; access restricted → "Restricted").

Row 4: four cards **What it is** (`summary`) / **How it is similar** (`similar[]`) / **How it differs** (`differs[]`) / **What it is good for** (`use[]`). Hide empty ones. Then **Sources** list (`sources` + `class_sources`, deduplicated).

If the shown text came from `ru` while UI is EN, add a tiny grey "RU" tag next to the block title. No other warning.

Targets' pages (`#/site/moon_shackleton`): header, map, feature table only.

Optional (M7): button **Compare with another site** → `#/site/<id>?vs=<id2>`: two score cards and two contribution bar sets side by side.

### 4.5 About `#/about` "Method & data"
Static page, EN, built partly from `missions.json`:
1. What LithoTwin does (2 sentences).
2. How similarity is computed: 3 km circle on a 500 m grid; 5 relief features + rock class + ice class; weights table per task (render from `missions.weights`); tolerance; exposure weight 0.2: `S = 0.8 · S_base + 20 · exposure`.
3. Suitability rules (render from `missions.suitability.rules`, worst rule wins).
4. Validation: table from `method_check` (pair, analog median, best negative, pass, robust runs/50).
5. Rock similarity matrix (heatmap table from `material_matrix.json`).
6. Data sources & attribution (copy exactly from the data README: Copernicus DEM GLO-90 attribution, LRO LOLA LDEM_80S_80M, MGS MOLA MEGDR 128 ppd, Natural Earth via world-atlas).
7. Limitations: draft dossier texts; Tolbachik centre awaits imagery check; rock matrix is expert judgement.
8. Team and AI disclosure (link to `docs/AI_DISCLOSURE.md`).

## 5. Visual language (from `_reference/design/*`)

Dark space UI, single theme (dark only, set `color-scheme: dark`).

```css
:root {
  --bg: #070A10; --panel: #0F141D; --panel-2: #1A2230; --border: #1E2836; --border-2: #263244;
  --text: #E6EBF2; --text-2: #B7C2D3; --muted: #93A0B4;
  --accent: #F2A93B;      /* rock, main numbers */
  --ice: #5CC8FF;         /* ice, links, Russia border */
  --pass: #3DD68C; --warn: #F2C14E; --fail: #F26D6D;
  --mars: #B07A52; --moon: #C9CED6;
  --radius: 14px;
}
```
Fonts (Google Fonts or `@fontsource/*` npm packages, prefer npm so the build is offline): **Space Grotesk** headings and big numbers, **Inter** body, **JetBrains Mono** numbers, coordinates, codes. Decimal separator: `.` in EN, `,` in RU (`Intl.NumberFormat`).
Panels: `--panel` background, 1px `--border`, `--radius`. Section labels: uppercase, letter-spacing .08em, colour by meaning (similar = pass green, differs = fail red, use = ice blue, what = muted).
Layout must work at 1440 px (judging laptop) and 390 px (phone: globe on top at 55vh, ranking below; dossier single column). No horizontal page scroll.

## 6. Stack

- **Vite** (vanilla JS, ES modules). No React unless German asks: fewer moving parts for review.
- `globe.gl`, `d3-geo`, `topojson-client`, `world-atlas`, `@fontsource/inter`, `@fontsource/space-grotesk`, `@fontsource/jetbrains-mono`. Nothing else without asking.
- Data loaded with `fetch('data/…json')` relative to `import.meta.env.BASE_URL`.
- GitHub Pages: `vite.config.js` `base: process.env.BASE ?? './'`; workflow `.github/workflows/pages.yml` (build + deploy with `actions/deploy-pages`).
- Scripts: `npm run dev`, `npm run build`, `npm test` (= `node tools/check_data.mjs`), `npm run shots` (Playwright screenshots of `#/`, `#/russia`, `#/site/ru_batagaika?pair=4`, `#/about` at 1440×900 and 390×844 into `docs/screenshots/`). Playwright is a devDependency only.

## 7. Milestones (stop after each for Damir's review)

| # | Done when | Time box |
|---|---|---|
| M1 | Repo skeleton, MIT, data copied, `check_data.mjs` passes, `npm run dev` shows a plain list of 19 sites for pair 1 | 30 min |
| M2 | Pair picker + filter + ranking panel with all rules from §4.2 (no globe yet), hash state, EN/RU toggle | 45 min |
| M3 | Dossier page complete (§4.4) incl. contribution bars, feature table, rules, text cards, sources | 75 min |
| M4 | Globe with pentagons, hover, click-to-select, sync with ranking | 60 min |
| M5 | Russia screen | 45 min |
| M6 | About page, README, AI disclosure, Pages workflow, screenshots, phone layout pass | 45 min |
| M7 (optional) | Compare view; flat-map fallback; target card with 3D Moon/Mars sphere | only if before 19:00 |

Feature freeze 20:00 MSK: after that only bug fixes, texts, data v2 swap, deployment.

## 8. Acceptance checklist (Damir reviews against this)

Data and logic
- [ ] `npm test` passes; 95 scores, 5 pairs × 19.
- [ ] For each pair, list order equals `rank`; top-3 matches: Moon base: Mauna Kea 66.5, McMurdo 62.0, Tolbachik 57.6 (data v3).
- [ ] Filter "No red" hides exactly the `fail` rows; "Green only" shows only `pass`; the globe hides the same sites.
- [ ] Contribution bars sum to the big number (±0.4, rounding of parts); bar maxima follow §3.
- [ ] Negatives are grey/dashed everywhere and labelled "Negative control".
- [ ] No code string (`ru_batagaika`, `loose_regolith`, `warn`) is visible anywhere in the UI.
- [ ] Null texts hide blocks; no "null"/"undefined"/empty cards (check `ru_chara`, `e_deathvalley`, `moon_shackleton`).
- [ ] Swapping in a new `public/data/*.json` with the same schema needs no code change.

UI
- [ ] Matches the design references in layout and tokens (not pixel-perfect).
- [ ] EN default, RU toggle switches all labels; dossier texts fall back to RU with an "RU" tag.
- [ ] Works at 1440 px and 390 px, no horizontal scroll; keyboard: pair chips, filter, rows are focusable and Enter opens the dossier.
- [ ] Ranking works with WebGL disabled.
- [ ] Shareable URL restores pair, filter and page.

Submission
- [ ] MIT `LICENSE`; README in English: what, how to run, data sources & attribution, team, AI disclosure.
- [ ] No files from `_reference/` or `_incoming/` committed (`git ls-files | grep -E "^_"` is empty).
- [ ] No pre-hackathon code; commit history starts 15 Nov.
- [ ] GitHub Pages URL loads with no console errors.

## 9. AI disclosure (create `docs/AI_DISCLOSURE.md`, link from README and About)

State plainly: code was written with Claude Code (Anthropic) under the team's direction and reviewed by a team member; relief features, scores and the data package were produced with Claude from public DEMs (Copernicus, LOLA, MOLA) using the scripts in `/tools`; rock/ice/exposure classes and dossier texts were written or checked by the team's geologists; design concept made with Claude. List the human roles: German Rajkov (lead), Nikolai Shveshkeev and Murat Arifullin (geology), Damir Kudyakov (code review).

## 10. English UI copy (use as-is)

- Title: **LithoTwin**: Earth analogs for the Moon and Mars
- World heading: "Which place on Earth is most like your target?"
- Pair picker label: "Target and task"
- Filter: "All" / "No red" / "Green only"; tooltip: "Similarity ranks the list. Colour shows whether you can actually work there."
- Suitability: Suitable / With caveats / Not suitable
- Group badges: Known analog / Russian candidate / Negative control
- Dossier sections: What it is · How it is similar · How it differs · What it is good for · Sources
- Empty state for a filter: "No sites pass this filter for this task. Try 'All'."
- Footer: "Data: Copernicus DEM GLO-90 (ESA), LRO LOLA, MGS MOLA (NASA PDS). Scores are a draft from 15 Nov 2026."

## 11. Known data caveats (do not "fix" them in code)
- Most dossier texts are RU only and some `intro` are `null` in v1. Data v2 will add EN.
- `e_mcmurdo`: full relief coverage since data v3 (missing DEM tile added). The coverage warning code stays for future gaps.
- `ru_tolbachik` centre moved to a lava plateau, pending imagery check.
- Rock matrix and statuses are drafts.
