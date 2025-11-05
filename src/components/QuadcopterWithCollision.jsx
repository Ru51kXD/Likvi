import React, { useRef } from 'react'
import Quadcopter from './Quadcopter'
import CollisionDetector from './CollisionDetector'

function QuadcopterWithCollision() {
  const quadcopterRef = useRef()
  
  return (
    <>
      <Quadcopter ref={quadcopterRef} />
      <CollisionDetector quadcopterRef={quadcopterRef} />
    </>
  )
}

export default QuadcopterWithCollision
