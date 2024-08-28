let trigger = new Map<string, number>()

export function getCurrentTimestamp() {
  return Math.floor(new Date().getTime())
}

export function startTrigger(label: string) {
  if (trigger.has(label)) { 
    // console.log(`[DAVID](TIME) Cannot start trigger for ${label}. already running ...`)
    return
  }
  const triggerStart = getCurrentTimestamp()
  // console.log(`[DAVID](TIME)(${label}) start trigerr. timestamp = ${triggerStart}`)
  trigger.set(label, triggerStart)
}

export function endTrigger(label: string) {
  const startTime = trigger.get(label)
  if (!startTime) { 
    // console.log(`[DAVID](TIME)(${label}) Cannot end trigger. not running ...`)
    return
  }
  const timestamp = getCurrentTimestamp()
  console.log(`[DAVID](TIME)(${label}) Trigger elapsed = ${timestamp - startTime} ms`)
  trigger.delete(label)
}