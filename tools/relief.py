"""LithoTwin: relief features and relief maps for sites and targets.

Every site is measured the same way: the elevation model is resampled to a 500 m grid in a local
azimuthal-equidistant projection centred on the site, and features are taken over a circle of
radius 3 km (AOI). Earth: Copernicus DEM GLO-90; Mars: MOLA MEGDR 128 ppd; Moon: LOLA LDEM_80S_80M.

Usage (needs numpy, rasterio, matplotlib and the source rasters, which are not in the repo):
    DEM_DIR=/path/to/copernicus_tiles PDS_DIR=/path/to/lola_mola \\
    python tools/relief.py e_mcmurdo e_neg_amazon        # recompute these ids
    python tools/relief.py --all                          # recompute everything
It reads centres from public/data/sites.json, updates public/data/features.json in place and
redraws public/maps/<id>.png. Run tools/compute_scores.py afterwards.
"""
import glob
import json
import os
import sys

import numpy as np
import rasterio
from rasterio.crs import CRS
from rasterio.transform import from_origin
from rasterio.warp import Resampling, reproject

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, "public", "data")
MAPS = os.path.join(ROOT, "public", "maps")
DEM_DIR = os.environ.get("DEM_DIR", "dem")
PDS_DIR = os.environ.get("PDS_DIR", "pds")

RES, RAD, MARGIN, WIN, FLAT = 500.0, 3000.0, 3000.0, 7, 8.0  # grid m, AOI radius m, margin m, roughness window, flat threshold deg
MARS_R, MOON_R = 3396000.0, 1737400.0
MAP_HALF, MAP_RES = 5000.0, 25.0  # relief map: 10 x 10 km at 25 m per pixel (400 px)


def aeqd(lat, lon, radius=None):
    s = f"+proj=aeqd +lat_0={lat} +lon_0={lon} +x_0=0 +y_0=0 +units=m"
    s += f" +R={radius}" if radius else " +datum=WGS84"
    return CRS.from_proj4(s + " +no_defs")


def warp(src, src_t, src_crs, dst_crs, half, res):
    # Averaging when coarsening (features); bilinear when the map grid is finer than the source.
    method = Resampling.bilinear if res < 90 else Resampling.average
    n = int(round(2 * half / res))
    dst = np.full((n, n), np.nan, np.float32)
    reproject(src.astype(np.float32), dst, src_transform=src_t, src_crs=src_crs, src_nodata=np.nan,
              dst_transform=from_origin(-half, half, res, res), dst_crs=dst_crs, dst_nodata=np.nan,
              resampling=method)
    return dst


def earth_grid(lat, lon, half, res):
    crs = aeqd(lat, lon)
    n = int(round(2 * half / res))
    out = np.full((n, n), np.nan, np.float32)
    for f in sorted(glob.glob(os.path.join(DEM_DIR, "*.tif"))):
        with rasterio.open(f) as r:
            b = r.bounds
            if not (b.left - .5 < lon < b.right + .5 and b.bottom - .5 < lat < b.top + .5):
                continue
            a = r.read(1).astype(np.float32)
            a[a == 0] = np.nan  # GLO-90 sea surface is flattened to 0 m: mask it
            g = warp(a, r.transform, r.crs, crs, half, res)
            m = np.isnan(out) & ~np.isnan(g)
            out[m] = g[m]
    return out


_mola, _lola = {}, None


def mars_grid(lat, lon, half, res):
    if lon > 180:  # tile megt88n180hb: 88N..44N, 180..270E (stored as -180..-90)
        key, t, lon_src = "megt88n180hb", from_origin(-180, 88, 1 / 128, 1 / 128), lon - 360
    else:          # tile megt44n000hb: 44N..0, 0..90E
        key, t, lon_src = "megt44n000hb", from_origin(0, 44, 1 / 128, 1 / 128), lon
    if key not in _mola:
        _mola[key] = np.fromfile(os.path.join(PDS_DIR, key + ".img"), dtype=">i2").reshape(5632, 11520)
    geo = CRS.from_proj4(f"+proj=longlat +R={MARS_R} +no_defs")
    return warp(_mola[key], t, geo, aeqd(lat, lon_src, MARS_R), half, res)


def moon_grid(lat, lon, half, res):
    global _lola
    if _lola is None:
        raw = np.fromfile(os.path.join(PDS_DIR, "LDEM_80S_80M.IMG"), dtype="<i2")
        _lola = raw.reshape(7600, 7600).astype(np.float32) * 0.5
    ps = CRS.from_proj4(f"+proj=stere +lat_0=-90 +lon_0=0 +k=1 +x_0=0 +y_0=0 +R={MOON_R} +units=m +no_defs")
    return warp(_lola, from_origin(-304000, 304000, 80, 80), ps, aeqd(lat, lon, MOON_R), half, res)


def grid(site, half, res):
    lat, lon = site["center"]["lat"], site["center"]["lon"]
    if site["body"] == "moon":
        return moon_grid(lat, lon, half, res)
    if site["body"] == "mars":
        return mars_grid(lat, lon, half, res)
    return earth_grid(lat, lon, half, res)


def features(z):
    half = RAD + MARGIN
    n = z.shape[0]
    yy, xx = np.mgrid[0:n, 0:n]
    aoi = np.hypot((xx + .5) * RES - half, half - (yy + .5) * RES) <= RAD
    valid = aoi & ~np.isnan(z)
    gy, gx = np.gradient(z, RES)
    slope = np.degrees(np.arctan(np.hypot(gx, gy)))
    sv = slope[valid & ~np.isnan(slope)]
    h = WIN // 2
    X, Y = np.meshgrid(np.arange(WIN) - h, np.arange(WIN) - h)
    A = np.c_[X.ravel(), Y.ravel(), np.ones(WIN * WIN)] * [RES, RES, 1]
    pinv = np.linalg.pinv(A)
    rough = []
    for i, j in zip(*np.where(valid)):
        w = z[i - h:i + h + 1, j - h:j + h + 1].ravel()
        if w.size == WIN * WIN and not np.isnan(w).any():
            rough.append((w - A @ (pinv @ w)).std())  # detrended RMS in a 7x7 window
    zv = z[valid]
    r = lambda v: None if v is None else round(float(v), 3)
    return {
        "valid_fraction": r(valid.sum() / aoi.sum()),
        "elev_median": r(np.median(zv)) if zv.size else None,
        "slope_p50": r(np.percentile(sv, 50)) if sv.size else None,
        "slope_p90": r(np.percentile(sv, 90)) if sv.size else None,
        "flat_frac": r((sv < FLAT).mean()) if sv.size else None,
        "roughness_rms": r(np.median(rough)) if rough else None,
        "local_relief": r(np.percentile(zv, 95) - np.percentile(zv, 5)) if zv.size else None,
    }


def draw_map(site, path):
    """10 x 10 km hypsometric map with hillshade, dashed 3 km circle and a 2 km scale bar."""
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    from matplotlib.colors import LightSource

    z = grid(site, MAP_HALF, MAP_RES)
    fig = plt.figure(figsize=(4, 4), dpi=100)
    ax = fig.add_axes([0, 0, 1, 1])
    ax.set_facecolor("#d9d9d9")  # no data
    zm = np.ma.masked_invalid(z)
    if zm.count():
        filled = np.where(np.isnan(z), np.nanmedian(z), z)
        rgb = LightSource(azdeg=315, altdeg=45).shade(
            filled, cmap=plt.get_cmap("gist_earth"), blend_mode="soft", vert_exag=2, dx=MAP_RES, dy=MAP_RES,
            vmin=float(np.nanmin(z)), vmax=float(np.nanmax(z)))
        rgb[np.isnan(z)] = (0.851, 0.851, 0.851, 1)
        ax.imshow(rgb, extent=(-MAP_HALF, MAP_HALF, -MAP_HALF, MAP_HALF), interpolation="bilinear")
    t = np.linspace(0, 2 * np.pi, 361)
    ax.plot(RAD * np.cos(t), RAD * np.sin(t), color="white", lw=1.6)
    ax.plot(RAD * np.cos(t), RAD * np.sin(t), color="black", lw=0.8, ls=(0, (3, 3)))
    ax.plot([2400, 4400], [-4550, -4550], color="white", lw=3, solid_capstyle="butt")
    ax.text(3400, -4200, "2 km", color="white", ha="center", va="bottom", fontsize=7, fontweight="bold")
    ax.set_xlim(-MAP_HALF, MAP_HALF)
    ax.set_ylim(-MAP_HALF, MAP_HALF)
    ax.axis("off")
    fig.savefig(path, transparent=True)
    plt.close(fig)


UNITS = {"slope_p50": "deg", "slope_p90": "deg", "flat_frac": "fraction", "roughness_rms": "m",
         "local_relief": "m", "elev_median": "m"}
SOURCES = {"earth": ("Copernicus GLO-90", 90), "moon": ("LOLA LDEM_80S_80M", 80), "mars": ("MOLA MEGDR 128ppd", 463)}


def main(ids):
    sites = {s["id"]: s for s in json.load(open(os.path.join(DATA, "sites.json"), encoding="utf-8"))["sites"]}
    fpath = os.path.join(DATA, "features.json")
    ffile = json.load(open(fpath, encoding="utf-8"))
    ids = list(sites) if ids == ["--all"] else ids
    for sid in ids:
        s = sites[sid]
        f = features(grid(s, RAD + MARGIN, RES))
        src, native = SOURCES[s["body"]]
        for rec in ffile["features"]:
            if rec["site_id"] != sid:
                continue
            rec["center"] = s["center"]
            if rec["feature"] in UNITS:
                rec.update({"value": f[rec["feature"]], "valid_fraction": f["valid_fraction"],
                            "source": src, "native_resolution_m": native})
        draw_map(s, os.path.join(MAPS, f"{sid}.png"))
        print(sid, f, flush=True)
    json.dump(ffile, open(fpath, "w", encoding="utf-8"), ensure_ascii=False, indent=1)


if __name__ == "__main__":
    main(sys.argv[1:] or ["--all"])
