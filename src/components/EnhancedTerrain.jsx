import React, { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { RigidBody } from '@react-three/rapier'
import * as THREE from 'three'

// Компонент для анимированных объектов
function AnimatedObject({ position, children, speed = 1 }) {
  const groupRef = useRef()
  
  useFrame((state, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * speed * 0.1
    }
  })
  
  return (
    <group ref={groupRef} position={position}>
      {children}
    </group>
  )
}

// Компонент для фонарей с мерцанием
function StreetLight({ position }) {
  const lightRef = useRef()
  
  useFrame((state) => {
    if (lightRef.current) {
      // Мерцание света (случайное)
      const intensity = 0.4 + Math.sin(state.clock.elapsedTime * 2 + Math.random() * 10) * 0.1
      lightRef.current.intensity = Math.max(0.3, Math.min(0.6, intensity))
    }
  })
  
  return (
    <group position={position} userData={{ isCollidable: false }}>
      {/* Столб */}
      <mesh position={[0, 2, 0]} >
        <cylinderGeometry args={[0.05, 0.05, 4, 8]} />
        <meshStandardMaterial color={0x333333} metalness={0.8} roughness={0.2} />
      </mesh>
      {/* Фонарь */}
      <mesh position={[0, 4.2, 0]} >
        <boxGeometry args={[0.3, 0.3, 0.3]} />
        <meshStandardMaterial 
          color={0xffffaa}
          emissive={0xffffaa}
          emissiveIntensity={1}
        />
      </mesh>
      {/* Свет */}
      <pointLight
        ref={lightRef}
        position={[0, 4.2, 0]}
        intensity={0.5}
        distance={10}
        color={0xffffaa}
      />
    </group>
  )
}

// Компонент для машин с анимацией
function Car({ position, color = 0xff0000 }) {
  const carRef = useRef()
  const startPosition = useRef(position)
  
  useFrame((state, delta) => {
    if (carRef.current) {
      // Машина движется по круговой траектории
      const angle = (state.clock.elapsedTime * 0.1) % (Math.PI * 2)
      const radius = 50
      carRef.current.position.x = startPosition.current[0] + Math.cos(angle) * radius
      carRef.current.position.z = startPosition.current[2] + Math.sin(angle) * radius
      carRef.current.rotation.y = angle + Math.PI / 2
    }
  })
  
  return (
    <group ref={carRef} position={position} userData={{ isCollidable: true }}>
      <mesh  >
        <boxGeometry args={[2, 0.8, 1]} />
        <meshStandardMaterial 
          color={color}
          metalness={0.7}
          roughness={0.3}
        />
      </mesh>
      {/* Колеса */}
      {[-0.6, 0.6].map((x, i) => (
        <group key={i}>
          <mesh position={[x, -0.4, 0.5]} >
            <cylinderGeometry args={[0.3, 0.3, 0.2, 16]} rotation={[0, 0, Math.PI / 2]} />
            <meshStandardMaterial color={0x222222} />
          </mesh>
          <mesh position={[x, -0.4, -0.5]} >
            <cylinderGeometry args={[0.3, 0.3, 0.2, 16]} rotation={[0, 0, Math.PI / 2]} />
            <meshStandardMaterial color={0x222222} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

function EnhancedTerrain() {
  // Создание ландшафта
  const safeRadius = 120 // радиус свободного поля вокруг точки старта
  const worldHalf = 300 // половина размера мира (уменьшенная карта)
  const terrainGeometry = useMemo(() => {
    const geometry = new THREE.PlaneGeometry(worldHalf * 2, worldHalf * 2, 64, 64)
    const vertices = geometry.attributes.position.array
    
    for (let i = 2; i < vertices.length; i += 3) {
      const x = vertices[i - 2]
      const z = vertices[i - 1]
      const height = Math.sin(x * 0.01) * Math.cos(z * 0.01) * 5 +
                     Math.sin(x * 0.05) * Math.cos(z * 0.05) * 2 +
                     Math.random() * 1 - 0.5
      vertices[i] = height
    }
    
    geometry.attributes.position.needsUpdate = true
    geometry.computeVertexNormals()
    return geometry
  }, [])

  const groundMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: 0x90EE90,
      roughness: 0.8,
      metalness: 0.1
    })
  }, [])

  // Простейшая генерация "рек" — широкие полосы, идущие через карту
  const rivers = useMemo(() => {
    const segments = []
    const makeRiver = (offsetZ = 0, width = 20, length = 1200, step = 80) => {
      for (let x = -length / 2; x < length / 2; x += step) {
        const z1 = Math.sin((x) * 0.002) * 150 + offsetZ
        const z2 = Math.sin((x + step) * 0.002) * 150 + offsetZ
        const cx = x + step / 2
        const cz = (z1 + z2) / 2
        const angle = Math.atan2(z2 - z1, step)
        segments.push({ position: [cx, 0.015, cz], rotation: [-Math.PI / 2, angle, 0], width, length: step * 1.2 })
      }
    }
    makeRiver(-80, 18, worldHalf * 2, 60)
    makeRiver(120, 14, worldHalf * 2, 60)
    return segments
  }, [])

  return (
    <>
      {/* Вертолетная площадка (helipad) в точке старта */}
      <group position={[0, 0.02, 0]} userData={{ isCollidable: false }}>
        {/* Круглая площадка */}
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[8, 48]} />
          <meshStandardMaterial color={0x3a3a3a} roughness={0.9} metalness={0.05} />
        </mesh>
        {/* Белая окантовка */}
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[7.5, 8, 48]} />
          <meshStandardMaterial color={0xffffff} />
        </mesh>
        {/* Буква H */}
        <group rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
          <mesh position={[-1.5, 0, 0]}>
            <boxGeometry args={[1, 6, 0.1]} />
            <meshStandardMaterial color={0xffffff} />
          </mesh>
          <mesh position={[1.5, 0, 0]}>
            <boxGeometry args={[1, 6, 0.1]} />
            <meshStandardMaterial color={0xffffff} />
          </mesh>
          <mesh>
            <boxGeometry args={[5, 1, 0.1]} />
            <meshStandardMaterial color={0xffffff} />
          </mesh>
        </group>
      </group>
      {/* Стартовая полоса (runway) */}
      <group position={[0, 0.01, 0]} userData={{ isCollidable: false }}>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[20, 400]} />
          <meshStandardMaterial color={0x222222} roughness={0.9} metalness={0.05} />
        </mesh>
        {/* Центральная разметка */}
        {Array.from({ length: 20 }).map((_, i) => (
          <mesh key={`mark-${i}`} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, -180 + i * 20]}>
            <planeGeometry args={[1, 6]} />
            <meshStandardMaterial color={0xffffff} />
          </mesh>
        ))}
      </group>

      {/* Земля - упрощенная без теней */}
      <RigidBody type="fixed" colliders="trimesh">
        <mesh
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, 0, 0]}
          geometry={terrainGeometry}
          material={groundMaterial}
        />
      </RigidBody>

      {/* Реки */}
      {rivers.map((seg, i) => (
        <mesh
          key={`river-${i}`}
          rotation={seg.rotation}
          position={seg.position}
          userData={{ isCollidable: false }}
        >
          <planeGeometry args={[seg.width, seg.length]} />
          <meshStandardMaterial color={0x3BA4FF} roughness={0.4} metalness={0.1} />
        </mesh>
      ))}

      {/* Деревья с коллизиями (уменьшено для стабильности) */}
      {Array.from({ length: 40 }).map((_, i) => {
        const x = (Math.random() - 0.5) * (worldHalf * 1.6)
        const z = (Math.random() - 0.5) * (worldHalf * 1.6)
        if (Math.hypot(x, z) < safeRadius) return null
        const height = Math.random() * 2 + 3
        
        return (
          <group key={`tree-${i}`} position={[x, height / 2, z]}>
            <mesh 
              position={[0, height / 2, 0]} 
              userData={{ isCollidable: true }}
            >
              <cylinderGeometry args={[0.3, 0.4, height, 8]} />
              <meshStandardMaterial color={0x8B4513} roughness={0.9} />
            </mesh>
            <mesh 
              position={[0, height + 1, 0]} 
              userData={{ isCollidable: true }}
            >
              <coneGeometry args={[2, 4, 8]} />
              <meshStandardMaterial color={0x228B22} roughness={0.8} />
            </mesh>
          </group>
        )
      })}

      {/* Здания (минималистично, но обширно) */}
      {Array.from({ length: 25 }).map((_, i) => {
        const x = (Math.random() - 0.5) * (worldHalf * 2)
        const z = (Math.random() - 0.5) * (worldHalf * 2)
        if (Math.hypot(x, z) < safeRadius) return null
        const height = 5 + Math.random() * 20
        const width = 3 + Math.random() * 5
        const depth = 3 + Math.random() * 5
        
        return (
          <group key={`building-${i}`} position={[x, height / 2, z]}>
            <mesh 
              userData={{ isCollidable: true }}
            >
              <boxGeometry args={[width, height, depth]} />
              <meshStandardMaterial
                color={new THREE.Color().setHSL(Math.random(), 0.3, 0.5)}
                roughness={0.7}
                metalness={0.2}
              />
            </mesh>
            {/* Минималистично без множества окон */}
          </group>
        )
      })}

      {/* Фонари редкие, для масштаба */}
      {Array.from({ length: 8 }).map((_, i) => {
        const angle = (i / 30) * Math.PI * 2
        const radius = 180 + Math.random() * 150
        const x = Math.cos(angle) * radius
        const z = Math.sin(angle) * radius
        if (Math.hypot(x, z) < safeRadius) return null
        
        return (
          <StreetLight key={`light-${i}`} position={[x, 0, z]} />
        )
      })}

      {/* Машины редкие, для жизни сцены */}
      {Array.from({ length: 3 }).map((_, i) => {
        const angle = (i / 20) * Math.PI * 2
        const radius = 220 + Math.random() * 80
        const x = Math.cos(angle) * radius
        const z = Math.sin(angle) * radius
        if (Math.hypot(x, z) < safeRadius) return null
        const carColor = new THREE.Color().setHSL(Math.random(), 0.8, 0.5).getHex()
        
        return (
          <Car 
            key={`car-${i}`} 
            position={[x, 0.5, z]}
            color={carColor}
          />
        )
      })}

      {/* Дороги */}
      {Array.from({ length: 10 }).map((_, i) => {
        const angle = (i / 10) * Math.PI * 2
        const x = Math.cos(angle) * 200
        const z = Math.sin(angle) * 200
        
        return (
          <mesh
            key={`road-${i}`}
            rotation={[-Math.PI / 2, angle, 0]}
            position={[x, 0.01, z]}
          >
            <planeGeometry args={[10, 200]} />
            <meshStandardMaterial color={0x444444} roughness={0.6} />
          </mesh>
        )
      })}
    </>
  )
}

export default EnhancedTerrain
