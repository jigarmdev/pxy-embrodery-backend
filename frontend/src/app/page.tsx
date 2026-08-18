'use client';

import React, { useState } from 'react';
import AdvancedSimulator from '../components/AdvancedSimulator';

export default function Home() {
  const [file, setFile] = useState<File | null>(null);

  return (
    <main className="min-h-screen bg-slate-100 p-4 md:p-8 font-sans text-slate-900">
      <div className="max-w-[1200px] mx-auto">
        <header className="mb-8 flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div>
            <div className="inline-block bg-indigo-100 text-indigo-800 px-3 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase mb-2">
              Next-Gen Simulator
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight">pxy888 <span className="text-indigo-600">Studio</span></h1>
            <p className="text-slate-500 mt-1 text-sm">Upload a design to instantly simulate thread paths, calculate costs, and preview production.</p>
          </div>
          <div className="flex-shrink-0">
             <input 
                type="file" 
                accept="image/png, image/jpeg, image/webp"
                onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)}
                className="block w-full text-sm text-slate-500 file:mr-4 file:py-2.5 file:px-6 file:rounded-full file:border-0 file:text-sm file:font-bold file:bg-indigo-600 file:text-white hover:file:bg-indigo-700 hover:shadow-md cursor-pointer transition-all"
              />
          </div>
        </header>

        <AdvancedSimulator file={file} />
      </div>
    </main>
  );
}
