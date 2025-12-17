import React, { useRef, useEffect, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { useKeyboardControls } from '../hooks/useKeyboardControls'
import { usePhysics } from '../hooks/usePhysics'
import { useSimulatorStore } from '../store/useSimulatorStore'
import * as THREE from 'three'
import Propeller from './Propeller'
import PropellerParticles from './PropellerParticles'

const Quadcopter = React.forwardRef((props, ref) => {
  const internalRef = React.useRef()
  const quadcopterRef = ref || internalRef
  const keys = useKeyboardControls()
  const { particleEffects } = useSimulatorStore()
  const throttle = useSimulatorStore((s) => s.throttle)
  
  usePhysics(quadcopterRef)
  
  // Управление с клавиатуры (реалистичное управление дроном)
  useFrame(() => {
    if (!keys) return
    
    // Всегда берём актуальные значения стора во фрейме
    const state = useSimulatorStore.getState()
    if (state.awaitingStart) {
      // Любая управленческая клавиша снимает дрон с парковки
      const anyControl = keys['q'] || keys['Q'] || keys['ц'] || keys['Ц'] ||
                         keys['e'] || keys['E'] || keys['у'] || keys['У'] ||
                         keys['w'] || keys['W'] || keys['s'] || keys['S'] ||
                         keys['a'] || keys['A'] || keys['d'] || keys['D'] ||
                         keys['ArrowLeft'] || keys['ArrowRight']
      if (anyControl) state.startFlight()
      return
    }
    
    const currentThrottle = state.throttle
    let newPitch = state.pitch
    let newRoll = state.roll
    let newYaw = state.yaw
    
    // Управление газом - ТОЛЬКО Q/E
    // Q - увеличить газ
    // E - уменьшить газ
    const throttleRate = 0.025 // Скорость изменения газа
    if (keys['q'] || keys['Q'] || keys['ц'] || keys['Ц']) {
      state.setThrottle(currentThrottle + throttleRate)
    }
    if (keys['e'] || keys['E'] || keys['у'] || keys['У']) {
      state.setThrottle(currentThrottle - throttleRate)
    }
    
    // Управление движением - WASD
    // W - движение вперед (наклон вперед через pitch)
    // S - движение назад (наклон назад через pitch)
    // A - движение влево (наклон влево через roll)
    // D - движение вправо (наклон вправо через roll)
    const pitchRate = 0.08
    const rollRate = 0.08
    
    if (keys['w'] || keys['W'] || keys['ц'] || keys['Ц']) {
      // W - движение вперед (наклон вперед, БЕЗ изменения газа)
      newPitch = Math.min(1, newPitch + pitchRate)
    }
    if (keys['s'] || keys['S'] || keys['ы'] || keys['Ы']) {
      // S - движение назад (наклон назад, БЕЗ изменения газа)
      newPitch = Math.max(-1, newPitch - pitchRate)
    }
    if (keys['a'] || keys['A'] || keys['ф'] || keys['Ф']) {
      // A - наклон влево (положительный roll)
      newRoll = Math.min(1, newRoll + rollRate)
    }
    if (keys['d'] || keys['D'] || keys['в'] || keys['В']) {
      // D - наклон вправо (отрицательный roll)
      newRoll = Math.max(-1, newRoll - rollRate)
    }
    
    // Стрелки влево/вправо - yaw (поворот вокруг вертикальной оси)
    const yawRate = 0.04 // Уменьшена чувствительность поворота
    if (keys['ArrowLeft']) {
      newYaw = Math.min(1, newYaw + yawRate)
    }
    if (keys['ArrowRight']) {
      newYaw = Math.max(-1, newYaw - yawRate)
    }
    
    // Более быстрое возвращение к нулю при отпускании клавиш (для лучшего контроля)
    if (!(keys['w'] || keys['W'] || keys['ц'] || keys['Ц']) && 
        !(keys['s'] || keys['S'] || keys['ы'] || keys['Ы'])) {
      newPitch *= 0.88 // Быстрее возвращается к нулю
    }
    if (!(keys['a'] || keys['A'] || keys['ф'] || keys['Ф']) && 
        !(keys['d'] || keys['D'] || keys['в'] || keys['В'])) {
      newRoll *= 0.88
    }
    if (!keys['ArrowLeft'] && !keys['ArrowRight']) {
      newYaw *= 0.88
    }
    
    state.setPitch(newPitch)
    state.setRoll(newRoll)
    state.setYaw(newYaw)
  })
  
  // Вращение винтов
  const propellerSpeed = throttle * 20 + 5
  
  const propellerPositions = [
    { x: 1.2, z: 1.2, rotation: 1 },
    { x: -1.2, z: 1.2, rotation: -1 },
    { x: 1.2, z: -1.2, rotation: -1 },
    { x: -1.2, z: -1.2, rotation: 1 }
  ]
  
  return (
    <group ref={quadcopterRef} position={[0, 0.5, 0]} userData={{ isQuadcopter: true }}>
      {/* Корпус - БЕЗ теней для экономии текстур */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[1.5, 0.5, 1.5]} />
        <meshStandardMaterial 
          color={0xff0000}
          metalness={0.8}
          roughness={0.2}
        />
      </mesh>
      
      {/* Центральная плата */}
      <mesh position={[0, 0.2, 0]}>
        <boxGeometry args={[0.8, 0.05, 0.8]} />
        <meshStandardMaterial 
          color={0x2a2a2a}
          metalness={0.9}
          roughness={0.1}
        />
      </mesh>
      
      {/* Винты и опоры */}
      {propellerPositions.map((pos, index) => (
        <group key={index}>
          {/* Опора двигателя */}
          <mesh
            position={[pos.x, 0.3, pos.z]}
          >
            <cylinderGeometry args={[0.08, 0.08, 0.6, 16]} />
            <meshStandardMaterial 
              color={0x444444}
              metalness={0.7}
              roughness={0.3}
            />
          </mesh>
          
          {/* Двигатель */}
          <mesh
            position={[pos.x, 0.6, pos.z]}
          >
            <cylinderGeometry args={[0.12, 0.12, 0.15, 16]} />
            <meshStandardMaterial 
              color={0x333333}
              metalness={0.8}
              roughness={0.2}
            />
          </mesh>
          
          {/* Винт */}
          <Propeller
            position={[pos.x, 0.75, pos.z]}
            speed={propellerSpeed * pos.rotation}
            throttle={throttle}
          />
          
          {/* Частицы от винтов */}
          {particleEffects && (
            <PropellerParticles
              position={[pos.x, 0.75, pos.z]}
              speed={propellerSpeed}
              throttle={throttle}
            />
          )}
        </group>
      ))}
      
      {/* Индикаторы */}
      <mesh position={[0.6, 0.25, 0]}>
        <sphereGeometry args={[0.08, 8, 8]} />
        <meshStandardMaterial
          color={0xff0000}
          emissive={0xff0000}
          emissiveIntensity={0.8}
        />
      </mesh>
      <mesh position={[-0.6, 0.25, 0]}>
        <sphereGeometry args={[0.08, 8, 8]} />
        <meshStandardMaterial
          color={0x0000ff}
          emissive={0x0000ff}
          emissiveIntensity={0.8}
        />
      </mesh>
      
      {/* Антенна GPS */}
      <mesh position={[0, 0.5, 0]} >
        <cylinderGeometry args={[0.02, 0.02, 0.3, 8]} />
        <meshStandardMaterial color={0x222222} />
      </mesh>
      
      {/* Камера (имитация) */}
      <mesh position={[0, 0.15, 0.6]}>
        <boxGeometry args={[0.15, 0.1, 0.1]} />
        <meshStandardMaterial color={0x000000} />
      </mesh>
      <mesh position={[0, 0.15, 0.65]}>
        <cylinderGeometry args={[0.05, 0.05, 0.02, 16]} />
        <meshStandardMaterial color={0x111111} />
      </mesh>
    </group>
  )
})

export default Quadcopter