import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  FolderPlus, Layers, Sliders, Box, Move, Rotate3d, Maximize2, 
  Download, Save, Eye, Trash2, Upload, RefreshCw, Palette, 
  CheckSquare, Square, ChevronRight, ChevronDown, Compass, 
  Share2, ShieldCheck, HelpCircle, Sparkles, AlertCircle, FileCode, Check
} from 'lucide-react';

const DB_NAME = 'CueCaseStudioDB';
const DB_VERSION = 1;
const STORE_NAME = 'saved_designs';

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = (e) => reject(e);
  });
}

async function saveDesignToDB(designData) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(designData);
    request.onsuccess = () => resolve(true);
    request.onerror = (err) => reject(err);
  });
}

async function getAllDesignsFromDB() {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = (err) => reject(err);
  });
}

async function deleteDesignFromDB(id) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(id);
    request.onsuccess = () => resolve(true);
    request.onerror = (err) => reject(err);
  });
}

function generateProceduralTexture(type, hexColor = '#1f1f23') {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.fillStyle = hexColor;
  ctx.fillRect(0, 0, 512, 512);

  if (type === 'leather') {
    // Subtle cellular leather grain
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 6000; i++) {
      const x = Math.random() * 512;
      const y = Math.random() * 512;
      ctx.beginPath();
      ctx.arc(x, y, 1 + Math.random() * 2, 0, Math.PI * 2);
      ctx.stroke();
    }
  } else if (type === 'carbon') {
    // Carbon weave grid
    const size = 16;
    for (let x = 0; x < 512; x += size) {
      for (let y = 0; y < 512; y += size) {
        const isOffset = (x / size + y / size) % 2 === 0;
        ctx.fillStyle = isOffset ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.25)';
        ctx.fillRect(x, y, size, size);
      }
    }
  } else if (type === 'brushed') {
    // Linear brushed metal streaks
    ctx.strokeStyle = 'rgba(255,255,255,0.07)';
    for (let y = 0; y < 512; y += 2) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(512, y);
      ctx.stroke();
    }
  }

  const texture = new window.THREE.CanvasTexture(canvas);
  texture.wrapS = window.THREE.RepeatWrapping;
  texture.wrapT = window.THREE.RepeatWrapping;
  texture.repeat.set(4, 4);
  return texture;
}

function createDefaultCueCaseModel(THREE) {
  const root = new THREE.Group();
  root.name = 'Cue_Case_Root';

  const defaultMat = new THREE.MeshStandardMaterial({
    color: 0x222227,
    roughness: 0.45,
    metalness: 0.15,
  });

  const metalMat = new THREE.MeshStandardMaterial({
    color: 0xd4af37, // Brass / gold accents
    roughness: 0.25,
    metalness: 0.85,
  });

  const zipperMat = new THREE.MeshStandardMaterial({
    color: 0x888890,
    roughness: 0.35,
    metalness: 0.6,
  });

  // 1. Main Cylindrical/Oval Body Part
  const bodyGeo = new THREE.CylinderGeometry(0.1, 0.09, 1.8, 32);
  const bodyMesh = new THREE.Mesh(bodyGeo, defaultMat.clone());
  bodyMesh.name = 'Body_part';
  bodyMesh.position.set(0, 0.9, 0);
  bodyMesh.castShadow = true;
  bodyMesh.receiveShadow = true;
  root.add(bodyMesh);

  // 2. Lid (Top cover)
  const lidGeo = new THREE.CylinderGeometry(0.103, 0.103, 0.15, 32);
  const lidMesh = new THREE.Mesh(lidGeo, defaultMat.clone());
  lidMesh.name = 'lid';
  lidMesh.position.set(0, 1.87, 0);
  lidMesh.castShadow = true;
  root.add(lidMesh);

  // 3. Small Pocket (Upper)
  const smallPocketGeo = new THREE.BoxGeometry(0.12, 0.32, 0.08);
  const smallPocket = new THREE.Mesh(smallPocketGeo, defaultMat.clone());
  smallPocket.name = 'small_pocket';
  smallPocket.position.set(0, 1.25, 0.12);
  smallPocket.castShadow = true;
  root.add(smallPocket);

  const zip1Geo = new THREE.BoxGeometry(0.015, 0.28, 0.01);
  const zip1 = new THREE.Mesh(zip1Geo, zipperMat.clone());
  zip1.name = 'zip';
  zip1.position.set(0, 1.25, 0.165);
  root.add(zip1);

  const ziper1Geo = new THREE.BoxGeometry(0.03, 0.04, 0.02);
  const ziper1 = new THREE.Mesh(ziper1Geo, metalMat.clone());
  ziper1.name = 'ziper';
  ziper1.position.set(0, 1.34, 0.17);
  root.add(ziper1);

  // 4. Large Pocket (Lower)
  const largePocketGeo = new THREE.BoxGeometry(0.13, 0.6, 0.08);
  const largePocket = new THREE.Mesh(largePocketGeo, defaultMat.clone());
  largePocket.name = 'Large_Pocket';
  largePocket.position.set(0, 0.55, 0.12);
  largePocket.castShadow = true;
  root.add(largePocket);

  const zip2Geo = new THREE.BoxGeometry(0.015, 0.54, 0.01);
  const zip2 = new THREE.Mesh(zip2Geo, zipperMat.clone());
  zip2.name = 'Zip_1';
  zip2.position.set(0, 0.55, 0.165);
  root.add(zip2);

  const ziper2Geo = new THREE.BoxGeometry(0.03, 0.04, 0.02);
  const ziper2 = new THREE.Mesh(ziper2Geo, metalMat.clone());
  ziper2.name = 'ziper_1';
  ziper2.position.set(0, 0.76, 0.17);
  root.add(ziper2);

  // 5. Side Handle
  const handleGripGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.28, 16);
  const handleGrip = new THREE.Mesh(handleGripGeo, defaultMat.clone());
  handleGrip.name = 'handle_grip';
  handleGrip.position.set(-0.16, 0.9, 0);
  handleGrip.castShadow = true;
  root.add(handleGrip);

  const handleStrapGeo = new THREE.TorusGeometry(0.06, 0.01, 8, 24, Math.PI);
  const handleStrap = new THREE.Mesh(handleStrapGeo, metalMat.clone());
  handleStrap.name = 'Handle_stap';
  handleStrap.rotation.z = Math.PI / 2;
  handleStrap.position.set(-0.11, 0.9, 0);
  root.add(handleStrap);

  // 6. Top Handle
  const topHandleGeo = new THREE.TorusGeometry(0.05, 0.012, 12, 24, Math.PI);
  const topHandle = new THREE.Mesh(topHandleGeo, defaultMat.clone());
  topHandle.name = 'Top_Handle';
  topHandle.position.set(0, 1.95, 0);
  root.add(topHandle);

  // 7. Shoulder Strap
  const strapGeo = new THREE.CylinderGeometry(0.015, 0.015, 1.1, 12);
  const strap = new THREE.Mesh(strapGeo, defaultMat.clone());
  strap.name = 'shoulder_strap';
  strap.position.set(0, 0.95, -0.16);
  strap.castShadow = true;
  root.add(strap);

  const buckle1Geo = new THREE.BoxGeometry(0.04, 0.04, 0.02);
  const buckle1 = new THREE.Mesh(buckle1Geo, metalMat.clone());
  buckle1.name = 'buckle_01';
  buckle1.position.set(0, 1.45, -0.15);
  root.add(buckle1);

  const buckle2 = buckle1.clone();
  buckle2.name = 'buckle_02';
  buckle2.position.set(0, 0.45, -0.15);
  root.add(buckle2);

  return root;
}

export default function App() {
  // Navigation
  const [activeTab, setActiveTab] = useState('studio'); // 'studio' | 'admin'
  const [toastMessage, setToastMessage] = useState(null);

  // Studio State
  const [threeLoaded, setThreeLoaded] = useState(false);
  const [sceneNodes, setSceneNodes] = useState([]);
  const [selectedNodeIds, setSelectedNodeIds] = useState(new Set());
  const [activeObject, setActiveObject] = useState(null);
  const [customGroups, setCustomGroups] = useState([]);
  const [newGroupName, setNewGroupName] = useState('');
  const [transformMode, setTransformMode] = useState('translate'); // 'translate' | 'rotate' | 'scale'
  const [spaceMode, setSpaceMode] = useState('local'); // 'local' | 'world'

  // Transform Inspector State
  const [pos, setPos] = useState({ x: 0, y: 0, z: 0 });
  const [rot, setRot] = useState({ x: 0, y: 0, z: 0 });
  const [scale, setScale] = useState({ x: 1, y: 1, z: 1 });
  const [uniformScale, setUniformScale] = useState(false);

  // Material State
  const [matColor, setMatColor] = useState('#222227');
  const [matRoughness, setMatRoughness] = useState(0.45);
  const [matMetalness, setMatMetalness] = useState(0.15);
  const [matTextureType, setMatTextureType] = useState('none');

  // Admin State
  const [savedDesigns, setSavedDesigns] = useState([]);
  const [previewDesign, setPreviewDesign] = useState(null);

  // Canvas Refs
  const mountRef = useRef(null);
  const previewCanvasRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const controlsRef = useRef(null);
  const transformControlsRef = useRef(null);
  const modelRootRef = useRef(null);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  useEffect(() => {
    const scripts = [
      'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js',
      'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js',
      'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/TransformControls.js',
      'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/GLTFLoader.js',
      'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/exporters/GLTFExporter.js',
      'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/geometries/DecalGeometry.js'
    ];

    let loadedCount = 0;
    const loadScript = (idx) => {
      if (idx >= scripts.length) {
        setThreeLoaded(true);
        return;
      }
      const script = document.createElement('script');
      script.src = scripts[idx];
      script.async = false;
      script.onload = () => loadScript(idx + 1);
      document.head.appendChild(script);
    };

    loadScript(0);
  }, []);

  const scanSceneHierarchy = useCallback((root) => {
    if (!root) return [];
    const list = [];
    const groups = [];

    const traverse = (obj, depth = 0) => {
      if (obj === root) {
        obj.children.forEach(c => traverse(c, depth));
        return;
      }

      const isGroup = obj.isGroup || (obj.children && obj.children.length > 0 && !obj.isMesh);
      const isMesh = obj.isMesh;

      list.push({
        id: obj.uuid,
        name: obj.name || `Object_${obj.uuid.slice(0, 5)}`,
        type: isGroup ? 'Group' : 'Mesh',
        depth,
        hasChildren: obj.children.length > 0,
        visible: obj.visible,
        ref: obj
      });

      if (isGroup && obj.name.includes('_Group')) {
        groups.push({
          id: obj.uuid,
          name: obj.name,
          childCount: obj.children.length,
          ref: obj
        });
      }

      obj.children.forEach(child => traverse(child, depth + 1));
    };

    traverse(root, 0);
    setCustomGroups(groups);
    return list;
  }, []);

  useEffect(() => {
    if (!threeLoaded || !mountRef.current) return;
    const THREE = window.THREE;

    const width = mountRef.current.clientWidth;
    const height = mountRef.current.clientHeight;

    // 1. Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0e1117);
    sceneRef.current = scene;

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(1.5, 1.8, 2.8);
    cameraRef.current = camera;

    // 3. Renderer with antialias and soft shadows
    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    mountRef.current.innerHTML = '';
    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 4. OrbitControls
    const controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.target.set(0, 0.9, 0);
    controlsRef.current = controls;

    // 5. Studio Lighting
    const ambLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.2);
    keyLight.position.set(3, 4, 3);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x7090ff, 0.5);
    fillLight.position.set(-3, 2, -2);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xffeedd, 0.6);
    rimLight.position.set(0, 4, -3);
    scene.add(rimLight);

    // Floor Grid & Shadow receiver
    const grid = new THREE.GridHelper(6, 24, 0x334155, 0x1e293b);
    grid.position.y = 0;
    scene.add(grid);

    const floorGeo = new THREE.PlaneGeometry(6, 6);
    const floorMat = new THREE.ShadowMaterial({ opacity: 0.35 });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    // 6. TransformControls Gizmo
    const tControls = new THREE.TransformControls(camera, renderer.domElement);
    tControls.size = 0.75;
    tControls.addEventListener('dragging-changed', (event) => {
      controls.enabled = !event.value;
    });
    tControls.addEventListener('change', () => {
      if (tControls.object) {
        setPos({
          x: +tControls.object.position.x.toFixed(3),
          y: +tControls.object.position.y.toFixed(3),
          z: +tControls.object.position.z.toFixed(3),
        });
        setRot({
          x: +(tControls.object.rotation.x * (180 / Math.PI)).toFixed(1),
          y: +(tControls.object.rotation.y * (180 / Math.PI)).toFixed(1),
          z: +(tControls.object.rotation.z * (180 / Math.PI)).toFixed(1),
        });
        setScale({
          x: +tControls.object.scale.x.toFixed(3),
          y: +tControls.object.scale.y.toFixed(3),
          z: +tControls.object.scale.z.toFixed(3),
        });
      }
    });
    scene.add(tControls);
    transformControlsRef.current = tControls;

    // 7. Load Default Procedural Model
    const defaultModel = createDefaultCueCaseModel(THREE);
    scene.add(defaultModel);
    modelRootRef.current = defaultModel;
    setSceneNodes(scanSceneHierarchy(defaultModel));

    // Animation Loop
    let animId;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (!mountRef.current) return;
      const w = mountRef.current.clientWidth;
      const h = mountRef.current.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      tControls.dispose();
      renderer.dispose();
    };
  }, [threeLoaded, scanSceneHierarchy]);

  const selectObject = useCallback((obj) => {
    setActiveObject(obj);
    if (!transformControlsRef.current) return;

    if (obj) {
      transformControlsRef.current.attach(obj);
      setPos({
        x: +obj.position.x.toFixed(3),
        y: +obj.position.y.toFixed(3),
        z: +obj.position.z.toFixed(3)
      });
      setRot({
        x: +(obj.rotation.x * (180 / Math.PI)).toFixed(1),
        y: +(obj.rotation.y * (180 / Math.PI)).toFixed(1),
        z: +(obj.rotation.z * (180 / Math.PI)).toFixed(1)
      });
      setScale({
        x: +obj.scale.x.toFixed(3),
        y: +obj.scale.y.toFixed(3),
        z: +obj.scale.z.toFixed(3)
      });

      // Sample Material
      const targetMesh = obj.isMesh ? obj : obj.children.find(c => c.isMesh);
      if (targetMesh && targetMesh.material) {
        const mat = targetMesh.material;
        if (mat.color) setMatColor('#' + mat.color.getHexString());
        if (mat.roughness !== undefined) setMatRoughness(mat.roughness);
        if (mat.metalness !== undefined) setMatMetalness(mat.metalness);
      }
    } else {
      transformControlsRef.current.detach();
    }
  }, []);

  const handleCreateGroupFromSelection = (groupNameOverride = null) => {
    if (selectedNodeIds.size === 0) {
      showToast('Select one or more objects to group');
      return;
    }

    const THREE = window.THREE;
    const root = modelRootRef.current;
    if (!root) return;

    const groupName = groupNameOverride || newGroupName.trim() || `Custom_Group_${Date.now().toString().slice(-4)}`;
    const newGroup = new THREE.Group();
    newGroup.name = groupName.endsWith('_Group') ? groupName : `${groupName}_Group`;
    root.add(newGroup);

    // Collect target meshes
    const meshesToGroup = [];
    selectedNodeIds.forEach(uuid => {
      const obj = root.getObjectByProperty('uuid', uuid);
      if (obj && obj !== root && obj !== newGroup) {
        meshesToGroup.push(obj);
      }
    });

    if (meshesToGroup.length === 0) return;

    // Compute bounding box center across all items to set clean pivot
    const combinedBox = new THREE.Box3();
    meshesToGroup.forEach(mesh => combinedBox.expandByObject(mesh));
    const centerPivot = new THREE.Vector3();
    combinedBox.getCenter(centerPivot);

    // Place group at center
    newGroup.position.copy(centerPivot);

    // Attach children preserving world transforms
    meshesToGroup.forEach(mesh => {
      newGroup.attach(mesh);
    });

    setSceneNodes(scanSceneHierarchy(root));
    setSelectedNodeIds(new Set());
    setNewGroupName('');
    selectObject(newGroup);
    showToast(`Created unified group "${newGroup.name}" with ${meshesToGroup.length} parts!`);
  };

  const handleAutoGroupPreset = (presetName, nodeKeywords) => {
    const root = modelRootRef.current;
    if (!root) return;

    const matchedUuids = new Set();
    nodeKeywords.forEach(kw => {
      root.traverse(child => {
        if (child.name.toLowerCase().includes(kw.toLowerCase())) {
          matchedUuids.add(child.uuid);
        }
      });
    });

    if (matchedUuids.size === 0) {
      showToast(`No matching parts found for ${presetName}`);
      return;
    }

    setSelectedNodeIds(matchedUuids);
    setTimeout(() => {
      handleCreateGroupFromSelection(presetName);
    }, 50);
  };

  const updateTransformProperty = (axis, value, type) => {
    if (!activeObject) return;
    const num = parseFloat(value);
    if (isNaN(num)) return;

    if (type === 'pos') {
      const next = { ...pos, [axis]: num };
      setPos(next);
      activeObject.position[axis] = num;
    } else if (type === 'rot') {
      const next = { ...rot, [axis]: num };
      setRot(next);
      activeObject.rotation[axis] = (num * Math.PI) / 180;
    } else if (type === 'scale') {
      if (uniformScale) {
        setScale({ x: num, y: num, z: num });
        activeObject.scale.set(num, num, num);
      } else {
        const next = { ...scale, [axis]: num };
        setScale(next);
        activeObject.scale[axis] = num;
      }
    }
  };

  const applyMaterialSettings = (newColor, newRoughness, newMetalness, textureType) => {
    if (!activeObject) return;
    const THREE = window.THREE;

    const applyToMesh = (mesh) => {
      if (!mesh.isMesh) return;
      mesh.material = mesh.material.clone();
      mesh.material.color.set(newColor);
      mesh.material.roughness = newRoughness;
      mesh.material.metalness = newMetalness;

      if (textureType !== 'none') {
        const tex = generateProceduralTexture(textureType, newColor);
        if (tex) {
          mesh.material.map = tex;
          mesh.material.needsUpdate = true;
        }
      } else {
        mesh.material.map = null;
        mesh.material.needsUpdate = true;
      }
    };

    if (activeObject.isMesh) {
      applyToMesh(activeObject);
    } else {
      activeObject.traverse(child => applyToMesh(child));
    }
  };

  const applyFaceDecal = (preset) => {
    if (!activeObject) {
      showToast('Select a pocket or part first');
      return;
    }
    const THREE = window.THREE;
    const targetMesh = activeObject.isMesh ? activeObject : activeObject.children.find(c => c.isMesh);
    if (!targetMesh) return;

    // Create Canvas Badge
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#0a0a0c';
    ctx.beginPath();
    ctx.arc(128, 128, 120, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 8;
    ctx.strokeStyle = '#d4af37';
    ctx.stroke();

    ctx.fillStyle = '#d4af37';
    ctx.font = 'bold 36px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(preset === 'pro' ? '★ PRO CUE ★' : 'CUSTOM 8', 128, 128);

    const decalTexture = new THREE.CanvasTexture(canvas);

    // Compute front bounds
    targetMesh.geometry.computeBoundingBox();
    const bbox = targetMesh.geometry.boundingBox;
    const center = new THREE.Vector3();
    bbox.getCenter(center);

    const facePosition = new THREE.Vector3(center.x, center.y, bbox.max.z + 0.005);
    const orientation = new THREE.Euler(0, 0, 0);
    const decalSize = new THREE.Vector3(0.08, 0.08, 0.05);

    const decalGeo = new THREE.DecalGeometry(targetMesh, facePosition, orientation, decalSize);
    const decalMat = new THREE.MeshStandardMaterial({
      map: decalTexture,
      transparent: true,
      depthTest: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -4
    });

    const decalMesh = new THREE.Mesh(decalGeo, decalMat);
    targetMesh.parent.add(decalMesh);
    showToast(`Decal projected on ${targetMesh.name}!`);
  };

  const handleGLBUpload = (file) => {
    if (!file) return;
    const THREE = window.THREE;
    const loader = new THREE.GLTFLoader();
    const reader = new FileReader();

    reader.onload = (e) => {
      const contents = e.target.result;
      loader.parse(contents, '', (gltf) => {
        const scene = sceneRef.current;
        if (modelRootRef.current) {
          scene.remove(modelRootRef.current);
        }

        const model = gltf.scene;
        model.name = file.name.replace(/\.[^/.]+$/, "");
        
        // Auto center and scale model
        const box = new THREE.Box3().setFromObject(model);
        const size = new THREE.Vector3();
        box.getSize(size);
        const maxDim = Math.max(size.x, size.y, size.z);
        if (maxDim > 0) {
          const scaleFactor = 1.8 / maxDim;
          model.scale.set(scaleFactor, scaleFactor, scaleFactor);
        }

        model.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
          }
        });

        scene.add(model);
        modelRootRef.current = model;
        setSceneNodes(scanSceneHierarchy(model));
        selectObject(null);
        showToast(`Loaded ${file.name} successfully!`);
      }, (err) => {
        showToast('Error parsing GLB: ' + err.message);
      });
    };

    reader.readAsArrayBuffer(file);
  };

  const handleSaveToIndexedDB = async () => {
    if (!rendererRef.current || !sceneRef.current || !cameraRef.current) return;

    // Render snapshot
    transformControlsRef.current.detach();
    rendererRef.current.render(sceneRef.current, cameraRef.current);
    const thumbnailDataUrl = rendererRef.current.domElement.toDataURL('image/jpeg', 0.85);
    if (activeObject) transformControlsRef.current.attach(activeObject);

    // Collect scene graph data
    const nodesData = [];
    if (modelRootRef.current) {
      modelRootRef.current.traverse((child) => {
        nodesData.push({
          name: child.name,
          uuid: child.uuid,
          isGroup: child.isGroup,
          pos: [child.position.x, child.position.y, child.position.z],
          rot: [child.rotation.x, child.rotation.y, child.rotation.z],
          scale: [child.scale.x, child.scale.y, child.scale.z],
          color: child.isMesh && child.material && child.material.color ? '#' + child.material.color.getHexString() : null
        });
      });
    }

    const designRecord = {
      id: 'cue_design_' + Date.now(),
      title: 'Custom Cue Case ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      date: new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString(),
      thumbnail: thumbnailDataUrl,
      groupCount: customGroups.length,
      groupNames: customGroups.map(g => g.name),
      nodesData
    };

    try {
      await saveDesignToDB(designRecord);
      showToast('Scene state and thumbnail saved to IndexedDB!');
      loadSavedDesigns();
    } catch (err) {
      showToast('Failed to save to IndexedDB');
    }
  };

  const handleExportGLB = () => {
    if (!modelRootRef.current) return;
    const THREE = window.THREE;
    const exporter = new THREE.GLTFExporter();

    exporter.parse(
      modelRootRef.current,
      (gltf) => {
        const blob = new Blob([gltf], { type: 'application/octet-stream' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `cue-case-${Date.now()}.glb`;
        link.click();
        showToast('GLB file downloaded!');
      },
      { binary: true }
    );
  };

  const handleExportJSON = () => {
    if (!modelRootRef.current) return;
    const jsonOutput = modelRootRef.current.toJSON();
    const blob = new Blob([JSON.stringify(jsonOutput, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `scene-definition-${Date.now()}.json`;
    link.click();
    showToast('JSON configuration exported!');
  };

  const loadSavedDesigns = async () => {
    try {
      const records = await getAllDesignsFromDB();
      setSavedDesigns(records.reverse());
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (activeTab === 'admin') {
      loadSavedDesigns();
    }
  }, [activeTab]);

  const handleDeleteDesign = async (id, e) => {
    e.stopPropagation();
    await deleteDesignFromDB(id);
    loadSavedDesigns();
    showToast('Design deleted from storage');
  };

  const setCameraView = (view) => {
    if (!cameraRef.current || !controlsRef.current) return;
    const cam = cameraRef.current;
    const ctrl = controlsRef.current;
    const targetY = 0.9;
    ctrl.target.set(0, targetY, 0);

    switch (view) {
      case 'front':
        cam.position.set(0, targetY, 2.8);
        break;
      case 'back':
        cam.position.set(0, targetY, -2.8);
        break;
      case 'side':
        cam.position.set(2.8, targetY, 0);
        break;
      case 'top':
        cam.position.set(0, 3.5, 0.01);
        break;
      default:
        cam.position.set(1.5, 1.8, 2.8);
    }
    ctrl.update();
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-950 text-slate-100 font-sans select-none">
      
      {/* Top Navigation Bar */}
      <header className="h-14 border-b border-slate-800 bg-slate-900/90 backdrop-blur px-4 flex items-center justify-between z-30">
        <div className="flex items-center space-x-3">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/20 text-slate-950 font-bold">
            <Box className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-wider text-slate-100 uppercase">3D Cue Case Studio</h1>
            <p className="text-[10px] text-amber-400 font-mono">GLB MESH GROUPER & CONFIGURATOR</p>
          </div>
        </div>

        {/* Mode Switcher Tabs */}
        <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800">
          <button
            onClick={() => setActiveTab('studio')}
            className={`px-4 py-1.5 text-xs font-medium rounded-md transition-all flex items-center space-x-1.5 ${
              activeTab === 'studio' 
                ? 'bg-amber-500 text-slate-950 font-semibold shadow' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Studio Editor</span>
          </button>
          <button
            onClick={() => setActiveTab('admin')}
            className={`px-4 py-1.5 text-xs font-medium rounded-md transition-all flex items-center space-x-1.5 ${
              activeTab === 'admin' 
                ? 'bg-amber-500 text-slate-950 font-semibold shadow' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Saved Designs (/admin)</span>
            {savedDesigns.length > 0 && (
              <span className="ml-1 px-1.5 py-0.2 bg-slate-800 text-[10px] rounded-full text-amber-300">
                {savedDesigns.length}
              </span>
            )}
          </button>
        </div>

        {/* Global Actions */}
        <div className="flex items-center space-x-2">
          <label className="cursor-pointer px-3 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg flex items-center space-x-1.5 border border-slate-700 transition">
            <Upload className="w-3.5 h-3.5 text-amber-400" />
            <span>Load GLB</span>
            <input 
              type="file" 
              accept=".glb,.gltf" 
              className="hidden" 
              onChange={(e) => handleGLBUpload(e.target.files?.[0])}
            />
          </label>

          <button
            onClick={handleSaveToIndexedDB}
            className="px-3 py-1.5 text-xs bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg flex items-center space-x-1.5 shadow-md shadow-emerald-700/20 font-medium transition"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save State</span>
          </button>

          <div className="relative group">
            <button className="px-3 py-1.5 text-xs bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg flex items-center space-x-1.5 font-semibold transition">
              <Download className="w-3.5 h-3.5" />
              <span>Export</span>
            </button>
            <div className="absolute right-0 top-full mt-1 w-36 bg-slate-900 border border-slate-800 rounded-lg shadow-xl py-1 hidden group-hover:block z-50">
              <button 
                onClick={handleExportGLB}
                className="w-full text-left px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-800 flex items-center space-x-2"
              >
                <Box className="w-3.5 h-3.5 text-amber-400" />
                <span>Export .GLB</span>
              </button>
              <button 
                onClick={handleExportJSON}
                className="w-full text-left px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-800 flex items-center space-x-2"
              >
                <FileCode className="w-3.5 h-3.5 text-blue-400" />
                <span>Export JSON</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="flex-1 flex overflow-hidden relative">

        {/* Tab 1: Studio Mode */}
        {activeTab === 'studio' && (
          <div className="flex-1 flex w-full h-full overflow-hidden">
            
            {/* Left Outliner & Grouping Panel */}
            <aside className="w-72 bg-slate-900/95 border-r border-slate-800 flex flex-col h-full z-10">
              <div className="p-3 border-b border-slate-800">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2 text-xs font-semibold text-slate-300">
                    <Layers className="w-4 h-4 text-amber-400" />
                    <span>Outliner & Groups</span>
                  </div>
                  <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-slate-400 font-mono">
                    {sceneNodes.length} nodes
                  </span>
                </div>

                {/* Auto Group Presets */}
                <div className="space-y-1">
                  <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Quick Cue Presets:</div>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button 
                      onClick={() => handleAutoGroupPreset('Pocket_1', ['small_pocket', 'ziper', 'zip'])}
                      className="px-2 py-1 text-[11px] bg-slate-800/80 hover:bg-slate-700/80 text-amber-300 rounded border border-slate-700/50 text-left truncate"
                    >
                      + Pocket 1
                    </button>
                    <button 
                      onClick={() => handleAutoGroupPreset('Pocket_2', ['Large_Pocket', 'ziper_1', 'Zip_1'])}
                      className="px-2 py-1 text-[11px] bg-slate-800/80 hover:bg-slate-700/80 text-amber-300 rounded border border-slate-700/50 text-left truncate"
                    >
                      + Pocket 2
                    </button>
                    <button 
                      onClick={() => handleAutoGroupPreset('Side_Handle', ['handle_grip', 'Handle_stap'])}
                      className="px-2 py-1 text-[11px] bg-slate-800/80 hover:bg-slate-700/80 text-amber-300 rounded border border-slate-700/50 text-left truncate"
                    >
                      + Side Handle
                    </button>
                    <button 
                      onClick={() => handleAutoGroupPreset('Top_Handle', ['Top_Handle'])}
                      className="px-2 py-1 text-[11px] bg-slate-800/80 hover:bg-slate-700/80 text-amber-300 rounded border border-slate-700/50 text-left truncate"
                    >
                      + Top Handle
                    </button>
                  </div>
                </div>

                {/* Manual Group Creation */}
                <div className="mt-3 pt-2 border-t border-slate-800 flex space-x-1">
                  <input
                    type="text"
                    placeholder="Custom group name..."
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    className="flex-1 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                  />
                  <button
                    onClick={() => handleCreateGroupFromSelection()}
                    disabled={selectedNodeIds.size === 0}
                    className={`px-2.5 py-1 text-xs rounded font-medium flex items-center space-x-1 ${
                      selectedNodeIds.size > 0 
                        ? 'bg-amber-500 hover:bg-amber-400 text-slate-950' 
                        : 'bg-slate-800 text-slate-600 cursor-not-allowed'
                    }`}
                  >
                    <FolderPlus className="w-3.5 h-3.5" />
                    <span>Group</span>
                  </button>
                </div>
              </div>

              {/* Node List */}
              <div className="flex-1 overflow-y-auto p-2 space-y-0.5 custom-scrollbar text-xs">
                {sceneNodes.map((node) => {
                  const isChecked = selectedNodeIds.has(node.id);
                  const isActive = activeObject && activeObject.uuid === node.id;
                  const isGroup = node.type === 'Group';

                  return (
                    <div
                      key={node.id}
                      onClick={() => selectObject(node.ref)}
                      style={{ paddingLeft: `${node.depth * 14 + 6}px` }}
                      className={`flex items-center justify-between py-1.5 px-2 rounded cursor-pointer transition ${
                        isActive 
                          ? 'bg-amber-500/20 border border-amber-500/40 text-amber-200' 
                          : 'hover:bg-slate-800/60 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center space-x-2 truncate">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const next = new Set(selectedNodeIds);
                            if (next.has(node.id)) next.delete(node.id);
                            else next.add(node.id);
                            setSelectedNodeIds(next);
                          }}
                          className="text-slate-400 hover:text-amber-400"
                        >
                          {isChecked ? (
                            <CheckSquare className="w-3.5 h-3.5 text-amber-400" />
                          ) : (
                            <Square className="w-3.5 h-3.5" />
                          )}
                        </button>
                        {isGroup ? (
                          <FolderPlus className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        ) : (
                          <Box className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                        )}
                        <span className="truncate">{node.name}</span>
                      </div>

                      {isGroup && (
                        <span className="text-[9px] px-1 py-0.2 bg-amber-950/80 text-amber-300 border border-amber-800/40 rounded">
                          Group
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Active Groups Summary */}
              {customGroups.length > 0 && (
                <div className="p-3 bg-slate-950 border-t border-slate-800">
                  <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold mb-1.5">
                    User Created Groups ({customGroups.length})
                  </div>
                  <div className="space-y-1 max-h-24 overflow-y-auto">
                    {customGroups.map(grp => (
                      <div 
                        key={grp.id}
                        onClick={() => selectObject(grp.ref)}
                        className="flex items-center justify-between p-1 px-2 rounded bg-slate-900 border border-slate-800 text-[11px] text-amber-300 cursor-pointer hover:border-amber-500/50"
                      >
                        <span className="truncate">{grp.name}</span>
                        <span className="text-[10px] text-slate-500">{grp.childCount} parts</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </aside>

            {/* Middle 3D Viewport */}
            <main className="flex-1 relative bg-slate-950">
              <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

              {/* Floating Gizmo Toolbar */}
              <div className="absolute top-4 left-4 bg-slate-900/90 backdrop-blur border border-slate-800 rounded-xl p-1.5 flex items-center space-x-1 shadow-2xl">
                <button
                  onClick={() => {
                    setTransformMode('translate');
                    if (transformControlsRef.current) transformControlsRef.current.setMode('translate');
                  }}
                  className={`p-2 rounded-lg text-xs font-medium flex items-center space-x-1 transition ${
                    transformMode === 'translate' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title="Translate [W]"
                >
                  <Move className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    setTransformMode('rotate');
                    if (transformControlsRef.current) transformControlsRef.current.setMode('rotate');
                  }}
                  className={`p-2 rounded-lg text-xs font-medium flex items-center space-x-1 transition ${
                    transformMode === 'rotate' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title="Rotate [E]"
                >
                  <Rotate3d className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    setTransformMode('scale');
                    if (transformControlsRef.current) transformControlsRef.current.setMode('scale');
                  }}
                  className={`p-2 rounded-lg text-xs font-medium flex items-center space-x-1 transition ${
                    transformMode === 'scale' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title="Scale [R]"
                >
                  <Maximize2 className="w-4 h-4" />
                </button>
                <div className="h-4 w-px bg-slate-800 mx-1" />
                <button
                  onClick={() => {
                    const next = spaceMode === 'local' ? 'world' : 'local';
                    setSpaceMode(next);
                    if (transformControlsRef.current) transformControlsRef.current.setSpace(next);
                  }}
                  className="px-2 py-1 text-[10px] font-mono bg-slate-800 text-slate-300 rounded hover:bg-slate-700"
                >
                  {spaceMode.toUpperCase()}
                </button>
              </div>

              {/* View Angles Quick Bar */}
              <div className="absolute top-4 right-4 bg-slate-900/90 backdrop-blur border border-slate-800 rounded-xl px-2 py-1 flex items-center space-x-1 text-xs">
                <span className="text-slate-500 text-[10px] mr-1">VIEW:</span>
                <button onClick={() => setCameraView('front')} className="px-2 py-1 hover:text-amber-400 text-slate-300">Front</button>
                <button onClick={() => setCameraView('back')} className="px-2 py-1 hover:text-amber-400 text-slate-300">Back</button>
                <button onClick={() => setCameraView('side')} className="px-2 py-1 hover:text-amber-400 text-slate-300">Side</button>
                <button onClick={() => setCameraView('top')} className="px-2 py-1 hover:text-amber-400 text-slate-300">Top</button>
                <button onClick={() => setCameraView('iso')} className="px-2 py-1 hover:text-amber-400 text-slate-300">3D</button>
              </div>

              {/* Selection Indicator Banner */}
              {activeObject && (
                <div className="absolute bottom-4 left-4 bg-slate-900/90 backdrop-blur border border-amber-500/40 rounded-xl px-3 py-1.5 flex items-center space-x-2 text-xs">
                  <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-slate-400">Selected:</span>
                  <span className="font-semibold text-amber-300">{activeObject.name}</span>
                  <span className="text-[10px] text-slate-500 font-mono">({activeObject.type})</span>
                </div>
              )}
            </main>

            {/* Right Inspector & Material Customizer */}
            <aside className="w-80 bg-slate-900/95 border-l border-slate-800 flex flex-col h-full z-10 overflow-y-auto custom-scrollbar">
              <div className="p-3 border-b border-slate-800">
                <div className="text-xs font-semibold text-slate-300 flex items-center space-x-2">
                  <Sliders className="w-4 h-4 text-amber-400" />
                  <span>Transform & Material Inspector</span>
                </div>
              </div>

              {activeObject ? (
                <div className="p-4 space-y-5 text-xs">
                  {/* Position (Move Top / Down) */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-slate-400 font-semibold text-[11px] uppercase tracking-wider">
                      <div className="flex items-center space-x-1">
                        <Move className="w-3.5 h-3.5 text-blue-400" />
                        <span>Position (Move)</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <span className="text-[10px] text-slate-500">X (Left/Right)</span>
                        <input
                          type="number"
                          step="0.05"
                          value={pos.x}
                          onChange={(e) => updateTransformProperty('x', e.target.value, 'pos')}
                          className="w-full bg-slate-950 border border-slate-800 rounded p-1 text-center font-mono text-slate-200"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] text-amber-400 font-bold">Y (Top/Down)</span>
                        <input
                          type="number"
                          step="0.05"
                          value={pos.y}
                          onChange={(e) => updateTransformProperty('y', e.target.value, 'pos')}
                          className="w-full bg-slate-950 border border-amber-500/50 rounded p-1 text-center font-mono text-amber-300"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500">Z (Front/Back)</span>
                        <input
                          type="number"
                          step="0.05"
                          value={pos.z}
                          onChange={(e) => updateTransformProperty('z', e.target.value, 'pos')}
                          className="w-full bg-slate-950 border border-slate-800 rounded p-1 text-center font-mono text-slate-200"
                        />
                      </div>
                    </div>
                    {/* Top/Down Quick nudge buttons */}
                    <div className="flex space-x-2 mt-1">
                      <button
                        onClick={() => updateTransformProperty('y', pos.y + 0.05, 'pos')}
                        className="flex-1 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-[11px]"
                      >
                        ▲ Nudge Up
                      </button>
                      <button
                        onClick={() => updateTransformProperty('y', pos.y - 0.05, 'pos')}
                        className="flex-1 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-[11px]"
                      >
                        ▼ Nudge Down
                      </button>
                    </div>
                  </div>

                  {/* Scale (Width & Height) */}
                  <div className="space-y-2 pt-3 border-t border-slate-800">
                    <div className="flex items-center justify-between text-slate-400 font-semibold text-[11px] uppercase tracking-wider">
                      <div className="flex items-center space-x-1">
                        <Maximize2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Scale & Dimensions</span>
                      </div>
                      <label className="flex items-center space-x-1 text-[10px] font-normal cursor-pointer text-slate-400">
                        <input
                          type="checkbox"
                          checked={uniformScale}
                          onChange={(e) => setUniformScale(e.target.checked)}
                          className="rounded bg-slate-800 border-slate-700"
                        />
                        <span>Uniform</span>
                      </label>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <span className="text-[10px] text-slate-400 font-semibold">Width (X)</span>
                        <input
                          type="number"
                          step="0.05"
                          value={scale.x}
                          onChange={(e) => updateTransformProperty('x', e.target.value, 'scale')}
                          className="w-full bg-slate-950 border border-slate-800 rounded p-1 text-center font-mono text-slate-200"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] text-amber-400 font-semibold">Height (Y)</span>
                        <input
                          type="number"
                          step="0.05"
                          value={scale.y}
                          onChange={(e) => updateTransformProperty('y', e.target.value, 'scale')}
                          className="w-full bg-slate-950 border border-amber-500/50 rounded p-1 text-center font-mono text-amber-300"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-semibold">Depth (Z)</span>
                        <input
                          type="number"
                          step="0.05"
                          value={scale.z}
                          onChange={(e) => updateTransformProperty('z', e.target.value, 'scale')}
                          className="w-full bg-slate-950 border border-slate-800 rounded p-1 text-center font-mono text-slate-200"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Material & Appearance */}
                  <div className="space-y-3 pt-3 border-t border-slate-800">
                    <div className="flex items-center space-x-1 text-slate-400 font-semibold text-[11px] uppercase tracking-wider">
                      <Palette className="w-3.5 h-3.5 text-pink-400" />
                      <span>Material & Custom Texture</span>
                    </div>

                    <div className="flex items-center space-x-3">
                      <input
                        type="color"
                        value={matColor}
                        onChange={(e) => {
                          setMatColor(e.target.value);
                          applyMaterialSettings(e.target.value, matRoughness, matMetalness, matTextureType);
                        }}
                        className="h-8 w-12 rounded cursor-pointer bg-transparent border-0"
                      />
                      <div className="flex-1 font-mono text-slate-300 uppercase">{matColor}</div>
                    </div>

                    {/* Texture presets */}
                    <div>
                      <span className="text-[10px] text-slate-400 block mb-1">Texture Grain Preset:</span>
                      <div className="grid grid-cols-2 gap-1.5">
                        {['none', 'leather', 'carbon', 'brushed'].map(t => (
                          <button
                            key={t}
                            onClick={() => {
                              setMatTextureType(t);
                              applyMaterialSettings(matColor, matRoughness, matMetalness, t);
                            }}
                            className={`p-1.5 rounded text-[11px] capitalize border text-left ${
                              matTextureType === t 
                                ? 'bg-amber-500/20 border-amber-500 text-amber-200' 
                                : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                            }`}
                          >
                            {t === 'none' ? 'Smooth Solid' : `${t} Grain`}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Roughness & Metalness sliders */}
                    <div className="space-y-2">
                      <div>
                        <div className="flex justify-between text-[10px] text-slate-400 mb-0.5">
                          <span>Roughness</span>
                          <span>{matRoughness.toFixed(2)}</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.05"
                          value={matRoughness}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            setMatRoughness(val);
                            applyMaterialSettings(matColor, val, matMetalness, matTextureType);
                          }}
                          className="w-full accent-amber-500"
                        />
                      </div>
                      <div>
                        <div className="flex justify-between text-[10px] text-slate-400 mb-0.5">
                          <span>Metallic Reflect</span>
                          <span>{matMetalness.toFixed(2)}</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.05"
                          value={matMetalness}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            setMatMetalness(val);
                            applyMaterialSettings(matColor, matRoughness, val, matTextureType);
                          }}
                          className="w-full accent-amber-500"
                        />
                      </div>
                    </div>

                    {/* Decal & Face Projection */}
                    <div className="pt-2 border-t border-slate-800">
                      <span className="text-[10px] text-slate-400 block mb-1.5 font-semibold">Front-Face Decal / Badge:</span>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => applyFaceDecal('pro')}
                          className="p-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded border border-slate-700 text-[11px]"
                        >
                          + Gold Star Patch
                        </button>
                        <button
                          onClick={() => applyFaceDecal('eight')}
                          className="p-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded border border-slate-700 text-[11px]"
                        >
                          + 8-Ball Emblem
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center text-slate-500 text-xs">
                  <Box className="w-8 h-8 mx-auto mb-2 text-slate-600" />
                  Select an object from the viewport or outliner list to edit its height, width, position, and surface material.
                </div>
              )}
            </aside>
          </div>
        )}

        {/* Tab 2: Admin / Saved Designs Mode */}
        {activeTab === 'admin' && (
          <div className="flex-1 bg-slate-950 p-6 overflow-y-auto">
            <div className="max-w-6xl mx-auto space-y-6">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div>
                  <h2 className="text-xl font-bold text-slate-100 flex items-center space-x-2">
                    <ShieldCheck className="w-5 h-5 text-amber-400" />
                    <span>Saved Designs & Snapshots (IndexedDB)</span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Manage and preview cue case configurations saved in the browser database.
                  </p>
                </div>
                <button
                  onClick={loadSavedDesigns}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs flex items-center space-x-1.5 border border-slate-700"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
                  <span>Refresh List</span>
                </button>
              </div>

              {savedDesigns.length === 0 ? (
                <div className="p-12 text-center border border-dashed border-slate-800 rounded-2xl bg-slate-900/40">
                  <Box className="w-12 h-12 mx-auto text-slate-700 mb-3" />
                  <h3 className="text-sm font-semibold text-slate-300">No Saved Designs in IndexedDB</h3>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
                    Switch to the Studio Editor, customize your pocket sizes, handles, and materials, then hit "Save State".
                  </p>
                  <button
                    onClick={() => setActiveTab('studio')}
                    className="px-4 py-2 bg-amber-500 text-slate-950 font-semibold text-xs rounded-lg shadow-lg hover:bg-amber-400 transition"
                  >
                    Go to Studio Editor
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {savedDesigns.map((design) => (
                    <div
                      key={design.id}
                      className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl overflow-hidden shadow-xl flex flex-col group transition"
                    >
                      {/* Thumbnail with Overlay */}
                      <div className="h-48 bg-slate-950 relative overflow-hidden flex items-center justify-center border-b border-slate-800">
                        {design.thumbnail ? (
                          <img
                            src={design.thumbnail}
                            alt={design.title}
                            className="w-full h-full object-contain group-hover:scale-105 transition duration-300"
                          />
                        ) : (
                          <Box className="w-10 h-10 text-slate-800" />
                        )}
                        <div className="absolute top-2 right-2 bg-slate-950/80 backdrop-blur px-2 py-0.5 rounded text-[10px] text-amber-400 font-mono">
                          {design.date}
                        </div>
                      </div>

                      {/* Design Info */}
                      <div className="p-4 flex-1 flex flex-col justify-between">
                        <div>
                          <h4 className="font-bold text-sm text-slate-100 mb-1">{design.title}</h4>
                          <div className="text-xs text-slate-400 flex items-center space-x-1.5 mb-3">
                            <FolderPlus className="w-3.5 h-3.5 text-amber-400" />
                            <span>{design.groupCount} Custom Groups:</span>
                          </div>

                          {/* Groups list tag cloud */}
                          <div className="flex flex-wrap gap-1 mb-4">
                            {design.groupNames && design.groupNames.length > 0 ? (
                              design.groupNames.map((gName, idx) => (
                                <span
                                  key={idx}
                                  className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full border border-slate-700/60"
                                >
                                  {gName}
                                </span>
                              ))
                            ) : (
                              <span className="text-[10px] text-slate-600">Standard Root Nodes</span>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between">
                          <button
                            onClick={() => {
                              setPreviewDesign(design);
                            }}
                            className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded-lg flex items-center space-x-1 transition"
                          >
                            <Eye className="w-3.5 h-3.5 text-amber-400" />
                            <span>Preview</span>
                          </button>

                          <div className="flex items-center space-x-1.5">
                            <button
                              onClick={() => {
                                const blob = new Blob([JSON.stringify(design, null, 2)], { type: 'application/json' });
                                const link = document.createElement('a');
                                link.href = URL.createObjectURL(blob);
                                link.download = `${design.id}.json`;
                                link.click();
                              }}
                              title="Download JSON schema"
                              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-blue-400 rounded-lg text-xs transition"
                            >
                              <FileCode className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={(e) => handleDeleteDesign(design.id, e)}
                              title="Delete from IndexedDB"
                              className="p-1.5 bg-slate-800 hover:bg-rose-950/50 hover:text-rose-400 text-slate-500 rounded-lg text-xs transition"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

      </div>

      {/* Quick 3D Preview Modal */}
      {previewDesign && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl flex flex-col">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-slate-100">{previewDesign.title}</h3>
                <p className="text-[11px] text-slate-400">Captured on {previewDesign.date}</p>
              </div>
              <button
                onClick={() => setPreviewDesign(null)}
                className="text-slate-400 hover:text-slate-100 text-lg font-bold px-2"
              >
                ✕
              </button>
            </div>
            <div className="p-4 bg-slate-950 flex items-center justify-center">
              <img
                src={previewDesign.thumbnail}
                alt="Preview"
                className="max-h-80 w-auto object-contain rounded-xl shadow"
              />
            </div>
            <div className="p-4 bg-slate-900 border-t border-slate-800 flex justify-between items-center text-xs">
              <div className="text-slate-400">
                Total Parts Recorded: <span className="text-amber-400 font-mono">{previewDesign.nodesData?.length || 0}</span>
              </div>
              <button
                onClick={() => {
                  setPreviewDesign(null);
                  setActiveTab('studio');
                  showToast('Re-opened in Studio');
                }}
                className="px-4 py-1.5 bg-amber-500 text-slate-950 font-semibold rounded-lg hover:bg-amber-400"
              >
                Open in Editor
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 bg-slate-900/95 border border-amber-500/50 text-slate-100 px-4 py-2.5 rounded-xl shadow-2xl flex items-center space-x-2 text-xs z-50 backdrop-blur">
          <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

    </div>
  );
}