"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { RotateCcw } from "lucide-react";
import { useLanguage } from "@/lib/language-context";
import "./bom-part-viewer.css";

interface BOMPartViewerProps {
  modelURL: string;
  imageURL: string;
  label: string;
  sourceName: string;
  active?: boolean;
}
interface ViewerRuntime {
  setActive: (active: boolean) => void;
  reset: () => void;
  dispose: () => void;
}

/** Isolated source geometry; product illustrations preserve their native finish. */
export default function BOMPartViewer({ modelURL, imageURL, label, sourceName, active = true }: BOMPartViewerProps) {
  const { t } = useLanguage();
  const host = useRef<HTMLDivElement>(null);
  const runtime = useRef<ViewerRuntime | null>(null);
  const activeRef = useRef(active);
  activeRef.current = active;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const isProductIllustration = modelURL.startsWith("/bom/products/");

  useEffect(() => { runtime.current?.setActive(active); }, [active]);
  useEffect(() => {
    const container = host.current;
    if (!container) return;
    let cancelled = false;
    let renderer: THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "high-performance" }); }
    catch { queueMicrotask(() => { setLoading(false); setError(true); }); return; }
    queueMicrotask(() => { setLoading(true); setError(false); });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    renderer.setClearColor(0xffffff);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = isProductIllustration ? .72 : 1;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.domElement.tabIndex = 0;
    renderer.domElement.setAttribute("role", "img");
    container.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(32, 1, 0.01, 50);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.enablePan = true;
    controls.minDistance = 0.7;
    controls.maxDistance = 7;
    controls.listenToKeyEvents(renderer.domElement);
    const recordCamera = () => {
      container.dataset.cameraPosition = camera.position.toArray().map(value => value.toFixed(5)).join(",");
      container.dataset.cameraTarget = controls.target.toArray().map(value => value.toFixed(5)).join(",");
    };
    controls.addEventListener("change", recordCamera);
    const pmrem = new THREE.PMREMGenerator(renderer);
    const room = new RoomEnvironment();
    const environment = pmrem.fromScene(room, 0.035);
    scene.environment = environment.texture;
    if (isProductIllustration) scene.environmentIntensity = .7;
    room.dispose();
    const key = new THREE.DirectionalLight(0xfff5e7, isProductIllustration ? 2.3 : 3.2);
    key.position.set(-2.4, 4.1, 3.2);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.left = -2; key.shadow.camera.right = 2;
    key.shadow.camera.top = 2; key.shadow.camera.bottom = -2;
    key.shadow.camera.near = 0.2; key.shadow.camera.far = 12;
    key.shadow.normalBias = 0.002;
    key.shadow.bias = -0.00005;
    scene.add(key);
    const fill = new THREE.DirectionalLight(0xdceaff, isProductIllustration ? .55 : 1.35);
    fill.position.set(3, 1.4, -1); scene.add(fill);
    scene.add(new THREE.HemisphereLight(0xffffff, 0xd9dde6, isProductIllustration ? .16 : .5));
    const part = new THREE.Group();
    scene.add(part);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(20, 20), new THREE.ShadowMaterial({ color: 0x667383, opacity: 0.15 }));
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);
    const cleanGeometry = new Set<THREE.BufferGeometry>([floor.geometry]);
    const cleanMaterial = new Set<THREE.Material>([floor.material]);
    let frame = 0, enabled = activeRef.current, ready = false, halfHeight = 0.5;
    const viewDirection = new THREE.Vector3(1.7, 1.35, 2.2).normalize();
    const fit = () => {
      const limitingFOV = 2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2) * Math.min(camera.aspect, 1));
      const distance = (Math.sqrt(3) * halfHeight / Math.sin(limitingFOV / 2)) * 1.03;
      // A normal reset still applies the previous drag's damped rotation/pan.
      // Flush those deltas before setting the fitted camera so it stays fixed.
      const damping = controls.enableDamping;
      controls.enableDamping = false;
      controls.update();
      controls.target.set(0, 0, 0);
      camera.position.copy(viewDirection).multiplyScalar(distance);
      controls.update();
      controls.saveState();
      controls.enableDamping = damping;
    };
    const render = () => { if (ready) { controls.update(); renderer.render(scene, camera); } };
    const tick = () => { if (!enabled || cancelled) return; render(); frame = requestAnimationFrame(tick); };
    const setActive = (next: boolean) => {
      enabled = next;
      cancelAnimationFrame(frame);
      if (enabled && !cancelled) tick();
    };
    let oldAspect = 1, resizeFrame = 0, lastWidth = 0, lastHeight = 0;
    const resize = () => {
      const width = Math.max(1, container.clientWidth), height = Math.max(1, container.clientHeight);
      if (cancelled || width === lastWidth && height === lastHeight) return;
      lastWidth = width; lastHeight = height;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
      // Fit a narrower viewport without resetting a user's orbit on every resize.
      if (ready && camera.aspect < oldAspect) {
        const scale = Math.min(oldAspect, 1) / Math.min(camera.aspect, 1);
        camera.position.sub(controls.target).multiplyScalar(scale).add(controls.target);
      }
      oldAspect = camera.aspect;
      render();
    };
    const observer = new ResizeObserver(() => {
      if (!resizeFrame && !cancelled) resizeFrame = requestAnimationFrame(() => { resizeFrame = 0; resize(); });
    });
    observer.observe(container);
    const controller = new AbortController();
    const disposeLoaded = (loaded: THREE.Object3D) => loaded.traverse(node => {
      if (!(node instanceof THREE.Mesh)) return;
      node.geometry.dispose();
      for (const material of Array.isArray(node.material) ? node.material : [node.material]) material.dispose();
    });
    void fetch(modelURL, { signal: controller.signal }).then(async response => {
      if (!response.ok) throw new Error("BOM CAD unavailable");
      const loaded = await new GLTFLoader().parseAsync(await response.arrayBuffer(), new URL(".", new URL(modelURL, window.location.href)).href);
      if (cancelled) { disposeLoaded(loaded.scene); return; }
      loaded.scene.updateMatrixWorld(true);
      const bounds = new THREE.Box3().setFromObject(loaded.scene);
      const size = bounds.getSize(new THREE.Vector3()), centre = bounds.getCenter(new THREE.Vector3());
      if (bounds.isEmpty() || ![size.x, size.y, size.z].every(Number.isFinite)) { disposeLoaded(loaded.scene); throw new Error("BOM CAD bounds unavailable"); }
      const scale = 1 / Math.max(size.x, size.y, size.z);
      const originalMaterials = new Set<THREE.Material>();
      let meshCount = 0;
      loaded.scene.traverse(node => {
        if (isProductIllustration && node instanceof THREE.LineSegments) {
          cleanGeometry.add(node.geometry);
          for (const material of Array.isArray(node.material) ? node.material : [node.material]) cleanMaterial.add(material);
          return;
        }
        if (!(node instanceof THREE.Mesh)) return;
        meshCount++;
        if (isProductIllustration) {
          // Product GLBs are exported from the same scene used for their PNGs.
          // Keep the red N / blue S and brass material definitions intact.
          node.castShadow = !(node.material instanceof THREE.MeshPhysicalMaterial && node.material.transmission > 0);
          node.receiveShadow = node.castShadow;
          cleanGeometry.add(node.geometry);
          for (const material of Array.isArray(node.material) ? node.material : [node.material]) cleanMaterial.add(material);
          return;
        }
        for (const material of Array.isArray(node.material) ? node.material : [node.material]) originalMaterials.add(material);
        const surface = new THREE.MeshPhysicalMaterial({ color: 0xd4dae3, metalness: 0, roughness: 0.58, clearcoat: 0.08, clearcoatRoughness: 0.5 });
        node.material = surface; node.castShadow = true; node.receiveShadow = true;
        cleanGeometry.add(node.geometry); cleanMaterial.add(surface);
        const edgeGeometry = new THREE.EdgesGeometry(node.geometry, 25);
        const edgeMaterial = new THREE.LineBasicMaterial({ color: 0x506176, transparent: true, opacity: 0.25 });
        const edge = new THREE.LineSegments(edgeGeometry, edgeMaterial);
        node.add(edge); cleanGeometry.add(edgeGeometry); cleanMaterial.add(edgeMaterial);
      });
      originalMaterials.forEach(material => material.dispose());
      part.add(loaded.scene);
      part.scale.setScalar(scale); part.position.copy(centre).multiplyScalar(-scale);
      halfHeight = Math.max(size.x, size.y, size.z) * scale / 2;
      floor.position.y = bounds.min.y * scale + part.position.y - 0.003;
      container.dataset.boundsMM = [size.x, size.y, size.z].map(value => value.toFixed(3)).join(",");
      container.dataset.meshCount = String(meshCount);
      container.dataset.loaded = "true";
      ready = true; resize(); fit(); render();
      if (!cancelled) setLoading(false);
      setActive(activeRef.current);
    }).catch(reason => {
      if (cancelled || reason?.name === "AbortError") return;
      setLoading(false); setError(true);
    });
    const dispose = () => {
      cancelled = true; controller.abort(); cancelAnimationFrame(frame); cancelAnimationFrame(resizeFrame); observer.disconnect();
      controls.dispose(); cleanGeometry.forEach(geometry => geometry.dispose()); cleanMaterial.forEach(material => material.dispose());
      environment.dispose(); pmrem.dispose(); renderer.dispose(); renderer.domElement.remove();
    };
    runtime.current = { setActive, reset: () => { fit(); render(); }, dispose };
    resize();
    return () => { dispose(); runtime.current = null; };
  }, [modelURL, isProductIllustration]);
  useEffect(() => { host.current?.querySelector("canvas")?.setAttribute("aria-label", `${label}. ${t("拖动旋转，滚轮缩放，右键平移。", "Drag to rotate, scroll to zoom, right-drag to pan.")}`); }, [label, t, loading]);

  return <div className="bom-part-viewer" data-model-url={modelURL} data-active={active} data-source-name={sourceName}>
    <div ref={host} className="bom-part-viewer__canvas"/>
    {loading && <div className="bom-part-viewer__status" role="status">{t("正在载入零件模型…", "Loading part model…")}</div>}
    {error && <div className="bom-part-viewer__fallback"><img src={imageURL} alt={label}/><p>{t("此浏览器暂时无法显示 3D；仍可查看同一零件的渲染图。", "3D is unavailable in this browser; the image shows the same part.")}</p></div>}
    <div className="bom-part-viewer__controls"><span>{t("拖动旋转 · 滚轮缩放 · 右键平移", "Drag to rotate · Scroll to zoom · Right-drag to pan")}</span><button onClick={() => runtime.current?.reset()} disabled={loading || error}><RotateCcw size={14}/>{t("复位", "Reset view")}</button></div>
    <p className="bom-part-viewer__caption">{isProductIllustration ? t("立体用途示意；以提供物料为准", "3D product illustration; check supplied parts") : t("来自提供的 STEP", "From provided STEP")} · {sourceName}</p>
  </div>;
}
