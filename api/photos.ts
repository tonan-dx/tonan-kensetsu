import type { VercelRequest, VercelResponse } from '@vercel/node'
import { put, list, del } from '@vercel/blob'
import { cors } from './_lib'

const MAX_PHOTOS = 10

export default async function handler(req: VercelRequest, res: VercelResponse) {
  cors(res)
  if (req.method === 'OPTIONS') return res.status(200).end()

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return res.status(503).json({ error: 'Photo storage not configured', setup_required: true })
  }

  try {
    if (req.method === 'GET') {
      const { ref_id, ref_type } = req.query
      if (!ref_id || !ref_type) return res.status(400).json({ error: 'missing params' })
      const prefix = `photos/${ref_type}/${ref_id}/`
      const { blobs } = await list({ prefix })
      return res.json(blobs.map(b => ({
        url: b.url,
        filename: b.pathname.split('/').pop() ?? '',
        uploaded_at: b.uploadedAt,
      })))
    }

    if (req.method === 'POST') {
      const { filename, data, ref_id, ref_type } = req.body ?? {}
      if (!filename || !data || !ref_id || !ref_type) {
        return res.status(400).json({ error: 'missing params' })
      }
      const prefix = `photos/${ref_type}/${ref_id}/`
      const { blobs } = await list({ prefix })
      if (blobs.length >= MAX_PHOTOS) {
        return res.status(400).json({ error: `最大${MAX_PHOTOS}枚までです` })
      }
      const base64Data = String(data).replace(/^data:image\/\w+;base64,/, '')
      const buffer = Buffer.from(base64Data, 'base64')
      if (buffer.length > 4 * 1024 * 1024) {
        return res.status(400).json({ error: 'ファイルサイズが大きすぎます (最大4MB)' })
      }
      const safeName = `${Date.now()}.jpg`
      const blob = await put(`${prefix}${safeName}`, buffer, {
        access: 'public',
        contentType: 'image/jpeg',
      })
      return res.status(201).json({
        url: blob.url,
        filename: safeName,
        uploaded_at: new Date().toISOString(),
      })
    }

    if (req.method === 'DELETE') {
      const { url } = req.query
      if (!url) return res.status(400).json({ error: 'missing url' })
      await del(String(url))
      return res.json({ ok: true })
    }

    res.status(405).end()
  } catch (e: any) {
    console.error(e)
    res.status(500).json({ error: String(e) })
  }
}
