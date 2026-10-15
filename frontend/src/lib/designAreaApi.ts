export interface DesignArea {
  x: number;
  y: number;
  width: number;
  height: number;
  name?: string;
}

export interface DetectionResult {
  imageSize: {
    width: number;
    height: number;
  };
  designArea: DesignArea;
  garmentType: string;
  printableAreas: DesignArea[];
  detectedFabricRegion?: DesignArea;
  savedImageUrl?: string;
  savedImageName?: string;
}

// Use relative path so Next.js rewrites proxy it to the backend.
// Falls back to direct URL if NEXT_PUBLIC_API_URL is set (Docker / prod).
const getApiBase = () => {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  return '/api';
};

export async function detectDesignArea(file: File): Promise<DetectionResult> {
  const formData = new FormData();
  // Backend parameter is named "file" (UploadFile = File(...))
  formData.append('file', file);

  const response = await fetch(`${getApiBase()}/detect-design-area`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => response.statusText);
    throw new Error(`Detection failed (${response.status}): ${detail}`);
  }

  return response.json();
}

export async function getGarmentTemplates() {
  const response = await fetch(`${getApiBase()}/garment-templates`);

  if (!response.ok) {
    throw new Error('Failed to fetch garment templates');
  }

  return response.json();
}
