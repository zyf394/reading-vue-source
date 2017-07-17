/* @flow */

/**
 * Runtime helper for resolving raw children VNodes into a slot object.
 */
// 运行时工具：帮助解析未加工的 children VNodes（子节点）到 slot 插槽对象中
export function resolveSlots (
  children: ?Array<VNode>,
  context: ?Component
): { [key: string]: Array<VNode> } {
  // 声明一个变量 slots
  const slots = {}
  if (!children) {
    // 如果没有传 children 参数，则直接将 slots 返回
    return slots
  }
  // 声明一个变量 defaultSlot
  const defaultSlot = []
  // 遍历传入的 children
  for (let i = 0, l = children.length; i < l; i++) {
    const child = children[i]
    // named slots should only be respected if the vnode was rendered in the
    // same context.
    // 如果 vnode 在同一个上下文中渲染，已命名的 slots 插槽应该被慎重对待
    if ((child.context === context || child.functionalContext === context) &&
      // 如果 child 的上下文 context，或者函数上下文 functionalContext，与传入的 context 等值
      // 并且 child.data.slot 不为空
      child.data && child.data.slot != null
    ) {
      // 获取 child.data.slot
      const name = child.data.slot
      // 获取对于的插槽 slot
      const slot = (slots[name] || (slots[name] = []))
      if (child.tag === 'template') {
        // 如果 child.tag 是 template 标签
        // 则将 child.children 推入 slot 数组中
        slot.push.apply(slot, child.children)
      } else {
        // 否则将 child 推入 slot 数组中
        slot.push(child)
      }
    } else {
      // 其余的 child 推入 defaultSlot 默认插槽数组中
      defaultSlot.push(child)
    }
  }
  // ignore whitespace
  if (!defaultSlot.every(isWhitespace)) {
    // 如果 defaultSlot 默认插槽数组中的所有元素都不是空格
    // 将 defaultSlot 赋值给 slots.default
    slots.default = defaultSlot
  }
  // 将 slots 返回
  return slots
}
// 判断是空格
function isWhitespace (node: VNode): boolean {
  // 是注释节点或者节点文本为空格
  return node.isComment || node.text === ' '
}
// 解析作用域插槽的方法
export function resolveScopedSlots (
  fns: ScopedSlotsData, // see flow/vnode
  res?: Object
): { [key: string]: Function } {
  // 给 res 设置默认值
  res = res || {}
  // 遍历传入的 fns
  for (let i = 0; i < fns.length; i++) {
    if (Array.isArray(fns[i])) {
      // 如果 fns[i] 是数组，则递归调用 resolveScopedSlots
      resolveScopedSlots(fns[i], res)
    } else {
      // 否则将 fns[i].fn 赋值给 res[fns[i].key]
      res[fns[i].key] = fns[i].fn
    }
  }
  // 返回解析完的结果
  return res
}
