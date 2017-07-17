/* @flow */

import { extend, warn } from 'core/util/index'

/**
 * Runtime helper for rendering <slot>
 */
// 运行时工具：帮助渲染 slot 插槽
export function renderSlot (
  name: string,
  fallback: ?Array<VNode>,
  props: ?Object,
  bindObject: ?Object
): ?Array<VNode> {
  // 获取 scopedSlotFn 作用域插槽方法
  const scopedSlotFn = this.$scopedSlots[name]
  // 扩展 scopedSlotFn 传入的 props
  if (scopedSlotFn) {
    // 如果有 scoped slot 作用域插槽
    props = props || {}
    if (bindObject) {
      // 如果传入了 bindObject，则合并 props 与 bindObject
      extend(props, bindObject)
    }
    // 调用 scopedSlotFn 方法，如果有返回值则返回结果，没有则返回备用的 fallback
    return scopedSlotFn(props) || fallback 
  } else {
    // 如果没有作用域插槽
    // 获取 slotNodes 插槽节点
    const slotNodes = this.$slots[name]
    // warn duplicate slot usage
    // 如果有 render 过的重复冗余的 slot 则报错
    if (slotNodes && process.env.NODE_ENV !== 'production') {
      slotNodes._rendered && warn(
        // 警告： 重复的插槽 "${name}" 在同一渲染树中出现，这很可能会引起渲染错误
        `Duplicate presence of slot "${name}" found in the same render tree ` +
        `- this will likely cause render errors.`,
        this
      )
      // 第一次渲染之后做个标记 _rendered
      slotNodes._rendered = true
    }
    // 返回 slotNodes 插槽节点，如果没有则返回备用的 fallback
    return slotNodes || fallback
  }
}
