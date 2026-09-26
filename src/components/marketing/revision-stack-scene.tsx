"use client";

import { useEffect, useMemo, useRef, type RefObject } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

const SHEET_W = 3.2;
const SHEET_H = 4;
const TEXTURE_W = 1000;
const TEXTURE_H = 1250;
const INK = "#102b38";
const PAPER = "#fbf8f0";
const CORAL = "#ff765f";
const LIME = "#bceba8";
const FONT = "Arial, Helvetica, sans-serif";
const MONO = '"SFMono-Regular", Consolas, "Liberation Mono", monospace';

type SheetSpec = {
  version: number;
  value: string;
  status: string;
  statusColor: string;
  superseded: boolean;
  // Resting pose once the stack has fanned out.
  position: [number, number, number];
  rotation: [number, number, number];
};

const sheets: SheetSpec[] = [
  {
    version: 1,
    value: "+520 €",
    status: "ЗАМЕНЕНА",
    statusColor: "#dfe3df",
    superseded: true,
    position: [-1.55, 0.62, -1.5],
    rotation: [0.02, 0.32, 0.13],
  },
  {
    version: 2,
    value: "+410 €",
    status: "ЗАМЕНЕНА",
    statusColor: "#dfe3df",
    superseded: true,
    position: [-0.78, 0.3, -0.75],
    rotation: [0.01, 0.18, 0.06],
  },
  {
    version: 3,
    value: "+384 €",
    status: "ИЗПРАТЕНА",
    statusColor: "#fee8a5",
    superseded: false,
    position: [0, 0, 0],
    rotation: [0, 0.04, -0.035],
  },
];

function roundedRectShape(width: number, height: number, radius: number) {
  const shape = new THREE.Shape();
  const x = -width / 2;
  const y = -height / 2;
  shape.moveTo(x + radius, y);
  shape.lineTo(x + width - radius, y);
  shape.quadraticCurveTo(x + width, y, x + width, y + radius);
  shape.lineTo(x + width, y + height - radius);
  shape.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  shape.lineTo(x + radius, y + height);
  shape.quadraticCurveTo(x, y + height, x, y + height - radius);
  shape.lineTo(x, y + radius);
  shape.quadraticCurveTo(x, y, x + radius, y);
  return shape;
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  fill: string,
) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fillStyle = fill;
  ctx.fill();
}

function text(
  ctx: CanvasRenderingContext2D,
  value: string,
  x: number,
  y: number,
  font: string,
  color: string,
  align: CanvasTextAlign = "left",
) {
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.fillText(value, x, y);
}

function drawSheet(spec: SheetSpec) {
  const canvas = document.createElement("canvas");
  canvas.width = TEXTURE_W;
  canvas.height = TEXTURE_H;
  const ctx = canvas.getContext("2d")!;

  roundRect(ctx, 0, 0, TEXTURE_W, TEXTURE_H, 70, "#18394c");
  roundRect(ctx, 26, 26, TEXTURE_W - 52, TEXTURE_H - 52, 50, PAPER);

  text(
    ctx,
    `ПР-042 / v${spec.version}`,
    90,
    140,
    `700 30px ${MONO}`,
    "#e86650",
  );
  text(ctx, "Къща · кв. Бояна", 90, 225, `900 64px ${FONT}`, INK);

  ctx.font = `700 26px ${FONT}`;
  const pillWidth = ctx.measureText(spec.status).width + 56;
  roundRect(
    ctx,
    TEXTURE_W - 90 - pillWidth,
    100,
    pillWidth,
    56,
    28,
    spec.statusColor,
  );
  text(
    ctx,
    spec.status,
    TEXTURE_W - 90 - pillWidth / 2,
    137,
    `700 26px ${FONT}`,
    "#73570d",
    "center",
  );

  ctx.fillStyle = "rgba(16,43,56,0.12)";
  ctx.fillRect(90, 285, TEXTURE_W - 180, 3);

  roundRect(ctx, 90, 330, 470, 480, 40, "#dceeea");
  text(ctx, "ПОСЛЕДНА ПРОМЯНА", 130, 395, `700 24px ${MONO}`, INK);
  ["Двата контакта", "се местят", "с 40 см."].forEach((line, index) =>
    text(ctx, line, 130, 600 + index * 62, `900 54px ${FONT}`, INK),
  );
  text(ctx, `${spec.value} · +2 ДНИ`, 130, 770, `400 26px ${MONO}`, "#53706f");

  roundRect(ctx, 590, 330, 320, 225, 40, spec.superseded ? "#f1c9bf" : CORAL);
  text(ctx, "ВЕРСИЯ", 625, 390, `700 24px ${MONO}`, INK);
  text(ctx, `v${spec.version}`, 625, 510, `900 120px ${FONT}`, INK);

  roundRect(ctx, 590, 585, 320, 225, 40, spec.superseded ? "#d7eccd" : LIME);
  text(ctx, "СТОЙНОСТ", 625, 645, `700 24px ${MONO}`, INK);
  text(ctx, spec.value, 625, 750, `900 72px ${FONT}`, INK);

  [
    "Към оферта ОФ-017",
    "Причина: искане на клиента",
    "Нов краен срок: 14.10",
  ].forEach((line, index) => {
    const y = 905 + index * 92;
    ctx.beginPath();
    ctx.arc(115, y - 10, 22, 0, Math.PI * 2);
    ctx.fillStyle = "#dcf3d1";
    ctx.fill();
    text(ctx, "✓", 115, y, `900 26px ${FONT}`, "#16916d", "center");
    text(ctx, line, 160, y, `700 34px ${FONT}`, INK);
    if (index < 2) {
      ctx.fillStyle = "rgba(16,43,56,0.08)";
      ctx.fillRect(90, y + 36, TEXTURE_W - 180, 2);
    }
  });

  if (spec.superseded) {
    // Old versions stay readable but visibly retired.
    ctx.fillStyle = "rgba(244,239,228,0.42)";
    ctx.beginPath();
    ctx.roundRect(26, 26, TEXTURE_W - 52, TEXTURE_H - 52, 50);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

function drawSeal() {
  const size = 512;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const center = size / 2;

  ctx.beginPath();
  ctx.arc(center, center, center - 6, 0, Math.PI * 2);
  ctx.fillStyle = CORAL;
  ctx.fill();
  ctx.lineWidth = 8;
  ctx.strokeStyle = INK;
  ctx.beginPath();
  ctx.arc(center, center, center - 40, 0, Math.PI * 2);
  ctx.stroke();

  text(ctx, "ОДОБРЕНО", center, 170, `900 50px ${FONT}`, INK, "center");
  ctx.lineWidth = 30;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(center - 72, center + 6);
  ctx.lineTo(center - 18, center + 58);
  ctx.lineTo(center + 82, center - 48);
  ctx.stroke();
  text(ctx, "14:32 · КОД ✓", center, 392, `700 34px ${MONO}`, INK, "center");

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

const CAMERA_FOV = 36;
const CAMERA_Z = 9.2;
// Widest the fanned stack reaches from the view centre (v1's left edge when the pointer
// swings it outward), plus a margin, measured at the sheets' depth.
const STACK_HALF_WIDTH = 3;

/** Pull the camera back in tall, narrow containers so the oldest sheet is never cut off. */
function FitCamera() {
  useFrame(({ camera, size }) => {
    if (!size.width || !size.height) return;
    const halfTan = Math.tan(THREE.MathUtils.degToRad(CAMERA_FOV / 2));
    const z = Math.max(
      CAMERA_Z,
      STACK_HALF_WIDTH / (halfTan * (size.width / size.height)),
    );
    if (camera.position.z !== z) camera.position.z = z;
  });

  return null;
}

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
const clamp01 = (t: number) => Math.min(1, Math.max(0, t));

function Stack({ pointer }: { pointer: RefObject<{ x: number; y: number }> }) {
  const root = useRef<THREE.Group>(null);
  const sheetRefs = useRef<(THREE.Group | null)[]>([]);
  const seal = useRef<THREE.Group>(null);
  const start = useRef<number | null>(null);

  const resources = useMemo(() => {
    const shape = roundedRectShape(SHEET_W, SHEET_H, 0.22);
    const body = new THREE.ExtrudeGeometry(shape, {
      depth: 0.05,
      bevelEnabled: true,
      bevelSize: 0.012,
      bevelThickness: 0.012,
      bevelSegments: 2,
      curveSegments: 10,
    });
    body.translate(0, 0, -0.062);
    const face = new THREE.PlaneGeometry(SHEET_W, SHEET_H);
    const textures = sheets.map(drawSheet);
    const sealTexture = drawSeal();
    const sealBody = new THREE.CylinderGeometry(0.62, 0.62, 0.09, 64);
    const sealFace = new THREE.CircleGeometry(0.62, 64);
    return { body, face, textures, sealTexture, sealBody, sealFace };
  }, []);

  useEffect(
    () => () => {
      resources.body.dispose();
      resources.face.dispose();
      resources.textures.forEach((texture) => texture.dispose());
      resources.sealTexture.dispose();
      resources.sealBody.dispose();
      resources.sealFace.dispose();
    },
    [resources],
  );

  useFrame((state, delta) => {
    if (start.current === null) start.current = state.clock.elapsedTime;
    const elapsed = state.clock.elapsedTime - start.current;
    const fan = easeOutCubic(clamp01((elapsed - 0.15) / 1.4));

    sheets.forEach((spec, index) => {
      const sheet = sheetRefs.current[index];
      if (!sheet) return;
      // Stacked pose: every sheet sits just behind the current one.
      const stackedZ = -0.08 * (sheets.length - 1 - index);
      sheet.position.set(
        spec.position[0] * fan,
        spec.position[1] * fan,
        stackedZ + (spec.position[2] - stackedZ) * fan,
      );
      sheet.rotation.set(
        spec.rotation[0] * fan,
        spec.rotation[1] * fan,
        spec.rotation[2] * fan + (1 - fan) * 0.06,
      );
    });

    if (seal.current) {
      const drop = clamp01((elapsed - 1.55) / 0.55);
      const eased = easeOutCubic(drop);
      seal.current.visible = drop > 0;
      seal.current.position.z = 0.12 + (1 - eased) * 1.8;
      seal.current.scale.setScalar(0.92 + 0.08 * eased);
      seal.current.rotation.z = -0.28 + (1 - eased) * 0.2;
    }

    if (root.current) {
      const target = pointer.current ?? { x: 0, y: 0 };
      const bob = Math.sin(state.clock.elapsedTime * 0.8) * 0.06;
      const damping = 1 - Math.exp(-delta * 3.2);
      root.current.rotation.y +=
        (target.x * 0.32 - 0.22 - root.current.rotation.y) * damping;
      root.current.rotation.x +=
        (-target.y * 0.2 + 0.06 - root.current.rotation.x) * damping;
      root.current.position.y += (bob - root.current.position.y) * damping;
    }
  });

  return (
    <group ref={root} position={[0.6, 0, 0]}>
      {sheets.map((spec, index) => (
        <group
          key={spec.version}
          ref={(node) => {
            sheetRefs.current[index] = node;
          }}
          position={[0, 0, -0.08 * (sheets.length - 1 - index)]}
          rotation={[0, 0, 0.06]}
        >
          <mesh geometry={resources.body}>
            {spec.superseded ? (
              // Plain translucency: transmission would add a full extra render pass every frame.
              <meshStandardMaterial
                color="#dfeeee"
                roughness={0.3}
                transparent
                opacity={0.72}
              />
            ) : (
              <meshStandardMaterial color="#18394c" roughness={0.6} />
            )}
          </mesh>
          <mesh geometry={resources.face} position={[0, 0, 0.002]}>
            <meshStandardMaterial
              map={resources.textures[index]}
              transparent
              opacity={spec.superseded ? 0.78 : 1}
              roughness={0.85}
            />
          </mesh>
          {!spec.superseded && (
            <group ref={seal} position={[1.12, -1.28, 0.12]} visible={false}>
              <mesh
                geometry={resources.sealBody}
                rotation={[Math.PI / 2, 0, 0]}
              >
                <meshStandardMaterial color="#e5634d" roughness={0.45} />
              </mesh>
              <mesh geometry={resources.sealFace} position={[0, 0, 0.047]}>
                <meshStandardMaterial
                  map={resources.sealTexture}
                  roughness={0.5}
                />
              </mesh>
            </group>
          )}
        </group>
      ))}
    </group>
  );
}

export default function RevisionStackScene({
  active,
  onReady,
}: {
  active: boolean;
  onReady: () => void;
}) {
  const pointer = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const handleMove = (event: PointerEvent) => {
      pointer.current = {
        x: (event.clientX / window.innerWidth) * 2 - 1,
        y: (event.clientY / window.innerHeight) * 2 - 1,
      };
    };
    window.addEventListener("pointermove", handleMove, { passive: true });
    return () => window.removeEventListener("pointermove", handleMove);
  }, []);

  return (
    <Canvas
      aria-hidden="true"
      dpr={[1, 1.5]}
      frameloop={active ? "always" : "never"}
      camera={{ position: [0, 0, CAMERA_Z], fov: CAMERA_FOV }}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      onCreated={() => onReady()}
      style={{ pointerEvents: "none" }}
    >
      <ambientLight intensity={1.35} />
      <directionalLight position={[3, 4, 6]} intensity={1.6} />
      <directionalLight
        position={[-4, -2, 3]}
        intensity={0.45}
        color="#c5e3e5"
      />
      <FitCamera />
      <Stack pointer={pointer} />
    </Canvas>
  );
}
