/* @flow */

import config from 'core/config'
/**
 * Runtime helper for checking keyCodes from config.
 */
// 运行时工具：帮助校验通过 Vue.config 设置的 keycodes，keycodes 是给 v-on 自定义键位别名。
export function checkKeyCodes (
  eventKeyCode: number,
  key: string,
  builtInAlias: number | Array<number> | void
): boolean {
  // 获取通过 Vue.config 设置的 keycodes
  // 如果没有，则取传入的内置别名
  const keyCodes = config.keyCodes[key] || builtInAlias
  if (Array.isArray(keyCodes)) {
    // 如果 keyCodes 是数组
    // 返回一个布尔值，判断传入的 eventKeyCode 是否在 keyCodes 列表里
    return keyCodes.indexOf(eventKeyCode) === -1
  } else {
    // 如果不是数组
    // 返回一个布尔值，判断传入的 eventKeyCode 是否与 keyCodes 相等
    return keyCodes !== eventKeyCode
  }
}
