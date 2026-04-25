import React, { useMemo, useState, useEffect, useRef } from 'react';
import { Stage, Layer, Line, Circle, Group, Image as KonvaImage } from 'react-konva';
import { Leaf, LeafStatus, Position } from '../types';
import useImage from 'use-image';

interface Branch {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  thickness: number;
  angle: number;
  length: number;
  depth: number;
}

interface TreeCanvasProps {
  width: number;
  height: number;
  treeLevel: number;
  leaves: Leaf[];
  onRakeLeaf: (leafId: string) => void;
  onSharePicture: (pos: Position, branchIndex: number) => void;
}

const TreeCanvas: React.FC<TreeCanvasProps> = ({ 
  width, 
  height, 
  treeLevel, 
  leaves, 
  onRakeLeaf,
  onSharePicture 
}) => {
  const [wind, setWind] = useState(0);
  const requestRef = useRef<number>(0);

  useEffect(() => {
    const animate = (time: number) => {
      setWind(Math.sin(time / 5000) * 0.05); // Slower, more graceful sway
      requestRef.current = requestAnimationFrame(animate);
    };
    requestRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(requestRef.current);
  }, []);

  // Stable branch parameters to prevent "vibrating" tree
  const branchParams = useMemo(() => {
    const params: any[] = [];
    const maxDepth = Math.min(treeLevel + 4, 9);
    
    function generate(depth: number) {
      if (depth >= maxDepth) return;
      const p = {
        lenMult: 0.75 + Math.random() * 0.1,
        spread: 0.4 + Math.random() * 0.1,
        id: Math.random().toString(36).substr(2, 9)
      };
      params.push(p);
      generate(depth + 1);
      generate(depth + 1);
    }
    generate(0);
    return params;
  }, [treeLevel]);

  const branches = useMemo(() => {
    const b: Branch[] = [];
    const maxDepth = Math.min(treeLevel + 4, 9);
    const startX = width / 2;
    const startY = height - 80;
    let paramIdx = 0;

    function createBranch(x: number, y: number, angle: number, depth: number, len: number) {
      if (depth >= maxDepth || paramIdx >= branchParams.length) return;
      
      const p = branchParams[paramIdx++];
      const dynamicAngle = angle + (depth > 0 ? wind * (depth / maxDepth) : 0);
      const x2 = x + Math.cos(dynamicAngle) * len;
      const y2 = y + Math.sin(dynamicAngle) * len;
      const thickness = Math.max(1, (maxDepth - depth) * 2);

      b.push({
        id: p.id,
        x1: x,
        y1: y,
        x2: x2,
        y2: y2,
        thickness,
        angle: dynamicAngle,
        length: len,
        depth
      });

      const nextLen = len * p.lenMult;
      createBranch(x2, y2, angle - p.spread, depth + 1, nextLen);
      createBranch(x2, y2, angle + p.spread, depth + 1, nextLen);
    }

    createBranch(startX, startY, -Math.PI / 2, 0, height / 5);
    return b;
  }, [width, height, treeLevel, wind, branchParams]);

  const leafSlots = useMemo(() => {
    const outerBranches = branches.filter(b => b.depth >= Math.max(0, branches[branches.length-1].depth - 2)); 
    return outerBranches.map((b, i) => ({
      index: i,
      x: b.x2,
      y: b.y2
    }));
  }, [branches]);

  return (
    <Stage width={width} height={height} className="bg-transparent">
      <Layer>{branches.map((b) => (
          <Line
            key={b.id}
            points={[b.x1, b.y1, b.x2, b.y2]}
            stroke="#5D4037"
            strokeWidth={b.thickness}
            lineCap="round"
            opacity={0.8}
          />
        ))}{leafSlots.map((slot, i) => {
          const hasLeaf = leaves.some(l => {
            if (l.status === LeafStatus.RAKED) return false;
            const actualIdx = Math.floor((l.branchIndex / 100) * leafSlots.length);
            return actualIdx % leafSlots.length === i;
          });
          if (hasLeaf) return null;

          return (
            <Circle
              key={`slot-${i}`}
              x={slot.x}
              y={slot.y}
              radius={10}
              fill="rgba(255, 255, 255, 0.3)"
              stroke="white"
              strokeWidth={1}
              dash={[3, 3]}
              onClick={() => onSharePicture({ x: slot.x, y: slot.y }, Math.floor((i / leafSlots.length) * 100))}
              onTap={() => onSharePicture({ x: slot.x, y: slot.y }, Math.floor((i / leafSlots.length) * 100))}
            />
          );
        })}{leaves.map((leaf) => {
          let currentPos = leaf.position;
          
          if (leaf.status === LeafStatus.ON_TREE) {
             const actualIndex = Math.floor((leaf.branchIndex / 100) * leafSlots.length);
             const slot = leafSlots[actualIndex % leafSlots.length];
             if (slot) currentPos = { x: slot.x, y: slot.y };
          } else if (leaf.status === LeafStatus.RAKED) {
            const hash = leaf.leafId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
            const groundX = (width * 0.2) + (hash % (width * 0.6));
            const groundY = height - 50 - (hash % 30);
            currentPos = { x: groundX, y: groundY };
          }

          return (
            <LeafItem 
              key={leaf.leafId} 
              leaf={leaf} 
              currentPos={currentPos}
              onRake={() => onRakeLeaf(leaf.leafId)}
            />
          );
        })}</Layer>
    </Stage>
  );
};

const LeafItem: React.FC<{ leaf: Leaf; currentPos: Position; onRake: () => void }> = ({ leaf, currentPos, onRake }) => {
  const [img] = useImage(leaf.imageUrl, 'anonymous');
  const isFallen = leaf.status === LeafStatus.FALLEN;
  const isFlower = leaf.status === LeafStatus.RAKED;

  return (
    <Group 
      x={currentPos.x} 
      y={currentPos.y}
      draggable={isFallen}
      onDragEnd={(e) => {
        if (e.target.y() > window.innerHeight - 150) {
          onRake();
        } else {
           // Reset position if not raked
           e.target.to({
              x: currentPos.x,
              y: currentPos.y,
              duration: 0.2
           });
        }
      }}
      onClick={() => {
        if (isFallen) onRake();
      }}
    >{isFlower && (
        <Group>{[0, 1, 2, 3, 4].map((i) => (
            <Circle
              key={i}
              radius={10}
              x={Math.cos((i * Math.PI * 2) / 5) * 12}
              y={Math.sin((i * Math.PI * 2) / 5) * 12}
              fill="#F472B6"
              shadowBlur={2}
              shadowColor="rgba(0,0,0,0.1)"
            />
          ))}<Circle radius={8} fill="#FDE047" /></Group>
      )}<Circle 
        radius={isFlower ? 12 : 20} 
        fill={isFlower ? "white" : (leaf.status === LeafStatus.GROWING ? "#BFF0D4" : "#4ADE80")}
        stroke={isFlower ? "#F472B6" : "white"}
        strokeWidth={isFlower ? 2 : 3}
        shadowBlur={isFlower ? 10 : (isFallen ? 15 : 5)}
        shadowColor="rgba(0,0,0,0.1)"
        shadowOpacity={0.3}
      />{img && (
        <KonvaImage
          image={img}
          width={isFlower ? 20 : 32}
          height={isFlower ? 20 : 32}
          x={isFlower ? -10 : -16}
          y={isFlower ? -10 : -16}
          cornerRadius={isFlower ? 10 : 16}
        />
      )}
    </Group>
  );
};

export default TreeCanvas;
