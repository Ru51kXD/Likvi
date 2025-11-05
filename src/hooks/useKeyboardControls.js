import { useState, useEffect, useRef } from 'react'

export function useKeyboardControls() {
  const [keys, setKeys] = useState({})
  const pressedRef = useRef({})

  useEffect(() => {
    const handleKeyDown = (e) => {
      // Блокируем прокрутку стрелками/пробелом в Canvas
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
        e.preventDefault()
      }
      if (pressedRef.current[e.key]) return
      pressedRef.current[e.key] = true
      setKeys(prev => ({ ...prev, [e.key]: true }))
    }

    const handleKeyUp = (e) => {
      if (!pressedRef.current[e.key]) return
      const copy = { ...pressedRef.current }
      delete copy[e.key]
      pressedRef.current = copy
      setKeys(prev => {
        const newKeys = { ...prev }
        delete newKeys[e.key]
        return newKeys
      })
    }

    window.addEventListener('keydown', handleKeyDown, { passive: false })
    window.addEventListener('keyup', handleKeyUp)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [])

  return keys
}