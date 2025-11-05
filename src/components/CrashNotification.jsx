import React, { useEffect, useState } from 'react'
import { useSimulatorStore } from '../store/useSimulatorStore'
import './CrashNotification.css'

function CrashNotification() {
  const { isCrash, resetFlight } = useSimulatorStore()
  const [show, setShow] = useState(false)
  const [fadeOut, setFadeOut] = useState(false)
  
  useEffect(() => {
    // Не показываем крушение сразу при загрузке
    if (isCrash) {
      setShow(true)
      setFadeOut(false)
      
      // Звук крушения (если есть)
      // Можно добавить звуковой эффект
      
      // Автоматическое скрытие через 5 секунд
      const timer = setTimeout(() => {
        setFadeOut(true)
        setTimeout(() => {
          setShow(false)
        }, 500)
      }, 5000)
      
      return () => clearTimeout(timer)
    }
  }, [isCrash])
  
  if (!show) return null
  
  const handleReset = () => {
    resetFlight()
    setFadeOut(true)
    setTimeout(() => {
      setShow(false)
    }, 500)
  }
  
  return (
    <div className={`crash-notification ${fadeOut ? 'fade-out' : ''}`}>
      <div className="crash-content">
        <div className="crash-icon">💥</div>
        <h2 className="crash-title">КРУШЕНИЕ!</h2>
        <p className="crash-message">
          Квадрокоптер разбился при столкновении с объектом
        </p>
        <div className="crash-stats">
          <p>Причина: Столкновение</p>
          <p>Скорость при ударе: {Math.round(useSimulatorStore.getState().speed)} км/ч</p>
        </div>
        <button className="crash-reset-button" onClick={handleReset}>
          Начать заново
        </button>
      </div>
    </div>
  )
}

export default CrashNotification
