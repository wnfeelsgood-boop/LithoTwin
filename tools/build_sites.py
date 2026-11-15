#!/usr/bin/env python3
"""LithoTwin: Google Sheet -> data/sites.json

Input: two CSV files exported from the team sheet
(File -> Download -> CSV, one tab at a time):
    plo.csv     tab «Площадки»
    dossier.csv tab «Досье»   (row 1 = JSON keys, row 2 = Russian labels)

Usage:
    python build_sites.py plo.csv dossier.csv -o data/sites.json

Exit code 1 if there are errors (unknown class, bad URL, missing id).
Warnings (text too long, no English yet) do not stop the build.
"""
import argparse, csv, json, re, sys

MATERIAL = {
    "анортозит": "anorthosite",
    "базальты/вулканиты": "basalt_volcanic",
    "импактные брекчии": "impact_breccia",
    "обломочные осадки": "clastic_sediment",
    "эвапориты/сульфаты/соли": "evaporite_salt",
    "глины/гидротермальные": "clay_hydrothermal",
    "рыхлые отложения/реголит": "loose_regolith",
}
GROUP = {"контроль": "control", "негатив": "negative", "РФ": "ru_candidate", "цель": "target"}
BARE = {"≥0.7": "high", "0.4–0.7": "medium", "<0.4": "low"}
ACCESS = {"да": "open", "ограничен": "restricted", "нет": "closed"}
STATUS = {"черновик": "draft", "проверено": "verified", "исправлено": "corrected"}
NOVELTY = {"есть работы": "published", "есть смежные": "related", "не найдено": "none"}
LIMITS = {"intro": 200, "summary": 160, "item": 140}

errors, warnings = [], []


def num(s):
    s = (s or "").strip().replace(",", ".").replace("−", "-")
    return float(s) if s else None


def enum(table, value, field, sid, allow_empty=True):
    v = (value or "").strip()
    if not v:
        if not allow_empty:
            errors.append(f"{sid}: пустое поле {field}")
        return None
    if v not in table:
        errors.append(f"{sid}: неизвестное значение {field} = «{v}»")
        return None
    return table[v]


def body_of(sid):
    return "moon" if sid.startswith("moon_") else "mars" if sid.startswith("mars_") else "earth"


def read_plo(path):
    rows = list(csv.reader(open(path, encoding="utf-8")))
    head = rows[0]
    col = {name: i for i, name in enumerate(head)}

    def g(r, name):
        i = col.get(name)
        return r[i].strip() if i is not None and i < len(r) else ""

    out = {}
    for r in rows[1:]:
        sid = g(r, "ID")
        if not sid:
            continue
        lat = num(g(r, "Широта центра объекта")) if g(r, "Широта центра объекта") else num(g(r, "Широта (сейчас)"))
        lon = num(g(r, "Долгота центра объекта")) if g(r, "Долгота центра объекта") else num(g(r, "Долгота (сейчас)"))
        ice_raw = g(r, "Лёд")
        ice = int(ice_raw[0]) if ice_raw[:1].isdigit() else None
        if ice is None:
            errors.append(f"{sid}: не задан класс льда")
        is_target = body_of(sid) != "earth"
        out[sid] = {
            "id": sid,
            "kind": "target" if is_target else "site",
            "body": body_of(sid),
            "group": enum(GROUP, g(r, "Группа"), "group", sid, allow_empty=False),
            "center": {"lat": lat, "lon": lon},
            "aoi_radius_km": 3,
            "object_at_center_ru": g(r, "Что в центре круга") or None,
            "material_class": enum(MATERIAL, g(r, "Материал"), "material_class", sid, allow_empty=False),
            "ice_class": ice,
            "bare_class": None if is_target else enum(BARE, g(r, "Голый грунт (круг 3 км)"), "bare_class", sid),
            "access": None if is_target else enum(ACCESS, g(r, "Доступ"), "access", sid),
            "class_sources": [s.strip() for s in g(r, "Источник (статья или ссылка)").splitlines() if s.strip()],
            "review_status": enum(STATUS, g(r, "Статус"), "status", sid),
        }
    return out


def read_dossier(path):
    rows = list(csv.reader(open(path, encoding="utf-8")))
    keys = rows[0]
    out = {}
    for r in rows[2:]:  # row 2 holds Russian labels
        d = {k: (r[i].strip() if i < len(r) else "") for i, k in enumerate(keys)}
        sid = d.get("id")
        if not sid:
            continue

        def pair(base):
            ru, en = d.get(f"{base}_ru", ""), d.get(f"{base}_en", "")
            if not ru:
                return None
            if not en:
                warnings.append(f"{sid}: нет английского текста для {base}")
            lim = LIMITS.get(base, LIMITS["item"])
            if len(ru) > lim:
                warnings.append(f"{sid}: {base}_ru длиннее {lim} знаков ({len(ru)})")
            if "\n" in ru:
                errors.append(f"{sid}: перенос строки внутри {base}_ru")
            return {"ru": ru, "en": en or None}

        sources = []
        for k in ("source_1", "source_2", "source_3"):
            u = d.get(k, "")
            if u:
                if not re.match(r"^https?://\S+$", u):
                    errors.append(f"{sid}: {k} не ссылка: «{u}»")
                else:
                    sources.append(u)
        out[sid] = {
            "name": {"ru": d.get("name_ru") or None, "en": d.get("name_en") or None},
            "intro": pair("intro"),      # shown first: card header, map tooltip
            "summary": pair("summary"),
            "similar": [p for p in (pair("similar_1"), pair("similar_2")) if p],
            "differs": [p for p in (pair("differs_1"), pair("differs_2")) if p],
            "use": [p for p in (pair("use_1"), pair("use_2")) if p],
            "novelty": enum(NOVELTY, d.get("novelty"), "novelty", sid),
            "sources": sources,
            "status": enum(STATUS, d.get("status"), "status", sid),
        }
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("plo")
    ap.add_argument("dossier")
    ap.add_argument("-o", "--out", default="sites.json")
    a = ap.parse_args()

    sites, dos = read_plo(a.plo), read_dossier(a.dossier)
    for sid in sites:
        if sid not in dos:
            errors.append(f"{sid}: нет строки в «Досье»")
        else:
            d = dos[sid]
            sites[sid]["name"] = d.pop("name")
            sites[sid]["dossier"] = d
    for sid in dos:
        if sid not in sites:
            errors.append(f"{sid}: есть в «Досье», но нет в «Площадках»")

    json.dump({"schema_version": 1, "sites": list(sites.values())},
              open(a.out, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    for w in warnings:
        print("WARN ", w)
    for e in errors:
        print("ERROR", e)
    print(f"{len(sites)} записей -> {a.out}; ошибок {len(errors)}, предупреждений {len(warnings)}")
    sys.exit(1 if errors else 0)


if __name__ == "__main__":
    main()
