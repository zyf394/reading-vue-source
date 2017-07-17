/* @flow */

import config from 'core/config'
import { isObject, warn, toObject } from 'core/util/index'

/**
 * Runtime helper for merging v-bind="object" into a VNode's data.
 */
// 运行时工具：帮助合并 v-bind="object" 设置的数据与 VNode 节点上的 data 属性
export function bindObjectProps (
  data: any,
  tag: string,
  value: any,
  asProp?: boolean
): VNodeData {
  // 是否传了value
  if (value) {
    // value是否是对象
    if (!isObject(value)) {
      // 如果不是则报错
      process.env.NODE_ENV !== 'production' && warn(
        // 警告：v-bind 需要传入一个对象或者数组参数
        'v-bind without argument expects an Object or Array value',
        this
      )
    } else {
      // 如果是数组，则转为对象
      if (Array.isArray(value)) {
        value = toObject(value)
      }
      // 声明一个 hash 值备用
      let hash
      // 遍历 value 里的 key 值
      for (const key in value) {
        // 如果是 Class 和 style （保留字），则赋值data（上面传入的值）给 hash
        if (key === 'class' || key === 'style') {
          hash = data
        } else {
          // 获取其他属性值
          const type = data.attrs && data.attrs.type
          // 按条件给 hash 赋值
          hash = asProp || config.mustUseProp(tag, type, key) // 如果是 prop 或者必须使用 prop
            ? data.domProps || (data.domProps = {}) // 则将 data.domProps 赋值给 hash
            : data.attrs || (data.attrs = {}) // 如果不是则将 data.attrs 赋值给 hash
        }
        // 如果传入的key不在hash列表里（我们刚才存下来的data.attrs或data.domProp），则添加key到到hash里
        if (!(key in hash)) {
          hash[key] = value[key]
        }
      }
    }
  }
  // 将处理过的data返回
  return data
}
