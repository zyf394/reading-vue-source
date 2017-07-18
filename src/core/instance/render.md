## 简述

该文件暴露了 `renderMixin ` 方法，给 Vue 实例上的属性设置一系列渲染相关的方法。

## 源码

```javascript
/* @flow */

import {
  warn,
  nextTick,
  toNumber,
  toString,
  looseEqual,
  emptyObject,
  handleError,
  looseIndexOf
} from '../util/index'

import VNode, {
  cloneVNodes,
  createTextVNode,
  createEmptyVNode
} from '../vdom/vnode'

import { createElement } from '../vdom/create-element'
import { renderList } from './render-helpers/render-list'
import { renderSlot } from './render-helpers/render-slot'
import { resolveFilter } from './render-helpers/resolve-filter'
import { checkKeyCodes } from './render-helpers/check-keycodes'
import { bindObjectProps } from './render-helpers/bind-object-props'
import { renderStatic, markOnce } from './render-helpers/render-static'
import { resolveSlots, resolveScopedSlots } from './render-helpers/resolve-slots'

// 初始化Render
export function initRender (vm: Component) {
  // vm 实例上定义属性 _vnode 作为子树的根节点
  vm._vnode = null // the root of the child tree
  // vm 实例上定义属性 _staticTrees
  vm._staticTrees = null
  // 获取父节点
  const parentVnode = vm.$vnode = vm.$options._parentVnode // the placeholder node in parent tree
  // 获取父节点的上下文
  const renderContext = parentVnode && parentVnode.context
  // vm 实例上定义属性 $slots ，并调用 resolveSlots 方法获取相关的插槽，结果赋值给 vm.$slots
  vm.$slots = resolveSlots(vm.$options._renderChildren, renderContext)
  // // vm 实例上定义属性 $scopedSlots ，将一个被冻结的空对象 emptyObject 赋值给它
  vm.$scopedSlots = emptyObject
  // bind the createElement fn to this instance
  // so that we get proper render context inside it.
  // args order: tag, data, children, normalizationType, alwaysNormalize
  // internal version is used by render functions compiled from templates
  // 在 vm 实例上定义简写属性 _c ，给实例绑定 createElement 方法，以使我们可以获取争取的渲染上下文。
  // createElement 函数传入的6个参数分别为：vm（实例）, tag（标签）, data（数据）, 
  // children（子节点）, normalizationType（一般化类型）, alwaysNormalize（是否总是一般化）
  vm._c = (a, b, c, d) => createElement(vm, a, b, c, d, false)
  // normalization is always applied for the public version, used in
  // user-written render functions.
  // 再在 vm 实例上定义属性 $createElement，方便用户调用，功能如上
  vm.$createElement = (a, b, c, d) => createElement(vm, a, b, c, d, true)
}

// 将render相关方法混合
export function renderMixin (Vue: Class<Component>) {
  // 在 Vue.prototype 定义方法 $nextTick，返回一个调用 nextTick 函数的结果
  Vue.prototype.$nextTick = function (fn: Function) {
    return nextTick(fn, this)
  }
  // 在 Vue.prototype 定义方法 _render
  Vue.prototype._render = function (): VNode {
    // 获取实例 vm ，指向 this
    const vm: Component = this
    // 获取 vm.$options 对象上的 render, staticRenderFns, _parentVnode 属性
    const {
      render,
      staticRenderFns,
      _parentVnode
    } = vm.$options

    if (vm._isMounted) {
      // 如果已经Mounted了，则克隆所有的 slot 节点
      // clone slot nodes on re-renders
      for (const key in vm.$slots) {
        vm.$slots[key] = cloneVNodes(vm.$slots[key])
      }
    }
    // 设置 $scopedSlots ，如果有父节点 _parentVnode，则将 _parentVnode.data.scopedSlots 赋值给 $scopedSlots
    // 否则赋值为一个冻结的空对象
    vm.$scopedSlots = (_parentVnode && _parentVnode.data.scopedSlots) || emptyObject
    // 如果 vm.$options 传入了 staticRenderFns 方法，并且实例上 _staticTrees 为空
    // 则在 vm 实例上定义属性 _staticTrees （静态树）
    if (staticRenderFns && !vm._staticTrees) {
      vm._staticTrees = []
    }
    // set parent vnode. this allows render functions to have access
    // to the data on the placeholder node.
    // 给 vm.$vnode 赋值 _parentVnode（vm.$options 传入的父节点）
    vm.$vnode = _parentVnode
    // render self
    // 渲染自身
    // 定义一个变量 vnode
    let vnode
    try {
      // 尝试调用 render 方法渲染，将结果赋值给 vnode ，render 方法来自 vm.$options 传入的 render 属性
      vnode = render.call(vm._renderProxy, vm.$createElement)
    } catch (e) {
      // 处理错误情况
      handleError(e, vm, `render function`)
      // return error render result,
      // or previous vnode to prevent render error causing blank component
      /* istanbul ignore else */
      // 将错误渲染成 vnode 返回，或者返回之前的 vnode， 以防止错误渲染引起了空组件
      if (process.env.NODE_ENV !== 'production') {
        // 非生产环境
        // renderError 在这里处理哦，就是你们页面上看到的错误堆栈的打印
        // 如果 vm.$options 传入了 renderError 方法，则调用 renderError 方法
        // 否则将 vm._vnode 赋值给 vnode
        vnode = vm.$options.renderError
          ? vm.$options.renderError.call(vm._renderProxy, vm.$createElement, e)
          : vm._vnode
      } else {
        // 非生产环境，直接将 vm._vnode 赋值给 vnode
        vnode = vm._vnode
      }
    }
    // return empty vnode in case the render function errored out
    // 返回空节点，以防止 render 方法错误溢出
    if (!(vnode instanceof VNode)) {
      // 如果 vnode 不是 VNode 的实例
      if (process.env.NODE_ENV !== 'production' && Array.isArray(vnode)) {
        // 非生产环境下并且 vnode是数组，则报错
        warn(
          // 警告：render 方法返回了多个根节点，render 方法应该只返回单一的根节点
          'Multiple root nodes returned from render function. Render function ' +
          'should return a single root node.',
          vm
        )
      }
      // 调用 createEmptyVNode 方法生成空节点，并赋值给 vnode
      vnode = createEmptyVNode()
    }
    // set parent
    // 将 _parentVnode 赋值给 vnode.parent
    vnode.parent = _parentVnode
    // 将处理完的 vnode 返回
    return vnode
  }
  // 内部render的帮助方法，为了减少render的代码量，这些变量被暴露到实例原型上
  // internal render helpers.
  // these are exposed on the instance prototype to reduce generated render
  // code size.
  Vue.prototype._o = markOnce // 仅记一次埋点
  Vue.prototype._n = toNumber // 转为 Number 类型
  Vue.prototype._s = toString // 转为 String 类型
  Vue.prototype._l = renderList // 渲染列表
  Vue.prototype._t = renderSlot // 渲染插槽
  Vue.prototype._q = looseEqual // 比较两个对象是否等值的方法
  Vue.prototype._i = looseIndexOf // 返回某个值的下标
  Vue.prototype._m = renderStatic // 渲染静态资源
  Vue.prototype._f = resolveFilter // 解析 Filter
  Vue.prototype._k = checkKeyCodes // 检查用户自定义的 v-on 属性
  Vue.prototype._b = bindObjectProps // 将 v-bind="object" 的数据绑定到 VNode's data
  Vue.prototype._v = createTextVNode // 生成文本节点
  Vue.prototype._e = createEmptyVNode // 生成空节点
  Vue.prototype._u = resolveScopedSlots // 解析 ScopedSlots
}

```