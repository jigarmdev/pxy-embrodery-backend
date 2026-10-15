"""Turn an uploaded logo into clean colour regions ready for tracing.

Steps: decode (alpha aware) -> downscale -> find the background (transparent, white, or whatever colour the
border is) -> cluster the artwork into at most N thread colours in Lab space -> merge near-duplicate colours and
drop specks. The background is never stitched.
"""
from dataclasses import dataclass
from typing import List, Optional, Tuple

import cv2
import numpy as np

MAX_DIM = 500
BACKGROUNDS = ('auto', 'white', 'none')
MERGE_DELTA_E = 13.0       # clusters closer than this are the same thread colour
MIN_SHARE = 0.003          # clusters with less than 0.3% of the artwork are anti-aliasing fringe, not a colour


class ImageError(ValueError):
    pass


@dataclass
class Prepared:
    labels: np.ndarray          # HxW int16: colour index per pixel, -1 = background
    colors: np.ndarray          # Kx3 uint8 RGB
    shares: List[float]         # fraction of the artwork each colour covers
    background: str             # what was detected: 'transparent' | 'white' | 'border' | 'none'
    size: Tuple[int, int]       # (width, height) of the working image


def _decode(contents: bytes):
    arr = np.frombuffer(contents, np.uint8)
    img = cv2.imdecode(arr, cv2.IMREAD_UNCHANGED)
    if img is None:
        raise ImageError("This file could not be read as an image (use PNG, JPG or WEBP)")
    if img.ndim == 2:
        img = cv2.cvtColor(img, cv2.COLOR_GRAY2BGR)
    if img.dtype != np.uint8:  # 16-bit PNG etc.
        img = cv2.convertScaleAbs(img, alpha=255.0 / max(1.0, float(img.max())))
    alpha = None
    if img.shape[2] == 4:
        alpha = img[:, :, 3]
        img = img[:, :, :3]
    return cv2.cvtColor(img, cv2.COLOR_BGR2RGB), alpha


def _border_background(rgb: np.ndarray, connected_only: bool) -> Optional[np.ndarray]:
    """Pixels that match the colour of the image border (all of them, or only those connected to the border),
    or None if the border isn't uniform."""
    h, w = rgb.shape[:2]
    lab = cv2.cvtColor(rgb, cv2.COLOR_RGB2LAB).astype(np.float32)
    ring = np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]])
    ref = np.median(ring, axis=0)
    spread = np.linalg.norm(ring - ref, axis=1)
    if np.percentile(spread, 85) > 14:   # border is busy (a photo, a badge touching the edge): don't guess
        return None
    close = (np.linalg.norm(lab - ref, axis=2) < 16).astype(np.uint8)
    if not connected_only:
        return close.astype(bool)
    n, comp = cv2.connectedComponents(close, connectivity=4)
    touching = set(np.unique(np.concatenate([comp[0], comp[-1], comp[:, 0], comp[:, -1]])).tolist()) - {0}
    return np.isin(comp, list(touching))


def _kmeans_lab(lab_pixels: np.ndarray, k: int) -> np.ndarray:
    if len(lab_pixels) > 40000:
        idx = np.random.default_rng(42).choice(len(lab_pixels), 40000, replace=False)
        sample = lab_pixels[idx]
    else:
        sample = lab_pixels
    k = max(1, min(k, len(np.unique(sample, axis=0))))
    if k == 1:
        return sample.mean(axis=0, keepdims=True)
    cv2.setRNGSeed(42)  # same image -> same DST
    crit = (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 20, 0.5)
    _, _, centers = cv2.kmeans(np.float32(sample), k, None, crit, 4, cv2.KMEANS_PP_CENTERS)
    return centers


def prepare_image(contents: bytes, max_colors: int = 8, background: str = 'auto', enclosed_as_fabric: bool = True) -> Prepared:
    """enclosed_as_fabric: background-coloured areas fully surrounded by artwork (the inside of an A, an O, a ring)
    show the fabric instead of being sewn as a fill. Turn off for logos that use light enclosed areas as real thread."""
    if background not in BACKGROUNDS:
        raise ImageError(f"background must be one of {', '.join(BACKGROUNDS)}")
    rgb, alpha = _decode(contents)
    h, w = rgb.shape[:2]
    if max(h, w) > MAX_DIM:
        f = MAX_DIM / max(h, w)
        rgb = cv2.resize(rgb, (max(1, int(w * f)), max(1, int(h * f))), interpolation=cv2.INTER_AREA)
        if alpha is not None:
            alpha = cv2.resize(alpha, (rgb.shape[1], rgb.shape[0]), interpolation=cv2.INTER_AREA)
    h, w = rgb.shape[:2]

    bg = np.zeros((h, w), bool)
    kind = 'none'
    if alpha is not None and (alpha < 128).any():
        bg, kind = alpha < 128, 'transparent'
    elif background == 'white':
        white = np.all(rgb > 240, axis=2)
        if not enclosed_as_fabric:
            n, comp = cv2.connectedComponents(white.astype(np.uint8), connectivity=4)
            edge = set(np.unique(np.concatenate([comp[0], comp[-1], comp[:, 0], comp[:, -1]])).tolist()) - {0}
            white = np.isin(comp, list(edge))
        bg, kind = white, 'white'
    elif background == 'auto':
        found = _border_background(rgb, connected_only=not enclosed_as_fabric)
        if found is not None and found.any():
            bg, kind = found, 'border'
        else:
            bg, kind = np.all(rgb > 240, axis=2), 'white'
    fg = ~bg
    if not fg.any():
        raise ImageError("No artwork found: the image looks empty (try background = none)")

    lab = cv2.cvtColor(rgb, cv2.COLOR_RGB2LAB).astype(np.float32)
    centers = _kmeans_lab(lab[fg], max(1, int(max_colors)))

    # assign every artwork pixel to its nearest centre
    pix = lab[fg]
    d = np.linalg.norm(pix[:, None, :] - centers[None, :, :], axis=2)
    assign = d.argmin(axis=1)

    # merge near-duplicate colours and drop fringe colours
    while True:
        k = len(centers)
        if k <= 1:
            break
        counts = np.bincount(assign, minlength=k).astype(float)
        share = counts / counts.sum()
        pair, best = None, MERGE_DELTA_E
        for i in range(k):
            for j in range(i + 1, k):
                dij = float(np.linalg.norm(centers[i] - centers[j]))
                if dij < best:
                    pair, best = (i, j), dij
        tiny = [i for i in range(k) if share[i] < MIN_SHARE]
        if pair is None and not tiny:
            break
        if pair is not None:
            i, j = pair
            keep, drop = (i, j) if counts[i] >= counts[j] else (j, i)
        else:
            drop = tiny[0]
            others = [c for c in range(k) if c != drop]
            keep = min(others, key=lambda c: float(np.linalg.norm(centers[c] - centers[drop])))
        assign[assign == drop] = keep
        remap = {old: new for new, old in enumerate(c for c in range(k) if c != drop)}
        assign = np.vectorize(remap.get)(assign)
        centers = np.delete(centers, drop, axis=0)

    labels = np.full((h, w), -1, np.int16)
    labels[fg] = assign
    k = len(centers)
    colors = np.zeros((k, 3), np.uint8)
    shares = []
    for i in range(k):
        m = labels == i
        colors[i] = np.median(rgb[m], axis=0).astype(np.uint8) if m.any() else (0, 0, 0)  # true colour, not the Lab centre
        shares.append(float(m.sum()) / float(fg.sum()))
    return Prepared(labels=labels, colors=colors, shares=shares, background=kind, size=(w, h))
