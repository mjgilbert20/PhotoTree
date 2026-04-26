import React, { useMemo, useState, useEffect, useRef } from 'react';
import { Stage, Layer, Group, Circle, Image as KonvaImage, Line, Path } from 'react-konva';
import { Leaf, LeafStatus, Position } from '../types';
import useImage from 'use-image';
 
interface TreeCanvasProps {
  width: number;
  height: number;
  treeLevel: number;
  leaves: Leaf[];
  onRakeLeaf: (leafId: string) => void;
  onSharePicture: (pos: Position, branchIndex: number) => void;
}
 
interface LeafSlotDef {
  x: number;       // center x in image coords
  y: number;       // center y in image coords
  rotation: number; // degrees, axis-aligned with the leaf
  width: number;   // bounding box width in image px
  height: number;  // bounding box height in image px
}
 
// Source image is /tree.png in the public/ folder. Dimensions:
const IMG_W = 1408;
const IMG_H = 768;
 
// ─── Leaf slots ──────────────────────────────────────────────────────────────
// Auto-detected leaf positions in the source image (1408x768). Each entry is
// the center, rotation, and bounding-box of one painted leaf. Ordered top-of-
// tree first so lower growth levels reveal upper leaves first.
const ALL_LEAF_SLOTS: LeafSlotDef[] = [
  { x: 651.1, y: 209.2, rotation: 49, width: 42, height: 45 },
  { x: 709.1, y: 211.2, rotation: -63, width: 40, height: 56 },
  { x: 856.8, y: 245.4, rotation: -68, width: 27, height: 44 },
  { x: 736.8, y: 260.6, rotation: -44, width: 50, height: 49 },
  { x: 888.7, y: 271.7, rotation: -19, width: 53, height: 33 },
  { x: 636.9, y: 280.3, rotation: 17, width: 63, height: 39 },
  { x: 499.2, y: 306.5, rotation: 74, width: 36, height: 59 },
  { x: 831.9, y: 314.7, rotation: -24, width: 43, height: 29 },
  { x: 906.0, y: 331.6, rotation: -10, width: 66, height: 36 },
  { x: 768.8, y: 336.5, rotation: 74, width: 29, height: 49 },
  { x: 830.9, y: 358.7, rotation: -45, width: 38, height: 39 },
  { x: 623.2, y: 361.5, rotation: -51, width: 34, height: 39 },
  { x: 572.6, y: 362.8, rotation: 58, width: 40, height: 53 },
  { x: 478.2, y: 363.7, rotation: 20, width: 58, height: 35 },
  { x: 882.5, y: 395.0, rotation: -6, width: 63, height: 31 },
  { x: 974.8, y: 401.1, rotation: -79, width: 29, height: 53 },
  { x: 477.9, y: 414.3, rotation: -6, width: 62, height: 34 },
  { x: 853.1, y: 427.5, rotation: 31, width: 41, height: 31 },
  { x: 566.7, y: 434.1, rotation: -5, width: 48, height: 27 },
  { x: 932.3, y: 434.3, rotation: -76, width: 28, height: 48 },
  { x: 1005.4, y: 437.7, rotation: -22, width: 54, height: 33 },
  { x: 425.3, y: 444.9, rotation: 72, width: 29, height: 49 },
  { x: 488.1, y: 468.0, rotation: -31, width: 43, height: 29 },
  { x: 785.8, y: 476.0, rotation: 83, width: 36, height: 45 },
  { x: 836.6, y: 486.2, rotation: -38, width: 51, height: 44 },
  { x: 425.8, y: 493.2, rotation: 7, width: 45, height: 23 },
  { x: 981.2, y: 493.8, rotation: 0, width: 65, height: 36 },
  { x: 450.8, y: 533.7, rotation: -25, width: 54, height: 34 },
  { x: 948.4, y: 536.4, rotation: 24, width: 59, height: 37 },
  { x: 535.4, y: 548.7, rotation: -37, width: 52, height: 45 },
  { x: 891.5, y: 569.1, rotation: 30, width: 56, height: 39 },
];
 
const SLOTS_BY_LEVEL: Record<number, number> = {
  1: 6,
  2: 12,
  3: 18,
  4: 24,
  5: 31,
};
 
function getActiveSlots(level: number): LeafSlotDef[] {
  const lvl = Math.min(Math.max(level, 1), 5);
  const n = SLOTS_BY_LEVEL[lvl] ?? ALL_LEAF_SLOTS.length;
  return ALL_LEAF_SLOTS.slice(0, n);
}
 
// ─── Leaf colors (used when a user photo isn't loaded yet, for the slot indicator) ──
const LEAF_FILLS = [
  '#5cb84a', '#4a9e3c', '#6cc858', '#3a8a2e',
  '#85c86a', '#52ae40', '#78c460', '#3d9632',
];
const LEAF_FILLS_AUTUMN = ['#c4732a', '#e8a435', '#d4652a', '#b85a1e', '#e09530'];
 
function getLeafFill(index: number, status: LeafStatus): string {
  if (status === LeafStatus.FALLEN) return LEAF_FILLS_AUTUMN[index % LEAF_FILLS_AUTUMN.length];
  if (status === LeafStatus.GROWING) return '#c8e896';
  return LEAF_FILLS[index % LEAF_FILLS.length];
}
 
// ─── Main Component ──────────────────────────────────────────────────────────
const TreeCanvas: React.FC<TreeCanvasProps> = ({
  width, height, treeLevel, leaves, onRakeLeaf, onSharePicture,
}) => {
  const [treeImg] = useImage('/tree.png');
  const [wind, setWind] = useState(0);
  const [windPhase, setWindPhase] = useState(0);
  const rafRef = useRef<number>(0);
  const startRef = useRef(Date.now());
 
  useEffect(() => {
    const animate = () => {
      const t = (Date.now() - startRef.current) / 1000;
      // Slow gentle sway you can actually see.
      setWind(Math.sin(t * 0.22) * 0.05 + Math.sin(t * 0.45) * 0.02);
      setWindPhase(t);
      rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);
 
  const activeSlotDefs = useMemo(() => getActiveSlots(treeLevel), [treeLevel]);
 
  // Fit the tree image into the canvas, preserving aspect ratio.
  const treeScale = useMemo(
    () => Math.min(width / IMG_W, height / IMG_H),
    [width, height]
  );
  const ox = (width - IMG_W * treeScale) / 2;
  const oy = (height - IMG_H * treeScale) / 2;
 
  // Convert image-coord -> canvas-coord
  const sx = (x: number) => x * treeScale + ox;
  const sy = (y: number) => y * treeScale + oy;
 
  // Slots in canvas coordinates
  const canvasSlots = useMemo(() =>
    activeSlotDefs.map((s, i) => ({
      index: i,
      x: sx(s.x),
      y: sy(s.y),
      rotation: s.rotation,
      width: s.width * treeScale,
      height: s.height * treeScale,
    })),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [activeSlotDefs, treeScale, ox, oy]);
 
  const occupiedSlots = useMemo(() => {
    const set = new Set<number>();
    leaves.forEach(leaf => {
      if (leaf.status !== LeafStatus.RAKED) {
        const idx = leaf.branchIndex % canvasSlots.length;
        set.add(idx);
      }
    });
    return set;
  }, [leaves, canvasSlots]);
 
  return (
    <Stage width={width} height={height}>
      {/* Falling leaves — drift down behind the tree for atmosphere */}
      <Layer listening={false}>
        <FallingLeaves width={width} height={height} treeScale={treeScale} />
      </Layer>
 
      <Layer>
        {/* Background tree image */}
        {treeImg && (
          <KonvaImage
            image={treeImg}
            x={ox}
            y={oy}
            width={IMG_W * treeScale}
            height={IMG_H * treeScale}
            listening={false}
          />
        )}
 
        {/* Empty leaf slots — clickable circles centered on each leaf */}
        {canvasSlots.map((slot, i) => {
          if (occupiedSlots.has(i)) return null;
          const radius = Math.max(slot.width, slot.height) / 2 + 2;
          return (
            <Circle
              key={`slot-${i}`}
              x={slot.x}
              y={slot.y}
              radius={radius}
              fill="rgba(255, 255, 255, 0.18)"
              stroke="rgba(45, 122, 32, 0.55)"
              strokeWidth={1.4}
              dash={[4, 3]}
              onClick={() => onSharePicture({ x: slot.x, y: slot.y }, i)}
              onTap={() => onSharePicture({ x: slot.x, y: slot.y }, i)}
            />
          );
        })}
 
        {/* User photo leaves */}
        {leaves.map((leaf, leafIdx) => {
          // branchIndex is now stored as the direct slot index
          const slotIdx = leaf.branchIndex % canvasSlots.length;
          const slot = canvasSlots[slotIdx];
 
          let pos: Position;
          let leafW: number;
          let leafH: number;
          let baseRot: number;
          if (leaf.status === LeafStatus.ON_TREE || leaf.status === LeafStatus.GROWING) {
            if (slot) {
              pos = { x: slot.x, y: slot.y };
              leafW = slot.width;
              leafH = slot.height;
              baseRot = slot.rotation;
            } else {
              pos = leaf.position;
              leafW = 50 * treeScale;
              leafH = 30 * treeScale;
              baseRot = 0;
            }
          } else if (leaf.status === LeafStatus.RAKED) {
            const hash = leaf.leafId.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
            pos = { x: width * 0.2 + (hash % (width * 0.6)), y: height - 50 - (hash % 30) };
            leafW = 30 * treeScale;
            leafH = 20 * treeScale;
            baseRot = 0;
          } else {
            pos = leaf.position;
            leafW = 50 * treeScale;
            leafH = 30 * treeScale;
            baseRot = 0;
          }
 
          // Each leaf gets its own phase so they sway independently — gentle ripple.
          const sway = wind * Math.sin(windPhase + leafIdx * 0.8) * 14;
          const fill = getLeafFill(leafIdx, leaf.status);
          const rot = baseRot + sway;
 
          return (
            <LeafItem
              key={leaf.leafId}
              leaf={leaf}
              pos={pos}
              fill={fill}
              leafW={leafW}
              leafH={leafH}
              rotation={rot}
              treeScale={treeScale}
              onRake={() => onRakeLeaf(leaf.leafId)}
            />
          );
        })}
      </Layer>
    </Stage>
  );
};
 
// ─── Falling Leaves (background atmosphere) ─────────────────────────────────
// A small pool of leaves that drift down across the canvas behind the tree.
// Each leaf has its own life cycle: spawn at top → drift down with side-to-side
// wobble → fade out → despawn. New leaves spawn occasionally so there are
// always 1–3 in flight.
interface FallingLeaf {
  id: number;
  x: number;          // canvas-space x at spawn
  y: number;          // canvas-space y, integrated each frame
  vy: number;         // px/second downward
  wobbleAmp: number;  // px of horizontal sway
  wobbleFreq: number; // Hz of wobble
  wobblePhase: number;
  rotation: number;
  rotSpeed: number;   // deg/second
  color: string;
  size: number;       // half-width in canvas px
  spawnedAt: number;  // performance.now() ms
}
 
const FALLING_LEAF_COLORS = [
  // Greens (matches tree)
  '#5cb84a', '#4a9e3c', '#6cc858', '#85c86a',
  // Autumn
  '#e8a435', '#d4652a', '#c4732a', '#b85a1e', '#e09530',
];
 
const FallingLeaves: React.FC<{
  width: number;
  height: number;
  treeScale: number;
}> = ({ width, height, treeScale }) => {
  const [tick, setTick] = useState(0);
  const leavesRef = useRef<FallingLeaf[]>([]);
  const lastSpawnRef = useRef<number>(0);
  const idRef = useRef<number>(0);
  const rafRef = useRef<number>(0);
 
  useEffect(() => {
    let running = true;
    const loop = () => {
      if (!running) return;
      const now = performance.now();
      // Spawn one leaf every ~4 seconds (with some randomness)
      const spawnInterval = 3500 + Math.random() * 1500;
      if (now - lastSpawnRef.current > spawnInterval && leavesRef.current.length < 4) {
        lastSpawnRef.current = now;
        idRef.current += 1;
        const sizeBase = 8 + Math.random() * 6;
        leavesRef.current.push({
          id: idRef.current,
          x: Math.random() * width,
          y: -30,
          vy: 18 + Math.random() * 14,         // slow drift, ~18-32 px/s
          wobbleAmp: 18 + Math.random() * 22,  // gentle sideways sway
          wobbleFreq: 0.15 + Math.random() * 0.15,
          wobblePhase: Math.random() * Math.PI * 2,
          rotation: Math.random() * 360,
          rotSpeed: (Math.random() - 0.5) * 50, // slow tumble
          color: FALLING_LEAF_COLORS[Math.floor(Math.random() * FALLING_LEAF_COLORS.length)],
          size: sizeBase * Math.max(0.7, treeScale),
          spawnedAt: now,
        });
      }
 
      // Despawn leaves that have left the bottom (with margin)
      leavesRef.current = leavesRef.current.filter(l => l.y < height + 60);
 
      // Trigger a re-render
      setTick(t => t + 1);
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => {
      running = false;
      cancelAnimationFrame(rafRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [width, height, treeScale]);
 
  // Compute current per-leaf positions on each render
  const now = performance.now();
  const drawn = leavesRef.current.map(leaf => {
    const elapsed = (now - leaf.spawnedAt) / 1000; // seconds
    const y = -30 + leaf.vy * elapsed;
    leaf.y = y; // mutate so despawn filter works
    const x = leaf.x + Math.sin(leaf.wobblePhase + elapsed * leaf.wobbleFreq * Math.PI * 2) * leaf.wobbleAmp;
    const rot = leaf.rotation + leaf.rotSpeed * elapsed;
    // Fade in for first 1s, full opacity, fade out in last 1.5s before bottom
    const fadeIn = Math.min(1, elapsed / 1.0);
    const distToBottom = height - y;
    const fadeOut = Math.min(1, distToBottom / 80);
    const opacity = 0.55 * fadeIn * Math.max(0, fadeOut);
    return { ...leaf, x, y, rot, opacity };
  });
 
  // Avoid unused-tick warning
  void tick;
 
  return (
    <Group>
      {drawn.map(l => {
        const lw = l.size;
        const lh = l.size * 0.62;
        return (
          <Group key={l.id} x={l.x} y={l.y} rotation={l.rot} opacity={l.opacity}>
            <Path
              data={`M ${-lw} 0 C ${-lw * 0.6} ${-lh} ${lw * 0.6} ${-lh} ${lw} 0 C ${lw * 0.6} ${lh} ${-lw * 0.6} ${lh} ${-lw} 0 Z`}
              fill={l.color}
              strokeEnabled={false}
            />
          </Group>
        );
      })}
    </Group>
  );
};
 
// ─── Leaf Item ──────────────────────────────────────────────────────────────
// Leaves are sized to MATCH the painted leaf in the underlying image, so a
// user photo replaces (covers) the painted leaf seamlessly. Almond shape with
// the user's photo clipped inside.
const LeafItem: React.FC<{
  leaf: Leaf;
  pos: Position;
  fill: string;
  leafW: number;     // full leaf width in canvas px
  leafH: number;     // full leaf height in canvas px
  rotation: number;
  treeScale: number;
  onRake: () => void;
}> = ({ leaf, pos, fill, leafW, leafH, rotation, treeScale, onRake }) => {
  const [img] = useImage(leaf.imageUrl, 'anonymous');
  const isFallen = leaf.status === LeafStatus.FALLEN;
  const isRaked = leaf.status === LeafStatus.RAKED;
 
  if (isRaked) {
    const s = treeScale;
    return (
      <Group x={pos.x} y={pos.y}>
        {[0, 1, 2, 3, 4].map(i => (
          <Circle
            key={i}
            radius={7 * s}
            x={Math.cos((i * Math.PI * 2) / 5) * 10 * s}
            y={Math.sin((i * Math.PI * 2) / 5) * 10 * s}
            fill="#F472B6"
          />
        ))}
        <Circle radius={6 * s} fill="#FDE047" />
        {img && <KonvaImage image={img} width={12 * s} height={12 * s} x={-6 * s} y={-6 * s} cornerRadius={6 * s} />}
      </Group>
    );
  }
 
  // Half-dimensions for centering
  const lw = leafW / 2;
  const lh = leafH / 2;
 
  return (
    <Group
      x={pos.x}
      y={pos.y}
      rotation={rotation}
      draggable={isFallen}
      onDragEnd={e => {
        if (e.target.y() > window.innerHeight - 150) onRake();
        else e.target.to({ x: pos.x, y: pos.y, duration: 0.2 });
      }}
      onClick={() => { if (isFallen) onRake(); }}
      onTap={() => { if (isFallen) onRake(); }}
    >
      {/* Almond leaf body — sized to match the painted leaf underneath */}
      <Path
        data={`M ${-lw} 0 C ${-lw * 0.6} ${-lh} ${lw * 0.6} ${-lh} ${lw} 0 C ${lw * 0.6} ${lh} ${-lw * 0.6} ${lh} ${-lw} 0 Z`}
        fill={fill}
        strokeEnabled={false}
        opacity={isFallen ? 0.85 : 1}
        shadowEnabled={isFallen}
        shadowColor="rgba(0,0,0,0.18)"
        shadowBlur={10}
        shadowOffsetY={4}
      />
      {/* Subtle vein */}
      <Line
        points={[-lw * 0.85, 0, lw * 0.85, 0]}
        stroke="rgba(255,255,255,0.30)"
        strokeWidth={Math.max(0.6, 0.04 * Math.min(leafW, leafH))}
        lineCap="round"
      />
      {/* User photo, clipped into the leaf shape */}
      {img && (
        <KonvaImage
          image={img}
          width={leafW * 0.95}
          height={leafH * 1.4}
          x={-leafW * 0.475}
          y={-lh * 1.2}
          cornerRadius={lh}
          opacity={0.92}
        />
      )}
    </Group>
  );
};
 
export default TreeCanvas;