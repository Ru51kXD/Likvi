import React, { useRef } from 'react'
import { useFrame } from '@react-three/fiber'

function Propeller({ position, speed, throttle }) {
  const propellerRef = useRef()
  
  useFrame(() => {
    if (propellerRef.current) {
      propellerRef.current.rotation.y += speed * 0.1
    }
  })
  
  return (
    <mesh ref={propellerRef} position={position}>
      {/* Лопасти винта */}
      <group>
        {/* Лопасть 1 */}
        <mesh rotation={[0, 0, 0]}>
          <boxGeometry args={[0.8, 0.02, 0.15]} />
          <meshStandardMaterial 
            color={0xcccccc}
            metalness={0.6}
            roughness={0.4}
            transparent
            opacity={0.9}
          />
        </mesh>
        {/* Лопасть 2 */}
        <mesh rotation={[0, Math.PI / 2, 0]}>
          <boxGeometry args={[0.8, 0.02, 0.15]} />
          <meshStandardMaterial 
            color={0xcccccc}
            metalness={0.6}
            roughness={0.4}
            transparent
            opacity={0.9}
          />
        </mesh>
      </group>
    </mesh>
  )
}

export default Propeller
