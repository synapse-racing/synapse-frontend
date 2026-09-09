import { CanvasTexture, RepeatWrapping, SRGBColorSpace } from 'three'
export function createSurfaceTexture(kind: 'asphalt' | 'ground') {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 128
  const context = canvas.getContext('2d')!
  const pixels = context.createImageData(128, 128)
  let seed = 42170
  for (let index = 0; index < pixels.data.length; index += 4) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
    const value = (kind === 'asphalt' ? 180 : 220) + (seed % 30)
    pixels.data[index] = pixels.data[index + 1] = pixels.data[index + 2] = value
    pixels.data[index + 3] = 255
  }
  context.putImageData(pixels, 0, 0)
  const texture = new CanvasTexture(canvas)
  texture.wrapS = texture.wrapT = RepeatWrapping
  texture.colorSpace = SRGBColorSpace
  if (kind === 'ground') texture.repeat.set(90, 90)
  return texture
}
