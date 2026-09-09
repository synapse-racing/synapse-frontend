import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import type { Group } from 'three'
import { useReducedMotion } from '../game/preferences.tsx'
import { RaceCarModel } from './RaceCarModel.tsx'
import { SceneCanvas } from './SceneCanvas.tsx'
function Garage() {
  const car = useRef<Group>(null)
  const reducedMotion = useReducedMotion()
  useFrame(({ clock, camera }) => {
    if (car.current) car.current.rotation.y = -0.65 + (reducedMotion ? 0 : Math.sin(clock.elapsedTime * 0.12) * 0.16)
    camera.lookAt(0, 0.35, 0)
  })
  return <>
    <color attach="background" args={['#151819']} /><fog attach="fog" args={['#151819', 16, 35]} />
    <ambientLight intensity={0.7} /><hemisphereLight args={['#e1e4da', '#292a27', 1.2]} />
    <spotLight position={[3, 7, 1]} intensity={110} angle={0.7} penumbra={0.8} castShadow shadow-mapSize={[1024, 1024]} />
    <pointLight position={[-3, 2, -2]} intensity={24} color="#ff803e" />
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow><planeGeometry args={[80, 80]} /><meshStandardMaterial color="#232727" roughness={0.62} metalness={0.25} /></mesh>
    <mesh position={[0, -0.1, 0]} receiveShadow><cylinderGeometry args={[3.2, 3.3, 0.18, 64]} /><meshStandardMaterial color="#343735" metalness={0.3} roughness={0.5} /></mesh>
    <group ref={car} scale={1.65}><RaceCarModel /></group>
    {[-6, -3, 0, 3, 6].map(x => <group key={x} position={[x, 0, -5]}>
      <mesh position={[0, 2.5, 0]}><boxGeometry args={[0.16, 5, 0.2]} /><meshStandardMaterial color="#373b3a" /></mesh>
      <mesh position={[0, 3.6, 0.12]}><boxGeometry args={[0.06, 1.7, 0.05]} /><meshBasicMaterial color={x % 2 === 0 ? '#f1eee1' : '#ff722d'} /></mesh>
    </group>)}
    <gridHelper args={[50, 25, '#474943', '#303330']} position={[0, -0.005, 0]} />
  </>
}
export default function GarageScene() { return <SceneCanvas garage><Garage /></SceneCanvas> }
