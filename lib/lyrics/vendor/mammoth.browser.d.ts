/**
 * Minimal type declaration for the vendored mammoth browser bundle
 * (mammoth.browser.js — see mammoth-LICENSE). Vendored rather than an npm
 * dependency because this environment's pnpm store is in a broken state
 * unrelated to this feature; swap for the real "mammoth" package's types
 * once `pnpm install` has been run normally.
 */

export interface MammothMessage {
  type: string
  message: string
}

export interface MammothResult {
  value: string
  messages: MammothMessage[]
}

export interface MammothStyleMap {
  styleMap?: string[]
}

declare const mammoth: {
  convertToHtml(input: { arrayBuffer: ArrayBuffer }, options?: MammothStyleMap): Promise<MammothResult>
  extractRawText(input: { arrayBuffer: ArrayBuffer }): Promise<MammothResult>
}

export default mammoth
