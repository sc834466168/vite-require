import path from 'path'
import {
  type Plugin,
  type ResolvedConfig,
} from 'vite'
import {
  cleanUrl,
  isCommonjs,
  JS_EXTENSIONS,
  KNOWN_SFC_EXTENSIONS,
} from './utils'
import { analyze } from './analyze'
import { Resolve } from './resolve'
import { DynamicRequire } from './dynamic-require'
import { dynamicImportToGlob } from './dynamic-import-to-glob'

export {
  analyze,
  Resolve,
  DynamicRequire,
  dynamicImportToGlob,
}

export interface Options {
  extensions?: string[]
  filter?: (id: string) => false | void
  /**
   * This option will change `./*` to `./** /*`
   * @default true
   */
  depth?: boolean
}

export function viteRequire(options: Options = {}): Plugin {
  const extensions = JS_EXTENSIONS.concat(KNOWN_SFC_EXTENSIONS)
  let config: ResolvedConfig
  let dynamicRequire: DynamicRequire

  return {
    name: 'vite-require',
    configResolved(_config) {
      config = _config
      options.extensions = [...new Set((config.resolve?.extensions || extensions).concat(options.extensions || []))]
      dynamicRequire = new DynamicRequire(options, _config)
    },
    transform(code, id) {
      const pureId = cleanUrl(id)

      if (/node_modules\/(?!\.vite)/.test(pureId)) return
      if (!extensions.includes(path.extname(pureId))) return
      if (!isCommonjs(code)) return
      if (options.filter?.(pureId) === false) return

      const ast = this.parse(code)
      const analyzed = analyze(ast, code)
      if (!analyzed.require.length) return

      return dynamicRequire.transform(analyzed, id)
    },
  }
}