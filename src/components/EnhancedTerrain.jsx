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

// Простая лодка, движущаяся по прямой
function Boat({ position, direction = 0, color = 0x2266cc, speed = 5 }) {
  const boatRef = useRef()
  useFrame((state, delta) => {
    if (!boatRef.current) return
    boatRef.current.position.x += Math.cos(direction) * speed * delta
    boatRef.current.position.z += Math.sin(direction) * speed * delta
    boatRef.current.rotation.y = -direction
    // Легкая покачка
    boatRef.current.position.y = 0.1 + Math.sin(state.clock.elapsedTime * 2) * 0.05
  })
  return (
    <group ref={boatRef} position={position} userData={{ isCollidable: false }}>
      <mesh>
        <boxGeometry args={[2.5, 0.5, 1]} />
        <meshStandardMaterial color={color} roughness={0.7} metalness={0.2} />
      </mesh>
    </group>
  )
}

// Воздушный шар (балун)
function Balloon({ position, color = 0xffaa00 }) {
  const ref = useRef()
  useFrame((state) => {
    if (!ref.current) return
    ref.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 0.5 + position[0]) * 2
    ref.current.rotation.y += 0.1 * state.clock.getDelta()
  })
  return (
    <group ref={ref} position={position} userData={{ isCollidable: false }}>
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[1.5, 16, 16]} />
        <meshStandardMaterial color={color} roughness={0.6} metalness={0.1} />
      </mesh>
      <mesh position={[0, -2, 0]}>
        <boxGeometry args={[0.8, 1, 0.8]} />
        <meshStandardMaterial color={0x885533} />
      </mesh>
    </group>
  )
}

function EnhancedTerrain() {
  // Создание плоского ландшафта (без проблем с z-fighting)
  const safeRadius = 120 // радиус свободного поля вокруг точки старта
  const worldHalf = 400 // увеличенный размер мира для более просторной карты
  const terrainGeometry = useMemo(() => {
    const geometry = new THREE.PlaneGeometry(worldHalf * 2, worldHalf * 2, 4, 4)
    return geometry
  }, [])

  // Улучшенный материал для земли с более реалистичными цветами
  const groundMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: 0x7cb342, // Более реалистичный зеленый цвет травы
      roughness: 0.85,
      metalness: 0.05
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
      {/* Стартовая полоса (runway) - рисуется первой */}
      <group position={[0, 0.05, 0]} userData={{ isCollidable: false }}>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[20, 400]} />
          <meshStandardMaterial color={0x222222} roughness={0.9} metalness={0.05} depthWrite={true} />
        </mesh>
        {/* Центральная разметка */}
        {Array.from({ length: 20 }).map((_, i) => (
          <mesh key={`mark-${i}`} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, -180 + i * 20]}>
            <planeGeometry args={[1, 6]} />
            <meshStandardMaterial color={0xffffff} depthWrite={true} />
          </mesh>
        ))}
      </group>
      
      {/* Вертолетная площадка (helipad) в точке старта */}
      <group position={[0, 0.1, 0]} userData={{ isCollidable: false }}>
        {/* Круглая площадка */}
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[8, 48]} />
          <meshStandardMaterial color={0x3a3a3a} roughness={0.9} metalness={0.05} depthWrite={true} />
        </mesh>
        {/* Белая окантовка */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
          <ringGeometry args={[7.5, 8, 48]} />
          <meshStandardMaterial color={0xffffff} depthWrite={true} />
        </mesh>
        {/* Буква H */}
        <group rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
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

      {/* Земля - упрощенная без теней */}
      <RigidBody type="fixed" colliders="trimesh">
        <mesh
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, 0, 0]}
          geometry={terrainGeometry}
          material={groundMaterial}
        />
      </RigidBody>

      {/* Реки - улучшенный внешний вид */}
      {rivers.map((seg, i) => (
        <mesh
          key={`river-${i}`}
          rotation={seg.rotation}
          position={[seg.position[0], 0.03, seg.position[2]]}
          userData={{ isCollidable: false }}
        >
          <planeGeometry args={[seg.width, seg.length]} />
          <meshStandardMaterial 
            color={0x2E86AB} 
            roughness={0.3} 
            metalness={0.05}
            depthWrite={true}
          />
        </mesh>
      ))}

      {/* Лодки на реках - больше лодок для оживления */}
      {rivers.length > 0 && (
        <>
          <Boat position={[ -80, 0.1, -60 ]} direction={Math.PI * 0.05} />
          <Boat position={[ 120, 0.1, 80 ]} direction={-Math.PI * 0.12} color={0x8844cc} />
          <Boat position={[ -60, 0.1, 120 ]} direction={Math.PI * 0.2} color={0x2266cc} />
        </>
      )}
      
      {/* Камни и валуны на ландшафте */}
      {Array.from({ length: 30 }).map((_, i) => {
        const x = (Math.random() - 0.5) * (worldHalf * 1.8)
        const z = (Math.random() - 0.5) * (worldHalf * 1.8)
        if (Math.hypot(x, z) < safeRadius) return null
        const size = 0.3 + Math.random() * 0.7
        const yRotation = Math.random() * Math.PI * 2
        
        return (
          <mesh
            key={`rock-${i}`}
            position={[x, size * 0.5, z]}
            rotation={[0, yRotation, 0]}
            userData={{ isCollidable: true }}
          >
            <dodecahedronGeometry args={[size, 0]} />
            <meshStandardMaterial
              color={new THREE.Color().setHSL(0.1, 0.2, 0.3 + Math.random() * 0.2)}
              roughness={0.9}
              metalness={0.1}
            />
          </mesh>
        )
      })}
      
      {/* Кусты и небольшие растения */}
      {Array.from({ length: 80 }).map((_, i) => {
        const x = (Math.random() - 0.5) * (worldHalf * 1.8)
        const z = (Math.random() - 0.5) * (worldHalf * 1.8)
        if (Math.hypot(x, z) < safeRadius) return null
        const size = 0.4 + Math.random() * 0.6
        const height = size * 0.8
        
        return (
          <mesh
            key={`bush-${i}`}
            position={[x, height * 0.5, z]}
            userData={{ isCollidable: false }}
          >
            <sphereGeometry args={[size, 8, 6]} />
            <meshStandardMaterial
              color={new THREE.Color().setHSL(0.22 + Math.random() * 0.08, 0.6, 0.25 + Math.random() * 0.15)}
              roughness={0.9}
            />
          </mesh>
        )
      })}

      {/* Деревья с коллизиями - больше деревьев для реалистичности */}
      {Array.from({ length: 120 }).map((_, i) => {
        const x = (Math.random() - 0.5) * (worldHalf * 1.8)
        const z = (Math.random() - 0.5) * (worldHalf * 1.8)
        if (Math.hypot(x, z) < safeRadius) return null
        
        // Разнообразие размеров деревьев
        const treeType = Math.random()
        let height, trunkRadius, crownRadius, crownHeight
        if (treeType < 0.7) {
          // Обычные деревья
          height = Math.random() * 3 + 4
          trunkRadius = 0.25 + Math.random() * 0.15
          crownRadius = 1.8 + Math.random() * 0.8
          crownHeight = 3 + Math.random() * 2
        } else if (treeType < 0.9) {
          // Высокие деревья
          height = Math.random() * 5 + 6
          trunkRadius = 0.35 + Math.random() * 0.2
          crownRadius = 2.5 + Math.random() * 1.2
          crownHeight = 4 + Math.random() * 2
        } else {
          // Небольшие деревья
          height = Math.random() * 2 + 2.5
          trunkRadius = 0.2 + Math.random() * 0.1
          crownRadius = 1.2 + Math.random() * 0.6
          crownHeight = 2 + Math.random() * 1
        }
        
        // Разнообразие цветов кроны
        const greenVariation = Math.random() * 0.3 + 0.2
        const crownColor = new THREE.Color().setHSL(0.25 + Math.random() * 0.1, 0.7, greenVariation)
        
        return (
          <group key={`tree-${i}`} position={[x, height / 2, z]}>
            <mesh 
              position={[0, height / 2, 0]} 
              userData={{ isCollidable: true }}
            >
              <cylinderGeometry args={[trunkRadius * 0.8, trunkRadius, height, 8]} />
              <meshStandardMaterial 
                color={new THREE.Color().setHSL(0.08, 0.5, 0.25 + Math.random() * 0.15)} 
                roughness={0.9} 
              />
            </mesh>
            <mesh 
              position={[0, height + crownHeight * 0.3, 0]} 
              userData={{ isCollidable: true }}
            >
              <coneGeometry args={[crownRadius, crownHeight, 8]} />
              <meshStandardMaterial color={crownColor} roughness={0.85} />
            </mesh>
          </group>
        )
      })}

      {/* Здания - более разнообразные и детализированные */}
      {Array.from({ length: 40 }).map((_, i) => {
        const x = (Math.random() - 0.5) * (worldHalf * 2)
        const z = (Math.random() - 0.5) * (worldHalf * 2)
        if (Math.hypot(x, z) < safeRadius) return null
        
        const buildingType = Math.random()
        let height, width, depth, color
        
        if (buildingType < 0.4) {
          // Низкие дома
          height = 4 + Math.random() * 3
          width = 5 + Math.random() * 4
          depth = 5 + Math.random() * 4
          color = new THREE.Color().setHSL(0.08 + Math.random() * 0.05, 0.4, 0.5)
        } else if (buildingType < 0.7) {
          // Средние здания
          height = 8 + Math.random() * 8
          width = 4 + Math.random() * 5
          depth = 4 + Math.random() * 5
          color = new THREE.Color().setHSL(0.1 + Math.random() * 0.1, 0.35, 0.4)
        } else {
          // Высокие здания
          height = 15 + Math.random() * 15
          width = 4 + Math.random() * 4
          depth = 4 + Math.random() * 4
          color = new THREE.Color().setHSL(0.15 + Math.random() * 0.15, 0.3, 0.35)
        }
        
        return (
          <group key={`building-${i}`} position={[x, height / 2, z]}>
            <mesh 
              userData={{ isCollidable: true }}
            >
              <boxGeometry args={[width, height, depth]} />
              <meshStandardMaterial
                color={color}
                roughness={0.75}
                metalness={0.15}
              />
            </mesh>
            {/* Крыша для домов */}
            {buildingType < 0.4 && (
              <mesh 
                position={[0, height / 2 + 0.5, 0]}
                userData={{ isCollidable: true }}
              >
                <coneGeometry args={[Math.max(width, depth) * 0.7, 2, 4]} />
                <meshStandardMaterial
                  color={new THREE.Color().setHSL(0.05, 0.6, 0.3)}
                  roughness={0.8}
                />
              </mesh>
            )}
            {/* Окна для высоких зданий */}
            {buildingType >= 0.7 && (
              <>
                {Array.from({ length: Math.floor(height / 4) }).map((_, j) =>
                  Array.from({ length: 2 }).map((_, k) => (
                    <mesh
                      key={`window-${j}-${k}`}
                      position={[
                        (k - 0.5) * width * 0.4,
                        (j - Math.floor(height / 8)) * 4 - height / 2 + 2,
                        depth / 2 + 0.01
                      ]}
                    >
                      <planeGeometry args={[0.8, 1.2]} />
                      <meshStandardMaterial
                        color={Math.random() > 0.7 ? 0xffffaa : 0x001122}
                        emissive={Math.random() > 0.7 ? 0xffffaa : 0x000000}
                        emissiveIntensity={Math.random() > 0.7 ? 0.3 : 0}
                      />
                    </mesh>
                  ))
                )}
              </>
            )}
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

      {/* Воздушные шары высоко в небе (без коллизий) */}
      {[
        [-150, 60, -120],
        [100, 80, 160],
        [0, 70, -200]
      ].map((p, i) => (
        <Balloon key={`balloon-${i}`} position={p} />
      ))}

      {/* Дороги - нормальная сетка */}
      {/* Главная дорога вдоль оси Z (от взлетной полосы) */}
      <group position={[0, 0.04, 0]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[12, 600]} />
          <meshStandardMaterial color={0x333333} roughness={0.7} metalness={0.05} />
        </mesh>
        {/* Разметка */}
        {Array.from({ length: 25 }).map((_, i) => (
          <mesh key={`main-mark-${i}`} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, -280 + i * 24]}>
            <planeGeometry args={[0.5, 6]} />
            <meshStandardMaterial color={0xFFFFFF} />
          </mesh>
        ))}
      </group>
      
      {/* Поперечные дороги */}
      {[-150, 150].map((zPos, i) => (
        <group key={`cross-road-${i}`} position={[0, 0.04, zPos]}>
          <mesh rotation={[-Math.PI / 2, Math.PI / 2, 0]}>
            <planeGeometry args={[10, 400]} />
            <meshStandardMaterial color={0x333333} roughness={0.7} metalness={0.05} />
          </mesh>
          {/* Разметка */}
          {Array.from({ length: 16 }).map((_, j) => (
            <mesh key={`cross-mark-${j}`} rotation={[-Math.PI / 2, Math.PI / 2, 0]} position={[0, 0.01, -180 + j * 24]}>
              <planeGeometry args={[0.5, 5]} />
              <meshStandardMaterial color={0xFFFFFF} />
            </mesh>
          ))}
        </group>
      ))}
    </>
  )
}

export default EnhancedTerrain
