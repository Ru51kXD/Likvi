import React, { useRef, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { useSimulatorStore } from '../store/useSimulatorStore'
import * as THREE from 'three'

function CollisionDetector({ quadcopterRef }) {
  const raycasterRef = useRef(new THREE.Raycaster())
  const collisionCheckInterval = useRef(0)
  const startupGraceRef = useRef(true)
  const collidableObjectsRef = useRef([])
  
  useFrame((state, delta) => {
    if (!quadcopterRef.current) return
    
    const quadcopter = quadcopterRef.current
    const { isCrash, speed, altitude, throttle } = useSimulatorStore.getState()
    
    // Грейс-период после старта, чтобы не ловить мгновенные ложные столкновения
    if (startupGraceRef.current) {
      if (state.clock.elapsedTime < 3) return
      startupGraceRef.current = false
    }
    
    // Не проверяем столкновения если уже разбились
    if (isCrash) return
    
    // Игнорируем столкновения пока не поднялись выше 6м
    if (altitude < 6) return
    
    // Не проверяем столкновения если скорость очень мала (почти на месте)
    if (speed < 5 && altitude < 2) return
    
    collisionCheckInterval.current += delta
    
    // Проверяем столкновения каждые 0.1 секунды
    if (collisionCheckInterval.current >= 0.1) {
      collisionCheckInterval.current = 0
      
      // Кэшируем список объектов для коллизий один раз
      if (collidableObjectsRef.current.length === 0) {
        const scene = state.scene
        const collected = []
        scene.traverse((child) => {
          if (
            child.isMesh &&
            child.userData.isCollidable === true &&
            child.userData.isQuadcopter !== true &&
            child.position.y > 0 &&
            child.geometry &&
            (child.geometry.type === 'BoxGeometry' ||
             child.geometry.type === 'CylinderGeometry' ||
             child.geometry.type === 'ConeGeometry')
          ) {
            let isQuadcopterPart = false
            let parent = child.parent
            while (parent) {
              if (parent.userData?.isQuadcopter) {
                isQuadcopterPart = true
                break
              }
              parent = parent.parent
            }
            if (!isQuadcopterPart) collected.push(child)
          }
        })
        collidableObjectsRef.current = collected
      }
      
      // Проверяем столкновение с каждым объектом
      const quadcopterPos = quadcopter.position.clone()
      const quadcopterSize = 0.6 // Размер квадрокоптера
      const maxCheckDistance = 60 // проверяем только близкие объекты
      const maxCheckDistanceSq = maxCheckDistance * maxCheckDistance
      
      for (const obj of collidableObjectsRef.current) {
        const objPos = obj.position.clone()
        const dx = quadcopterPos.x - objPos.x
        const dz = quadcopterPos.z - objPos.z
        const distanceSq = dx * dx + dz * dz
        if (distanceSq > maxCheckDistanceSq) continue
        const distance = Math.sqrt(distanceSq)
        
        // Определяем размер объекта
        let objSize = 1
        let objHeight = 5
        if (obj.geometry) {
          if (obj.geometry.type === 'BoxGeometry') {
            const args = obj.geometry.parameters
            objSize = Math.max(args.width || 1, args.depth || 1) / 2
            objHeight = args.height || 5
          } else if (obj.geometry.type === 'CylinderGeometry') {
            objSize = Math.max(obj.geometry.parameters.radiusTop || 1, obj.geometry.parameters.radiusBottom || 1)
            objHeight = obj.geometry.parameters.height || 5
          } else if (obj.geometry.type === 'ConeGeometry') {
            objSize = obj.geometry.parameters.radius || 1
            objHeight = obj.geometry.parameters.height || 5
          }
        }
        
        // Проверяем столкновение по горизонтали
        const horizontalDistance = Math.sqrt(
          (quadcopterPos.x - objPos.x) ** 2 + 
          (quadcopterPos.z - objPos.z) ** 2
        )
        
        if (horizontalDistance < (quadcopterSize + objSize)) {
          // Проверяем высоту
          const quadcopterBottom = quadcopterPos.y - quadcopterSize
          const quadcopterTop = quadcopterPos.y + quadcopterSize
          const objBottom = objPos.y - objHeight / 2
          const objTop = objPos.y + objHeight / 2
          
          // Проверяем пересечение по высоте
          if (quadcopterBottom < objTop && quadcopterTop > objBottom) {
            // СТОЛКНОВЕНИЕ!
            console.log('Крушение! Столкновение с объектом', {
              object: obj,
              distance: horizontalDistance,
              speed: useSimulatorStore.getState().speed
            })
            useSimulatorStore.getState().updateState({
              isCrash: true,
              isFlying: false
            })
            break
          }
        }
      }
      
      // Удар о землю отключен для избежания ложных срабатываний на взлете/посадке
    }
  })
  
  return null
}

export default CollisionDetector
