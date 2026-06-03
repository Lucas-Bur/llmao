import { useEffect, useState } from "react"

import { Skeleton } from "@/components/ui/skeleton"

type QRCodeProps = {
  url: string
  size?: number
}

export function QRCode({ url, size = 200 }: Readonly<QRCodeProps>) {
  const [dataUrl, setDataUrl] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    import("qrcode").then((mod) => {
      if (cancelled) return
      mod.default.toDataURL(url, { width: size, margin: 2 }, (_, url) => {
        if (!cancelled) setDataUrl(url)
      })
    })
    return () => { cancelled = true }
  }, [url, size])

  if (!dataUrl) {
    return <Skeleton className="rounded-none" style={{ width: size, height: size }} />
  }

  return (
    <img
      src={dataUrl}
      alt="QR-Code"
      width={size}
      height={size}
      className="border"
    />
  )
}
