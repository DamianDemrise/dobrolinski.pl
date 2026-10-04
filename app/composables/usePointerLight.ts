import { computed, onBeforeUnmount, ref } from 'vue'

export function usePointerLight() {
  const current = ref({ x: 50, y: 42 })
  const target = { x: 50, y: 42 }
  let frame: number | undefined

  const tick = () => {
    current.value = {
      x: current.value.x + (target.x - current.value.x) * 0.075,
      y: current.value.y + (target.y - current.value.y) * 0.075,
    }

    const distance = Math.abs(target.x - current.value.x) + Math.abs(target.y - current.value.y)
    frame = distance > 0.05 ? requestAnimationFrame(tick) : undefined
  }

  const onPointerMove = (event: PointerEvent) => {
    if (event.pointerType === 'touch') return

    target.x = (event.clientX / window.innerWidth) * 100
    target.y = (event.clientY / window.innerHeight) * 100

    if (frame === undefined) frame = requestAnimationFrame(tick)
  }

  onBeforeUnmount(() => {
    if (frame !== undefined) cancelAnimationFrame(frame)
  })

  return {
    lightStyle: computed(() => ({
      '--pointer-x': `${current.value.x}%`,
      '--pointer-y': `${current.value.y}%`,
    })),
    onPointerMove,
  }
}
