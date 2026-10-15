import React from 'react';

interface Props {
  width: number;
  setWidth: (val: number) => void;
  height: number;
  setHeight: (val: number) => void;
  file: File | null;
  setFile: (val: File | null) => void;
  onDigitize: () => void;
  onDownload: () => void;
  loading: boolean;
  hasStitches: boolean;
}

export default function ControlPanel({ width, setWidth, height, setHeight, file, setFile, onDigitize, onDownload, loading, hasStitches }: Props) {
  return (
    <div className="bg-surface p-4 sm:p-6 rounded-xl shadow-lg border border-gray-100 flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-bold text-gray-800 mb-4">Digitizing Controls</h2>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Upload Vector / Image</label>
          <input 
            type="file" 
            accept="image/png, image/jpeg, image/webp"
            onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Target Width (mm): {width}mm</label>
            <input 
              type="range" min="20" max="200" value={width} 
              onChange={(e) => setWidth(Number(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Target Height (mm): {height}mm</label>
            <input 
              type="range" min="20" max="200" value={height} 
              onChange={(e) => setHeight(Number(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
          </div>
        </div>
      </div>
      
      <div className="flex flex-col gap-3">
        <button 
          onClick={onDigitize} 
          disabled={loading}
          className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow transition-colors disabled:opacity-50"
        >
          {loading ? 'Digitizing...' : '1-Click Auto Digitize'}
        </button>
        <button 
          onClick={onDownload} 
          disabled={!hasStitches || loading}
          className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg shadow transition-colors disabled:opacity-50"
        >
          Download Machine File (.DST)
        </button>
      </div>
    </div>
  );
}
