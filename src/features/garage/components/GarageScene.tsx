import { Environment, Lightformer, OrbitControls } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import type { ComponentRef } from 'react'
import {
  CanvasTexture,
  MathUtils,
  PerspectiveCamera,
  SRGBColorSpace,
  Vector3,
} from 'three'
import {
  paddockCarMotion,
  paddockShot,
  paddockShots,
} from '../domain/paddock-showcase.ts'
import { RaceCarModel } from '../../../shared/three/RaceCarModel.tsx'
import { useGamePreferences } from '../../../shared/game/preferences.ts'
import type { GarageBackdropProps } from './GarageBackdrop.tsx'
import type { VehicleAppearance } from '../domain/appearance.ts'
import {
  allowedCameraDistance,
  cameraLimits,
} from '../domain/garage-camera-bounds.ts'

const carScale = 2.6

function useBaySign(number: number) {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 1024
    canvas.height = 256
    const context = canvas.getContext('2d')!
    context.fillStyle = '#111b21'
    context.fillRect(0, 0, 1024, 256)
    context.fillStyle = '#ff783e'
    context.fillRect(0, 0, 12, 256)
    context.fillRect(1012, 0, 12, 256)
    context.font = 'bold 82px sans-serif'
    context.fillStyle = '#e6e5d7'
    context.textAlign = 'center'
    context.fillText('S Y N A P S E', 512, 120)
    context.font = '27px monospace'
    context.fillStyle = '#9baeb3'
    context.fillText(
      `RACING DEVELOPMENT / BAY ${String(number).padStart(2, '0')}`,
      512,
      184,
    )
    const result = new CanvasTexture(canvas)
    result.colorSpace = SRGBColorSpace
    return result
  }, [number])
  useEffect(() => () => texture.dispose(), [texture])
  return texture
}

function GarageCamera({
  interactive,
  paused,
  resetViewKey,
}: Pick<
  GarageBackdropProps,
  'interactive' | 'paused' | 'resetViewKey'
>) {
  const { camera, size, invalidate } = useThree()
  const controls = useRef<ComponentRef<typeof OrbitControls>>(null)
  const time = useRef(0)
  const previousShotIndex = useRef(-1)
  const vectors = useMemo(
    () => ({
      position: new Vector3(),
      target: new Vector3(),
      right: new Vector3(),
      up: new Vector3(0, 1, 0),
    }),
    [],
  )
  /** Distance the user asked for with the wheel, before wall collisions. */
  const desiredDistance = useRef(0)
  /** Distance actually applied to the camera on the previous frame. */
  const appliedDistance = useRef(0)

  const framing = useMemo(() => {
    const small = size.width <= 760
    const position = new Vector3(
      small ? (interactive ? 7 : 11.3) : 10.5,
      small ? (interactive ? 3.5 : 6.4) : 4.2,
      small ? (interactive ? -8.5 : -13.6) : -11.5,
    )
    const target = new Vector3(0, small && !interactive ? -2.2 : 1.05, 0)
    const right = target
      .clone()
      .sub(position)
      .cross(new Vector3(0, 1, 0))
      .normalize()
    if (!small) target.addScaledVector(right, interactive ? -2.15 : -2.6)
    return { position, target }
  }, [size.width, interactive])

  useLayoutEffect(() => {
    if (interactive) {
      camera.position.copy(framing.position)
      camera.lookAt(framing.target)
      if (camera instanceof PerspectiveCamera) {
        camera.fov = 42
        camera.updateProjectionMatrix()
      }
      controls.current?.target.copy(framing.target)
      controls.current?.update()
      const distance = framing.position.distanceTo(framing.target)
      desiredDistance.current = distance
      appliedDistance.current = distance
      invalidate()
    } else {
      const initialShot = paddockShots[0]
      const { position, target, right, up } = vectors
      position.set(...initialShot.position)
      target.set(...initialShot.target)
      const small = size.width <= 760
      right.copy(target).sub(position).cross(up).normalize()
      target.addScaledVector(right, small ? -0.4 : -2.6)
      camera.position.copy(position)
      camera.lookAt(target)
      if (camera instanceof PerspectiveCamera) {
        camera.fov = initialShot.fov
        camera.updateProjectionMatrix()
      }
      invalidate()
    }
  }, [camera, framing, size.width, size.height, resetViewKey, invalidate, interactive, vectors])

  useFrame((_, delta) => {
    if (interactive || paused) return

    const step = Math.min(delta, 0.05)
    time.current += step

    const { index, progress, shot } = paddockShot(time.current)
    const cut = previousShotIndex.current !== index
    if (cut) {
      previousShotIndex.current = index
    }

    const { position, target, right, up } = vectors
    position.set(
      shot.position[0] + shot.drift[0] * progress,
      shot.position[1] + shot.drift[1] * progress,
      shot.position[2] + shot.drift[2] * progress,
    )
    target.set(shot.target[0], shot.target[1], shot.target[2])

    const small = size.width <= 760
    right.copy(target).sub(position).cross(up).normalize()
    const menuOffset = small ? -0.4 : -2.6
    target.addScaledVector(right, menuOffset)

    if (camera instanceof PerspectiveCamera) {
      if (camera.fov !== shot.fov) {
        camera.fov = shot.fov
        camera.updateProjectionMatrix()
      }
    }

    camera.position.copy(position)
    camera.lookAt(target)
  })

  // Spring-arm camera: runs after OrbitControls (priority -1) and pulls the
  // camera towards the car whenever a wall, the sign or furniture would get
  // between them, easing back out once the view is clear again.
  useFrame((_, delta) => {
    const orbit = controls.current
    if (!interactive || !orbit) return
    const { position, target } = vectors

    orbit.target.set(
      MathUtils.clamp(orbit.target.x, -7, 7),
      MathUtils.clamp(orbit.target.y, 0.3, 4),
      MathUtils.clamp(orbit.target.z, -7, 6),
    )
    target.copy(orbit.target)
    position.copy(camera.position).sub(target)
    const current = position.length()
    if (current < 1e-6) return
    position.divideScalar(current)

    const applied = appliedDistance.current || current
    if (Math.abs(current - applied) > 1e-4) {
      const ratio = current / applied
      const base =
        ratio < 1
          ? Math.min(desiredDistance.current, applied)
          : desiredDistance.current
      desiredDistance.current = MathUtils.clamp(
        base * ratio,
        cameraLimits.minDistance,
        cameraLimits.maxDistance,
      )
    } else if (!desiredDistance.current) {
      desiredDistance.current = current
    }

    const allowed = allowedCameraDistance(
      [target.x, target.y, target.z],
      [position.x, position.y, position.z],
      desiredDistance.current,
    )
    const next =
      allowed < applied
        ? allowed
        : applied + (allowed - applied) * (1 - Math.exp(-8 * delta))

    camera.position.copy(target).addScaledVector(position, next)
    camera.lookAt(target)
    appliedDistance.current = next
  })

  return interactive ? (
    <OrbitControls
      ref={controls}
      makeDefault
      target={framing.target}
      minDistance={cameraLimits.hardMinDistance}
      maxDistance={cameraLimits.maxDistance}
      minPolarAngle={0.25}
      maxPolarAngle={Math.PI / 2.12}
      rotateSpeed={0.55}
      zoomSpeed={0.6}
      panSpeed={0.6}
      enableDamping
      dampingFactor={0.08}
    />
  ) : null
}

function PaddockCarShowcase({
  appearance,
  interactive,
  paused,
}: {
  appearance: VehicleAppearance
  interactive: boolean
  paused: boolean
}) {
  const time = useRef(0)
  const currentSteer = useRef(0)

  useFrame((_, delta) => {
    if (interactive) return
    const step = Math.min(delta, 0.05)
    if (!paused) {
      time.current += step
    }

    const motion = paddockCarMotion(time.current, paused)
    currentSteer.current = motion.steerAngle
  })

  return (
    <group>
      {!interactive && (
        <group position={[0, 0.026, 0]}>
          <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
            <circleGeometry args={[4.2, 48]} />
            <meshStandardMaterial
              color="#2a3336"
              roughness={0.5}
              metalness={0.35}
            />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.002, 0]}>
            <ringGeometry args={[4.12, 4.22, 48]} />
            <meshStandardMaterial
              color="#ff874e"
              emissive="#ed632a"
              emissiveIntensity={0.7}
            />
          </mesh>
        </group>
      )}

      <group position={[0, 0.065, 0]} scale={carScale}>
        <RaceCarModel
          appearance={appearance}
          getSteerAngle={() => currentSteer.current}
        />
      </group>
    </group>
  )
}

function Cabinet({ x, z }: { x: number; z: number }) {
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 1.2, 0]} castShadow>
        <boxGeometry args={[1.5, 2.4, 0.7]} />
        <meshStandardMaterial
          color="#263b41"
          roughness={0.55}
          metalness={0.3}
        />
      </mesh>
      <mesh position={[0, 2.45, 0]}>
        <boxGeometry args={[1.6, 0.1, 0.85]} />
        <meshStandardMaterial
          color="#687b79"
          metalness={0.65}
          roughness={0.4}
        />
      </mesh>
      {[0.45, 0.95, 1.45, 1.95].map((y) => (
        <group key={y}>
          <mesh position={[0, y, -0.365]}>
            <boxGeometry args={[1.35, 0.4, 0.035]} />
            <meshStandardMaterial color="#18272d" />
          </mesh>
          <mesh position={[0, y + 0.1, -0.4]}>
            <boxGeometry args={[0.5, 0.035, 0.055]} />
            <meshStandardMaterial
              color="#b1b8af"
              metalness={0.65}
              roughness={0.3}
            />
          </mesh>
        </group>
      ))}
      <mesh position={[-0.65, 1.2, -0.39]}>
        <boxGeometry args={[0.025, 2.2, 0.025]} />
        <meshStandardMaterial
          color="#ff7d47"
          emissive="#ff5720"
          emissiveIntensity={0.45}
        />
      </mesh>
    </group>
  )
}

export default function GarageScene({
  appearance,
  interactive,
  theme = 'tournament',
  paused = false,
  reduced: _reduced = false,
  resetViewKey = 0,
}: GarageBackdropProps) {
  const { preferences } = useGamePreferences()
  const high = preferences.quality === 'high'
  const desert = theme === 'desert'
  const sign = useBaySign(appearance.number)
  return (
    <>
      <color attach="background" args={[desert ? '#605c50' : '#152631']} />
      <fog attach="fog" args={[desert ? '#605c50' : '#152631', 24, 75]} />
      <ambientLight intensity={0.65} color="#b8cdd8" />
      <hemisphereLight args={['#d5edf1', '#272a27', 1.2]} />
      <directionalLight
        position={[3, 9, -5]}
        intensity={3.6}
        color="#ffead0"
        castShadow={high}
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-12}
        shadow-camera-right={12}
        shadow-camera-top={12}
        shadow-camera-bottom={-12}
        shadow-camera-near={0.5}
        shadow-camera-far={35}
        shadow-bias={-0.0004}
        shadow-normalBias={0.04}
      />
      <directionalLight position={[-6, 5, 4]} intensity={1.7} color="#71a9be" />
      <pointLight
        position={[5, 3, 4]}
        intensity={14}
        distance={16}
        decay={2}
        color="#ff773a"
      />
      <Environment resolution={high ? 128 : 64} frames={1}>
        <Lightformer
          intensity={3}
          color="#fff1dc"
          position={[0, 8, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
          scale={[9, 5, 1]}
        />
        <Lightformer
          intensity={1.6}
          color="#82bacd"
          position={[6, 3, 0]}
          rotation={[0, -Math.PI / 2, 0]}
          scale={[12, 3, 1]}
        />
        <Lightformer
          intensity={2}
          color="#ff864e"
          position={[-6, 2, 2]}
          rotation={[0, Math.PI / 2, 0]}
          scale={[10, 2, 1]}
        />
      </Environment>

      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[80, 90]} />
        <meshStandardMaterial
          color="#252e30"
          roughness={0.6}
          metalness={0.23}
        />
      </mesh>
      <mesh position={[0, 0.025, 0]} receiveShadow>
        <boxGeometry args={[9, 0.05, 10]} />
        <meshStandardMaterial
          color="#394043"
          roughness={0.45}
          metalness={0.36}
        />
      </mesh>
      {[-4.25, 4.25].map((x) => (
        <mesh key={x} position={[x, 0.06, 0]}>
          <boxGeometry args={[0.04, 0.02, 9.6]} />
          <meshStandardMaterial
            color="#ff874e"
            emissive="#ed632a"
            emissiveIntensity={0.6}
          />
        </mesh>
      ))}
      {[-4.8, 4.8].map((z) => (
        <mesh key={z} position={[0, 0.06, z]}>
          <boxGeometry args={[8.5, 0.02, 0.04]} />
          <meshStandardMaterial color="#c8cab6" roughness={0.7} />
        </mesh>
      ))}
      {[-7, 7].map((x) => (
        <group key={x}>
          <mesh position={[x, 0.035, 0]}>
            <boxGeometry args={[0.45, 0.03, 18]} />
            <meshStandardMaterial color="#111a1d" />
          </mesh>
          {Array.from({ length: 28 }, (_, i) => (
            <mesh key={i} position={[x, 0.06, i * 0.6 - 8.1]}>
              <boxGeometry args={[0.45, 0.02, 0.04]} />
              <meshStandardMaterial
                color="#516060"
                metalness={0.45}
                roughness={0.5}
              />
            </mesh>
          ))}
        </group>
      ))}
      {Array.from({ length: 14 }, (_, i) => (
        <mesh
          key={i}
          position={[i * 0.6 - 3.9, 0.065, -5.6]}
          rotation={[0, -0.5, 0]}
        >
          <boxGeometry args={[0.3, 0.02, 0.65]} />
          <meshStandardMaterial color={i % 2 ? '#dfaa54' : '#101b20'} />
        </mesh>
      ))}

      <PaddockCarShowcase
        appearance={appearance}
        interactive={interactive}
        paused={paused}
      />

      {[-11, 11].map((x) => (
        <group key={x}>
          <mesh position={[x, 4, 0]} receiveShadow>
            <boxGeometry args={[0.35, 8, 22]} />
            <meshStandardMaterial color="#1a272d" roughness={0.9} />
          </mesh>
          {[-8, -2, 4, 10].map((z) => (
            <group key={z}>
              <mesh position={[x * 0.95, 4, z]}>
                <boxGeometry args={[0.35, 8, 0.45]} />
                <meshStandardMaterial
                  color="#344146"
                  metalness={0.45}
                  roughness={0.6}
                />
              </mesh>
              <mesh position={[x * 0.93, 1.7, z - 0.3]}>
                <boxGeometry args={[0.06, 2.5, 0.07]} />
                <meshStandardMaterial
                  color="#ff803c"
                  emissive="#f66128"
                  emissiveIntensity={1.7}
                />
              </mesh>
            </group>
          ))}
        </group>
      ))}
      {[-7.5, 7.5].map((x) => (
        <mesh key={x} position={[x, 3.6, 8.2]} receiveShadow>
          <boxGeometry args={[7, 7.2, 0.4]} />
          <meshStandardMaterial color="#243239" roughness={0.8} />
        </mesh>
      ))}
      <mesh position={[0, 6.9, 8.2]}>
        <boxGeometry args={[8, 1.8, 0.5]} />
        <meshStandardMaterial color="#25363d" />
      </mesh>
      <mesh position={[0, 6.65, 7.92]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[7, 1.75]} />
        <meshBasicMaterial map={sign} toneMapped={false} />
      </mesh>
      {[-4.1, 4.1].map((x) => (
        <mesh key={x} position={[x, 3.1, 7.9]}>
          <boxGeometry args={[0.08, 6.2, 0.08]} />
          <meshStandardMaterial
            color="#d1ece9"
            emissive="#a6e1df"
            emissiveIntensity={2.5}
          />
        </mesh>
      ))}

      {[-5, 1, 7].map((z) => (
        <group key={z}>
          <mesh position={[0, 8, z]}>
            <boxGeometry args={[22, 0.4, 0.4]} />
            <meshStandardMaterial
              color="#2e3b41"
              metalness={0.5}
              roughness={0.55}
            />
          </mesh>
          {[-5.3, 5.3].map((x) => (
            <group key={x}>
              <mesh position={[x, 7.7, z]}>
                <boxGeometry args={[7, 0.15, 0.6]} />
                <meshStandardMaterial color="#101c22" />
              </mesh>
              <mesh position={[x, 7.6, z]}>
                <boxGeometry args={[6.7, 0.05, 0.32]} />
                <meshStandardMaterial
                  color="#e7f2e4"
                  emissive="#e7f2e4"
                  emissiveIntensity={3}
                  toneMapped={false}
                />
              </mesh>
            </group>
          ))}
        </group>
      ))}

      <Cabinet x={6.3} z={6.4} />
      <Cabinet x={8.1} z={6.4} />
      <group position={[-7.5, 0, 5.8]}>
        {[0.2, 0.62, 1.04, 1.46].map((y) => (
          <mesh
            key={y}
            position={[0, y, 0]}
            rotation={[Math.PI / 2, 0, 0]}
            castShadow
          >
            <torusGeometry args={[0.48, 0.19, 8, 20]} />
            <meshStandardMaterial color="#0b1216" roughness={0.92} />
          </mesh>
        ))}
        <mesh position={[0, 1.65, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.31, 20]} />
          <meshStandardMaterial
            color="#657475"
            metalness={0.65}
            roughness={0.35}
          />
        </mesh>
      </group>
      <mesh position={[6.7, 0.9, 3.4]} castShadow>
        <boxGeometry args={[2.2, 1.8, 0.95]} />
        <meshStandardMaterial
          color="#2d474b"
          roughness={0.55}
          metalness={0.2}
        />
      </mesh>
      <mesh position={[6.7, 1.83, 3.4]}>
        <boxGeometry args={[2.4, 0.06, 1.05]} />
        <meshStandardMaterial
          color="#7b8580"
          metalness={0.65}
          roughness={0.4}
        />
      </mesh>
      {[0.45, 0.85, 1.25].map((y) => (
        <mesh key={y} position={[6.7, y, 2.9]}>
          <boxGeometry args={[1.8, 0.03, 0.06]} />
          <meshStandardMaterial
            color="#a9b2a9"
            metalness={0.6}
            roughness={0.4}
          />
        </mesh>
      ))}

      <mesh position={[0, -0.015, 23]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[70, 22]} />
        <meshStandardMaterial
          color={desert ? '#8c8065' : '#283d45'}
          roughness={0.95}
        />
      </mesh>
      <mesh position={[0, 0.01, 18]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[65, 6]} />
        <meshStandardMaterial color="#293135" roughness={0.9} />
      </mesh>
      {[15, 21].map((z) => (
        <mesh key={z} position={[0, 0.025, z]}>
          <boxGeometry args={[65, 0.02, 0.1]} />
          <meshStandardMaterial color="#e5e0c9" />
        </mesh>
      ))}
      {Array.from({ length: 11 }, (_, i) => (
        <mesh key={i} position={[i * 5 - 25, 0.03, 18]}>
          <boxGeometry args={[2.5, 0.02, 0.12]} />
          <meshStandardMaterial color="#aaa995" />
        </mesh>
      ))}
      {desert
        ? [-20, -8, 12, 26].map((x, i) => (
            <mesh
              key={x}
              position={[x, 3, 43 + (i % 2) * 5]}
              rotation={[0, 0.4 * i, 0]}
            >
              <coneGeometry args={[12, 11 + i * 2, 4]} />
              <meshStandardMaterial color={i % 2 ? '#8d7760' : '#a38d70'} />
            </mesh>
          ))
        : [-22, -9, 10, 24].map((x, i) => (
            <group key={x}>
              <mesh position={[x, 3.5 + (i % 2), 37]}>
                <boxGeometry args={[9, 7 + (i % 2) * 2, 5]} />
                <meshStandardMaterial color="#293f4b" />
              </mesh>
              <mesh position={[x, 5, 34.4]}>
                <boxGeometry args={[7, 0.16, 0.04]} />
                <meshBasicMaterial color="#bbd9cf" />
              </mesh>
            </group>
          ))}
      <GarageCamera
        interactive={interactive}
        paused={paused}
        resetViewKey={resetViewKey}
      />
    </>
  )
}
