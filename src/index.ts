import { dirname, relative, resolve } from 'path'
import { slash } from '@antfu/utils'
import _debug from 'debug'
import { emptyDir, ensureDir, existsSync, unlink } from 'fs-extra'
import { parse } from 'node-html-parser'
import type { Plugin, ResolvedConfig, ViteDevServer } from 'vite'
import { type RemoteScriptMeta, chunkHash, downloadTo, getElementMeta, isValidHttpUrl } from './utils'

export interface RemoteScriptsOptions {
  /**
   * Directory name to store the styles or scripts from remote
   *
   * @default 'node_modules/.remote-scripts'
   */
  assetsDir?: string

  /**
   * Mark the elements that need to download resources
   *
   * @default data-remote-script
   */
  attributeName?: string

  /**
   * Prefix appended to the file when bundling
   *
   * @default remote-script
   */
  chunkPrefix?: 'remote-script.'

  /**
   * Mode to resolve urls
   *
   * @default relative
   */
  resolveMode?: 'relative' | '@fs' | ((moduleId: string, url: string) => 'relative' | '@fs')

  /**
   * Wait for download before serving the content
   *
   * @default true
   */
  awaitDownload?: boolean
}

const defaultScriptMetas: Record<string, RemoteScriptMeta> = {
  SCRIPT: {
    attributeName: 'src',
    extension: '.js',
  },
  LINK: {
    attributeName: 'href',
    extension: '.css',
  },
}

const debug = _debug('vite-plugin-remote-scripts')

export function VitePluginRemoteScripts(options: RemoteScriptsOptions = {}): Plugin {
  const {
    assetsDir = 'node_modules/.remote-scripts',
    attributeName = 'data-remote-script',
    chunkPrefix = 'remote-script.',
    resolveMode = 'relative',
    awaitDownload = true,
  } = options

  let dir: string = undefined!
  let config: ResolvedConfig
  let server: ViteDevServer | undefined

  const tasksMap: Record<string, Promise<void> | undefined> = {}

  async function transform(code: string, id: string) {
    const root = parse(code)
    const elements = root.querySelectorAll(`link[${attributeName}], script[${attributeName}]`)

    if (elements.length > 0) {
      const tasks: Promise<void>[] = []
      let hasReplaced = false

      for (const element of elements) {
        const meta = getElementMeta(element, defaultScriptMetas)

        if (!meta.url || !isValidHttpUrl(meta.url))
          continue

        const hash = chunkPrefix + chunkHash(meta.url) + defaultScriptMetas[meta.tagName].extension
        let filepath

        if (config.env.PROD) {
          filepath = slash([config.root, config.build.outDir, config.build.assetsDir, hash].join('/'))
        }
        else {
          filepath = slash(resolve(dir, hash))
        }

        debug('detected', meta.url, hash)

        if (!existsSync(filepath) || tasksMap[filepath]) {
          if (!tasksMap[filepath]) {
            tasksMap[filepath] = (async () => {
              try {
                debug('downloading', meta.url)
                await downloadTo(meta.url, filepath)
                debug('downloaded', meta.url)
              }
              catch (e) {
                if (existsSync(filepath)) {
                  await unlink(filepath)
                }
                throw e
              }
              finally {
                delete tasksMap[filepath]
              }
            })()
          }
          tasks.push(tasksMap[filepath]!)

          if (!config.env.PROD && !awaitDownload) {
            continue
          }
        }

        hasReplaced = true

        const mode = typeof resolveMode === 'function' ? resolveMode(id, meta.url) : resolveMode
        let newUrl: string

        if (config.env.PROD) {
          newUrl = slash([config.base + config.build.assetsDir, hash].join('/'))
        }
        else {
          if (mode === 'relative') {
            newUrl = slash(relative(dirname(id), `${dir}/${hash}`))
            if (newUrl[0] !== '.') {
              newUrl = `./${newUrl}`
            }
          }
          else {
            let path = `${dir}/${hash}`
            if (!path.startsWith('/')) {
              path = `/${path}`
            }

            newUrl = `/@fs${path}`
          }
        }

        element.setAttribute(defaultScriptMetas[element.tagName].attributeName, newUrl)
      }

      if (tasks.length) {
        if (config.env.PROD || awaitDownload) {
          await Promise.all(tasks)
        }
        else {
          Promise.all(tasks).then(() => {
            if (server) {
              const module = server.moduleGraph.getModuleById(id)

              if (module) {
                server.moduleGraph.invalidateModule(module)
              }
            }
          })
        }
      }

      if (!hasReplaced)
        return null

      code = root.toString()
    }

    return code
  }

  async function configResolved(_config: ResolvedConfig) {
    config = _config

    if (config.env.PROD) {
      dir = slash(resolve(config.root, config.build.outDir, config.build.assetsDir))
    }
    else {
      dir = slash(resolve(config.root, assetsDir))
    }

    if (config.server.force) {
      await emptyDir(dir)
    }

    await ensureDir(dir)
  }

  return {
    name: 'vite-plugin-remote-scripts',
    enforce: 'post',
    configResolved,
    configureServer(_server) {
      server = _server
    },
    transformIndexHtml: {
      enforce: 'post',
      async transform(code, ctx) {
        await configResolved(config)
        return await transform(code, ctx.filename)
      },
    },
  } as Plugin
}

export default VitePluginRemoteScripts
