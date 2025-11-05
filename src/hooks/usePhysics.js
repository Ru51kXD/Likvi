import { useRef, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useSimulatorStore } from '../store/useSimulatorStore'

export function usePhysics(quadcopterRef) {
  const velocityRef = useRef(new THREE.Vector3(0, 0, 0))
  const angularVelocityRef = useRef(new THREE.Vector3(0, 0, 0))
  
  // Параметры физики
  const mass = 1.5 // кг
  const gravity = 9.81
  const dragCoefficient = 0.15
  const angularDamping = 0.96
  
  // Инерция
  const inertiaRef = useRef(new THREE.Vector3(0, 0, 0))
  const angularInertiaRef = useRef(new THREE.Vector3(0, 0, 0))
  
  // Параметры двигателей
  const maxThrust = 50 // Н
  const motorEfficiency = 0.8
  const propellerRadius = 0.15 // м
  
  useFrame((state, delta) => {
    if (!quadcopterRef.current) return
    
    const { throttle, pitch, roll, yaw, moveX, moveZ, awaitingStart, startPosition } = useSimulatorStore.getState()
    const quadcopter = quadcopterRef.current
    
    // Режим ожидания старта: фиксируем дрон на стартовых координатах
    if (awaitingStart) {
      quadcopter.position.set(startPosition.x, startPosition.y, startPosition.z)
      quadcopter.rotation.set(0, 0, 0)
      velocityRef.current.set(0, 0, 0)
      angularVelocityRef.current.set(0, 0, 0)
      useSimulatorStore.getState().updateState({
        altitude: quadcopter.position.y,
        speed: 0,
        velocity: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        gps: { x: quadcopter.position.x, y: quadcopter.position.y, z: quadcopter.position.z }
      })
      return
    }
    
    // Вычисление тяги от каждого двигателя
    const baseThrust = throttle * maxThrust * motorEfficiency
    
    // Распределение тяги для управления (differential thrust)
    const frontLeft = baseThrust * (1 + roll - pitch)
    const frontRight = baseThrust * (1 - roll - pitch)
    const backLeft = baseThrust * (1 + roll + pitch)
    const backRight = baseThrust * (1 - roll + pitch)
    
    // Общая подъемная сила
    const totalThrust = (frontLeft + frontRight + backLeft + backRight) / 4
    
    // Применение сил с учетом инерции
    const liftForce = totalThrust - (mass * gravity)
    const acceleration = liftForce / mass
    
    // Обновление вертикальной скорости с инерцией
    const targetVelocity = acceleration * delta
    velocityRef.current.y = THREE.MathUtils.lerp(
      velocityRef.current.y,
      velocityRef.current.y + targetVelocity,
      0.5 // Плавность инерции
    )
    velocityRef.current.y *= 0.98 // Аэродинамическое сопротивление
    
    // Прямое горизонтальное движение на основе осей moveX/moveZ (локально относительно yaw)
    const forward = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0,1,0), quadcopter.rotation.y)
    const right = new THREE.Vector3(1, 0, 0).applyAxisAngle(new THREE.Vector3(0,1,0), quadcopter.rotation.y)
    const desiredDir = new THREE.Vector3()
      .addScaledVector(forward, moveZ)
      .addScaledVector(right, moveX)
    if (desiredDir.lengthSq() > 1) desiredDir.normalize()
    const horizontalAccel = totalThrust * 0.25
    const targetVelocityX = desiredDir.x * horizontalAccel * delta
    const targetVelocityZ = desiredDir.z * horizontalAccel * delta
    
    // Применяем инерцию к горизонтальному движению
    velocityRef.current.x = THREE.MathUtils.lerp(
      velocityRef.current.x,
      velocityRef.current.x + targetVelocityX,
      0.4
    )
    velocityRef.current.z = THREE.MathUtils.lerp(
      velocityRef.current.z,
      velocityRef.current.z + targetVelocityZ,
      0.4
    )
    
    // Применение сопротивления воздуха
    const speed = velocityRef.current.length()
    const dragForce = dragCoefficient * speed * speed
    const dragDirection = velocityRef.current.clone().normalize().multiplyScalar(-1)
    velocityRef.current.add(dragDirection.multiplyScalar(dragForce * delta))
    
    // Угловая скорость (поворот) с инерцией
    const targetAngularY = yaw * 1.5 // рад/с
    const targetAngularX = 0 // без тангажа от управления
    const targetAngularZ = 0 // без крена от управления
    
    // Применяем инерцию к угловой скорости
    angularVelocityRef.current.y = THREE.MathUtils.lerp(
      angularVelocityRef.current.y,
      targetAngularY,
      0.3
    )
    angularVelocityRef.current.x = THREE.MathUtils.lerp(
      angularVelocityRef.current.x,
      targetAngularX,
      0.3
    )
    angularVelocityRef.current.z = THREE.MathUtils.lerp(
      angularVelocityRef.current.z,
      targetAngularZ,
      0.3
    )
    
    // Применение угловой скорости
    quadcopter.rotation.y += angularVelocityRef.current.y * delta
    quadcopter.rotation.x += angularVelocityRef.current.x * delta
    quadcopter.rotation.z += angularVelocityRef.current.z * delta
    
    // Затухание угловой скорости
    angularVelocityRef.current.multiplyScalar(angularDamping)
    
    // Применение линейной скорости
    const movement = velocityRef.current.clone().multiplyScalar(delta)
    quadcopter.position.add(movement)
    
    // Предотвращение падения ниже пола
    if (quadcopter.position.y < 0.5) {
      quadcopter.position.y = 0.5
      velocityRef.current.y = Math.max(0, velocityRef.current.y)
    }
    
    // Обновление состояния
    const speedKmh = Math.sqrt(
      velocityRef.current.x ** 2 + velocityRef.current.z ** 2
    ) * 3.6
    
    useSimulatorStore.getState().updateState({
      altitude: quadcopter.position.y,
      speed: speedKmh,
      velocity: {
        x: velocityRef.current.x,
        y: velocityRef.current.y,
        z: velocityRef.current.z
      },
      rotation: {
        x: quadcopter.rotation.x,
        y: quadcopter.rotation.y,
        z: quadcopter.rotation.z
      },
      gps: {
        x: quadcopter.position.x,
        y: quadcopter.position.y,
        z: quadcopter.position.z
      }
    })
  })
  
  return { velocityRef, angularVelocityRef }
}
