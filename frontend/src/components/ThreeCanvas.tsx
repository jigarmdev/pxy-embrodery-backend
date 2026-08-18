'use client';

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

interface Props {
  stitches: [number, number, string][] | null;
}

export default function ThreeCanvas({ stitches }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#f8fafc'); // Slate-50 background
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, width / height, 1, 1000);
    camera.position.set(0, 0, 150);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    rendererRef.current = renderer;
    containerRef.current.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(100, 100, 100);
    scene.add(dirLight);

    let animationId: number;
    const animate = () => {
      animationId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(animationId);
      if (rendererRef.current && rendererRef.current.domElement) {
        rendererRef.current.domElement.remove();
        rendererRef.current.dispose();
      }
    };
  }, []);

  useEffect(() => {
    if (!sceneRef.current || !stitches || stitches.length === 0) return;
    const scene = sceneRef.current;

    const objectsToRemove = scene.children.filter(c => c.name === 'stitchPath');
    objectsToRemove.forEach(obj => scene.remove(obj));

    const material = new THREE.LineBasicMaterial({
      color: 0x2563eb,
      linewidth: 2,
    });

    const points = [];
    for (let i = 0; i < stitches.length; i++) {
      points.push(new THREE.Vector3(stitches[i][0], stitches[i][1], 0));
    }

    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const line = new THREE.Line(geometry, material);
    line.name = 'stitchPath';
    scene.add(line);

    geometry.computeBoundingBox();
    if (geometry.boundingBox) {
      const center = new THREE.Vector3();
      geometry.boundingBox.getCenter(center);
      line.position.sub(center);
    }

  }, [stitches]);

  return (
    <div 
      ref={containerRef} 
      className="w-full h-full min-h-[500px] bg-slate-50 rounded-xl shadow-inner border border-gray-200 overflow-hidden cursor-move"
    />
  );
}
