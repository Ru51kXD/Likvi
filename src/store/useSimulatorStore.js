import { create } from 'zustand'

export const useSimulatorStore = create((set) => ({
  // Управление
  throttle: 0,
  pitch: 0,
  roll: 0,
  yaw: 0,
  
  // Состояние квадрокоптера
  altitude: 0,
  speed: 0,
  battery: 100,
  gps: { x: 0, y: 0.5, z: 0 },
  rotation: { x: 0, y: 0, z: 0 },
  startPosition: { x: 0, y: 0.5, z: 0 },
  
  // Физика
  velocity: { x: 0, y: 0, z: 0 },
  angularVelocity: { x: 0, y: 0, z: 0 },
  moveX: 0, // -1 влево, 1 вправо
  moveZ: 0, // -1 назад, 1 вперед
  
  // Настройки
  cameraMode: 'orbit', // follow, fps, free, orbit
  showHUD: true,
  showTrajectory: false,
  particleEffects: true,
  soundEnabled: true,
  safeMode: true,
  
  // Данные полета
  flightTime: 0,
  maxAltitude: 0,
  distance: 0,
  trajectory: [],
  
  // Системные
  isFlying: false,
  isCrash: false,
  awaitingStart: true,
  
  // Дневной/ночной цикл
  timeOfDay: 0.5, // 0 = полночь, 0.5 = полдень, 1 = полночь
  isDay: true,
  sunElevation: 1,
  
  // Actions
  setThrottle: (value) => set({ throttle: Math.max(0, Math.min(1, value)) }),
  setPitch: (value) => set({ pitch: Math.max(-1, Math.min(1, value)) }),
  setRoll: (value) => set({ roll: Math.max(-1, Math.min(1, value)) }),
  setYaw: (value) => set({ yaw: Math.max(-1, Math.min(1, value)) }),
  setMoveX: (value) => set({ moveX: Math.max(-1, Math.min(1, value)) }),
  setMoveZ: (value) => set({ moveZ: Math.max(-1, Math.min(1, value)) }),
  startFlight: () => set({ awaitingStart: false, isFlying: true }),
  setStartPosition: (pos) => set({ startPosition: pos, gps: pos }),
  
  updateState: (state) => set((prev) => ({ ...prev, ...state })),
  
  resetFlight: () => set({
    throttle: 0,
    pitch: 0,
    roll: 0,
    yaw: 0,
    altitude: 0,
    speed: 0,
    battery: 100,
    velocity: { x: 0, y: 0, z: 0 },
    angularVelocity: { x: 0, y: 0, z: 0 },
    flightTime: 0,
    maxAltitude: 0,
    distance: 0,
    trajectory: [],
    isFlying: false,
    isCrash: false,
    awaitingStart: true,
    gps: (state) => ({ x: state.startPosition.x, y: state.startPosition.y, z: state.startPosition.z }),
    rotation: { x: 0, y: 0, z: 0 },
    moveX: 0,
    moveZ: 0
  }),
  
  setCameraMode: (mode) => set({ cameraMode: mode }),
  toggleHUD: () => set((state) => ({ showHUD: !state.showHUD })),
  toggleTrajectory: () => set((state) => ({ showTrajectory: !state.showTrajectory })),
  toggleParticles: () => set((state) => ({ particleEffects: !state.particleEffects })),
  toggleSound: () => set((state) => ({ soundEnabled: !state.soundEnabled })),
  toggleSafeMode: () => set((state) => ({ safeMode: !state.safeMode }))
}))
