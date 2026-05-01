"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

export function SecretAccess() {
  const [clicks, setClicks] = useState(0)
  const router = useRouter()

  const handleSecretClick = () => {
    const newClicks = clicks + 1
    setClicks(newClicks)

    if (newClicks === 7) {
      router.push("/sanctum/portal")
      setClicks(0)
    }

    // Reset después de 3 segundos sin clicks
    setTimeout(() => {
      setClicks(0)
    }, 3000)
  }

  return (
    <div onClick={handleSecretClick} className="cursor-pointer" title={clicks > 0 ? `${clicks}/7` : ""}>
      {/* Este componente se puede usar envolviendo el logo */}
    </div>
  )
}
