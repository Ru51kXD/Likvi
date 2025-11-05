import React, { useEffect } from 'react'
import { Canvas } from '@react-three/fiber'
import { Physics } from '@react-three/rapier'
import { useSimulatorStore } from './store/useSimulatorStore'
import QuadcopterWithCollision from './components/QuadcopterWithCollision'
import EnhancedTerrain from './components/EnhancedTerrain'
import CameraController from './components/CameraController'
import Trajectory from './components/Trajectory'
import FlightStats from './components/FlightStats'
import CollisionDetector from './components/CollisionDetector'
import CrashNotification from './components/CrashNotification'
import CrashParticles from './components/CrashParticles'
import SoundSystem from './components/SoundSystem'
import MiniMap from './components/MiniMap'
import Achievements from './components/Achievements'
import HUD from './components/HUD'
import SettingsPanel from './components/SettingsPanel'
import ControlsPanel from './components/ControlsPanel'
import './App.css'

function App() {
  // Обработка ESC для меню
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        // Можно добавить меню паузы
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])
  
  return (
    <div className="app">
      <Canvas
        shadows={false}
        camera={{ position: [0, 20, 30], fov: 75 }}
        gl={{ 
          antialias: true,
          alpha: false,
          powerPreference: 'high-performance'
        }}
        onCreated={({ gl, scene, camera }) => {
          gl.setClearColor('#87CEEB')
          // Убедимся что камера видит центр сцены
          camera.lookAt(0, 0, 0)
        }}
      >
        {/* Окружение - упрощенное для экономии текстур */}
        <color attach="background" args={['#87CEEB']} />
        <fog attach="fog" args={['#87CEEB', 100, 500]} />
        
        
        {/* Освещение */}
        <ambientLight intensity={0.8} />
        {/* Простое освещение без теней (экономия текстур) */}
        <directionalLight
          position={[50, 100, 50]}
          intensity={1.5}
        />
        
        {/* Физика */}
        <Physics gravity={[0, -9.81, 0]} debug={false}>
          <EnhancedTerrain />
          <QuadcopterWithCollision />
        </Physics>
        
        {/* Тестовая сцена отключена, чтобы не мешать старту */}
        
        {/* Камера */}
        <CameraController />
        
        {/* Траектория */}
        <Trajectory />
        
        {/* Статистика полета */}
        <FlightStats />
        
        {/* Звуковая система */}
        <SoundSystem />
        
        {/* Частицы крушения */}
        <CrashParticles />
        
            {/* Постобработка отключена для экономии текстурных юнитов */}
      </Canvas>
      
      {/* UI */}
      <HUD />
      <SettingsPanel />
      <ControlsPanel />
      <MiniMap />
      <CrashNotification />
      <Achievements />
    </div>
  )
}

export default App