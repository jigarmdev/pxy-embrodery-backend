import math

# Realistic Thread Libraries
MADEIRA_POLYNEON = [
    {"name": "Super White", "code": "1801", "hex": "#f5f5f5"},
    {"name": "Black", "code": "1800", "hex": "#1a1a1a"},
    {"name": "Classic Red", "code": "1637", "hex": "#d32f2f"},
    {"name": "Royal Blue", "code": "1966", "hex": "#1976d2"},
    {"name": "Emerald", "code": "1903", "hex": "#388e3c"},
    {"name": "Bright Yellow", "code": "1867", "hex": "#fbc02d"},
    {"name": "Orange", "code": "1678", "hex": "#f57c00"},
    {"name": "Pink", "code": "1910", "hex": "#e91e63"},
    {"name": "Purple", "code": "1832", "hex": "#7b1fa2"},
    {"name": "Silver", "code": "1918", "hex": "#9e9e9e"},
]

ISACORD_40 = [
    {"name": "White", "code": "0015", "hex": "#ffffff"},
    {"name": "Black", "code": "0020", "hex": "#000000"},
    {"name": "Red", "code": "1902", "hex": "#e53935"},
    {"name": "Blue", "code": "3333", "hex": "#1e88e5"},
    {"name": "Green", "code": "5633", "hex": "#43a047"},
    {"name": "Yellow", "code": "0600", "hex": "#fdd835"},
    {"name": "Orange", "code": "1304", "hex": "#fb8c00"},
]

def hex_to_rgb(hex_color: str):
    hex_color = hex_color.lstrip('#')
    if len(hex_color) == 3:
        hex_color = ''.join(c + c for c in hex_color)
    return tuple(int(hex_color[i:i+2], 16) for i in (0, 2, 4))

def color_distance(rgb1, rgb2):
    return math.sqrt(sum((a - b) ** 2 for a, b in zip(rgb1, rgb2)))

def map_to_closest_thread(hex_color: str, library="Madeira"):
    palette = MADEIRA_POLYNEON if library == "Madeira" else ISACORD_40
    try:
        target_rgb = hex_to_rgb(hex_color)
    except:
        target_rgb = (0, 0, 0)
    
    closest_thread = None
    min_dist = float('inf')
    
    for thread in palette:
        thread_rgb = hex_to_rgb(thread["hex"])
        dist = color_distance(target_rgb, thread_rgb)
        if dist < min_dist:
            min_dist = dist
            closest_thread = thread
            
    return closest_thread


# A curated palette (own naming, same as the frontend picker) used to give every design colour a readable name.
THREAD_COLORS = [
    ("Jet Black", "#111111"), ("Charcoal", "#3b3f46"), ("Silver Grey", "#9aa0a8"), ("Snow White", "#f8f8f4"),
    ("Cream", "#efe3c4"), ("Sand", "#cdb38a"), ("Chestnut", "#7a4a2b"), ("Espresso", "#3e2a1f"),
    ("Scarlet", "#d3202f"), ("Crimson", "#9c1230"), ("Coral", "#f26d5b"), ("Blush Pink", "#f4a6bd"),
    ("Hot Pink", "#e0278c"), ("Orchid", "#a24cc4"), ("Royal Purple", "#5a2d91"), ("Lavender", "#b9a5e0"),
    ("Navy", "#14284b"), ("Royal Blue", "#1f55c9"), ("Sky Blue", "#59a8e6"), ("Teal", "#0f8a8a"),
    ("Emerald", "#109a55"), ("Kelly Green", "#2ea84b"), ("Lime", "#9ccc3c"), ("Olive", "#6b7a2c"),
    ("Sunflower", "#f5c518"), ("Tangerine", "#f58220"), ("Burnt Orange", "#c4551b"), ("Gold", "#c9a227"),
]


def _redmean(a, b) -> float:
    """Perceptual-ish RGB distance (the 'redmean' approximation), cheap and good enough for naming colours."""
    rm = (a[0] + b[0]) / 2.0
    dr, dg, db = a[0] - b[0], a[1] - b[1], a[2] - b[2]
    return math.sqrt((2 + rm / 256) * dr * dr + 4 * dg * dg + (2 + (255 - rm) / 256) * db * db)


def nearest_named(hex_color: str):
    """(name, hex) of the closest colour in THREAD_COLORS."""
    try:
        rgb = hex_to_rgb(hex_color)
    except Exception:
        rgb = (0, 0, 0)
    return min(THREAD_COLORS, key=lambda t: _redmean(rgb, hex_to_rgb(t[1])))
