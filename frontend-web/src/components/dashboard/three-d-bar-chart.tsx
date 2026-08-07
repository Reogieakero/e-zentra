"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { useTheme } from "@/components/theme-provider";
import { CustomSelect } from "@/components/ui/select";
import styles from "./three-d-bar-chart.module.css";

export interface SectionBar {
  name: string;
  present: number;
  absent: number;
  late: number;
  excused: number;
}

type View = "presentAbsent" | "lateExcused";

interface ThreeDBarChartProps {
  data: SectionBar[];
  view: View;
  toolbar?: ReactNode;
}

interface TooltipState {
  x: number;
  y: number;
  section: string;
  rows: { label: string; value: number; color: string }[];
}

const METRIC_COLORS: Record<string, string> = {
  present: "#16a34a",
  absent: "#ef4444",
  late: "#f59e0b",
  excused: "#8b5cf6",
};

const MAX_BAR_H = 4;

export default function ThreeDBarChart({ data, view, toolbar }: ThreeDBarChartProps) {
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
    const pairStep = 2.6;
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
    controls.target.set(0, 1.5, 0);
    controls.minDistance = 4;
    controls.maxDistance = 40;
    controls.maxPolarAngle = Math.PI / 2.05;

    const initialOffset = new THREE.Vector3(half + 2.5, 5.5, half + 2.5);
    const initialRadius = initialOffset.length();
    const initialPhi = Math.acos(initialOffset.y / initialRadius);
    const prevCam = camRef.current;
    const radius = prevCam?.radius ?? initialRadius;
    const phi = prevCam?.phi ?? initialPhi;
    const theta = prevCam?.theta ?? Math.PI / 4;
    const startSph = new THREE.Spherical(radius, phi, theta);
    const startPos = new THREE.Vector3().setFromSpherical(startSph);
    camera.position.set(controls.target.x + startPos.x, controls.target.y + startPos.y, controls.target.z + startPos.z);

    const ambient = new THREE.AmbientLight(0xffffff, 0.75);
    scene.add(ambient);
    const key = new THREE.DirectionalLight(0xffffff, 1.1);
    key.position.set(half, 8, half);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0xffffff, 0.35);
    fill.position.set(-half, 4, -half);
    scene.add(fill);

    const grid = new THREE.GridHelper(total + 2, Math.round((total + 2) / 2), gridColor, gridColor);
    scene.add(grid);

    const barGroup = new THREE.Group();
    scene.add(barGroup);

    const labelCleanup: { texture: THREE.Texture; material: THREE.Material }[] = [];
    const makeTextSprite = (text: string, color: string, scale: [number, number]) => {
      const canvas = document.createElement("canvas");
      canvas.width = 256;
      canvas.height = 64;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.font = "600 28px Inter, system-ui, sans-serif";
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
    [0, 25, 50, 75, 100].forEach((v) => {
      const sprite = makeTextSprite(`${Math.round(v)}%`, labelColor, [0.9, 0.24]);
      sprite.position.set(startX - 1.35, (v / 100) * MAX_BAR_H, 0.6);
      scene.add(sprite);
    });

    const barMeshes: THREE.Mesh[] = [];
    const barsGroup = barGroup;
    data.forEach((section, i) => {
      const cx = n === 1 ? 0 : startX + i * pairStep;
      const metrics: { key: "present" | "absent" | "late" | "excused"; value: number; offset: number }[] =
        view === "presentAbsent"
          ? [
              { key: "present", value: section.present, offset: -0.55 },
              { key: "absent", value: section.absent, offset: 0.55 },
            ]
          : [
              { key: "late", value: section.late, offset: -0.55 },
              { key: "excused", value: section.excused, offset: 0.55 },
            ];
      metrics.forEach(({ key, value, offset }) => {
        const h = Math.max((value / 100) * MAX_BAR_H, 0.02);
        const geo = new THREE.BoxGeometry(0.7, h, 0.7);
        geo.translate(0, h / 2, 0);
        const color = METRIC_COLORS[key];
        const mat = new THREE.MeshStandardMaterial({
          color,
          roughness: 0.45,
          metalness: 0.15,
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(cx + offset, 0, 0);
        mesh.userData = { sectionIndex: i, metric: key };
        mesh.scale.y = grewRef.current ? 1 : 0.01;
        barsGroup.add(mesh);
        barMeshes.push(mesh);
      });

      const sectionSprite = makeTextSprite(section.name, labelColor, [
        Math.max(0.9, section.name.length * 0.22),
        0.3,
      ]);
      sectionSprite.position.set(cx, -0.12, 0.55);
      scene.add(sectionSprite);
    });

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const canvas = renderer.domElement;
    const spherical = new THREE.Spherical();
    const rotDir = new THREE.Vector3();
    const ROT_STEP = 0.008;

    const spin = () => {
      spherical.setFromVector3(camera.position.clone().sub(controls.target));
      spherical.theta += ROT_STEP;
      camRef.current = { theta: spherical.theta, phi: spherical.phi, radius: spherical.radius };
      rotDir.setFromSpherical(spherical);
      camera.position.set(
        controls.target.x + rotDir.x,
        controls.target.y + rotDir.y,
        controls.target.z + rotDir.z,
      );
    };

    const onPointerMove = (ev: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      pointer.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(barMeshes);
      const hit = hits.length ? (hits[0].object as THREE.Mesh) : undefined;

      if (hoveredRef.current && hoveredRef.current !== hit) {
        const mat = hoveredRef.current.material as THREE.MeshStandardMaterial;
        mat.emissive.setHex(0x000000);
        hoveredRef.current = null;
      }
      if (hit) {
        const mat = hit.material as THREE.MeshStandardMaterial;
        mat.emissive.setHex((mat.color as THREE.Color).getHex());
        hoveredRef.current = hit;
        const section = data[hit.userData.sectionIndex as number];
        const rows =
          view === "presentAbsent"
            ? [
                { label: "Present", value: section.present, color: METRIC_COLORS.present },
                { label: "Absent", value: section.absent, color: METRIC_COLORS.absent },
              ]
            : [
                { label: "Late", value: section.late, color: METRIC_COLORS.late },
                { label: "Excused", value: section.excused, color: METRIC_COLORS.excused },
              ];
        setTip({ x: ev.clientX, y: ev.clientY, section: section.name, rows });
        canvas.style.cursor = "pointer";
      } else {
        setTip(null);
        canvas.style.cursor = "grab";
      }
    };
    const onPointerLeave = () => {
      setTip(null);
      if (hoveredRef.current) {
        (hoveredRef.current.material as THREE.MeshStandardMaterial).emissive.setHex(0x000000);
        hoveredRef.current = null;
      }
    };
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerleave", onPointerLeave);

    let raf = 0;
    const animate = () => {
      raf = requestAnimationFrame(animate);
      if (!grewRef.current) {
        let allGrown = true;
        for (const m of barMeshes) {
          if (m.scale.y < 1) {
            m.scale.y = Math.min(1, m.scale.y + 0.06);
            allGrown = false;
          }
        }
        if (allGrown) grewRef.current = true;
      }
      if (autoRotateRef.current) {
        spin();
      }
      controls.update();
      spherical.setFromVector3(camera.position.clone().sub(controls.target));
      camRef.current = { theta: spherical.theta, phi: spherical.phi, radius: spherical.radius };
      renderer.render(scene, camera);
    };
    animate();

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
      barMeshes.forEach((m) => {
        m.geometry.dispose();
        (m.material as THREE.Material).dispose();
      });
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
  }, [data, view, theme]);

  if (data.length === 0) {
    return <div className={styles.empty}>No section data to display.</div>;
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
          <span className={styles.tooltipTitle}>{tip.section}</span>
          {tip.rows.map((row) => (
            <div key={row.label} className={styles.tooltipRow}>
              <span className={styles.tooltipDot} style={{ background: row.color }} />
              <span className={styles.tooltipName}>{row.label}</span>
              <span className={styles.tooltipValue}>{row.value}%</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

type ThreeDOverlayProps = {
  data: SectionBar[];
  initialView: View;
  onClose: () => void;
};

export function ThreeDOverlay({ data, initialView, onClose }: ThreeDOverlayProps) {
  const [view, setView] = useState<View>(initialView);

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
          <h4>Section Performance — 3D View</h4>
          <button type="button" className={styles.overlayClose} onClick={onClose} aria-label="Close 3D view">
            ×
          </button>
        </div>
        <ThreeDBarChart
          data={data}
          view={view}
          toolbar={
            <CustomSelect
              id="overlay-view"
              value={view}
              options={[
                { value: "presentAbsent", label: "Present / Absent" },
                { value: "lateExcused", label: "Late / Excused" },
              ]}
              onChange={(v) => setView(v as View)}
              className={styles.overlayViewSelect}
              size="sm"
              showCheck={false}
            />
          }
        />
        <p className={styles.overlayHint}>Drag to rotate · Scroll to zoom · Hover a bar for details</p>
      </div>
    </div>
  );
}
