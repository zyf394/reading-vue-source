/* @flow */

import { cloneVNode, cloneVNodes } from 'core/vdom/vnode'

/**
 * Runtime helper for rendering static trees.
 */
// 运行时工具：帮助渲染静态树
export function renderStatic (
  index: number,
  isInFor?: boolean
): VNode | Array<VNode> {
  // 从 _staticTrees 获取静态树中的某个元素
  let tree = this._staticTrees[index]
  // if has already-rendered static tree and not inside v-for,
  // we can reuse the same tree by doing a shallow clone.
  // 如果已经有渲染过的静态树，并且不是在 v-for 中，我们可以将这个树 clone 下来复用
  if (tree && !isInFor) {
    // 返回克隆后的 VNode
    return Array.isArray(tree)
      ? cloneVNodes(tree)
      : cloneVNode(tree)
  }
  // otherwise, render a fresh tree.
  // 否则调用 this.$options.staticRenderFns 方法渲染一株新树
  tree = this._staticTrees[index] = this.$options.staticRenderFns[index].call(this._renderProxy)
  // 给树做静态标记
  markStatic(tree, `__static__${index}`, false)
  // 将处理后的树返回
  return tree
}

/**
 * Runtime helper for v-once.
 * Effectively it means marking the node as static with a unique key.
 */
// 运行时工具：帮助渲染 v-once ，功能上这个只渲染元素和组件一次。
// 官方文档注释：随后的重新渲染，元素/组件及其所有的子节点将被视为静态内容并跳过。这可以用于优化更新性能。

export function markOnce (
  tree: VNode | Array<VNode>,
  index: number,
  key: string
) {
  // 给树做静态标记 __once__
  markStatic(tree, `__once__${index}${key ? `_${key}` : ``}`, true)
  return tree
}

// 给渲染树做静态标记的方法
function markStatic (
  tree: VNode | Array<VNode>,
  key: string,
  isOnce: boolean
) {
  // 如果传入的 tree 是数组则遍历，并做静态标记
  if (Array.isArray(tree)) {
    for (let i = 0; i < tree.length; i++) {
      if (tree[i] && typeof tree[i] !== 'string') {
        // 如果 tree[i] 不是字符串类型，则给这个节点做标记
        markStaticNode(tree[i], `${key}_${i}`, isOnce)
      }
    }
  } else {
    // 如果 tree 不是数组，则给 tree 节点做标记
    markStaticNode(tree, key, isOnce)
  }
}
// 给静态 Node 作标记
function markStaticNode (node, key, isOnce) {
  node.isStatic = true
  node.key = key
  node.isOnce = isOnce
}
