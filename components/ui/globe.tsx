"use client"

import createGlobe, { COBEOptions } from "cobe"
import { useCallback, useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"

export type GlobeConfig = COBEOptions & {
  onRender?: (state: Record<string, any>) => void
  isAutoRotate?: boolean
  autoRotateSpeed?: number
  targetPhi?: number | null
  targetTheta?: number | null
}

const GLOBE_CONFIG: GlobeConfig = {
  width: 800,
  height: 800,
  onRender: () => {},
  devicePixelRatio: 2,
  phi: 0,
  theta: 0.3,
  dark: 0,
  diffuse: 0.4,
  mapSamples: 16000,
  mapBrightness: 1.2,
  baseColor: [1, 1, 1],
  markerColor: [251 / 255, 100 / 255, 21 / 255],
  glowColor: [1, 1, 1],
  markers: [
    { location: [14.5995, 120.9842], size: 0.03 },
    { location: [19.076, 72.8777], size: 0.1 },
    { location: [23.8103, 90.4125], size: 0.05 },
    { location: [30.0444, 31.2357], size: 0.07 },
    { location: [39.9042, 116.4074], size: 0.08 },
    { location: [-23.5505, -46.6333], size: 0.1 },
    { location: [19.4326, -99.1332], size: 0.1 },
    { location: [40.7128, -74.006], size: 0.1 },
    { location: [34.6937, 135.5022], size: 0.05 },
    { location: [41.0082, 28.9784], size: 0.06 },
  ],
}

export function Globe({
  className,
  config = GLOBE_CONFIG,
}: {
  className?: string
  config?: GlobeConfig
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const pointerInteracting = useRef<{ x: number; y: number } | null>(null)
  const phiRef = useRef<number>(config.phi ?? 0)
  const thetaRef = useRef<number>(config.theta ?? 0.3)
  const [width, setWidth] = useState(0)

  // Keep target refs updated so render loop can smoothly damp towards them
  const configRef = useRef(config)
  useEffect(() => {
    configRef.current = config
  }, [config])

  const updatePointerInteraction = (pos: { x: number; y: number } | null) => {
    pointerInteracting.current = pos
    if (canvasRef.current) {
      canvasRef.current.style.cursor = pos ? "grabbing" : "grab"
    }
  }

  const updateMovement = (clientX: number, clientY: number) => {
    if (pointerInteracting.current !== null) {
      const deltaX = clientX - pointerInteracting.current.x
      const deltaY = clientY - pointerInteracting.current.y
      pointerInteracting.current = { x: clientX, y: clientY }

      phiRef.current += deltaX * 0.005
      const newTheta = thetaRef.current - deltaY * 0.005
      // Clamp theta so sphere doesn't flip upside down
      const maxTheta = Math.PI / 2.2
      const minTheta = -Math.PI / 2.2
      thetaRef.current = Math.max(minTheta, Math.min(maxTheta, newTheta))
    }
  }

  const onRender = useCallback((state: Record<string, any>) => {
    const currentConfig = configRef.current
    const isDragging = pointerInteracting.current !== null

    if (!isDragging) {
      const targetPhi = currentConfig.targetPhi
      const targetTheta = currentConfig.targetTheta

      if (targetPhi !== undefined && targetPhi !== null) {
        // Shortest-path angle interpolation for phi
        let diff = (targetPhi - phiRef.current) % (2 * Math.PI)
        if (diff > Math.PI) diff -= 2 * Math.PI
        if (diff < -Math.PI) diff += 2 * Math.PI
        phiRef.current += diff * 0.08
      } else if (currentConfig.isAutoRotate !== false) {
        const speed = currentConfig.autoRotateSpeed ?? 0.003
        phiRef.current += speed
      }

      if (targetTheta !== undefined && targetTheta !== null) {
        const diffTheta = targetTheta - thetaRef.current
        thetaRef.current += diffTheta * 0.08
      }
    }

    state.phi = phiRef.current
    state.theta = thetaRef.current

    if (currentConfig.onRender) {
      currentConfig.onRender(state)
    }
  }, [])

  const onResize = useCallback(() => {
    if (canvasRef.current) {
      setWidth(canvasRef.current.offsetWidth)
    }
  }, [])

  useEffect(() => {
    window.addEventListener("resize", onResize)
    onResize()
    return () => window.removeEventListener("resize", onResize)
  }, [onResize])

  useEffect(() => {
    if (!canvasRef.current || width === 0) return

    const globe = createGlobe(canvasRef.current, {
      ...config,
      width: width * 2,
      height: width * 2,
      onRender,
    } as any)

    if (canvasRef.current) {
      canvasRef.current.style.opacity = "1"
    }

    return () => {
      globe.destroy()
    }
  }, [width, config.markers, config.mapSamples, config.dark, config.diffuse, onRender])

  return (
    <div
      className={cn(
        "absolute inset-0 mx-auto aspect-[1/1] w-full max-w-[600px]",
        className,
      )}
    >
      <canvas
        className={cn(
          "size-full opacity-0 transition-opacity duration-500 [contain:layout_paint_size]",
        )}
        ref={canvasRef}
        onPointerDown={(e) =>
          updatePointerInteraction({ x: e.clientX, y: e.clientY })
        }
        onPointerUp={() => updatePointerInteraction(null)}
        onPointerOut={() => updatePointerInteraction(null)}
        onMouseMove={(e) => updateMovement(e.clientX, e.clientY)}
        onTouchStart={(e) =>
          e.touches[0] &&
          updatePointerInteraction({
            x: e.touches[0].clientX,
            y: e.touches[0].clientY,
          })
        }
        onTouchEnd={() => updatePointerInteraction(null)}
        onTouchMove={(e) =>
          e.touches[0] && updateMovement(e.touches[0].clientX, e.touches[0].clientY)
        }
      />
    </div>
  )
}
