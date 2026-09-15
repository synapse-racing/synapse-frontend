import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo } from 'react'
import { BufferAttribute, BufferGeometry, Color, DynamicDrawUsage } from 'three'
import type { TrackDefinition } from '../domain/track.ts'
import {
  senseSimulation,
  sensorAngles,
  type SimulationState,
} from '../simulation/race-contract.ts'

const hitColor = new Color('#ff4040')
const clearColor = new Color('#59e4d2')
const selectedColor = new Color('#ffe178')

export function SensorRays({
  getState,
  track,
  selected,
}: {
  getState: () => SimulationState
  track: TrackDefinition
  selected: boolean
}) {
  const buffer = useMemo(() => {
    const positions = new Float32Array(sensorAngles.length * 6)
    const attribute = new BufferAttribute(positions, 3).setUsage(
      DynamicDrawUsage,
    )
    const hits = new Uint8Array(sensorAngles.length)
    const colors = new BufferAttribute(
      new Float32Array(sensorAngles.length * 6),
      3,
    ).setUsage(DynamicDrawUsage)
    const geometry = new BufferGeometry()
      .setAttribute('position', attribute)
      .setAttribute('color', colors)
    return {
      positions,
      hits,
      colors,
      attribute,
      geometry,
      x: NaN,
      z: NaN,
      yaw: NaN,
      track: null as TrackDefinition | null,
      selected: undefined as boolean | undefined,
    }
  }, [])
  useEffect(() => () => buffer.geometry.dispose(), [buffer])

  useFrame(() => {
    const state = getState()
    const poseUnchanged =
      track === buffer.track &&
      state.x === buffer.x &&
      state.z === buffer.z &&
      state.yaw === buffer.yaw
    if (poseUnchanged && selected === buffer.selected) return
    if (!poseUnchanged) {
      senseSimulation(state, track, buffer.positions, buffer.hits)
      buffer.attribute.needsUpdate = true
    }
    buffer.hits.forEach((hit, index) => {
      const color = hit ? hitColor : selected ? selectedColor : clearColor
      buffer.colors.setXYZ(index * 2, color.r, color.g, color.b)
      buffer.colors.setXYZ(index * 2 + 1, color.r, color.g, color.b)
    })
    buffer.colors.needsUpdate = true
    buffer.selected = selected
    buffer.x = state.x
    buffer.z = state.z
    buffer.yaw = state.yaw
    buffer.track = track
  })

  return (
    <lineSegments
      geometry={buffer.geometry}
      frustumCulled={false}
      renderOrder={10}
    >
      <lineBasicMaterial
        vertexColors
        toneMapped={false}
        transparent
        opacity={selected ? 1 : 0.65}
        depthTest={false}
        depthWrite={false}
      />
    </lineSegments>
  )
}
