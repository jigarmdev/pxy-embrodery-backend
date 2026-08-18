Here is the complete master specification of **Wilcom EmbroideryStudio capabilities**, the mathematical calculation engine, stitch method taxonomy, and the end-to-end architecture required to build a **Web-to-Print / Web-to-Embroidery** SaaS platform.

---

```
                       [ Web-to-Embroidery Cloud Engine ]
                                       │
      ┌────────────────────────────────┼────────────────────────────────┐
      ▼                                ▼                                ▼
[ 1. Ingestion & Vision ]   [ 2. Auto-Digitizing Core ]   [ 3. CAM & Simulation ]
• Image Upload / Vector / Text • Auto-Branching & Pathing   • 3D TrueView™ Shader
• CIELAB Color Quantization    • Dynamic Pull Compensation  • Tajima (.DST) / Brother (.PES)
• Commercial Thread Matching   • Multi-Layer Underlays      • 1-Click Quotation PDF

```

---

## 1. Complete Wilcom Feature & Capability Matrix

Wilcom EmbroideryStudio's industry-standard capabilities are divided into five functional pillars:

### A. Core Vector Input & Digitizing Tools

* **Input A (Symmetrical Column):** Two boundary lines digitized point-by-point; stitches span between pairs.
* **Input B (Variable Asymmetrical Column):** Independent left/right curves for shapes that taper or swell unevenly.
* **Input C (Fixed-Width Border / Ribbon):** Single centerline with defined width (ideal for borders, patches, and overlocked merrowed edges).
* **Complex Fill with Holes (Fusion Fill):** Closed polygon shapes with arbitrary internal holes and custom fill angles.
* **Turning Satin:** Automatically calculates dynamic stitch angles along curved ribbons using the Medial Axis Transform.
* **Manual / Freehand Stitching:** Direct point-by-point needle penetration placement for artistic and Schiffli work.

---

### B. Structural Controls & Production Physics

* **Push / Pull Compensation:** Expands shapes outward ($+0.15\text{ mm to }+0.45\text{ mm}$) perpendicular to stitch angles to prevent registration gaps caused by thread tension.
* **Dual-Layer Auto-Underlay Engine:**
* *Center-Run:* Single line down column center (small lettering, narrow columns).
* *Edge-Run:* Dual lines $0.4\text{ mm}$ inside borders (prevents edge sinking).
* *Double Zig-Zag:* Criss-cross diagonal grid (flattens high-pile fabrics like fleece and terry towel).
* *Tatami Grid:* Perpendicular grid ($90^\circ$ to top fill) to anchor stretchy fabrics.


* **Smart Corners (Corner Mitering):** Automatically partitions acute corners into **Mitered seams**, **Capped corners**, or **Overlap turns** to eliminate needle breaks.
* **Short Stitching (Fractional Spacing):** Drops 1 out of every 2–3 inner needle points on sharp curves to avoid high thread density and nesting.
* **Auto-Branching (Eulerian Pathing):** Solves the Chinese Postman Problem to path multi-segment objects continuously with underpathing, eliminating trims and jumps.
* **Connectors & Locks:** Automatic 3-stitch micro-locks (tie-in and tie-off) before and after trims/color stops.

---

### C. Advanced Lettering & Monogramming

* **228+ Pre-Digitized Embroidery Fonts:** Native vector fonts optimized for satin and tatami stitches with built-in pull compensation.
* **Baselines:** Freeform baseline curves (Arc, Circle, Bridge, Wave, Envelope Warping, Vertical).
* **Cap / Center-Out Sequencing:** Sequences text from the center outwards to prevent fabric drift on baseball caps and pockets.
* **Monogramming Templates:** Initials and names enclosed in geometric frames, crests, and floral motif borders.

---

### D. Auto-Fabric Assistant Profiles

Automatically adjusts pull compensation, underlay types, and stitch density based on the selected substrate:

| Fabric Profile | Top Density (Pitch) | Pull Compensation | Primary Underlay | Secondary Underlay |
| --- | --- | --- | --- | --- |
| **Pique Polo Knit** | $0.38\text{ mm}$ | $+0.35\text{ mm}$ | Tatami Grid ($90^\circ$) | Edge-Run ($0.4\text{ mm}$ inset) |
| **Cotton / Twill** | $0.40\text{ mm}$ | $+0.25\text{ mm}$ | Center-Run | Zig-Zag ($1.5\text{ mm}$ pitch) |
| **Denim (Heavy)** | $0.42\text{ mm}$ | $+0.20\text{ mm}$ | Center-Run | None |
| **Fleece / Terry Towel** | $0.36\text{ mm}$ | $+0.40\text{ mm}$ | Double Zig-Zag | Water-Soluble Topping |
| **Cap / Structured** | $0.38\text{ mm}$ | $+0.15\text{ mm}$ | Center-Run | Edge-Run |
| **Leather / Vinyl** | $0.45\text{ mm}$ | $+0.15\text{ mm}$ | None / Light Center-Run | None (prevents perforation) |
| **Silk / Organza** | $0.45\text{ mm}$ | $+0.30\text{ mm}$ | Center-Run | None |

---

### E. Multi-Decoration Elements

* **Appliqué Engine:** Generates 3 sequential machine passes: (1) Placement Run, (2) Tackdown Zig-zag, and (3) Finishing Satin / E-stitch border.
* **3D Puff / Foam:** Increases top satin density by $40\%$ ($0.22\text{–}0.25\text{ mm}$ pitch) with perforated cutting caps at column ends to cleanly cut EVA foam.
* **Single / Twin Sequins:** Automated sequin drops with standard fixing stitches (Star, Ring, Cross).
* **Chenille & Moss Stitching:** Loop and moss stitch generation for letterman jackets.
* **Borer Embroidery:** Eyelet cutwork with surrounding reinforced satin rings.

---

## 2. Exhaustive Stitch Method Taxonomy

| Category | Stitch Method | Visual Characteristic | Optimal Use Case |
| --- | --- | --- | --- |
| **Fill** | **Tatami (Standard)** | Staggered brick-pattern parallel rows | Large filled areas ($>7\text{ mm}$) |
|  | **Turning Satin** | Glossy, angle-following smooth columns | Lettering, scrolls, organic shapes ($1\text{–}7\text{ mm}$) |
|  | **Satin Auto-Split** | Breaks satin stitches $>10\text{ mm}$ into mini-steps | Wide columns to avoid loose, snaggy threads |
|  | **Curved Fill** | Follows the curvature of closed contours | Dynamic flowing surfaces, hair, water waves |
|  | **Spiral / Maze Fill** | Double-spiral path that never crosses itself | Modern abstract fills and circular badges |
|  | **Carving Stamp / Split** | Recessed pattern lines stamped into Tatami | Subtle embossed logos and watermarks |
|  | **Gradient / Multi-Blend** | Accordion density transition between 2 colors | Photorealistic color blending and shading |
| **Line** | **Single Running Stitch** | Thin dashed outline ($2.0\text{–}2.5\text{ mm}$) | Fine line work, traveling, details |
|  | **Triple Run (Bean)** | 3 passes (forward-back-forward) | Bold, prominent outlines |
|  | **Backstitch / Stem** | Overlapping rope-like hand look | Vintage, traditional, and floral outlines |
|  | **Paghadi / String Stitch** | Multi-point geometric string art | Traditional Indian mirror work |
| **Decorative** | **Motif Fill & Motif Run** | Repeating geometric shapes (stars, crosses) | Intricate backgrounds, lace, borders |
|  | **Cross Stitch** | Traditional $X$ stitch grid ($14\text{–}18\text{ count}$) | Folk art, samplers, rustic aesthetics |
|  | **Stipple (Meander)** | Continuous maze-like wander line | Quilting, background relief, clouds |
| **Edge** | **Zig-Zag** | Alternating diagonal tooth pattern | Appliqué tackdown, stretch seams |
|  | **E-Stitch / Blanket** | Comb-like edge teeth | Appliqué borders, baby wear |
|  | **Scallop / Picot** | Looped and arched trim borders | Decorative handkerchief and collar edges |

---

## 3. Mathematical & Pricing Calculation Formulas

```
                                  [ Total Stitch Calculation ]
                                                │
           ┌────────────────────────────────────┼────────────────────────────────────┐
           ▼                                    ▼                                    ▼
[ Tatami Area Equation ]              [ Satin Column Equation ]            [ Running Outline Equation ]
 Area / (Pitch × StitchLen)           Length / Pitch × 2 × (1+Underlay)     Total Path Length / StitchLen

```

### 1. Total Stitch Count ($S_{\text{total}}$)

$$\begin{aligned} S_{\text{tatami}} &= \sum_{i} \left( \frac{\text{Area}_i\ (\text{mm}^2)}{\text{Row Pitch}\ (\text{mm}) \times \text{Stitch Length}\ (\text{mm})} \right) \times (1 + \text{Underlay Ratio } 0.35) \\ S_{\text{satin}} &= \sum_{j} \left( \frac{\text{Column Length}_j\ (\text{mm})}{\text{Stitch Spacing}\ (\text{mm})} \times 2 \right) \times (1 + \text{Underlay Ratio } 0.40) \\ S_{\text{run}} &= \sum_{k} \left( \frac{\text{Path Length}_k\ (\text{mm})}{\text{Stitch Length}\ (\text{mm})} \times \text{Passes } (1 \text{ or } 3) \right) \\ S_{\text{total}} &= S_{\text{tatami}} + S_{\text{satin}} + S_{\text{run}} + S_{\text{locks \& transitions}} \end{aligned}$$

---

### 2. Thread Consumption (Meters)

* **Top Thread ($L_{\text{top}}$):**

$$L_{\text{top}} = \left( \sum_{m=1}^{S_{\text{total}}} \text{Length}(P_m, P_{m+1}) \right) \times 1.18 \quad (\text{18\% take-up slack \& curve tension})$$


* **Bobbin Thread ($L_{\text{bobbin}}$):**

$$L_{\text{bobbin}} = L_{\text{top}} \times 0.35 \quad (\text{1:3 standard industrial ratio})$$



---

### 3. Machine Production Runtime

$$T_{\text{run}} = \left( \frac{S_{\text{total}}}{\text{Machine SPM (e.g. 750)}} \right) + \left( N_{\text{color stops}} \times \frac{25\text{ s}}{60} \right) + \left( N_{\text{trims}} \times \frac{6\text{ s}}{60} \right)$$

---

### 4. Commercial Price ($P_{\text{total}}$)

$$P_{\text{total}} = C_{\text{setup}} + \left( \frac{S_{\text{total}}}{1000} \times \text{Rate}_{\text{1k}} \right) + (L_{\text{top}} \times C_{\text{thread/m}}) + C_{\text{stabilizer}} + C_{\text{hooping labor}} + \text{Margin}$$

---

## 4. End-to-End Web-to-Print System Workflow

```
[ Step 1: User Input ] ────────► PNG / JPG / SVG / Custom Typography Text
                                          │
                                          ▼
[ Step 2: Vision & AI ] ────────► 1. Background Isolation & Alpha Masking
                                  2. K-Means CIELAB Quantization (ΔE₀₀ < 2.0)
                                  3. Match to Madeira / Isacord / Sulky Thread Charts
                                          │
                                          ▼
[ Step 3: Vector Slicing ] ─────► 1. Contour Extraction with Hole Hierarchy (RETR_CCOMP)
                                  2. Thin Lines (<1mm) ──► Running / Triple Stitch
                                  3. Columns (1-7mm)   ──► Turning Satin (Voronoi Medial Axis)
                                  4. Fills (>7mm)      ──► Tatami Slicer (0.25 Offset)
                                          │
                                          ▼
[ Step 4: Fabrication Rules ] ──► 1. Apply Fabric Pull Comp (+0.25mm to +0.40mm)
                                  2. Generate Perpendicular Underlay Grid
                                  3. Smart Mitered Corners & Short Stitching
                                  4. Eulerian Path Sequencing & Micro-Locks
                                          │
                  ┌───────────────────────┴───────────────────────┐
                  ▼                                               ▼
[ Step 5: TrueView™ 3D Preview ]                [ Step 6: Machine CAM & Output ]
• 3D Volumetric Extruded Ribbons                • Tajima Binary (.DST)
• Anisotropic Thread Luster Shader              • Brother (.PES), Janome (.JEF), Melco (.EXP)
• Fabric Normal Bump Map (Pique/Denim)          • 1-Click Client Quotation PDF
• Needle Hole Cavities & Drop Shadows           • Production Worksheet with Color Sequence

```

---

## 5. Machine Output File Formats Supported

| Machine Format | Extension | Manufacturer / Platform | Key Features |
| --- | --- | --- | --- |
| **Tajima** | `.dst` | Tajima, Barudan, SWF, Ricoma, Chinese Multi-Head | Universal industry standard; 3-byte ternary deltas, STOP, JUMP, END |
| **Brother / Baby Lock** | `.pes`, `.pec` | Brother, Baby Lock | Full embedded color palettes, thread brand codes, thumbnail graphics |
| **Melco** | `.exp` | Melco, Bernina | 2-byte coordinate deltas with separate color sequence |
| **Janome / Elna** | `.jef`, `.sew` | Janome, Elna | Direct hoop boundary checks and coordinate clipping |
| **Husqvarna / Pfaff** | `.vp3`, `.hus` | Husqvarna Viking, Pfaff | Multi-hoop coordinate offsets and color brand mappings |
| **Wilcom Object** | `.emb` | Wilcom (Proprietary) | Parametric vector boundaries + properties (recalculated on scale) |

---

## 6. Architecture for the Web-to-Print Platform

```
pxy888 Platform
├── Client Web Studio (Next.js 14 + Three.js + Canvas 2.5D)
│   ├── Drag-and-Drop Ingestion (Image or Text Monogram)
│   ├── Interactive 3D TrueView™ Thread Shader (Kajiya-Kay anisotropic lighting)
│   ├── Live Estimation Dashboard (Stitches, Thread, Runtime, Price in ₹ INR)
│   └── 1-Click CAM Exporter (.DST / .PES / PDF Quote)
│
├── FastAPI Computational Microservices (Python + WebAssembly)
│   ├── /api/digitize/image    -> OpenCV + K-Means + Shapely Slicing Engine
│   ├── /api/digitize/text     -> OpenType.js Glyph Extraction + Satin Column Mapper
│   ├── /api/estimate          -> Exact stitch and financial metrics
│   ├── /api/export/dst        -> Pure binary Tajima encoder
│   └── /api/export/quote-pdf  -> Generates branded customer quotation sheets
│
└── Infrastructure & Deployment
    ├── Next.js Frontend deployed on Vercel / Cloudflare Pages
    ├── FastAPI Backend deployed on Docker / AWS ECS / Render
    └── Database & Billing: Supabase (PostgreSQL) + Razorpay (INR) / Stripe (USD)

```

With this complete specification, **`pxy888`** contains all the mathematical models, stitch classifications, visual shaders, and file serialization needed to compete directly with commercial desktop software like [Wilcom EmbroideryStudio](https://wilcom.com/embroiderystudio) at a nominal SaaS price point.