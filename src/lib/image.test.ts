import { describe, expect, it } from 'vitest'
import { safePhotoPath } from './image'

describe('safePhotoPath', () => {
  it('never embeds the original file name', () => {
    const path = safePhotoPath('hub-salemba', 'Minced beef in supermarket packa…_20260716111.jpeg', 0, 1700000000000)
    expect(path).toBe('hub-salemba/1700000000000-0.jpeg')
  })

  it('lowercases and keeps a safe extension', () => {
    expect(safePhotoPath('hub-a', 'photo.PNG', 0, 1)).toBe('hub-a/1-0.png')
  })

  it('falls back to jpg when the extension is missing or unsafe', () => {
    expect(safePhotoPath('hub-a', 'no-extension', 0, 1)).toBe('hub-a/1-0.jpg')
    expect(safePhotoPath('hub-a', 'weird…name', 0, 1)).toBe('hub-a/1-0.jpg')
  })

  it('stays unique across files uploaded in the same submission', () => {
    const first = safePhotoPath('hub-a', 'a.jpg', 0, 1)
    const second = safePhotoPath('hub-a', 'b.jpg', 1, 1)
    expect(first).not.toBe(second)
  })
})
