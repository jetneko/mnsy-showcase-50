import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useProgressRef } from "./progress";
import { smoothstep, stageLocal } from "./stages";

/**
 * Fully procedural house that constructs itself across scroll stages 1–7.
 * Every mesh reads shared progress inside useFrame — no per-frame setState.
 */
export function HouseConstruction({ mobile }: { mobile: boolean }) {
  const progress = useProgressRef();

  // -- Refs for animated pieces ------------------------------------------------
  const wallsRef = useRef<THREE.Group>(null);
  const columnsRef = useRef<THREE.Group>(null);
  const beamsRef = useRef<THREE.Group>(null);
  const glassRef = useRef<THREE.Group>(null);
  const windowFramesRef = useRef<THREE.Group>(null);
  const doorGroupRef = useRef<THREE.Group>(null);
  const roofRef = useRef<THREE.Group>(null);
  const trimRef = useRef<THREE.Mesh>(null);
  const groundRef = useRef<THREE.Mesh>(null);
  const drivewayRef = useRef<THREE.Mesh>(null);
  const pathRef = useRef<THREE.Mesh>(null);
  const treesRef = useRef<THREE.InstancedMesh>(null);
  const trunksRef = useRef<THREE.InstancedMesh>(null);
  const hedgesRef = useRef<THREE.Group>(null);

  const wallMatRef = useRef<THREE.MeshStandardMaterial | null>(null);
  const wallMaterial = useMemo(() => {
    const m = new THREE.MeshStandardMaterial({
      color: new THREE.Color("#3a5a7a"),
      emissive: new THREE.Color("#1a6fd8"),
      emissiveIntensity: 0.4,
      roughness: 0.9,
    });
    wallMatRef.current = m;
    return m;
  }, []);

  const trimMatRef = useRef<THREE.MeshStandardMaterial | null>(null);
  const trimMaterial = useMemo(() => {
    const m = new THREE.MeshStandardMaterial({
      color: new THREE.Color("#3a5a7a"),
      emissive: new THREE.Color("#1a6fd8"),
      emissiveIntensity: 0.3,
      roughness: 0.6,
      metalness: 0.1,
    });
    trimMatRef.current = m;
    return m;
  }, []);

  // -- Layout ------------------------------------------------------------------
  const W = 12, D = 8, H = 3;
  const wallT = 0.25;

  const wallDefs = useMemo(() => {
    return [
      { pos: [-3.5, H / 2, -D / 2] as const, size: [5, H, wallT] as const },
      { pos: [4.5, H / 2, -D / 2] as const, size: [3, H, wallT] as const },
      { pos: [-4, H / 2, D / 2] as const, size: [4, H, wallT] as const },
      { pos: [2.5, H / 2, D / 2] as const, size: [7, H, wallT] as const },
      { pos: [W / 2, H / 2, 0] as const, size: [wallT, H, D] as const },
      { pos: [-W / 2, H / 2, -1.5] as const, size: [wallT, H, 5] as const },
      { pos: [-W / 2, H / 2, 3] as const, size: [wallT, H, 2] as const },
      { pos: [-2, H / 2, -1.25] as const, size: [wallT, H, 5.5] as const },
    ];
  }, []);

  const columnPositions = useMemo(
    () =>
      [
        [-W / 2, H / 2, -D / 2],
        [W / 2, H / 2, -D / 2],
        [W / 2, H / 2, D / 2],
        [-W / 2, H / 2, D / 2],
        [0, H / 2, -D / 2],
        [0, H / 2, D / 2],
      ] as const,
    [],
  );

  // Windows: [pos, size] — matched with frame that sits just behind them.
  const glassDefs = useMemo(
    () =>
      [
        { pos: [0.7, 1.6, -D / 2] as const, size: [2.2, 1.8, 0.06] as const, axis: "z" as const },
        { pos: [-W / 2, 1.7, 1.2] as const, size: [0.06, 1.4, 1.6] as const, axis: "x" as const },
        { pos: [4.5, 1.6, -D / 2] as const, size: [1.6, 1.4, 0.06] as const, axis: "z" as const },
      ] as const,
    [],
  );

  // Frames: slightly larger dark rectangles behind the glass panels.
  const frameDefs = useMemo(
    () =>
      glassDefs.map((g) => {
        const [x, y, z] = g.pos;
        const [sx, sy, sz] = g.size;
        // grow the two in-plane dimensions, keep the wall-normal thin
        const pad = 0.12;
        const size: [number, number, number] =
          g.axis === "z"
            ? [sx + pad, sy + pad, 0.05]
            : [0.05, sy + pad, sz + pad];
        const pos: [number, number, number] =
          g.axis === "z" ? [x, y, z + Math.sign(z) * 0.01] : [x + Math.sign(x) * 0.01, y, z];
        return { pos, size };
      }),
    [glassDefs],
  );

  // Trees.
  const treeCount = mobile ? 6 : 14;
  const treeMatrices = useMemo(() => {
    const arr: THREE.Matrix4[] = [];
    const dummy = new THREE.Object3D();
    let seed = 1;
    const rnd = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };
    for (let i = 0; i < treeCount; i++) {
      const side = i % 2 === 0 ? -1 : 1;
      const x = side * (W / 2 + 2.5 + rnd() * 4);
      const z = -10 + rnd() * 20;
      const s = 0.9 + rnd() * 0.8;
      dummy.position.set(x, 0, z);
      dummy.scale.set(s, s, s);
      dummy.rotation.y = rnd() * Math.PI;
      dummy.updateMatrix();
      arr.push(dummy.matrix.clone());
    }
    return arr;
  }, [treeCount]);

  // Hedge positions flanking the front entrance.
  const hedgeDefs = useMemo(
    () =>
      [
        { pos: [-3.4, 0.4, D / 2 + 0.9] as const },
        { pos: [-0.6, 0.4, D / 2 + 0.9] as const },
        { pos: [-4.5, 0.4, D / 2 + 0.9] as const },
        { pos: [0.3, 0.4, D / 2 + 0.9] as const },
      ] as const,
    [],
  );

  // -- Frame loop --------------------------------------------------------------
  useFrame(() => {
    const p = progress.current;

    // Stage 1: walls extrude.
    const wallsS = smoothstep(stageLocal(p, 1));
    if (wallsRef.current) {
      wallsRef.current.children.forEach((c, i) => {
        const staggered = Math.max(0, Math.min(1, wallsS * 1.4 - i * 0.05));
        const eased = smoothstep(staggered);
        c.scale.y = Math.max(0.0001, eased);
        c.position.y = (H / 2) * eased;
      });
    }

    // Stage 2: columns + beams.
    const structS = smoothstep(stageLocal(p, 2));
    if (columnsRef.current) {
      columnsRef.current.children.forEach((c, i) => {
        const s = Math.max(0, Math.min(1, structS * 1.3 - i * 0.05));
        c.scale.y = smoothstep(s);
        c.position.y = (H / 2) * smoothstep(s);
      });
    }
    if (beamsRef.current) {
      const beamS = smoothstep(Math.max(0, structS - 0.3) / 0.7);
      beamsRef.current.children.forEach((b) => {
        (b as THREE.Mesh).scale.x = beamS;
      });
    }

    // Stage 3: windows + doors.
    const openS = smoothstep(stageLocal(p, 3));
    if (windowFramesRef.current) {
      windowFramesRef.current.children.forEach((f, i) => {
        const s = smoothstep(Math.max(0, openS - i * 0.1));
        f.scale.setScalar(Math.max(0.0001, s));
      });
    }
    if (glassRef.current) {
      glassRef.current.children.forEach((g, i) => {
        const s = smoothstep(Math.max(0, openS - i * 0.12));
        g.scale.setScalar(Math.max(0.0001, s));
        const mat = (g as THREE.Mesh).material as THREE.MeshPhysicalMaterial;
        mat.opacity = 0.25 + 0.55 * s;
      });
    }
    if (doorGroupRef.current) {
      doorGroupRef.current.scale.y = smoothstep(openS);
      doorGroupRef.current.position.y = 1.05 * smoothstep(openS);
    }

    // Stage 4: roof.
    const roofS = smoothstep(stageLocal(p, 4));
    if (roofRef.current) {
      roofRef.current.visible = roofS > 0.001;
      roofRef.current.position.y = 6 - 2.9 * roofS; // settles at y≈3.1
      const s = smoothstep(roofS);
      (roofRef.current.children as THREE.Object3D[]).forEach((c) => {
        c.scale.x = s;
        c.scale.z = s;
      });
    }

    // Stage 5: materials — walls warm up, trim band appears.
    const matS = smoothstep(stageLocal(p, 5));
    if (wallMatRef.current) {
      const cool = new THREE.Color("#3a5a7a");
      const warm = new THREE.Color("#d9cdb4"); // warm limestone
      wallMatRef.current.color.copy(cool).lerp(warm, matS);
      wallMatRef.current.emissiveIntensity = 0.4 * (1 - matS);
      wallMatRef.current.roughness = 0.9 - 0.35 * matS;
    }
    if (trimMatRef.current) {
      const cool = new THREE.Color("#3a5a7a");
      const walnut = new THREE.Color("#2a1f16"); // dark walnut band
      trimMatRef.current.color.copy(cool).lerp(walnut, matS);
      trimMatRef.current.emissiveIntensity = 0.3 * (1 - matS);
    }
    if (trimRef.current) {
      trimRef.current.scale.y = matS;
      trimRef.current.visible = matS > 0.01;
    }

    // Stage 6: landscape.
    const landS = smoothstep(stageLocal(p, 6));
    if (groundRef.current) {
      const mat = groundRef.current.material as THREE.MeshStandardMaterial;
      const dirt = new THREE.Color("#141a26");
      const grass = new THREE.Color("#3d5f34");
      mat.color.copy(dirt).lerp(grass, landS);
    }
    if (drivewayRef.current) {
      drivewayRef.current.scale.z = smoothstep(landS);
      drivewayRef.current.visible = landS > 0.01;
    }
    if (pathRef.current) {
      pathRef.current.scale.z = smoothstep(Math.max(0, landS - 0.1));
      pathRef.current.visible = landS > 0.05;
    }
    if (hedgesRef.current) {
      hedgesRef.current.children.forEach((h, i) => {
        const s = smoothstep(Math.max(0, landS * 1.4 - i * 0.08));
        h.scale.set(s, s, s);
      });
    }
    const setTrees = (mesh: THREE.InstancedMesh | null) => {
      if (!mesh) return;
      const dummy = new THREE.Object3D();
      treeMatrices.forEach((m, i) => {
        dummy.matrix.copy(m);
        dummy.matrix.decompose(dummy.position, dummy.quaternion, dummy.scale);
        const localS = smoothstep(Math.max(0, landS * 1.5 - i * 0.05));
        dummy.scale.multiplyScalar(localS || 0.0001);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
      });
      mesh.instanceMatrix.needsUpdate = true;
      mesh.visible = landS > 0.01;
    };
    setTrees(treesRef.current);
    setTrees(trunksRef.current);
  });

  return (
    <group>
      {/* Ground */}
      <mesh
        ref={groundRef}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0, 0]}
        receiveShadow
      >
        <planeGeometry args={[80, 80]} />
        <meshStandardMaterial color="#141a26" roughness={1} />
      </mesh>

      {/* Driveway */}
      <mesh
        ref={drivewayRef}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[3.5, 0.01, D / 2 + 6]}
        receiveShadow
      >
        <planeGeometry args={[3.5, 12]} />
        <meshStandardMaterial color="#2c2f36" roughness={0.85} />
      </mesh>

      {/* Front entry path */}
      <mesh
        ref={pathRef}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[-2, 0.02, D / 2 + 2]}
        receiveShadow
      >
        <planeGeometry args={[1.6, 4]} />
        <meshStandardMaterial color="#8a8477" roughness={0.9} />
      </mesh>

      {/* Slab / foundation */}
      <mesh position={[0, 0.05, 0]} receiveShadow>
        <boxGeometry args={[W + 0.4, 0.1, D + 0.4]} />
        <meshStandardMaterial color="#1e2530" roughness={1} />
      </mesh>

      {/* Walls */}
      <group ref={wallsRef}>
        {wallDefs.map((w, i) => (
          <mesh key={i} position={w.pos} castShadow receiveShadow material={wallMaterial}>
            <boxGeometry args={w.size} />
          </mesh>
        ))}
      </group>

      {/* Dark trim band — appears with materials */}
      <mesh
        ref={trimRef}
        position={[0, H - 0.25, 0]}
        material={trimMaterial}
        visible={false}
      >
        <boxGeometry args={[W + 0.05, 0.35, D + 0.05]} />
      </mesh>

      {/* Columns */}
      <group ref={columnsRef}>
        {columnPositions.map((pos, i) => (
          <mesh key={i} position={pos as unknown as [number, number, number]} castShadow>
            <boxGeometry args={[0.35, H, 0.35]} />
            <meshStandardMaterial color="#c8c4bd" roughness={0.7} />
          </mesh>
        ))}
      </group>

      {/* Beams */}
      <group ref={beamsRef}>
        <mesh position={[0, H + 0.15, -D / 2]} castShadow>
          <boxGeometry args={[W, 0.25, 0.3]} />
          <meshStandardMaterial color="#b8b3aa" roughness={0.6} />
        </mesh>
        <mesh position={[0, H + 0.15, D / 2]} castShadow>
          <boxGeometry args={[W, 0.25, 0.3]} />
          <meshStandardMaterial color="#b8b3aa" roughness={0.6} />
        </mesh>
      </group>

      {/* Window frames (dark backing) */}
      <group ref={windowFramesRef}>
        {frameDefs.map((f, i) => (
          <mesh key={i} position={f.pos} castShadow>
            <boxGeometry args={f.size} />
            <meshStandardMaterial color="#1a1d24" roughness={0.5} metalness={0.3} />
          </mesh>
        ))}
      </group>

      {/* Glass panels */}
      <group ref={glassRef}>
        {glassDefs.map((g, i) => (
          <mesh key={i} position={g.pos} castShadow>
            <boxGeometry args={g.size} />
            <meshPhysicalMaterial
              color="#9dc4ff"
              transparent
              opacity={0.75}
              roughness={0.05}
              metalness={0}
              transmission={0.55}
              thickness={0.2}
              ior={1.45}
            />
          </mesh>
        ))}
      </group>

      {/* Door — frame + panel */}
      <group ref={doorGroupRef} position={[-2, 1.05, D / 2]}>
        <mesh position={[0, 0, 0.03]} castShadow>
          <boxGeometry args={[1.5, 2.2, 0.08]} />
          <meshStandardMaterial color="#1a1d24" roughness={0.5} metalness={0.2} />
        </mesh>
        <mesh position={[0, -0.05, 0.09]} castShadow>
          <boxGeometry args={[1.2, 2, 0.06]} />
          <meshStandardMaterial color="#3d2617" roughness={0.35} metalness={0.15} />
        </mesh>
        {/* Handle */}
        <mesh position={[0.45, -0.05, 0.14]} castShadow>
          <boxGeometry args={[0.06, 0.28, 0.04]} />
          <meshStandardMaterial color="#c9a86a" roughness={0.3} metalness={0.85} />
        </mesh>
      </group>

      {/* Roof — clean modern flat slab with subtle parapet */}
      <group ref={roofRef} position={[0, 3, 0]}>
        <mesh position={[0, 0.15, 0]} castShadow receiveShadow>
          <boxGeometry args={[W + 0.6, 0.25, D + 0.6]} />
          <meshStandardMaterial color="#1a1d24" roughness={0.75} metalness={0.15} />
        </mesh>
        {/* thin parapet lip along the perimeter */}
        <mesh position={[0, 0.35, 0]} castShadow>
          <boxGeometry args={[W + 0.7, 0.08, D + 0.7]} />
          <meshStandardMaterial color="#0f1116" roughness={0.6} metalness={0.2} />
        </mesh>
      </group>

      {/* Hedges near entrance */}
      <group ref={hedgesRef}>
        {hedgeDefs.map((h, i) => (
          <mesh key={i} position={h.pos} castShadow scale={0.0001}>
            <boxGeometry args={[1.4, 0.7, 0.7]} />
            <meshStandardMaterial color="#26492a" roughness={0.95} />
          </mesh>
        ))}
      </group>

      {/* Trees — canopies */}
      <instancedMesh
        ref={treesRef}
        args={[undefined as unknown as THREE.BufferGeometry, undefined as unknown as THREE.Material, treeCount]}
        castShadow
        visible={false}
      >
        <coneGeometry args={[0.7, 2.4, 8]} />
        <meshStandardMaterial color="#2e5a2c" roughness={0.9} />
      </instancedMesh>
      {/* Trees — trunks */}
      <instancedMesh
        ref={trunksRef}
        args={[undefined as unknown as THREE.BufferGeometry, undefined as unknown as THREE.Material, treeCount]}
        castShadow
        visible={false}
      >
        <cylinderGeometry args={[0.09, 0.12, 1.2, 6]} />
        <meshStandardMaterial color="#3a2a1c" roughness={1} />
      </instancedMesh>
    </group>
  );
}
