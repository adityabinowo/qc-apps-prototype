export async function compressToUnder1MB(file: File): Promise<Blob> {
  const MAX = 900 * 1024
  if (file.size <= MAX) return file
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const canvas = document.createElement('canvas')
      const scale = Math.sqrt(MAX / file.size)
      canvas.width = Math.round(img.width * scale)
      canvas.height = Math.round(img.height * scale)
      canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
      const tryEncode = (q: number) => {
        canvas.toBlob(blob => {
          if (!blob) return reject(new Error('canvas.toBlob failed'))
          if (blob.size <= MAX || q <= 0.3) return resolve(blob)
          tryEncode(q - 0.1)
        }, 'image/jpeg', q)
      }
      tryEncode(0.85)
    }
    img.onerror = reject
    img.src = url
  })
}
