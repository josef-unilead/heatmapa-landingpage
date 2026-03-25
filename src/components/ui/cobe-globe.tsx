"use client"

import { useEffect, useRef, useCallback, useState } from "react"
import createGlobe from "cobe"

interface Marker {
  id: string
  location: [number, number]
  label: string
  image?: string
  type?: "event" | "person" | "place" | "business"
  icon?: "coffee" | "restaurant" | "club"
  color?: string
}

interface Arc {
  id: string
  from: [number, number]
  to: [number, number]
  label?: string
}

interface GlobeProps {
  markers?: Marker[]
  arcs?: Arc[]
  className?: string
  markerColor?: [number, number, number]
  baseColor?: [number, number, number]
  arcColor?: [number, number, number]
  glowColor?: [number, number, number]
  dark?: number
  mapBrightness?: number
  markerSize?: number
  markerElevation?: number
  arcWidth?: number
  arcHeight?: number
  speed?: number
  theta?: number
  diffuse?: number
  mapSamples?: number
}

function projectMarker(
  lat: number,
  lng: number,
  currentPhi: number,
  currentTheta: number,
  containerSize: number
) {
  const latRad = (lat * Math.PI) / 180
  const lngRad = (lng * Math.PI) / 180

  // Spherical to cartesian
  const sx = Math.cos(latRad) * Math.sin(lngRad)
  const sy = -Math.sin(latRad)
  const sz = Math.cos(latRad) * Math.cos(lngRad)

  // Rotate by phi (Y-axis)
  const rx = sx * Math.cos(currentPhi) + sz * Math.sin(currentPhi)
  const rz = -sx * Math.sin(currentPhi) + sz * Math.cos(currentPhi)

  // Rotate by theta (X-axis)
  const ry = sy * Math.cos(currentTheta) - rz * Math.sin(currentTheta)
  const fz = sy * Math.sin(currentTheta) + rz * Math.cos(currentTheta)

  const radius = containerSize / 2
  return {
    x: radius + rx * radius,
    y: radius + ry * radius,
    visible: fz > 0,
  }
}

export function Globe({
  markers = [],
  arcs = [],
  className = "",
  markerColor = [0.3, 0.45, 0.85],
  baseColor = [1, 1, 1],
  arcColor = [0.3, 0.45, 0.85],
  glowColor = [0.94, 0.93, 0.91],
  dark = 0,
  mapBrightness = 10,
  markerSize = 0.025,
  markerElevation = 0.01,
  arcWidth = 0.5,
  arcHeight = 0.25,
  speed = 0.003,
  theta = 0.2,
  diffuse = 1.5,
  mapSamples = 16000,
}: GlobeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const pointerInteracting = useRef<{ x: number; y: number } | null>(null)
  const lastPointer = useRef<{ x: number; y: number; t: number } | null>(null)
  const dragOffset = useRef({ phi: 0, theta: 0 })
  const velocity = useRef({ phi: 0, theta: 0 })
  const phiOffsetRef = useRef(0)
  const thetaOffsetRef = useRef(0)
  const isPausedRef = useRef(false)
  const markerElsRef = useRef<Record<string, HTMLDivElement | null>>({})

  const [supportsAnchor] = useState(
    () => typeof CSS !== "undefined" && !!CSS.supports?.("position-anchor", "--test")
  )

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      pointerInteracting.current = { x: e.clientX, y: e.clientY }
      if (canvasRef.current) canvasRef.current.style.cursor = "grabbing"
      isPausedRef.current = true
    },
    []
  )

  const handlePointerMove = useCallback((e: PointerEvent) => {
    if (pointerInteracting.current !== null) {
      const deltaX = e.clientX - pointerInteracting.current.x
      const deltaY = e.clientY - pointerInteracting.current.y
      dragOffset.current = { phi: deltaX / 300, theta: deltaY / 1000 }
      const now = Date.now()
      if (lastPointer.current) {
        const dt = Math.max(now - lastPointer.current.t, 1)
        const maxVelocity = 0.15
        velocity.current = {
          phi: Math.max(
            -maxVelocity,
            Math.min(maxVelocity, ((e.clientX - lastPointer.current.x) / dt) * 0.3)
          ),
          theta: Math.max(
            -maxVelocity,
            Math.min(maxVelocity, ((e.clientY - lastPointer.current.y) / dt) * 0.08)
          ),
        }
      }
      lastPointer.current = { x: e.clientX, y: e.clientY, t: now }
    }
  }, [])

  const handlePointerUp = useCallback(() => {
    if (pointerInteracting.current !== null) {
      phiOffsetRef.current += dragOffset.current.phi
      thetaOffsetRef.current += dragOffset.current.theta
      dragOffset.current = { phi: 0, theta: 0 }
      lastPointer.current = null
    }
    pointerInteracting.current = null
    if (canvasRef.current) canvasRef.current.style.cursor = "grab"
    isPausedRef.current = false
  }, [])

  useEffect(() => {
    window.addEventListener("pointermove", handlePointerMove, { passive: true })
    window.addEventListener("pointerup", handlePointerUp, { passive: true })
    return () => {
      window.removeEventListener("pointermove", handlePointerMove)
      window.removeEventListener("pointerup", handlePointerUp)
    }
  }, [handlePointerMove, handlePointerUp])

  useEffect(() => {
    if (!canvasRef.current) return
    const canvas = canvasRef.current
    let globe: ReturnType<typeof createGlobe> | null = null
    let animationId: number
    let phi = 0

    function init() {
      const width = canvas.offsetWidth
      if (width === 0 || globe) return

      const isMobile = width < 400
      const dpr = isMobile ? 1 : Math.min(window.devicePixelRatio || 1, 2)
      const samples = isMobile ? 6000 : mapSamples
      globe = createGlobe(canvas, {
        devicePixelRatio: dpr,
        width,
        height: width,
      phi: 0,
      theta,
      dark,
      diffuse,
      mapSamples: samples,
      mapBrightness,
      baseColor,
      markerColor,
      glowColor,
      markerElevation,
      markers: markers.map((m) => ({
        location: m.location,
        size: markerSize,
        id: m.id,
      })),
      arcs: arcs.map((a) => ({
        from: a.from,
        to: a.to,
        id: a.id,
      })),
      arcColor,
      arcWidth,
      arcHeight,
      opacity: 0.7,
    })

    function animate() {
      if (!isPausedRef.current) {
        phi += speed
        if (
          Math.abs(velocity.current.phi) > 0.0001 ||
          Math.abs(velocity.current.theta) > 0.0001
        ) {
          phiOffsetRef.current += velocity.current.phi
          thetaOffsetRef.current += velocity.current.theta
          velocity.current.phi *= 0.95
          velocity.current.theta *= 0.95
        }
        const thetaMin = -0.4,
          thetaMax = 0.4
        if (thetaOffsetRef.current < thetaMin) {
          thetaOffsetRef.current += (thetaMin - thetaOffsetRef.current) * 0.1
        } else if (thetaOffsetRef.current > thetaMax) {
          thetaOffsetRef.current += (thetaMax - thetaOffsetRef.current) * 0.1
        }
      }

      const currentPhi = phi + phiOffsetRef.current + dragOffset.current.phi
      const currentTheta = theta + thetaOffsetRef.current + dragOffset.current.theta

      globe!.update({
        phi: currentPhi,
        theta: currentTheta,
        dark,
        mapBrightness,
        markerColor,
        baseColor,
        arcColor,
        markerElevation,
        markers: markers.map((m) => ({
          location: m.location,
          size: markerSize,
          id: m.id,
        })),
        arcs: arcs.map((a) => ({
          from: a.from,
          to: a.to,
          id: a.id,
        })),
      })

      // JS fallback: position markers manually when CSS Anchor Positioning is not supported
      if (!supportsAnchor) {
        const size = canvas.offsetWidth
        markers.forEach((m) => {
          const el = markerElsRef.current[m.id]
          if (!el) return
          const pos = projectMarker(
            m.location[0],
            m.location[1],
            currentPhi,
            currentTheta,
            size
          )
          el.style.left = `${pos.x}px`
          el.style.top = `${pos.y}px`
          el.style.opacity = pos.visible ? "1" : "0"
          el.style.filter = pos.visible ? "none" : "blur(8px)"
        })
      }

      animationId = requestAnimationFrame(animate)
    }
      animate()
      setTimeout(() => canvas && (canvas.style.opacity = "1"))
    }

    if (canvas.offsetWidth > 0) {
      init()
    } else {
      const ro = new ResizeObserver((entries) => {
        if (entries[0]?.contentRect.width > 0) {
          ro.disconnect()
          init()
        }
      })
      ro.observe(canvas)
    }

    return () => {
      if (animationId) cancelAnimationFrame(animationId)
      if (globe) globe.destroy()
    }
  }, [markers, arcs, markerColor, baseColor, arcColor, glowColor, dark, mapBrightness, markerSize, markerElevation, arcWidth, arcHeight, speed, theta, diffuse, mapSamples, supportsAnchor])

  return (
    <div className={`relative aspect-square select-none ${className}`}>
      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        style={{
          width: "100%",
          height: "100%",
          cursor: "grab",
          opacity: 0,
          transition: "opacity 1.2s ease",
          borderRadius: "50%",
          touchAction: "none",
        }}
      />
      <div className="hidden md:contents">
      {markers.map((m) => {
        const isImage = !!m.image
        const isPerson = m.type === "person"
        const isEvent = m.type === "event"
        const isBusiness = m.type === "business"

        // Anchor-based styles (Chrome 125+)
        const anchorStyle: React.CSSProperties = supportsAnchor
          ? {
              position: "absolute",
              // @ts-expect-error CSS Anchor Positioning
              positionAnchor: `--cobe-${m.id}`,
              bottom: "anchor(top)",
              left: "anchor(center)",
              translate: "-50% 0",
              marginBottom: 4,
              pointerEvents: "none" as const,
              opacity: `var(--cobe-visible-${m.id}, 0)`,
              filter: `blur(calc((1 - var(--cobe-visible-${m.id}, 0)) * 8px))`,
              transition: "opacity 0.8s, filter 0.8s",
            }
          : {
              // JS fallback styles — positioned via animation loop
              position: "absolute" as const,
              transform: "translate(-50%, -100%)",
              pointerEvents: "none" as const,
              opacity: 0,
              transition: "opacity 0.3s, filter 0.3s",
            }

        return (
          <div
            key={m.id}
            ref={(el) => {
              markerElsRef.current[m.id] = el
            }}
            style={anchorStyle}
          >
            {isBusiness ? (
              <div style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 1,
              }}>
                <div style={{
                  width: 30,
                  height: 30,
                  borderRadius: "50% 50% 50% 0",
                  transform: "rotate(-45deg)",
                  background: `${m.color || "#f97316"}44`,
                  backdropFilter: "blur(12px)",
                  WebkitBackdropFilter: "blur(12px)",
                  border: `2px solid ${m.color || "#f97316"}88`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: `0 4px 16px ${m.color || "#f97316"}44, inset 0 1px 0 ${m.color || "#f97316"}55`,
                }}>
                  {m.icon === "coffee" ? (
                    <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 15, height: 15, transform: "rotate(45deg)" }}>
                      <path d="M17 8h1a4 4 0 110 8h-1" />
                      <path d="M3 8h14v9a4 4 0 01-4 4H7a4 4 0 01-4-4V8z" />
                      <line x1="6" y1="2" x2="6" y2="4" />
                      <line x1="10" y1="2" x2="10" y2="4" />
                      <line x1="14" y1="2" x2="14" y2="4" />
                    </svg>
                  ) : m.icon === "restaurant" ? (
                    <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 15, height: 15, transform: "rotate(45deg)" }}>
                      <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 002-2V2" />
                      <path d="M7 2v20" />
                      <path d="M21 15V2v0a5 5 0 00-5 5v6c0 1.1.9 2 2 2h3zm0 0v7" />
                    </svg>
                  ) : m.icon === "club" ? (
                    <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 15, height: 15, transform: "rotate(45deg)" }}>
                      <path d="M9 18V5l12-2v13" />
                      <circle cx="6" cy="18" r="3" />
                      <circle cx="18" cy="16" r="3" />
                    </svg>
                  ) : null}
                </div>
                <span style={{
                  fontSize: "0.55rem",
                  letterSpacing: "0.06em",
                  textTransform: "uppercase" as const,
                  whiteSpace: "nowrap" as const,
                  color: m.color || "#fbbf24",
                  fontFamily: "monospace",
                  fontWeight: 600,
                  textShadow: `0 1px 4px rgba(0,0,0,0.9), 0 0 8px ${m.color || "#f97316"}44`,
                  marginTop: 3,
                }}>
                  {m.label}
                </span>
              </div>
            ) : isImage ? (
              <div style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 2,
              }}>
                <div style={{
                  width: isPerson ? 33 : isEvent ? 36 : 30,
                  height: isPerson ? 33 : isEvent ? 36 : 30,
                  borderRadius: isPerson ? "50%" : isEvent ? 11 : 9,
                  border: isPerson
                    ? "2.5px solid #f97316"
                    : isEvent
                    ? "2.5px solid #a855f7"
                    : "2.5px solid #f97316",
                  overflow: "hidden",
                  boxShadow: isPerson
                    ? "0 4px 16px rgba(249,115,22,0.4)"
                    : isEvent
                    ? "0 4px 16px rgba(168,85,247,0.4)"
                    : "0 4px 16px rgba(249,115,22,0.4)",
                  background: "#111",
                }}>
                  <img
                    src={m.image}
                    alt={m.label}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      display: "block",
                    }}
                  />
                </div>
                <span style={{
                  fontSize: "0.55rem",
                  letterSpacing: "0.06em",
                  textTransform: "uppercase" as const,
                  whiteSpace: "nowrap" as const,
                  color: "#fff",
                  fontFamily: "monospace",
                  textShadow: "0 1px 3px rgba(0,0,0,0.8)",
                }}>
                  {m.label}
                </span>
              </div>
            ) : null}
          </div>
        )
      })}
      </div>
    </div>
  )
}
