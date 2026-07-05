import type { VercelRequest, VercelResponse } from '@vercel/node'
import { put, list, del } from '@vercel/blob'
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client'
import { cors } from './_lib'

// 画像・ファイル添付を Vercel Blob に保存する（ref_type / ref_id 単位）
const MAX_FILES = 20
// Vercelのリクエストボディ上限(約4.5MB)を base64膨張後も超えないよう、実体は3MBまで
const MAX_BYTES = 3 * 1024 * 1024

const IMAGE_EXT = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic', 'heif', 'bmp', 'svg'])
const MIME: Record<string, string> = {
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif',
  webp: 'image/webp', heic: 'image/heic', bmp: 'image/bmp', svg: 'image/svg+xml',
  pdf: 'application/pdf', doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ppt: 'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  csv: 'text/csv', txt: 'text/plain', zip: 'application/zip',
}

function extOf(name: string): string {
  const m = /\.([A-Za-z0-9]+)$/.exec(name || '')
  return m ? m[1].toLowerCase() : ''
}
function guessType(name: string): string {
  return MIME[extOf(name)] ?? 'application/octet-stream'
}
// 元のファイル名を保持するため、パスに encodeURIComponent して埋め込む
function decodeName(pathname: string): string {
  const base = pathname.split('/').pop() ?? ''
  const idx = base.indexOf('__')
  const raw = idx >= 0 ? base.slice(idx + 2) : base
  try { return decodeURIComponent(raw) } catch { return raw }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  cors(res)
  if (req.method === 'OPTIONS') return res.status(200).end()

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return res.status(503).json({ error: 'Attachment storage not configured', setup_required: true })
  }

  try {
    if (req.method === 'GET') {
      const { ref_id, ref_type } = req.query
      if (!ref_id || !ref_type) return res.status(400).json({ error: 'missing params' })
      const prefix = `photos/${ref_type}/${ref_id}/`
      const { blobs } = await list({ prefix })
      return res.json(blobs.map(b => {
        const filename = decodeName(b.pathname)
        return {
          url: b.url,
          filename,
          content_type: guessType(filename),
          is_image: IMAGE_EXT.has(extOf(filename)),
          uploaded_at: b.uploadedAt,
        }
      }))
    }

    // ブラウザからの直接アップロード（大きいPDF等・Vercelのボディ上限を回避）
    // クライアントの upload() が送る token 要求 / 完了通知を処理する
    if (req.method === 'POST' && typeof req.body?.type === 'string' && req.body.type.startsWith('blob.')) {
      const jsonResponse = await handleUpload({
        body: req.body as HandleUploadBody,
        request: req,
        onBeforeGenerateToken: async () => ({
          addRandomSuffix: false,
          maximumSizeInBytes: 30 * 1024 * 1024,
        }),
        onUploadCompleted: async () => { /* URLはクライアント側で取得済み。何もしない */ },
      })
      return res.status(200).json(jsonResponse)
    }

    if (req.method === 'POST') {
      const { filename, data, ref_id, ref_type, content_type } = req.body ?? {}
      if (!filename || !data || !ref_id || !ref_type) {
        return res.status(400).json({ error: 'missing params' })
      }
      const prefix = `photos/${ref_type}/${ref_id}/`
      const { blobs } = await list({ prefix })
      if (blobs.length >= MAX_FILES) {
        return res.status(400).json({ error: `最大${MAX_FILES}件までです` })
      }
      const match = /^data:([^;]+);base64,/.exec(String(data))
      const mime = content_type || (match ? match[1] : guessType(filename))
      const base64Data = String(data).replace(/^data:[^;]+;base64,/, '')
      const buffer = Buffer.from(base64Data, 'base64')
      if (buffer.length > MAX_BYTES) {
        return res.status(400).json({ error: 'ファイルサイズが大きすぎます (最大3MB)' })
      }
      const safeName = `${Date.now()}__${encodeURIComponent(filename)}`
      const blob = await put(`${prefix}${safeName}`, buffer, {
        access: 'public',
        contentType: mime,
      })
      return res.status(201).json({
        url: blob.url,
        filename,
        content_type: mime,
        is_image: IMAGE_EXT.has(extOf(filename)) || mime.startsWith('image/'),
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
