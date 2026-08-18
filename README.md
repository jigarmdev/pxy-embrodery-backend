Here is the complete **1-Click automated execution system**, along with an itemized breakdown of all installation commands, technologies, and setup steps for **`pxy888`**.

---

## 1. Single-Click / Single-Command Execution

Choose the setup method that matches your operating system:

### Option A: macOS & Linux (1-Click Bash Script)

Run the automated runner script to create the Python virtual environment, install dependencies, and launch both the backend and frontend simultaneously:

```bash
chmod +x setup_and_run.sh
./setup_and_run.sh

```

---

### Option B: Windows (1-Click Batch or PowerShell Script)

* **Command Prompt:** Double-click or run:
```cmd
setup_and_run.bat

```


* **PowerShell:**
```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\setup_and_run.ps1

```



---

### Option C: Docker (1-Click Containerized Run)

If you prefer running via Docker without configuring local Node.js or Python runtimes:

```bash
docker compose up --build

```

* **Frontend Web Studio:** [http://localhost:3000](http://localhost:3000)
* **Backend API & Swagger Docs:** [http://localhost:8000/docs](http://localhost:8000/docs)

---

## 2. Complete Inventory: What, Why & How

### A. System Runtime Prerequisites

| Tool | Minimum Version | Why It Is Needed | How It Works in `pxy888` |
| --- | --- | --- | --- |
| **Node.js** | `v18.0.0+` | JavaScript/TypeScript runtime. | Runs the Next.js frontend development and build pipelines. |
| **Python** | `3.10+` | Backend computational runtime. | Executes geometry math, polygon slicing, and file serialization. |
| **npm** | `9.0.0+` | Package manager for Node.js. | Installs Three.js, React, Lucide icons, and Tailwind CSS. |
| **pip** | `23.0+` | Package installer for Python. | Installs FastAPI, Shapely, OpenCV, Pillow, and Uvicorn. |

---

### B. Python Backend Dependencies (`backend/requirements.txt`)

| Library | Setup Command | Why We Need It | How It Operates |
| --- | --- | --- | --- |
| **`fastapi`** | `pip install fastapi` | Asynchronous REST API framework. | Exposes endpoints for auto-digitizing, metric estimation, and `.DST` generation. |
| **`uvicorn`** | `pip install uvicorn` | ASGI web server. | Serves the FastAPI application on port `8000` with live reload. |
| **`shapely`** | `pip install shapely` | 2D Computational Geometry library. | Clips polygons against horizontal scanlines, handles interior holes, and calculates pull compensation buffers. |
| **`numpy`** | `pip install numpy` | Vectorized numerical computation. | Calculates Euclidean stitch distances, coordinate transformations, and thread length summations. |
| **`opencv-python`** | `pip install opencv-python-headless` | Image analysis and computer vision. | Binarizes uploaded artwork, isolates colors, and traces vector contours. |
| **`pillow`** | `pip install pillow` | Image decoding and manipulation. | Ingests PNG, JPG, and WebP raster assets. |
| **`pydantic`** | `pip install pydantic` | Data validation. | Validates digitizing parameters and pricing responses. |

---

### C. Frontend JavaScript / WebGL Dependencies (`frontend/package.json`)

| Package | Setup Command | Why We Need It | How It Operates |
| --- | --- | --- | --- |
| **`next`** | `npm install next react react-dom` | Web application framework. | Provides server and client rendering with fast hot-reloading. |
| **`three`** | `npm install three @types/three` | WebGL 3D graphics library. | Renders continuous 3D thread splines over a fabric plane. |
| **`tailwindcss`** | `npm install -D tailwindcss postcss autoprefixer` | Utility-first CSS styling. | Styles the Studio UI, control panels, sliders, and metric dashboards. |
| **`lucide-react`** | `npm install lucide-react` | Clean vector iconography. | Provides UI icons for stitch counts, run times, thread meters, and export buttons. |

---

## 3. Step-by-Step Manual Setup Guide

If you prefer to set up each component manually command-by-command:

### Step 1: Set Up Backend

```bash
# 1. Navigate to the backend directory
cd backend

# 2. Create and activate a Python virtual environment
python3 -m venv venv
source venv/bin/activate       # On Windows: venv\Scripts\activate

# 3. Upgrade pip and install all backend packages
pip install --upgrade pip
pip install -r requirements.txt

# 4. Start the FastAPI development server
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

```

---

### Step 2: Set Up Frontend

Open a new terminal window:

```bash
# 1. Navigate to the frontend directory
cd frontend

# 2. Install all frontend dependencies
npm install

# 3. Start the Next.js development server
npm run dev

```

---

## 4. End-to-End Workflow Verification

1. Open **[http://localhost:3000](http://localhost:3000)** in your web browser.
2. **Interactive Size Slider:** Move the target size slider between $40\text{ mm}$ and $150\text{ mm}$.
* The backend dynamically recalculates the Tatami fill scanlines, underlay grid, and pull compensation.


3. **TrueView™ 3D Simulator:** View the rendered 3D thread strands with cylindrical reflections and needle penetration points.
4. **Production Metrics Panel:** Review live calculations for:
* Total stitch count
* Machine run time at $750\text{ SPM}$
* Top thread and bobbin consumption in meters
* Commercial cost breakdown in ₹ INR


5. **Machine CAM File Download:** Click **"Download Machine File (.DST)"** to generate and download a binary Tajima file ready for industrial embroidery machines.