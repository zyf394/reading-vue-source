/* @flow */

import { identity, resolveAsset } from 'core/util/index'

/**
 * Runtime helper for resolving filters
 */
export function resolveFilter (id: string): Function {
  // 调用 resolveAsset 方法，解析 vm 实例的 $options 属性上的 filters
  return resolveAsset(this.$options, 'filters', id, true) || identity
}
