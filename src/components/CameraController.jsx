import React, { useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { useSimulatorStore } from '../store/useSimulatorStore'
import * as THREE from 'three'

function CameraController() {
  const { camera, scene } = useThree()
  const orbitControlsRef = useRef()
  const { cameraMode, gps, rotation } = useSimulatorStore()
  
  useFrame(() => {
    const quadcopterPos = new THREE.Vector3(gps.x, gps.y, gps.z)
    
    // Если квадрокоптер на стартовой позиции, используем начальную позицию
    if (quadcopterPos.length() < 0.1) {
      quadcopterPos.set(0, 0.5, 0)
    }
    
    switch (cameraMode) {
      case 'fps':
        // Камера от первого лица
        camera.position.copy(quadcopterPos)
        camera.position.y += 0.3
        camera.rotation.set(rotation.x, rotation.y, rotation.z)
        break
        
      case 'follow':
        // Камера следует за квадрокоптером
        const offset = new THREE.Vector3(0, 12, 25)
        const targetPos = quadcopterPos.clone().add(offset)
        camera.position.lerp(targetPos, 0.2)
        const lookAtPos = quadcopterPos.clone()
        lookAtPos.y = Math.max(0.5, lookAtPos.y)
        camera.lookAt(lookAtPos)
        break
        
      case 'orbit':
        // Орбитальная камера
        if (orbitControlsRef.current) {
          orbitControlsRef.current.target.lerp(quadcopterPos, 0.1)
        }
        break
        
      case 'free':
        // Свободная камера (управляется OrbitControls)
        break
        
      default:
        break
    }
  })
  
  if (cameraMode === 'fps' || cameraMode === 'follow') {
    return null
  }
  
  return (
    <OrbitControls
      ref={orbitControlsRef}
      enableDamping
      dampingFactor={0.05}
      minDistance={5}
      maxDistance={100}
      enablePan={cameraMode === 'free'}
      enableZoom={true}
    />
  )
}

export default CameraController
