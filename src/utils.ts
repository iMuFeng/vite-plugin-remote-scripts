import { createHash } from 'crypto'
import axios from 'axios'
import { createWriteStream } from 'fs-extra'
import type { HTMLElement } from 'node-html-parser'

export interface RemoteScriptMeta {
  attributeName: string
  extension: string
}

export function chunkHash(text: string) {
  const hex = createHash('md5').update(text).digest('hex')
  return hex.slice(8, 16)
}

export function isValidHttpUrl(str: string) {
  let url
  try {
    url = new URL(str)
  }
  catch (_) {
    return false
  }
  return url.protocol === 'http:' || url.protocol === 'https:'
}

export async function downloadTo(url: string, filepath: string): Promise<void> {
  const writer = createWriteStream(filepath)

  const response = await axios({
    url,
    method: 'GET',
    responseType: 'stream',
  })

  response.data.pipe(writer)

  return new Promise((resolve, reject) => {
    writer.on('finish', resolve)
    writer.on('error', reject)
  })
}

export function getElementMeta(element: HTMLElement, scriptMetas: Record<string, RemoteScriptMeta>) {
  const tagName = element.tagName
  const url = element.getAttribute(scriptMetas[tagName].attributeName)

  return {
    tagName: element.tagName,
    url: url!,
  }
}
