#!/usr/bin/env python3
"""LithoTwin: data/{sites,features,missions,material_matrix}.json -> data/scores.json

Usage (from the package root):
    python scripts/compute_scores.py            # writes data/scores.json and prints the method check
Pure Python 3, no dependencies. Deterministic (fixed random seed for the sensitivity test).
"""
import json, math, os, random, statistics as st, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
D = lambda name: os.path.join(ROOT, "data", name)
load = lambda name: json.load(open(D(name), encoding="utf-8"))

sites = {s["id"]: s for s in load("sites.json")["sites"]}
feat = {}
for r in load("features.json")["features"]:
    feat.setdefault(r["site_id"], {})[r["feature"]] = r
    feat[r["site_id"]]["_valid"] = r["valid_fraction"] if r["feature"] != "exposure" else feat[r["site_id"]].get("_valid", 1.0)
M = load("missions.json")
mm = load("material_matrix.json")
MIDX = {c: i for i, c in enumerate(mm["classes"])}
ORDER = M["suitability"]["order"]
RELIEF = ["slope_p50", "slope_p90", "flat_frac", "roughness_rms", "local_relief"]


def fsim(k, e, t):
    tol = M["tolerance"][k]
    if tol["type"] == "linear":
        return max(0.0, 1 - abs(e - t) / tol["tau"])
    e, t = max(e, tol["floor"]), max(t, tol["floor"])
    return max(0.0, 1 - abs(math.log(e / t)) / math.log(tol["base"]))


def similarity(sid, tid, task, w=None, ew=None):
    w = w or M["weights"][task]
    ew = M["exposure"]["weight"] if ew is None else ew
    s, t, fs, ft = sites[sid], sites[tid], feat[sid], feat[tid]
    q_relief = fs["_valid"]
    num = den = wsum = 0.0
    parts = {}
    for k, wk in w.items():
        if k == "material":
            sim, q = mm["matrix"][MIDX[s["material_class"]]][MIDX[t["material_class"]]], 1.0
        elif k == "ice":
            sim, q = 1 - abs(s["ice_class"] - t["ice_class"]) / M["ice_scale"], 1.0
        else:
            e, tv = fs[k]["value"], ft[k]["value"]
            if e is None or tv is None:
                sim, q = 0.0, 0.0
            else:
                sim, q = fsim(k, e, tv), q_relief
        num += wk * q * sim
        den += wk * q
        wsum += wk
        parts[k] = wk * q * sim
    base = 100 * num / den if den else 0.0
    expo = M["exposure"]["values"].get(s["bare_class"], 1.0)
    S = (1 - ew) * base + ew * 100 * expo
    contrib = {k: round((1 - ew) * 100 * v / den, 1) for k, v in parts.items()}
    contrib["exposure"] = round(ew * 100 * expo, 1)
    return S, den / wsum, contrib


def suitability(sid, task):
    s, f, R = sites[sid], feat[sid], M["suitability"]["rules"]
    d = {}
    bg = R["bare_ground"].get(task, R["bare_ground"]["all"])
    d["bare_ground"] = bg[s["bare_class"]]
    d["access"] = R["access"][s["access"]]
    if task == "moon_base":
        v = f["flat_frac"]["value"]
        d["flat_area"] = "pass" if v >= 0.3 else "warn" if v >= 0.1 else "fail"
    if task == "mars_rover_eva":
        v = f["slope_p90"]["value"]
        d["slope_p90"] = "pass" if v <= 20 else "warn" if v <= 30 else "fail"
    if task == "mars_drill":
        ok = s["ice_class"] >= 2 or s["material_class"] in ("clay_hydrothermal", "evaporite_salt", "basalt_volcanic", "loose_regolith")
        d["drill_target"] = "pass" if ok else "warn"
    return max(d.values(), key=ORDER.index), d


def main():
    random.seed(7)
    earth = [sid for sid, s in sites.items() if s["kind"] == "site"]
    V = M["validation"]
    out, checks = [], []
    for tid, task in M["pairs"]:
        base = {sid: similarity(sid, tid, task) for sid in earth}
        order = sorted(earth, key=lambda x: -base[x][0])
        rank = {sid: i + 1 for i, sid in enumerate(order)}
        runs = {sid: [] for sid in earth}
        robust = 0
        for _ in range(V["sensitivity"]["runs"]):
            j = V["sensitivity"]["weight_jitter"]
            w = {k: v * random.uniform(1 - j, 1 + j) for k, v in M["weights"][task].items()}
            ew = M["exposure"]["weight"] * random.uniform(1 - j, 1 + j)
            sc = {sid: similarity(sid, tid, task, w, ew)[0] for sid in earth}
            for i, sid in enumerate(sorted(earth, key=lambda x: -sc[x])):
                runs[sid].append(i + 1)
            med = st.median(sc[a] for a in V["known_analogs"][tid])
            robust += max(sc[n] for n in V["negatives"]) < med
        med = st.median(base[a][0] for a in V["known_analogs"][tid])
        best_neg = max(base[n][0] for n in V["negatives"])
        checks.append({"target_id": tid, "task": task, "analog_median": round(med, 1), "best_negative": round(best_neg, 1),
                       "pass": best_neg < med, "robust_runs": robust, "runs": V["sensitivity"]["runs"]})
        for sid in earth:
            S, C, contrib = base[sid]
            su, rules = suitability(sid, task)
            spread = max(runs[sid]) - min(runs[sid])
            out.append({"site_id": sid, "target_id": tid, "task": task, "similarity": round(S, 1), "completeness": round(C, 2),
                        "rank": rank[sid], "suitability": su, "suitability_rules": rules,
                        "rank_stability": "high" if spread <= 2 else "medium" if spread <= 4 else "low",
                        "rank_range": [min(runs[sid]), max(runs[sid])], "contrib": contrib})
    json.dump({"schema_version": 1, "status": "draft", "aoi_radius_km": 3, "method_check": checks, "scores": out},
              open(D("scores.json"), "w", encoding="utf-8"), indent=1)
    for c in checks:
        print(f"{c['target_id']:16s} {c['task']:15s} analogs median {c['analog_median']:5.1f}  best negative {c['best_negative']:5.1f}  "
              f"{'PASS' if c['pass'] else 'FAIL'}  robust {c['robust_runs']}/{c['runs']}")
    print(f"{len(out)} scores -> data/scores.json")
    sys.exit(0 if all(c["pass"] for c in checks) else 1)


if __name__ == "__main__":
    main()
