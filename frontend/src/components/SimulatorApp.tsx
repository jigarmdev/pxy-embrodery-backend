'use client';

import React, { useState } from 'react';
import AdvancedSimulator from './AdvancedSimulator';

export default function SimulatorApp() {
  const [file, setFile] = useState<File | null>(null);
  return <AdvancedSimulator file={file} setFile={setFile} />;
}
