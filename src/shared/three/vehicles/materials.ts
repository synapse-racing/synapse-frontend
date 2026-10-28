import {
  CanvasTexture,
  Color,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  SRGBColorSpace,
} from 'three'
import type { VehicleAppearance } from '../../../features/garage/domain/appearance.ts'

const finishes = {
  matte: {
    metalness: 0.12,
    roughness: 0.62,
    clearcoat: 0.12,
    clearcoatRoughness: 0.5,
  },
  satin: {
    metalness: 0.3,
    roughness: 0.32,
    clearcoat: 0.5,
    clearcoatRoughness: 0.24,
  },
  metallic: {
    metalness: 0.65,
    roughness: 0.26,
    clearcoat: 0.85,
    clearcoatRoughness: 0.13,
  },
}

export function createVehicleMaterials(
  appearance: VehicleAppearance,
  faded: boolean,
) {
  const fade = {
    transparent: faded,
    opacity: faded ? 0.35 : 1,
    depthWrite: !faded,
  }
  const paint = new MeshPhysicalMaterial({
    color: appearance.primaryColor,
    ...finishes[appearance.finish],
    ...fade,
  })
  const secondary = new Color(appearance.secondaryColor)
  const mode =
    appearance.livery === 'stripe' ? 1 : appearance.livery === 'split' ? 2 : 0
  paint.onBeforeCompile = (shader) => {
    shader.uniforms.vehicleSecondary = { value: secondary }
    shader.uniforms.vehicleLivery = { value: mode }
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        '#include <common>\nvarying float vVehicleX;',
      )
      .replace(
        '#include <begin_vertex>',
        '#include <begin_vertex>\nvVehicleX = position.x;',
      )
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        '#include <common>\nvarying float vVehicleX;\nuniform vec3 vehicleSecondary;\nuniform float vehicleLivery;',
      )
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
        float line = 1.0 - smoothstep(0.062, 0.068, abs(vVehicleX));
        float split = step(0.0, vVehicleX);
        float mask = vehicleLivery < 0.5 ? 0.0 : (vehicleLivery < 1.5 ? line : split);
        diffuseColor.rgb = mix(diffuseColor.rgb, vehicleSecondary, mask);`,
      )
  }
  paint.customProgramCacheKey = () => 'vehicle-paint-v2'
  const basic = (color: string, metalness: number, roughness: number) =>
    new MeshStandardMaterial({ color, metalness, roughness, ...fade })
  return {
    paint,
    accent: new MeshPhysicalMaterial({
      color: appearance.secondaryColor,
      ...finishes[appearance.finish],
      ...fade,
    }),
    rim: basic(appearance.rimColor, 0.75, 0.28),
    glass: new MeshPhysicalMaterial({
      color: '#1d303b',
      metalness: 0.3,
      roughness: 0.12,
      clearcoat: 1,
      clearcoatRoughness: 0.08,
      ...fade,
    }),
    carbon: basic('#171a1d', 0.1, 0.7),
    metal: basic('#8c959c', 0.75, 0.32),
    mirror: basic('#b7cdd7', 1, 0.08),
    lights: new MeshStandardMaterial({
      color: '#e1effa',
      emissive: '#c7e4fa',
      emissiveIntensity: 0.8,
      ...fade,
    }),
    rearLights: new MeshStandardMaterial({
      color: '#d52b24',
      emissive: '#e52714',
      emissiveIntensity: 0.65,
      ...fade,
    }),
  }
}

const numbers = new Map<number, CanvasTexture>()
export function numberTexture(number: number) {
  const normalized = Math.max(1, Math.min(99, Math.round(number)))
  const existing = numbers.get(normalized)
  if (existing) return existing
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 256
  const context = canvas.getContext('2d')!
  context.fillStyle = '#efece0'
  context.fillRect(0, 0, 256, 256)
  context.fillStyle = '#1a2026'
  context.fillRect(0, 0, 256, 35)
  context.font = 'bold 17px Arial'
  context.textAlign = 'center'
  context.fillStyle = '#efece0'
  context.fillText('S Y N A P S E', 128, 24)
  context.fillStyle = '#182126'
  context.font = 'italic 900 172px Arial'
  context.textBaseline = 'middle'
  context.fillText(String(normalized).padStart(2, '0'), 122, 145, 227)
  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  texture.anisotropy = 4
  numbers.set(normalized, texture)
  return texture
}
