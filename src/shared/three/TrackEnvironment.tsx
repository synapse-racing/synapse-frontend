import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import {
  CanvasTexture,
  Color,
  DoubleSide,
  InstancedMesh,
  Object3D,
  SRGBColorSpace,
} from 'three'
import type { TrackDefinition } from '../../features/training/domain/track.ts'
import { useGamePreferences } from '../game/preferences.ts'
import { createRoadGeometry, trackExtent } from './track-geometry.ts'
import { createSurfaceTexture } from './surface-texture.ts'

export type TrackTheme = 'desert' | 'tournament'

function BoundaryPaint({
  track,
  theme,
}: {
  track: TrackDefinition
  theme: TrackTheme
}) {
  const stripes = useRef<InstancedMesh>(null)
  useLayoutEffect(() => {
    const object = new Object3D()
    track.boundaries.forEach(([x1, z1, x2, z2], index) => {
      object.position.set((x1 + x2) / 2, 0.055, (z1 + z2) / 2)
      object.rotation.set(0, Math.atan2(-(z2 - z1), x2 - x1), 0)
      object.scale.set(
        Math.hypot(x2 - x1, z2 - z1) + 0.02,
        0.045,
        theme === 'desert' ? 0.16 : 0.55,
      )
      object.updateMatrix()
      stripes.current?.setMatrixAt(index, object.matrix)
    })
    if (stripes.current) {
      stripes.current.instanceMatrix.needsUpdate = true
      stripes.current.computeBoundingSphere()
    }
  }, [track, theme])
  return (
    <instancedMesh
      ref={stripes}
      args={[undefined, undefined, track.boundaries.length]}
    >
      <boxGeometry />
      <meshStandardMaterial
        color={theme === 'desert' ? '#e4ce84' : '#f3e9d7'}
        roughness={0.9}
      />
    </instancedMesh>
  )
}

function TrackBarriers({ track, desert }: { track: TrackDefinition; desert: boolean }) {
  const mesh = useRef<InstancedMesh>(null)
  const walls = useMemo(() => track.walls.filter((_, index) => !desert || index % 6 < 2), [track, desert])
  useLayoutEffect(() => {
    const object = new Object3D()
    walls.forEach((wall, index) => {
      object.position.set(wall.position[0], desert ? 0.25 : 0.38, wall.position[2])
      object.rotation.set(0, wall.rotationY, 0)
      object.scale.set(desert ? 1 : wall.size[0], 1, 1)
      object.updateMatrix()
      mesh.current?.setMatrixAt(index, object.matrix)
      mesh.current?.setColorAt(index, new Color(desert ? '#e17c3e' : index % 4 < 2 ? '#c75039' : '#e6e2ce'))
    })
    if (mesh.current) {
      mesh.current.instanceMatrix.needsUpdate = true
      if (mesh.current.instanceColor) mesh.current.instanceColor.needsUpdate = true
      mesh.current.computeBoundingSphere()
    }
  }, [walls, desert])
  return <instancedMesh ref={mesh} args={[undefined, undefined, walls.length]} receiveShadow>
    {desert ? <coneGeometry args={[0.2, 0.5, 8]} /> : <boxGeometry args={[1, 0.7, 0.3]} />}
    <meshStandardMaterial roughness={0.9} />
  </instancedMesh>
}

function SectorGate({
  track,
  theme,
}: {
  track: TrackDefinition
  theme: TrackTheme
}) {
  const checkpoint = track.checkpoints.at(-1)!
  const width = checkpoint.size[0] + 1.8
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 512
    canvas.height = 96
    const context = canvas.getContext('2d')!
    context.fillStyle = '#202925'
    context.fillRect(0, 0, 512, 96)
    context.fillStyle = '#ff793f'
    context.fillRect(0, 82, 512, 14)
    context.fillStyle = '#f2eee1'
    context.font = 'bold italic 35px Arial'
    context.textAlign = 'center'
    context.fillText(
      theme === 'desert' ? 'SYNAPSE / TEST FIELD' : 'SYNAPSE / START + FINISH',
      256,
      57,
    )
    const texture = new CanvasTexture(canvas)
    texture.colorSpace = SRGBColorSpace
    return texture
  }, [theme])
  useEffect(() => () => texture.dispose(), [texture])
  return (
    <group
      position={[checkpoint.position[0], 0, checkpoint.position[2]]}
      rotation={[0, checkpoint.rotationY, 0]}
    >
      {[-1, 1].map((side) => (
        <mesh key={side} position={[(side * width) / 2, 1.8, 0]} castShadow>
          <boxGeometry args={[0.25, 3.6, 0.3]} />
          <meshStandardMaterial color="#e5e0c9" />
        </mesh>
      ))}
      <mesh position={[0, 3.4, 0]}>
        <boxGeometry args={[width + 0.4, 0.85, 0.25]} />
        <meshStandardMaterial color="#202925" />
      </mesh>
      <mesh position={[0, 3.4, 0.14]}>
        <planeGeometry args={[width, 0.8]} />
        <meshBasicMaterial map={texture} side={DoubleSide} />
      </mesh>
    </group>
  )
}

export function TrackEnvironment({
  track,
  theme,
}: {
  track: TrackDefinition
  theme: TrackTheme
}) {
  const { preferences } = useGamePreferences()
  const high = preferences.quality === 'high',
    desert = theme === 'desert'
  const geometry = useMemo(() => createRoadGeometry(track), [track])
  const surfaces = useMemo(
    () => ({
      road: createSurfaceTexture('asphalt'),
      ground: createSurfaceTexture('ground'),
    }),
    [],
  )
  useEffect(
    () => () => {
      surfaces.road.dispose()
      surfaces.ground.dispose()
    },
    [surfaces],
  )
  useEffect(() => () => geometry.dispose(), [geometry])
  const extent = useMemo(() => trackExtent(track), [track])
  const radius = Math.hypot(extent.x, extent.z) + 22
  return (
    <>
      <color attach="background" args={[desert ? '#d4b78c' : '#a8c3cf']} />
      <fog attach="fog" args={[desert ? '#d4b78c' : '#a8c3cf', Math.max(75, radius * 2), Math.max(230, radius * 5)]} />
      <hemisphereLight
        args={[
          desert ? '#fff1ce' : '#e8f5ff',
          desert ? '#977750' : '#607553',
          1.7,
        ]}
      />
      <directionalLight
        position={[-30, 45, 15]}
        intensity={desert ? 2.8 : 2.3}
        color={desert ? '#ffe0ac' : '#fff5dc'}
        castShadow={high}
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-60}
        shadow-camera-right={60}
        shadow-camera-top={60}
        shadow-camera-bottom={-60}
        shadow-camera-far={140}
        shadow-bias={-0.0003}
      />
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.045, 0]}
        receiveShadow
      >
        <planeGeometry args={[650, 650]} />
        <meshStandardMaterial
          color={desert ? '#bda273' : '#75815a'}
          map={surfaces.ground}
          roughness={1}
        />
      </mesh>
      <mesh geometry={geometry} receiveShadow>
        <meshStandardMaterial
          color={desert ? '#686457' : '#424b4d'}
          map={surfaces.road}
          roughness={0.95}
          side={DoubleSide}
        />
      </mesh>
      <BoundaryPaint track={track} theme={theme} />
      <TrackBarriers track={track} desert={desert} />
      {track.checkpoints.map((checkpoint) => (
        <group
          key={checkpoint.id}
          position={[checkpoint.position[0], 0.015, checkpoint.position[2]]}
          rotation={[0, checkpoint.rotationY, 0]}
        >
          {Array.from({ length: checkpoint.index === track.checkpoints.length - 1 ? 10 : 1 }, (_, index) => (
            <mesh
              key={index}
              position={[checkpoint.index === track.checkpoints.length - 1 ? ((index - 4.5) * checkpoint.size[0]) / 10 : 0, 0, 0]}
              rotation={[-Math.PI / 2, 0, 0]}
            >
              <planeGeometry args={[checkpoint.size[0] / (checkpoint.index === track.checkpoints.length - 1 ? 10 : 1), 0.65]} />
              <meshBasicMaterial
                color={index % 2 === 0 ? '#ebe4ce' : '#343b35'}
              />
            </mesh>
          ))}
        </group>
      ))}
      <SectorGate track={track} theme={theme} />
      {desert ? (
        <>
          {Array.from({ length: high ? 22 : 9 }, (_, index) => {
            const angle = index * 2.399 + (track.recipe.seed % 12)
            const distance = radius + (index % 4) * 12
            return (
              <mesh
                key={index}
                position={[
                  Math.cos(angle) * distance,
                  3,
                  Math.sin(angle) * distance,
                ]}
                scale={[7 + (index % 5), 5 + (index % 7), 8]}
                rotation={[0, angle, 0]}
              >
                <dodecahedronGeometry args={[1, 0]} />
                <meshStandardMaterial
                  color={index % 2 ? '#ad895e' : '#b6966a'}
                  roughness={1}
                  flatShading
                />
              </mesh>
            )
          })}
          <group position={[extent.x + 12, 0, 0]}>
            <mesh position={[0, 1.2, 0]} castShadow>
              <boxGeometry args={[5, 2.4, 3]} />
              <meshStandardMaterial color="#d7c9a4" />
            </mesh>
            <mesh position={[0, 2.5, 0]}>
              <boxGeometry args={[5.4, 0.15, 3.4]} />
              <meshStandardMaterial color="#575e49" />
            </mesh>
            <mesh position={[-2.6, 2.8, 0]}>
              <cylinderGeometry args={[0.06, 0.06, 5.6, 6]} />
              <meshStandardMaterial color="#626451" />
            </mesh>
          </group>
        </>
      ) : (
        <>
          {[-1, 1].map((side) => (
            <group
              key={side}
              position={[side * (extent.x + 12), 0, 0]}
              rotation={[0, side > 0 ? 0 : Math.PI, 0]}
            >
              {Array.from({ length: high ? 5 : 3 }, (_, row) => (
                <mesh
                  key={row}
                  position={[row * 1.1, row * 0.6 + 0.3, 0]}
                  receiveShadow
                  castShadow={high}
                >
                  <boxGeometry args={[1.3, 0.6 + row * 1.2, 24]} />
                  <meshStandardMaterial
                    color={row % 2 ? '#d4d5c4' : '#45606a'}
                  />
                </mesh>
              ))}
              <mesh position={[2, 5.4, 0]} castShadow={high}>
                <boxGeometry args={[8, 0.18, 26]} />
                <meshStandardMaterial color="#e3e0cb" />
              </mesh>
              {[-11, 11].map((z) => (
                <mesh key={z} position={[4.5, 2.6, z]}>
                  <boxGeometry args={[0.2, 5.2, 0.2]} />
                  <meshStandardMaterial color="#4d5e5e" />
                </mesh>
              ))}
            </group>
          ))}
          {[-1, 1].flatMap((x) =>
            [-1, 1].map((z) => (
              <group
                key={`${x}-${z}`}
                position={[x * (extent.x + 7), 0, z * (extent.z + 6)]}
              >
                <mesh position={[0, 5, 0]}>
                  <cylinderGeometry args={[0.12, 0.2, 10, 8]} />
                  <meshStandardMaterial color="#526165" />
                </mesh>
                <mesh position={[0, 10, 0]} rotation={[0.35, 0, 0]}>
                  <boxGeometry args={[2.8, 0.65, 0.4]} />
                  <meshStandardMaterial
                    color="#f1eed7"
                    emissive="#ffebbb"
                    emissiveIntensity={0.8}
                  />
                </mesh>
              </group>
            )),
          )}
          <mesh position={[0, 1.3, -extent.z - 9]} castShadow={high}>
            <boxGeometry args={[15, 2.6, 5]} />
            <meshStandardMaterial color="#d8ddd2" />
          </mesh>
        </>
      )}
    </>
  )
}
