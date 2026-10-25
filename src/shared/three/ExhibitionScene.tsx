import { useFrame, useThree } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import type { MutableRefObject } from 'react'
import { DirectionalLight, Group, PerspectiveCamera, Vector3 } from 'three'
import { generateTrack } from '../../features/training/domain/track.ts'
import { createExhibitionPath, exhibitionCar, exhibitionShot } from '../game/exhibition.ts'
import type { TrackTheme } from './TrackEnvironment.tsx'
import { TrackEnvironment } from './TrackEnvironment.tsx'
import { RaceCarModel } from './RaceCarModel.tsx'

interface Props {
  theme: TrackTheme
  calm: boolean
  paused: boolean
  reduced: boolean
  visible: boolean
  onShot: (index: number) => void
  audioSpeed: MutableRefObject<number>
}

export default function ExhibitionScene({ theme, calm, paused, reduced, visible, onShot, audioSpeed }: Props) {
  const track = useMemo(() => generateTrack({ version: 'curved-loop-v1', seed: theme === 'desert' ? 42170 : 42 }), [theme])
  const path = useMemo(() => createExhibitionPath(track), [track])
  const cars = useRef<Array<Group | null>>([])
  const sun = useRef<DirectionalLight>(null)
  const time = useRef(0)
  const previous = useRef('')
  const { camera, size } = useThree()
  const vectors = useMemo(() => ({ position: new Vector3(), target: new Vector3(), right: new Vector3(), up: new Vector3(0, 1, 0) }), [])
  const speeds = useRef([0, 0, 0, 0])

  useFrame((_, delta) => {
    const moving = !paused && !reduced && visible
    if (moving) time.current += Math.min(delta, 0.05)
    const shot = exhibitionShot(time.current)
    const shotIndex = calm || reduced ? 0 : shot.index
    const identity = `${theme}-${shotIndex}-${calm}-${size.width}-${size.height}`
    const cut = previous.current !== identity
    if (cut) { previous.current = identity; onShot(shotIndex) }
    if (!moving && !cut) return
    for (let i = 0; i < 4; i++) {
      const pose = exhibitionCar(path, time.current, i)
      cars.current[i]?.position.set(pose.x, 0, pose.z)
      cars.current[i]?.rotation.set(0, pose.yaw, 0)
      speeds.current[i] = moving ? pose.speed : 0
    }
    const hero = exhibitionCar(path, time.current, 0)
    audioSpeed.current = moving ? hero.speed : 0
    const forwardX = -Math.sin(hero.yaw), forwardZ = -Math.cos(hero.yaw)
    const rightX = Math.cos(hero.yaw), rightZ = -Math.sin(hero.yaw)
    const { position, target, right, up } = vectors
    target.set(hero.x, 0.6, hero.z)
    let fov = 44
    switch (shotIndex) {
      case 0:
        position.set(hero.x - forwardX * 12 + rightX * 15, calm ? 19 : 24, hero.z - forwardZ * 12 + rightZ * 15)
        fov = 42
        break
      case 1:
        position.set(hero.x - forwardX * 8 + rightX * 2, 2.5, hero.z - forwardZ * 8 + rightZ * 2)
        target.add(new Vector3(forwardX * 3, 0, forwardZ * 3))
        fov = 52
        break
      case 2: {
        const anchor = path.pose(hero.distance + (1 - shot.progress) * 19 - 6, 7)
        position.set(anchor.x, 1.25, anchor.z)
        fov = 60
        break
      }
      case 3:
        position.set(hero.x + rightX * 9 - forwardX * 2, 2, hero.z + rightZ * 9 - forwardZ * 2)
        fov = 46
        break
      default:
        position.set(hero.x + forwardX * 13 + rightX * 9, 10, hero.z + forwardZ * 13 + rightZ * 9)
        fov = 48
    }
    // Frame the race on the open side of the menu instead of behind its text.
    right.copy(target).sub(position).cross(up).normalize()
    target.addScaledVector(right, size.width > 850 ? -4.5 : -0.5)
    if (cut || reduced) camera.position.copy(position)
    else camera.position.lerp(position, 1 - Math.exp(-5 * Math.min(delta, 0.05)))
    camera.lookAt(target)
    if (camera instanceof PerspectiveCamera) {
      camera.fov = size.width < 650 ? fov + 14 : fov
      camera.updateProjectionMatrix()
    }
    if (sun.current) {
      sun.current.position.set(hero.x - 18, 24, hero.z + 12)
      sun.current.target.position.set(hero.x, 0, hero.z)
      sun.current.target.updateMatrixWorld()
    }
  }, -1)

  return (
    <>
      <TrackEnvironment track={track} theme={theme} cinematic />
      <directionalLight ref={sun} intensity={2.4} color="#ffd8a4" castShadow
        shadow-mapSize={[1024, 1024]} shadow-camera-left={-24} shadow-camera-right={24}
        shadow-camera-top={24} shadow-camera-bottom={-24} shadow-camera-far={100} shadow-bias={-0.0005} />
      {['#ff6f35', '#e3e7dd', '#8ab8bf', '#d4ac47'].map((color, i) => (
        <group key={color} ref={(group) => { cars.current[i] = group }}>
          <RaceCarModel color={color} getSpeed={() => paused || reduced || !visible ? 0 : speeds.current[i]} />
        </group>
      ))}
    </>
  )
}
