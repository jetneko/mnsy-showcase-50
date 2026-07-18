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
  const doorRef = useRef<THREE.Mesh>(null);
  const roofRef = useRef<THREE.Group>(null);
  const groundRef = useRef<THREE.Mesh>(null);
  const drivewayRef = useRef<THREE.Mesh>(null);
  const treesRef = useRef<THREE.InstancedMesh>(null);
  const wallMatRef = useRef<THREE.MeshStandardMaterial>(null);

  // -- Layout ------------------------------------------------------------------
  const W = 12, D = 8, H = 3;
  const wallT = 0.25;

  // Wall segments as { position, size } — outer + one interior partition.
  const wallDefs = useMemo(() => {
    return [
      // North wall (with a big opening for glass at center-right)
      { pos: [-3.5, H / 2, -D / 2] as const, size: [5, H, wallT] as const },
      { pos: [4.5, H / 2, -D / 2] as const, size: [3, H, wallT] as const },
      // South wall (with door opening)
      { pos: [-4, H / 2, D / 2] as const, size: [4, H, wallT] as const },
      { pos: [2.5, H / 2, D / 2] as const, size: [7, H, wallT] as const },
      // East + West walls
      { pos: [W / 2, H / 2, 0] as const, size: [wallT, H, D] as const },
      { pos: [-W / 2, H / 2, -1.5] as const, size: [wallT, H, 5] as const },
      { pos: [-W / 2, H / 2, 3] as const, size: [wallT, H, 2] as const },
      // Interior partition
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

  const glassDefs = useMemo(
    () =>
      [
        // large front window on north wall
        { pos: [0.7, 1.6, -D / 2] as const, size: [2.2, 1.8, 0.06] as const },
        // side window west
        { pos: [-W / 2, 1.7, 1.2] as const, size: [0.06, 1.4, 1.6] as const },
      ] as const,
    [],
  );

  // Trees: instanced positions around the plot.
  const treeCount = mobile ? 6 : 14;
  const treeMatrices = useMemo(() => {
    const arr: THREE.Matrix4[] = [];
    const dummy = new THREE.Object3D();
    let seed = 1;
    const rnd = () => {
      // deterministic pseudo-random so positions don't jitter between renders
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };
    for (let i = 0; i < treeCount; i++) {
      const side = i % 2 === 0 ? -1 : 1;
      const x = side * (W / 2 + 2 + rnd() * 4);
      const z = -10 + rnd() * 20;
      const s = 0.8 + rnd() * 0.7;
      dummy.position.set(x, 0, z);
      dummy.scale.set(s, s, s);
      dummy.rotation.y = rnd() * Math.PI;
      dummy.updateMatrix();
      arr.push(dummy.matrix.clone());
    }
    return arr;
  }, [treeCount]);

  // -- Frame loop --------------------------------------------------------------
  useFrame(() => {
    const p = progress.current;

    // Stage 1: walls extrude from 0 to 1.
    const wallsS = smoothstep(stageLocal(p, 1));
    if (wallsRef.current) {
      wallsRef.current.children.forEach((c, i) => {
        // stagger walls so they don't all rise at exact same moment
        const staggered = Math.max(0, Math.min(1, wallsS * 1.4 - i * 0.05));
        const eased = smoothstep(staggered);
        c.scale.y = Math.max(0.0001, eased);
        // Because walls are centered at H/2, we translate so they grow from y=0.
        c.position.y = (H / 2) * eased;
      });
    }

    // Stage 2: columns + beams appear.
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
      (beamsRef.current.children[0] as THREE.Mesh | undefined) &&
        beamsRef.current.children.forEach((b) => {
          const m = b as THREE.Mesh;
          m.scale.x = beamS;
        });
    }

    // Stage 3: windows + doors slide in.
    const openS = smoothstep(stageLocal(p, 3));
    if (glassRef.current) {
      glassRef.current.children.forEach((g, i) => {
        const s = smoothstep(Math.max(0, openS - i * 0.15));
        g.scale.setScalar(s);
        const mat = (g as THREE.Mesh).material as THREE.MeshPhysicalMaterial;
        mat.opacity = 0.15 + 0.55 * s;
      });
    }
    if (doorRef.current) {
      doorRef.current.scale.y = smoothstep(openS);
      doorRef.current.position.y = 1 * smoothstep(openS);
    }

    // Stage 4: roof drops in from above.
    const roofS = smoothstep(stageLocal(p, 4));
    if (roofRef.current) {
      roofRef.current.visible = roofS > 0.001;
      roofRef.current.position.y = 6 - 3 * roofS; // settles at y≈3
      const s = smoothstep(roofS);
      (roofRef.current.children as THREE.Object3D[]).forEach((c) => {
        c.scale.z = s;
      });
    }

    // Stage 5: materials fade in — swap blueprint-emissive walls for PBR.
    const matS = smoothstep(stageLocal(p, 5));
    if (wallMatRef.current) {
      // color travels from cool blueprint blue → warm limestone
      const cool = new THREE.Color("#3a5a7a");
      const warm = new THREE.Color("#e6dcc8");
      wallMatRef.current.color.copy(cool).lerp(warm, matS);
      wallMatRef.current.emissiveIntensity = 0.4 * (1 - matS);
      wallMatRef.current.roughness = 0.9 - 0.4 * matS;
    }

    // Stage 6: landscape.
    const landS = smoothstep(stageLocal(p, 6));
    if (groundRef.current) {
      const mat = groundRef.current.material as THREE.MeshStandardMaterial;
      const dirt = new THREE.Color("#141a26");
      const grass = new THREE.Color("#2f4a2a");
      mat.color.copy(dirt).lerp(grass, landS);
    }
    if (drivewayRef.current) {
      drivewayRef.current.scale.z = smoothstep(landS);
      drivewayRef.current.visible = landS > 0.01;
    }
    if (treesRef.current) {
      const dummy = new THREE.Object3D();
      treeMatrices.forEach((m, i) => {
        dummy.matrix.copy(m);
        dummy.matrix.decompose(dummy.position, dummy.quaternion, dummy.scale);
        const localS = smoothstep(Math.max(0, landS * 1.5 - i * 0.05));
        dummy.scale.multiplyScalar(localS || 0.0001);
        dummy.updateMatrix();
        treesRef.current!.setMatrixAt(i, dummy.matrix);
      });
      treesRef.current.instanceMatrix.needsUpdate = true;
      treesRef.current.visible = landS > 0.01;
    }
  });

  return (
    <group>
      {/* Ground plane — starts as bare terrain, greens up in stage 6. */}
      <mesh
        ref={groundRef}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0, 0]}
        receiveShadow
      >
        <planeGeometry args={[80, 80]} />
        <meshStandardMaterial color="#141a26" roughness={1} />
      </mesh>

      {/* Driveway ribbon */}
      <mesh
        ref={drivewayRef}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.01, D / 2 + 6]}
        receiveShadow
      >
        <planeGeometry args={[3.5, 12]} />
        <meshStandardMaterial color="#3a3a3a" roughness={0.8} />
      </mesh>

      {/* Slab / foundation */}
      <mesh position={[0, 0.05, 0]} receiveShadow>
        <boxGeometry args={[W + 0.4, 0.1, D + 0.4]} />
        <meshStandardMaterial color="#1e2530" roughness={1} />
      </mesh>

      {/* Walls */}
      <group ref={wallsRef}>
        {wallDefs.map((w, i) => (
          <mesh key={i} position={w.pos} castShadow receiveShadow>
            <boxGeometry args={w.size} />
            <meshStandardMaterial
              ref={i === 0 ? wallMatRef : undefined}
              color="#3a5a7a"
              emissive="#1a6fd8"
              emissiveIntensity={0.4}
              roughness={0.9}
            />
          </mesh>
        ))}
      </group>

      {/* Columns */}
      <group ref={columnsRef}>
        {columnPositions.map((pos, i) => (
          <mesh key={i} position={pos as unknown as [number, number, number]} castShadow>
            <boxGeometry args={[0.35, H, 0.35]} />
            <meshStandardMaterial color="#c8c4bd" roughness={0.7} />
          </mesh>
        ))}
      </group>

      {/* Beams — thin horizontal ring at top of walls */}
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

      {/* Windows (glass) */}
      <group ref={glassRef}>
        {glassDefs.map((g, i) => (
          <mesh key={i} position={g.pos} castShadow>
            <boxGeometry args={g.size} />
            <meshPhysicalMaterial
              color="#a8d0ff"
              transparent
              opacity={0.5}
              roughness={0.05}
              metalness={0}
              transmission={0.6}
              thickness={0.2}
              ior={1.4}
            />
          </mesh>
        ))}
      </group>

      {/* Door */}
      <mesh ref={doorRef} position={[-2, 1, D / 2]} castShadow>
        <boxGeometry args={[1.2, 2, 0.1]} />
        <meshStandardMaterial color="#5b3a20" roughness={0.4} metalness={0.05} />
      </mesh>

      {/* Roof — gable in two slanted slabs */}
      <group ref={roofRef} position={[0, 3, 0]}>
        <mesh position={[0, 0.9, -D / 4]} rotation={[Math.PI / 8, 0, 0]} castShadow>
          <boxGeometry args={[W + 0.6, 0.2, D / 2 + 0.6]} />
          <meshStandardMaterial color="#2a2e35" roughness={0.7} />
        </mesh>
        <mesh position={[0, 0.9, D / 4]} rotation={[-Math.PI / 8, 0, 0]} castShadow>
          <boxGeometry args={[W + 0.6, 0.2, D / 2 + 0.6]} />
          <meshStandardMaterial color="#2a2e35" roughness={0.7} />
        </mesh>
      </group>

      {/* Trees — instanced cones for canopy + cylinder trunks (two meshes) */}
      <instancedMesh
        ref={treesRef}
        args={[undefined as unknown as THREE.BufferGeometry, undefined as unknown as THREE.Material, treeCount]}
        castShadow
        visible={false}
      >
        <coneGeometry args={[0.6, 2, 8]} />
        <meshStandardMaterial color="#2e5a2c" roughness={0.9} />
      </instancedMesh>
    </group>
  );
}
