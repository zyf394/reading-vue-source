/* @flow */

import { isObject, isDef } from 'core/util/index'

/**
 * Runtime helper for rendering v-for lists.
 */
// 运行时工具：帮助渲染 v-for 列表
export function renderList (
  val: any,
  render: () => VNode
): ?Array<VNode> {
  // 声明变量 ret, i, l, keys, key
  let ret: ?Array<VNode>, i, l, keys, key
  // 如果传入的 val 是数组或者是字符串
  if (Array.isArray(val) || typeof val === 'string') {
    // 将 ret 赋值为一个数组，数组的长度是 val.length
    ret = new Array(val.length)
    // 遍历 ret 并调用传入的 render 方法，将结果赋值给 ret 里的每一项
    for (i = 0, l = val.length; i < l; i++) {
      ret[i] = render(val[i], i)
    }
  // 如果传入的 val 是数字
  } else if (typeof val === 'number') {
    // 将 ret 赋值为一个数组，数组的长度是 val
    ret = new Array(val)
    // 遍历 ret 并调用传入的 render 方法，将结果赋值给 ret 里的每一项
    for (i = 0; i < val; i++) {
      ret[i] = render(i + 1, i)
    }
  // 如果传入的 val 是对象
  } else if (isObject(val)) {
    // 获取所有键
    keys = Object.keys(val)
    // 将 ret 赋值为一个数组，数组的长度是 keys.length
    ret = new Array(keys.length)
    // 遍历 ret 并调用传入的 render 方法，将结果赋值给 ret 里的每一项
    for (i = 0, l = keys.length; i < l; i++) {
      key = keys[i]
      ret[i] = render(val[key], key, i)
    }
  }
  // 如果 ret 已经被定义了
  if (isDef(ret)) {
    // 给 ret 上增加一个属性 _isVList，并设置为 true
    (ret: any)._isVList = true
  }
  // 返回 ret
  return ret
}
