"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { useTheme } from "@/components/theme-provider";
import styles from "./three-d-bar-chart.module.css";

export interface TrendBar {
  day: string;
  rate: number;
}

const MAX_H = 4;
const ROT_STEP = 0.008;
const DRAW_DUR = 1700;
const MARK_DUR = 420;
const RING_DUR = 650;

interface TooltipState {
  x: number;
  y: number;
  day: string;
  value: number;
}

interface Props {
  data: TrendBar[];
  toolbar?: ReactNode;
}
const VERT = `
varying float vU;
void main() {
  vU = uv.x;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const FRAG = `
varying float vU;
uniform float uProgress;
uniform vec3 uColor;
uniform vec3 uGlow;
void main() {
  if (vU > uProgress) discard;
  float trail = smoothstep(uProgress, uProgress * 0.45, vU);
  float edge = smoothstep(max(uProgress - 0.16, 0.0), uProgress, vU);
  vec3 col = mix(uColor, uGlow, edge);
  col += vec3(0.4, 1.0, 0.75) * smoothstep(max(uProgress - 0.05, 0.0), uProgress, vU) * 0.7;
  col *= 0.6 + 0.4 * trail;
  gl_FragColor = vec4(col, 1.0);
}
`;

export default function ThreeDTrendChart({ data, toolbar }: Props) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [tip, setTip] = useState<TooltipState | null>(null);
  const [autoRotate, setAutoRotate] = useState(false);
  const autoRotateRef = useRef(false);
  const hoveredRef = useRef<THREE.Mesh | null>(null);
  const camRef = useRef<{ theta: number; phi: number; radius: number } | null>(null);
  const grewRef = useRef(false);
  const { theme } = useTheme();

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount || data.length === 0) return;

    const dark = theme === "dark";
    const gridColor = dark ? 0x3f4a63 : 0xd7dbe3;
    const labelColor = dark ? "#94a3b8" : "#6b7280";

    const n = data.length;
    const pairStep = 2.3;
    const total = Math.max(n * pairStep, 6);
    const startX = n === 1 ? 0 : -((n - 1) * pairStep) / 2;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
    const half = Math.max(total / 2, 3);

    const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true });
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    mount.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.target.set(0, 1.4, 0);
    controls.minDistance = 4;
    controls.maxDistance = 40;
    controls.maxPolarAngle = Math.PI / 2.05;

    const initOffset = new THREE.Vector3(half + 2.5, 5.5, half + 2.5);
    const initRadius = initOffset.length();
    const initPhi = Math.acos(initOffset.y / initRadius);
    const prevCam = camRef.current;
    const sph = new THREE.Spherical(
      prevCam?.radius ?? initRadius,
      prevCam?.phi ?? initPhi,
      prevCam?.theta ?? Math.PI / 4
    );
    const camPos = new THREE.Vector3().setFromSpherical(sph);
    camera.position.set(
      controls.target.x + camPos.x,
      controls.target.y + camPos.y,
      controls.target.z + camPos.z
    );

    const ambient = new THREE.AmbientLight(0xffffff, 0.85);
    scene.add(ambient);
    const key = new THREE.DirectionalLight(0xffffff, 1.1);
    key.position.set(half, 8, half);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0xffffff, 0.35);
    fill.position.set(-half, 4, -half);
    scene.add(fill);

    const grid = new THREE.GridHelper(total + 2, Math.round((total + 2) / 2), gridColor, gridColor);
    scene.add(grid);

    const labelCleanup: { texture: THREE.Texture; material: THREE.Material }[] = [];
    const makeSprite = (text: string, color: string, scale: [number, number]) => {
      const canvas = document.createElement("canvas");
      canvas.width = 256;
      canvas.height = 64;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.font = "600 30px Inter, system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = color;
        ctx.fillText(text, 128, 32);
      }
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.minFilter = THREE.LinearFilter;
      const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false, sizeAttenuation: true });
      const sprite = new THREE.Sprite(material);
      sprite.scale.set(scale[0], scale[1], 1);
      labelCleanup.push({ texture, material });
      return sprite;
    };

    const makeBadge = (text: string, color: string, scale: [number, number]) => {
      const canvas = document.createElement("canvas");
      canvas.width = 256;
      canvas.height = 88;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const radius = 22;
        ctx.beginPath();
        ctx.moveTo(radius, 0);
        ctx.arcTo(canvas.width - radius, 0, canvas.width - radius, canvas.height, radius);
        ctx.arcTo(canvas.width - radius, canvas.height, radius, canvas.height, radius);
        ctx.arcTo(0, canvas.height, 0, radius, radius);
        ctx.arcTo(0, 0, radius, 0, radius);
        ctx.closePath();
        ctx.fillStyle = color;
        ctx.fill();
        ctx.strokeStyle = "rgba(255,255,255,0.5)";
        ctx.lineWidth = 5;
        ctx.stroke();
        ctx.font = "800 42px Inter, system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = "#0b1220";
        ctx.fillText(text, canvas.width / 2, canvas.height / 2 + 2);
      }
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.minFilter = THREE.LinearFilter;
      const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false, sizeAttenuation: true });
      const sprite = new THREE.Sprite(material);
      sprite.scale.set(scale[0], scale[1], 1);
      labelCleanup.push({ texture, material });
      return sprite;
    };

    [0, 25, 50, 75, 100].forEach((v) => {
      const sprite = makeSprite(`${v}%`, labelColor, [0.8, 0.22]);
      sprite.position.set(startX - 1.2, (v / 100) * MAX_H, 0.6);
      scene.add(sprite);
    });

    const points = data.map((d, i) => ({
      x: n === 1 ? 0 : startX + i * pairStep,
      y: (Math.max(d.rate, 0) / 100) * MAX_H,
      day: d.day,
      rate: d.rate,
    }));

    const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(p.x, p.y, 0)));

    const cleaner: Array<() => void> = [];

    const tubeMat = new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      uniforms: { uProgress: { value: grewRef.current ? 1 : 0 }, uColor: { value: new THREE.Color(0x4ade80) }, uGlow: { value: new THREE.Color(0xeafff2) } },
    });
    const tubeGeo = new THREE.TubeGeometry(curve, 90, 0.14, 10, false);
    const tube = new THREE.Mesh(tubeGeo, tubeMat);
    scene.add(tube);
    cleaner.push(() => {
      tubeGeo.dispose();
      tubeMat.dispose();
    });

    const rateColor = (rate: number) =>
      rate >= 80 ? "#22c55e" : rate >= 60 ? "#f59e0b" : "#ef4444";

    const markers: THREE.Mesh[] = [];
    const rings: THREE.Mesh[] = [];
    const ringMaterials: THREE.MeshBasicMaterial[] = [];
    const ringActivated: number[] = [];

    points.forEach((p) => {
      const markerGeo = new THREE.SphereGeometry(0.2, 20, 20);
      const markerMat = new THREE.MeshStandardMaterial({
        color: rateColor(p.rate),
        roughness: 0.35,
        metalness: 0.2,
        emissive: rateColor(p.rate),
        emissiveIntensity: 0.55,
      });
      const marker = new THREE.Mesh(markerGeo, markerMat);
      marker.position.set(p.x, p.y, 0);
      marker.userData = { day: p.day, value: p.rate };
      marker.scale.setScalar(grewRef.current ? 1 : 0.001);
      scene.add(marker);
      markers.push(marker);
      cleaner.push(() => {
        markerGeo.dispose();
        markerMat.dispose();
      });

      const ringGeo = new THREE.TorusGeometry(0.34, 0.03, 8, 40);
      const ringMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.position.set(p.x, p.y, 0);
      ring.scale.setScalar(0.01);
      scene.add(ring);
      rings.push(ring);
      ringMaterials.push(ringMat);
      ringActivated.push(0);
      cleaner.push(() => {
        ringGeo.dispose();
        ringMat.dispose();
      });

      const dayLabel = makeSprite(p.day, labelColor, [Math.max(0.9, p.day.length * 0.22), 0.3]);
      dayLabel.position.set(p.x, -0.24, 0.55);
      scene.add(dayLabel);
      const valLabel = makeBadge(`${Math.round(p.rate)}%`, rateColor(p.rate), [1.25, 0.44]);
      valLabel.position.set(p.x, p.y + 0.62, 0.55);
      scene.add(valLabel);
    });

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const canvas = renderer.domElement;

    const onPointerMove = (ev: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      pointer.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const hit = raycaster.intersectObjects(markers)[0];
      if (hit) {
        const mesh = hit.object as THREE.Mesh;
        const ud = mesh.userData as { day: string; value: number };
        if (hoveredRef.current !== mesh) {
          if (hoveredRef.current) {
            (hoveredRef.current.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.55;
            hoveredRef.current.scale.setScalar(1);
          }
          hoveredRef.current = mesh;
        }
        (mesh.material as THREE.MeshStandardMaterial).emissiveIntensity = 1.4;
        mesh.scale.setScalar(1.35);
        setTip({ x: ev.clientX, y: ev.clientY, day: ud.day, value: Math.round(ud.value) });
      } else {
        if (hoveredRef.current) {
          (hoveredRef.current.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.55;
          hoveredRef.current.scale.setScalar(1);
          hoveredRef.current = null;
        }
        setTip(null);
      }
    };
    const onPointerLeave = () => {
      setTip(null);
      if (hoveredRef.current) {
        (hoveredRef.current.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.55;
        hoveredRef.current.scale.setScalar(1);
        hoveredRef.current = null;
      }
    };
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerleave", onPointerLeave);

    const spin = () => {
      sph.setFromVector3(camera.position.clone().sub(controls.target));
      sph.theta += ROT_STEP;
      camRef.current = { theta: sph.theta, phi: sph.phi, radius: sph.radius };
      const dir = new THREE.Vector3().setFromSpherical(sph);
      camera.position.set(
        controls.target.x + dir.x,
        controls.target.y + dir.y,
        controls.target.z + dir.z
      );
    };

    let raf = 0;
    const entStart = performance.now();
    const THRESHOLD = (i: number) => (i + 1) / n;

    const frame = () => {
      raf = requestAnimationFrame(frame);
      const elapsed = performance.now() - entStart;
      const drawT = grewRef.current ? 1 : Math.min(1, elapsed / DRAW_DUR);
      tubeMat.uniforms.uProgress.value = drawT;
      if (!grewRef.current) {
        markers.forEach((m, i) => {
          const reached = drawT >= THRESHOLD(i);
          if (reached) {
            const local = Math.max(0, elapsed - THRESHOLD(i) * DRAW_DUR);
            const t = Math.min(1, local / MARK_DUR);
            m.scale.setScalar(Math.max(0.001, 1 - Math.pow(1 - t, 3)));
            if (ringActivated[i] === 0 && m.scale.x >= 0.9) ringActivated[i] = elapsed;
          } else {
            m.scale.setScalar(0.001);
          }
          if (ringActivated[i] > 0) {
            const age = elapsed - ringActivated[i];
            const rt = Math.min(1, age / RING_DUR);
            rings[i].scale.setScalar(0.3 + 1.7 * rt);
            ringMaterials[i].opacity = Math.max(0, 1 - rt);
          }
        });

        if (drawT >= 1) {
          grewRef.current = true;
          rings.forEach((r) => r.scale.setScalar(0.01));
          ringMaterials.forEach((rm) => (rm.opacity = 0));
        }
      }
      if (autoRotateRef.current) {
        spin();
      }
      controls.update();
      sph.setFromVector3(camera.position.clone().sub(controls.target));
      camRef.current = { theta: sph.theta, phi: sph.phi, radius: sph.radius };
      renderer.render(scene, camera);
    };
    frame();

    const resize = () => {
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      renderer.setSize(w, h);
      camera.aspect = w / Math.max(h, 1);
      camera.updateProjectionMatrix();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(mount);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerleave", onPointerLeave);
      controls.dispose();
      cleaner.forEach((fn) => fn());
      labelCleanup.forEach(({ texture, material }) => {
        texture.dispose();
        material.dispose();
      });
      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose();
        }
      });
      renderer.dispose();
      mount.removeChild(renderer.domElement);
    };
  }, [data, theme]);

  if (data.length === 0) {
    return <div className={styles.empty}>No trend data to display.</div>;
  }

  return (
    <div className={styles.wrap}>
      <div ref={mountRef} className={styles.canvas} />
      <div className={styles.toolbar}>
        {toolbar}
        <button
          type="button"
          className={`${styles.rotateBtn} ${autoRotate ? styles.rotateBtnActive : ""}`}
          onClick={() => {
            autoRotateRef.current = !autoRotateRef.current;
            setAutoRotate(autoRotateRef.current);
          }}
          aria-pressed={autoRotate}
        >
          {autoRotate ? "Stop rotate" : "Auto-rotate"}
        </button>
      </div>
      {tip && (
        <div className={styles.tooltip} style={{ left: tip.x, top: tip.y }}>
          <span className={styles.tooltipTitle}>{tip.day}</span>
          <div className={styles.tooltipRow}>
            <span className={styles.tooltipDot} style={{ background: "#22c55e" }} />
            <span className={styles.tooltipName}>Attendance</span>
            <span className={styles.tooltipValue}>{tip.value}%</span>
          </div>
        </div>
      )}
    </div>
  );
}

type ThreeDTrendOverlayProps = {
  data: TrendBar[];
  onClose: () => void;
  title?: string;
};

export function ThreeDTrendOverlay({ data, onClose, title }: ThreeDTrendOverlayProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.overlayCard} onClick={(e) => e.stopPropagation()}>
        <div className={styles.overlayHeader}>
          <h4>{title ?? "Daily Attendance Trend — 3D View"}</h4>
          <button type="button" className={styles.overlayClose} onClick={onClose} aria-label="Close 3D view">
            ×
          </button>
        </div>
        <ThreeDTrendChart data={data} />
        <p className={styles.overlayHint}>Drag to rotate · Scroll to zoom · Hover a marker for details</p>
      </div>
    </div>
  );
}