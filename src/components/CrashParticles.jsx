import React, { useRef, useMemo, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { useSimulatorStore } from '../store/useSimulatorStore'
import * as THREE from 'three'

function CrashParticles() {
  const particlesRef = useRef()
  const { isCrash, gps } = useSimulatorStore()
  
  const particles = useMemo(() => {
    const count = 200
    const positions = new Float32Array(count * 3)
    const velocities = new Float32Array(count * 3)
    const colors = new Float32Array(count * 3)
    
    for (let i = 0; i < count; i++) {
      const i3 = i * 3
      
      // Случайное направление для частиц
      const angle = Math.random() * Math.PI * 2
      const speed = Math.random() * 5 + 2
      const elevation = (Math.random() - 0.5) * Math.PI
      
      positions[i3] = 0
      positions[i3 + 1] = 0
      positions[i3 + 2] = 0
      
      velocities[i3] = Math.cos(angle) * Math.cos(elevation) * speed
      velocities[i3 + 1] = Math.sin(elevation) * speed + 2
      velocities[i3 + 2] = Math.sin(angle) * Math.cos(elevation) * speed
      
      // Цвета: оранжевый/красный для огня, серый для дыма
      if (i < count * 0.7) {
        // Огонь/искры
        colors[i3] = 1 // R
        colors[i3 + 1] = Math.random() * 0.5 + 0.3 // G
        colors[i3 + 2] = 0 // B
      } else {
        // Дым
        const gray = Math.random() * 0.3 + 0.1
        colors[i3] = gray
        colors[i3 + 1] = gray
        colors[i3 + 2] = gray
      }
    }
    
    return { positions, velocities, colors }
  }, [])
  
  const [active, setActive] = React.useState(false)
  const lifetimeRef = useRef(0)
  
  useEffect(() => {
    if (isCrash) {
      setActive(true)
      lifetimeRef.current = 0
    } else {
      setActive(false)
    }
  }, [isCrash])
  
  useFrame((state, delta) => {
    if (!particlesRef.current || !active) return
    
    lifetimeRef.current += delta
    
    // Продолжаем анимацию 5 секунд
    if (lifetimeRef.current > 5) {
      setActive(false)
      return
    }
    
    const positions = particlesRef.current.geometry.attributes.position.array
    const velocities = particles.velocities
    
    for (let i = 0; i < positions.length; i += 3) {
      // Обновление позиции
      positions[i] += velocities[i] * delta
      positions[i + 1] += velocities[i + 1] * delta
      positions[i + 2] += velocities[i + 2] * delta
      
      // Гравитация
      velocities[i + 1] -= 9.81 * delta
      
      // Сопротивление воздуха
      velocities[i] *= 0.98
      velocities[i + 1] *= 0.98
      velocities[i + 2] *= 0.98
      
      // Сброс при падении ниже земли
      if (positions[i + 1] < 0) {
        positions[i + 1] = 0
        velocities[i + 1] *= -0.3 // Отскок с затуханием
      }
      
      // Сброс частиц, которые улетели далеко
      if (Math.abs(positions[i]) > 50 || Math.abs(positions[i + 2]) > 50 || positions[i + 1] > 30) {
        positions[i] = 0
        positions[i + 1] = 0
        positions[i + 2] = 0
        
        const angle = Math.random() * Math.PI * 2
        const speed = Math.random() * 5 + 2
        const elevation = (Math.random() - 0.5) * Math.PI
        
        velocities[i] = Math.cos(angle) * Math.cos(elevation) * speed
        velocities[i + 1] = Math.sin(elevation) * speed + 2
        velocities[i + 2] = Math.sin(angle) * Math.cos(elevation) * speed
      }
    }
    
    particlesRef.current.geometry.attributes.position.needsUpdate = true
  })
  
  if (!active) return null
  
  return (
    <points ref={particlesRef} position={[gps.x, gps.y, gps.z]}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={particles.positions.length / 3}
          array={particles.positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          count={particles.colors.length / 3}
          array={particles.colors}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.3}
        vertexColors={true}
        transparent
        opacity={0.8}
        sizeAttenuation={true}
        blending={THREE.AdditiveBlending}
      />
    </points>
  )
}

export default CrashParticles
