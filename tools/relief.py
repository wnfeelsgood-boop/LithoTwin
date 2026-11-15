"""LithoTwin: relief features on a common 500 m grid, AOI = circle of radius 10 km.
Earth: Copernicus GLO-90; Mars: MOLA MEGDR 128 ppd; Moon: LOLA LDEM_80S_80M.
"""
import glob, json, os, sys
import numpy as np, rasterio
from rasterio.transform import from_origin, Affine
from rasterio.warp import reproject, Resampling
from rasterio.crs import CRS

SP = "/tmp/claude-0/-home-claude/8154dcdd-3aab-5b32-926a-b7929d9489ca/scratchpad"
UP = "/mnt/user-data/uploads/"
RES, RAD, MARGIN, WIN, FLAT = 500.0, 10000.0, 3000.0, 7, 8.0
HALF = RAD + MARGIN
N = int(round(2 * HALF / RES))
DST_T = from_origin(-HALF, HALF, RES, RES)

SITES = {
 "e_haughton": (75.38, -89.68), "e_atacama": (-24.08, -70.01), "e_riotinto": (37.70, -6.55),
 "e_mcmurdo": (-77.50, 162.00), "e_deathvalley": (36.50, -117.00), "e_askja": (65.05, -16.75),
 "e_meteor": (35.03, -111.02), "e_maunakea": (19.75, -155.45), "e_lanzarote": (29.03, -13.75),
 "e_ries": (48.88, 10.57), "e_neg_amazon": (-3.0, -60.0), "e_neg_farmland": (38.5, -98.5),
 "ru_batagaika": (67.58, 134.77), "ru_chara": (56.84, 118.13), "ru_uzon": (54.50, 159.97),
 "ru_tolbachik": (55.86, 160.36), "ru_elgygytgyn": (67.50, 172.08),
 "ru_baskunchak": (48.17, 46.88), "ru_sarykum": (43.01, 47.24),
}
TARGETS = {
 "moon_shackleton": ("moon", -89.5, 135.0), "moon_pole_rim": ("moon", -90.0, 0.0),
 "mars_arcadia": ("mars", 45.0, 190.0), "mars_jezero": ("mars", 18.4, 77.6),
}

def aeqd(lat, lon, R=None):
    s = f"+proj=aeqd +lat_0={lat} +lon_0={lon} +x_0=0 +y_0=0 +units=m"
    s += f" +R={R}" if R else " +datum=WGS84"
    return CRS.from_proj4(s + " +no_defs")

def warp(src_arr, src_t, src_crs, dst_crs, nodata=None):
    dst = np.full((N, N), np.nan, np.float32)
    a = src_arr.astype(np.float32)
    if nodata is not None:
        a[a == nodata] = np.nan
    reproject(a, dst, src_transform=src_t, src_crs=src_crs, src_nodata=np.nan,
              dst_transform=DST_T, dst_crs=dst_crs, dst_nodata=np.nan,
              resampling=Resampling.average)
    return dst

def earth_grid(lat, lon):
    crs = aeqd(lat, lon)
    out = np.full((N, N), np.nan, np.float32)
    for f in sorted(glob.glob(SP + "/data/zip/*.tif")):
        if "(1)" in f:
            continue
        with rasterio.open(f) as r:
            b = r.bounds
            if not (b.left - .5 < lon < b.right + .5 and b.bottom - .5 < lat < b.top + .5):
                continue
            a = r.read(1).astype(np.float32)
            a[a == 0] = np.nan          # GLO-90 sea surface is flattened to 0 m: mask it
            g = warp(a, r.transform, r.crs, crs)
            m = np.isnan(out) & ~np.isnan(g)
            out[m] = g[m]
    return out

MARS_R, MOON_R = 3396000.0, 1737400.0
MARS_GEO = CRS.from_proj4(f"+proj=longlat +R={MARS_R} +no_defs")
_mola = {}
def mars_grid(lat, lon):
    if lon > 180:  # tile megt88n180hb: 88N..44N, 180..270E (stored as -180..-90)
        key, shape, t = "megt88n180hb", (5632, 11520), from_origin(-180, 88, 1/128, 1/128)
        lon = lon - 360
    else:          # tile megt44n000hb: 44N..0, 0..90E
        key, shape, t = "megt44n000hb", (5632, 11520), from_origin(0, 44, 1/128, 1/128)
    if key not in _mola:
        _mola[key] = np.fromfile(UP + key + "_2.img", dtype=">i2").reshape(shape)
    return warp(_mola[key], t, MARS_GEO, aeqd(lat, lon, MARS_R))

MOON_PS = CRS.from_proj4(f"+proj=stere +lat_0=-90 +lon_0=0 +k=1 +x_0=0 +y_0=0 +R={MOON_R} +units=m +no_defs")
MOON_T = from_origin(-304000, 304000, 80, 80)
_lola = None
def moon_grid(lat, lon):
    global _lola
    if _lola is None:
        _lola = np.fromfile(UP + "LDEM_80S_80M_2.IMG", dtype="<i2").reshape(7600, 7600).astype(np.float32) * 0.5
    return warp(_lola, MOON_T, MOON_PS, aeqd(lat, lon, MOON_R))

def features(z):
    yy, xx = np.mgrid[0:N, 0:N]
    cx = (xx + .5) * RES - HALF
    cy = HALF - (yy + .5) * RES
    aoi = np.hypot(cx, cy) <= RAD
    valid = aoi & ~np.isnan(z)
    vf = valid.sum() / aoi.sum()
    gy, gx = np.gradient(z, RES)
    slope = np.degrees(np.arctan(np.hypot(gx, gy)))
    sv = slope[valid & ~np.isnan(slope)]
    h = WIN // 2
    X, Y = np.meshgrid(np.arange(WIN) - h, np.arange(WIN) - h)
    A = np.c_[X.ravel(), Y.ravel(), np.ones(WIN * WIN)] * [RES, RES, 1]
    pinv = np.linalg.pinv(A)
    rr = []
    for i, j in zip(*np.where(valid)):
        w = z[i-h:i+h+1, j-h:j+h+1].ravel()
        if w.size != WIN * WIN or np.isnan(w).any():
            continue
        res = w - A @ (pinv @ w)
        rr.append(res.std())
    zv = z[valid]
    r = lambda v: None if v is None else round(float(v), 3)
    return {
        "valid_fraction": r(vf),
        "elev_median_m": r(np.median(zv)) if zv.size else None,
        "slope_p50": r(np.percentile(sv, 50)) if sv.size else None,
        "slope_p90": r(np.percentile(sv, 90)) if sv.size else None,
        "flat_frac": r((sv < FLAT).mean()) if sv.size else None,
        "roughness_rms": r(np.median(rr)) if rr else None,
        "local_relief": r(np.percentile(zv, 95) - np.percentile(zv, 5)) if zv.size else None,
    }

if __name__ == "__main__":
    out = {}
    for sid, (lat, lon) in SITES.items():
        out[sid] = {"body": "earth", "lat": lat, "lon": lon, "source": "Copernicus GLO-90", "native_m": 90,
                    **features(earth_grid(lat, lon))}
        print(sid, out[sid], flush=True)
    for tid, (body, lat, lon) in TARGETS.items():
        g = moon_grid(lat, lon) if body == "moon" else mars_grid(lat, lon)
        src = ("LOLA LDEM_80S_80M", 80) if body == "moon" else ("MOLA MEGDR 128ppd", 463)
        out[tid] = {"body": body, "lat": lat, "lon": lon, "source": src[0], "native_m": src[1], **features(g)}
        print(tid, out[tid], flush=True)
    json.dump(out, open(SP + "/feat/relief_raw.json", "w"), indent=1, ensure_ascii=False)
