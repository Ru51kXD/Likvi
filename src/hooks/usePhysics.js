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
  const dragCoefficient = 0.35 // Увеличенное сопротивление воздуха для контроля скорости
  const angularDamping = 0.92 // Улучшенное затухание угловой скорости
  const linearDamping = 0.96 // Затухание линейной скорости
  
  // Параметры двигателей
  const maxThrust = 50 // Н (максимальная тяга одного двигателя)
  const motorEfficiency = 0.85
  const armLength = 0.3 // м - расстояние от центра до мотора
  
  // Параметры управления
  const maxPitchRollAngle = Math.PI / 5 // Увеличен максимальный угол наклона до ~36 градусов
  const maxYawRate = 1.5 // рад/с - скорость поворота
  const maxHorizontalSpeed = 20 // м/с - максимальная горизонтальная скорость (~72 км/ч)
  
  // Коэффициент горизонтального ускорения (увеличен для лучшей отзывчивости)
  const horizontalThrustFactor = 0.8
  
  useFrame((state, delta) => {
    if (!quadcopterRef.current) return
    
    const { throttle, pitch, roll, yaw, awaitingStart, startPosition } = useSimulatorStore.getState()
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
    
    // Базовая тяга каждого двигателя
    const baseThrust = throttle * maxThrust * motorEfficiency
    
    // Дифференциальная тяга для управления pitch (тангаж)
    // Pitch: наклон вперед/назад
    // При положительном pitch: передние моторы уменьшают тягу, задние увеличивают
    const pitchThrustDiff = pitch * baseThrust * 0.25 // Уменьшено для более плавного управления
    
    // Дифференциальная тяга для управления roll (крен)
    // Roll: наклон влево/вправо
    // При положительном roll: левые моторы увеличивают тягу, правые уменьшают
    const rollThrustDiff = roll * baseThrust * 0.25 // Уменьшено для более плавного управления
    
    // Дифференциальная тяга для управления yaw (рыскание)
    // Yaw: поворот вокруг вертикальной оси
    // Создается за счет разницы в скорости вращения противоположных пар винтов
    // При положительном yaw: диагональные пары вращаются с разной скоростью
    const yawThrustDiff = yaw * baseThrust * 0.1 // Уменьшено для более плавного управления
    
    // Расчет тяги каждого двигателя
    // Расположение: frontLeft, frontRight, backLeft, backRight
    // Координаты: FL(x+,z-), FR(x-,z-), BL(x+,z+), BR(x-,z+)
    const frontLeftThrust = baseThrust - pitchThrustDiff + rollThrustDiff - yawThrustDiff
    const frontRightThrust = baseThrust - pitchThrustDiff - rollThrustDiff + yawThrustDiff
    const backLeftThrust = baseThrust + pitchThrustDiff + rollThrustDiff + yawThrustDiff
    const backRightThrust = baseThrust + pitchThrustDiff - rollThrustDiff - yawThrustDiff
    
    // Ограничение тяги каждого мотора (не может быть отрицательной или превышать максимум)
    const clampThrust = (thrust) => Math.max(0, Math.min(maxThrust * motorEfficiency, thrust))
    const fl = clampThrust(frontLeftThrust)
    const fr = clampThrust(frontRightThrust)
    const bl = clampThrust(backLeftThrust)
    const br = clampThrust(backRightThrust)
    
    // Общая подъемная сила (вертикальная компонента)
    const totalVerticalThrust = (fl + fr + bl + br)
    
    // Горизонтальные моменты создают наклоны
    // Pitch момент: разница между передними и задними моторами
    const pitchMoment = (bl + br - fl - fr) * armLength
    // Roll момент: разница между левыми и правыми моторами
    const rollMoment = (fl + bl - fr - br) * armLength
    // Yaw момент: разница в моменте сопротивления от вращения винтов
    const yawMoment = (fl + br - fr - bl) * armLength * 0.3
    
    // Моменты инерции квадрокоптера
    const Ixx = mass * (armLength * 2) * (armLength * 2) / 12 // Инерция по оси X
    const Iyy = mass * (armLength * 2) * (armLength * 2) / 12 // Инерция по оси Y
    const Izz = mass * (armLength * 2) * (armLength * 2) / 6  // Инерция по оси Z
    
    // Угловые ускорения
    const pitchAccel = pitchMoment / Iyy
    const rollAccel = rollMoment / Ixx
    const yawAccel = yawMoment / Izz
    
    // Обновление угловой скорости с учетом желаемого поворота
    const targetPitchRate = pitch * maxPitchRollAngle * 3.0 // Увеличена скорость достижения угла
    const targetRollRate = roll * maxPitchRollAngle * 3.0
    const targetYawRate = yaw * maxYawRate
    
    // Плавное изменение угловой скорости к целевой
    angularVelocityRef.current.x = THREE.MathUtils.lerp(
      angularVelocityRef.current.x + pitchAccel * delta,
      targetPitchRate,
      0.12 // Более отзывчивая интерполяция
    )
    angularVelocityRef.current.z = THREE.MathUtils.lerp(
      angularVelocityRef.current.z + rollAccel * delta,
      targetRollRate,
      0.12
    )
    angularVelocityRef.current.y = THREE.MathUtils.lerp(
      angularVelocityRef.current.y + yawAccel * delta,
      targetYawRate,
      0.15
    )
    
    // Затухание угловой скорости (аэродинамическое сопротивление)
    angularVelocityRef.current.multiplyScalar(angularDamping)
    
    // Применение угловой скорости к вращению квадрокоптера
    quadcopter.rotation.x += angularVelocityRef.current.x * delta
    quadcopter.rotation.z += angularVelocityRef.current.z * delta
    quadcopter.rotation.y += angularVelocityRef.current.y * delta
    
    // Ограничение углов наклона для реалистичности
    quadcopter.rotation.x = THREE.MathUtils.clamp(quadcopter.rotation.x, -maxPitchRollAngle, maxPitchRollAngle)
    quadcopter.rotation.z = THREE.MathUtils.clamp(quadcopter.rotation.z, -maxPitchRollAngle, maxPitchRollAngle)
    
    // Вертикальное движение
    // При наклоне дрона вертикальная компонента тяги уменьшается
    // Используем углы наклона напрямую для более понятного и предсказуемого управления
    const currentPitch = quadcopter.rotation.x // Pitch: наклон вперед/назад
    const currentRoll = quadcopter.rotation.z  // Roll: наклон влево/вправо
    const currentYaw = quadcopter.rotation.y   // Yaw: поворот вокруг вертикальной оси
    
    // Вычисляем эффективную вертикальную тягу с учетом наклона
    const tiltFactor = Math.cos(currentPitch) * Math.cos(currentRoll) // Фактор наклона (1 = вертикально, <1 = наклонен)
    
    // Эффективная вертикальная тяга (уменьшается при наклоне)
    const effectiveVerticalThrust = totalVerticalThrust * tiltFactor
    
    const liftForce = effectiveVerticalThrust - (mass * gravity)
    const verticalAccel = liftForce / mass
    velocityRef.current.y += verticalAccel * delta
    // Улучшенное вертикальное сопротивление
    velocityRef.current.y *= linearDamping
    
    // Горизонтальное движение создается за счет наклона квадрокоптера
    
    // Сила наклона (как сильно дрон наклонен)
    const pitchTilt = Math.sin(currentPitch) // -1 до 1: вперед/назад
    const rollTilt = Math.sin(currentRoll)   // -1 до 1: влево/вправо
    
    // Вычисляем направление движения в локальной системе координат дрона
    // В Three.js: Z отрицательный = вперед, Z положительный = назад
    // X положительный = вправо, X отрицательный = влево
    // pitch > 0 = наклон вперед → движение вперед (отрицательный Z)
    // roll > 0 = наклон влево → движение влево (отрицательный X)
    // roll < 0 = наклон вправо → движение вправо (положительный X)
    const localForward = -pitchTilt  // Вперед при наклоне вперед
    const localRight = -rollTilt     // Вправо при наклоне вправо (отрицательный roll)
    
    // Трансформируем локальное направление в мировые координаты с учетом yaw
    const cosYaw = Math.cos(currentYaw)
    const sinYaw = Math.sin(currentYaw)
    
    // Мировые координаты направления движения
    const worldForward = localForward * cosYaw - localRight * sinYaw
    const worldRight = localForward * sinYaw + localRight * cosYaw
    
    // Вычисляем силу наклона (насколько сильно наклонен дрон)
    const tiltMagnitude = Math.sqrt(pitchTilt * pitchTilt + rollTilt * rollTilt)
    const horizontalTiltFactor = Math.min(1, tiltMagnitude) // Ограничиваем до 1
    
    // Горизонтальная тяга пропорциональна углу наклона и общей тяге
    const horizontalThrust = totalVerticalThrust * horizontalTiltFactor * horizontalThrustFactor
    
    // Горизонтальное ускорение в мировых координатах
    if (horizontalTiltFactor > 0.01) {
      const horizontalAccel = horizontalThrust / mass
      velocityRef.current.x += worldRight * horizontalAccel * delta
      velocityRef.current.z += worldForward * horizontalAccel * delta
    }
    
    // Ограничение максимальной горизонтальной скорости
    const currentHorizontalSpeed = Math.sqrt(
      velocityRef.current.x ** 2 + velocityRef.current.z ** 2
    )
    if (currentHorizontalSpeed > maxHorizontalSpeed) {
      const scale = maxHorizontalSpeed / currentHorizontalSpeed
      velocityRef.current.x *= scale
      velocityRef.current.z *= scale
    }
    
    // Применение сопротивления воздуха (пропорционально квадрату скорости)
    const horizontalSpeed = Math.sqrt(
      velocityRef.current.x ** 2 + velocityRef.current.z ** 2
    )
    if (horizontalSpeed > 0.01) {
      // Улучшенное сопротивление воздуха
      const dragForce = dragCoefficient * horizontalSpeed * horizontalSpeed
      const dragX = -(velocityRef.current.x / horizontalSpeed) * dragForce * delta
      const dragZ = -(velocityRef.current.z / horizontalSpeed) * dragForce * delta
      velocityRef.current.x += dragX / mass
      velocityRef.current.z += dragZ / mass
    }
    
    // Дополнительное затухание горизонтальной скорости для лучшего контроля
    velocityRef.current.x *= linearDamping
    velocityRef.current.z *= linearDamping
    
    // Применение линейной скорости
    const movement = velocityRef.current.clone().multiplyScalar(delta)
    quadcopter.position.add(movement)
    
    // Предотвращение падения ниже пола
    if (quadcopter.position.y < 0.5) {
      quadcopter.position.y = 0.5
      if (velocityRef.current.y < 0) {
        velocityRef.current.y = 0
      }
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
