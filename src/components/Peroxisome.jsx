import { Component, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { bodyFragment, bodyVertex, haloFragment, haloVertex } from './peroxisomeShaders';

// Cool blue-cyan for mechanisms, warm coral-red for diseases.
const PALETTE = {
  mechanisms: { deep: '#06205c', mid: '#1c63ea', glow: '#5fd8ff', hot: '#e3f8ff' },
  diseases: { deep: '#4d0a10', mid: '#e0452f', glow: '#ff8366', hot: '#ffe6d9' },
};

const TILT = THREE.MathUtils.degToRad(10); // how far it leans towards the cursor
const PULSE_EVERY = 7; // seconds between idle pulses
const HALO_SCALE = 1.42;

// The body fills this share of the canvas height (camera: fov 30 at z 6.4).
export const BODY_SHARE = 0.583;

const toColors = (view) =>
  Object.fromEntries(Object.entries(PALETTE[view]).map(([k, hex]) => [k, new THREE.Color(hex)]));

function Organelle({ view, hot, still }) {
  const group = useRef();
  const body = useRef();
  const pointer = useRef({ x: 0, y: 0 });
  const motion = useRef({ energy: 0, kick: 0, clock: 0 });
  const target = useMemo(() => toColors(view), [view]);

  const uniforms = useMemo(() => {
    const start = toColors(view);
    return {
      uTime: { value: 0 },
      uWobble: { value: 0.075 },
      uEnergy: { value: 0 },
      uDeep: { value: start.deep },
      uMid: { value: start.mid },
      uGlow: { value: start.glow },
      uHot: { value: start.hot },
      uCamO: { value: new THREE.Vector3(0, 0, 6.4) },
    };
    // Created once; later palette changes are eased in the frame loop below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The halo follows the same shape, only calmer, so the glow stays smooth.
  const haloUniforms = useMemo(() => ({ ...uniforms, uWobble: { value: 0.032 } }), [uniforms]);

  // A small swell whenever the view flips, so the colour change has a cause.
  const firstView = useRef(true);
  useEffect(() => {
    if (firstView.current) {
      firstView.current = false;
      return;
    }
    motion.current.kick = 1;
  }, [view]);

  useFrame(({ gl, camera }, rawDelta) => {
    const dt = Math.min(rawDelta, 0.05);
    const m = motion.current;
    m.clock += dt * (still ? 0.2 : 1);
    const ease = (rate) => 1 - Math.exp(-dt * rate);

    for (const key of ['deep', 'mid', 'glow', 'hot']) {
      uniforms[`u${key[0].toUpperCase()}${key.slice(1)}`].value.lerp(target[key], ease(3.2));
    }

    const phase = (m.clock % PULSE_EVERY) - PULSE_EVERY / 2;
    const pulse = still ? 0 : Math.exp(-(phase * phase) / 0.42);
    m.energy += ((hot ? 1 : 0) - m.energy) * ease(6);
    m.kick *= Math.exp(-dt * 2.2);

    uniforms.uTime.value = m.clock;
    uniforms.uEnergy.value = m.energy * 0.9 + pulse * 0.5 + m.kick * 0.7;

    const g = group.current;
    g.scale.setScalar(1 + pulse * 0.028 + m.energy * 0.03 + m.kick * 0.045);

    // Lean towards wherever the cursor is, relative to the organelle's centre.
    const p = pointer.current;
    const rect = gl.domElement.getBoundingClientRect();
    const nx = THREE.MathUtils.clamp((p.x - (rect.left + rect.width / 2)) / (window.innerWidth / 2), -1, 1);
    const ny = THREE.MathUtils.clamp((p.y - (rect.top + rect.height / 2)) / (window.innerHeight / 2), -1, 1);
    const sway = still ? 0 : Math.sin(m.clock * 0.21) * 0.07;
    const goalY = (still || !p.seen ? 0 : nx * TILT) + sway;
    const goalX = still || !p.seen ? 0 : ny * TILT;
    g.rotation.y += (goalY - g.rotation.y) * ease(4);
    g.rotation.x += (goalX - g.rotation.x) * ease(4);

    body.current.updateWorldMatrix(true, false);
    body.current.worldToLocal(uniforms.uCamO.value.copy(camera.position));
  });

  useEffect(() => {
    const onMove = (e) => {
      pointer.current = { x: e.clientX, y: e.clientY, seen: true };
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => window.removeEventListener('pointermove', onMove);
  }, []);

  return (
    <group ref={group}>
      <mesh ref={body}>
        <icosahedronGeometry args={[1, 28]} />
        <shaderMaterial vertexShader={bodyVertex} fragmentShader={bodyFragment} uniforms={uniforms} />
      </mesh>
      <mesh scale={HALO_SCALE}>
        <icosahedronGeometry args={[1, 16]} />
        <shaderMaterial
          vertexShader={haloVertex}
          fragmentShader={haloFragment}
          uniforms={haloUniforms}
          side={THREE.BackSide}
          transparent
          depthWrite={false}
          blending={THREE.CustomBlending}
          blendEquation={THREE.AddEquation}
          blendSrc={THREE.OneFactor}
          blendDst={THREE.OneFactor}
          blendSrcAlpha={THREE.ZeroFactor}
          blendDstAlpha={THREE.OneFactor}
        />
      </mesh>
    </group>
  );
}

// If WebGL is unavailable the CSS orb underneath (see .peroxisome-fallback) is what shows.
class CanvasBoundary extends Component {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}

export default function Peroxisome({ view, hot, still }) {
  const [ready, setReady] = useState(false);

  return (
    <>
      {!ready && <div className="peroxisome-fallback" aria-hidden="true" />}
      <CanvasBoundary>
        <Canvas
          className="peroxisome-canvas"
          dpr={[1, 2]}
          camera={{ fov: 30, position: [0, 0, 6.4], near: 0.1, far: 30 }}
          gl={{ alpha: true, antialias: true, powerPreference: 'high-performance' }}
          style={{ pointerEvents: 'none' }}
          // Measure the layout box, not the on-screen box: the wrapper is scaled
          // with a CSS transform and the canvas must not shrink its buffer to match.
          resize={{ offsetSize: true, scroll: false }}
          onCreated={() => setReady(true)}
        >
          <Organelle view={view} hot={hot} still={still} />
        </Canvas>
      </CanvasBoundary>
    </>
  );
}
