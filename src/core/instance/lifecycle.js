/* @flow */

import config from '../config'
import Watcher from '../observer/watcher'
import { mark, measure } from '../util/perf'
import { createEmptyVNode } from '../vdom/vnode'
import { observerState } from '../observer/index'
import { updateComponentListeners } from './events'
import { resolveSlots } from './render-helpers/resolve-slots'

import {
  warn,
  noop,
  remove,
  handleError,
  emptyObject,
  validateProp
} from '../util/index'
// 保存活动实例的指针
export let activeInstance: any = null
// 初始化生命周期
export function initLifecycle (vm: Component) {
  // 缓存配置项
  const options = vm.$options

  // 定位第一非提取的父类？？
  // locate first non-abstract parent
  let parent = options.parent
  if (parent && !options.abstract) {
    while (parent.$options.abstract && parent.$parent) {
      parent = parent.$parent
    }
    parent.$children.push(vm)
  }
  // 一些初始化变量
  vm.$parent = parent
  vm.$root = parent ? parent.$root : vm

  vm.$children = []
  vm.$refs = {}

  vm._watcher = null
  vm._inactive = null
  vm._directInactive = false
  vm._isMounted = false
  vm._isDestroyed = false
  vm._isBeingDestroyed = false
}
// 生命周期各属性混合到Vue原型中
export function lifecycleMixin (Vue: Class<Component>) {
  // 更新
  Vue.prototype._update = function (vnode: VNode, hydrating?: boolean) {
    const vm: Component = this
    // 如果已经mounted了，则调用beforeUpdate钩子函数
    if (vm._isMounted) {
      callHook(vm, 'beforeUpdate')
    }
    // 缓存变换前的元素及虚拟节点及活跃实例
    const prevEl = vm.$el
    const prevVnode = vm._vnode
    const prevActiveInstance = activeInstance
    // 将实例的指针赋值给activeInstance
    activeInstance = vm
    // vnode 赋值
    vm._vnode = vnode
    // 如果还未缓存过之前的vnode，则初始化render函数。Vue.prototype.__patch__就是更新节点的核心功能方法
    // Vue.prototype.__patch__ is injected in entry points
    // based on the rendering backend used.
    if (!prevVnode) {
      // 初始化渲染
      // initial render
      vm.$el = vm.__patch__(
        vm.$el, vnode, hydrating, false /* removeOnly */,
        vm.$options._parentElm,
        vm.$options._refElm
      )
    } else {
      // 更新
      // updates
      vm.$el = vm.__patch__(prevVnode, vnode)
    }
    // 重置实例
    activeInstance = prevActiveInstance
    // 更新实例上暴露的一些方法
    // update __vue__ reference
    if (prevEl) {
      prevEl.__vue__ = null
    }
    if (vm.$el) {
      vm.$el.__vue__ = vm
    }
    // if parent is an HOC, update its $el as well
    if (vm.$vnode && vm.$parent && vm.$vnode === vm.$parent._vnode) {
      vm.$parent.$el = vm.$el
    }
    // updated hook is called by the scheduler to ensure that children are
    // updated in a parent's updated hook.
  }

  // 强制更新
  Vue.prototype.$forceUpdate = function () {
    const vm: Component = this
    // 通过watch属性来强制更新
    if (vm._watcher) {
      vm._watcher.update()
    }
  }

  // 销毁
  Vue.prototype.$destroy = function () {
    const vm: Component = this
    // 顾虑正在被销毁的实例
    if (vm._isBeingDestroyed) {
      return
    }
    // 调用beforeDestroy钩子函数
    callHook(vm, 'beforeDestroy')
    // 正在被销毁记号
    vm._isBeingDestroyed = true
    // 通过父类来销毁
    // remove self from parent
    const parent = vm.$parent
    if (parent && !parent._isBeingDestroyed && !vm.$options.abstract) {
      remove(parent.$children, vm)
    }
    // 销毁watcher
    // teardown watchers
    if (vm._watcher) {
      vm._watcher.teardown()
    }
    let i = vm._watchers.length
    while (i--) {
      vm._watchers[i].teardown()
    }
    // 移除_data.__ob__
    // remove reference from data ob
    // frozen object may not have observer.
    if (vm._data.__ob__) {
      vm._data.__ob__.vmCount--
    }
    // 已被销毁记号
    // call the last hook...
    vm._isDestroyed = true
    // 更新节点
    // invoke destroy hooks on current rendered tree
    vm.__patch__(vm._vnode, null)
    // 触发destroyed钩子
    // fire destroyed hook
    callHook(vm, 'destroyed')
    // 解绑所有事件
    // turn off all instance listeners.
    vm.$off()
    // 移除$el.__vue__
    // remove __vue__ reference
    if (vm.$el) {
      vm.$el.__vue__ = null
    }
    // 移除父元素属性，防止内存泄漏
    // remove reference to DOM nodes (prevents leak)
    vm.$options._parentElm = vm.$options._refElm = null
  }
}
// 载入组件函数
export function mountComponent (
  vm: Component,
  el: ?Element,
  hydrating?: boolean
): Component {
  vm.$el = el
  // 如果传参有render方法
  if (!vm.$options.render) {
    // 先创建一个空节点
    vm.$options.render = createEmptyVNode
    // 非生产环境警告用户要使用template或render方法
    if (process.env.NODE_ENV !== 'production') {
      /* istanbul ignore if */
      if ((vm.$options.template && vm.$options.template.charAt(0) !== '#') ||
        vm.$options.el || el) {
        warn(
          'You are using the runtime-only build of Vue where the template ' +
          'compiler is not available. Either pre-compile the templates into ' +
          'render functions, or use the compiler-included build.',
          vm
        )
      } else {
        warn(
          'Failed to mount component: template or render function not defined.',
          vm
        )
      }
    }
  }
  // 调用beforeMount钩子函数
  callHook(vm, 'beforeMount')

  let updateComponent
  /* istanbul ignore if */
  // 非生产环境时，加入一系列性能埋点检测
  if (process.env.NODE_ENV !== 'production' && config.performance && mark) {
    updateComponent = () => {
      const name = vm._name
      const id = vm._uid
      const startTag = `vue-perf-start:${id}`
      const endTag = `vue-perf-end:${id}`
      // 性能埋点
      mark(startTag)
      // 调用实例上的_render方法，获取虚拟节点
      const vnode = vm._render()
      mark(endTag)
      measure(`${name} render`, startTag, endTag)

      mark(startTag)
      // 调用实例上的_update方法更新数据
      vm._update(vnode, hydrating)
      mark(endTag)
      // 丈量加载时间
      measure(`${name} patch`, startTag, endTag)
    }
  } else {
    updateComponent = () => {
      // 调用_update更新虚拟节点
      vm._update(vm._render(), hydrating)
    }
  }
  // 为实例创建一个watcher
  vm._watcher = new Watcher(vm, updateComponent, noop)
  // 干燥剂
  hydrating = false
  // 调用mounted钩子函数
  // manually mounted instance, call mounted on self
  // mounted is called for render-created child components in its inserted hook
  if (vm.$vnode == null) {
    vm._isMounted = true
    callHook(vm, 'mounted')
  }
  return vm
}
// 更新子组件
export function updateChildComponent (
  vm: Component,
  propsData: ?Object,
  listeners: ?Object,
  parentVnode: VNode,
  renderChildren: ?Array<VNode>
) {
  // 检测是否有子组件，此处判断注释写得很明确
  // determine whether component has slot children
  // we need to do this before overwriting $options._renderChildren
  const hasChildren = !!(
    renderChildren ||               // has new static slots
    vm.$options._renderChildren ||  // has old static slots
    parentVnode.data.scopedSlots || // has new scoped slots
    vm.$scopedSlots !== emptyObject // has old scoped slots
  )
  // 赋值parentVnode给一些实例上的属性
  vm.$options._parentVnode = parentVnode
  vm.$vnode = parentVnode // update vm's placeholder node without re-render
  // 赋值子组件树上的父组件
  if (vm._vnode) { // update child tree's parent
    vm._vnode.parent = parentVnode
  }
  vm.$options._renderChildren = renderChildren
  // 更新props属性
  // update props
  if (propsData && vm.$options.props) {
    observerState.shouldConvert = false
    if (process.env.NODE_ENV !== 'production') {
      observerState.isSettingProps = true
    }
    // 遍历prop的key值
    const props = vm._props
    const propKeys = vm.$options._propKeys || []
    for (let i = 0; i < propKeys.length; i++) {
      const key = propKeys[i]
      // 校验props的key
      props[key] = validateProp(key, vm.$options.props, propsData, vm)
    }
    observerState.shouldConvert = true
    if (process.env.NODE_ENV !== 'production') {
      observerState.isSettingProps = false
    }
    // 缓存一个propsData的备份
    // keep a copy of raw propsData
    vm.$options.propsData = propsData
  }
  // 更新监听器
  // update listeners
  if (listeners) {
    const oldListeners = vm.$options._parentListeners
    vm.$options._parentListeners = listeners
    updateComponentListeners(vm, listeners, oldListeners)
  }
  // 解析slot + 强制更新子组件
  // resolve slots + force update if has children
  if (hasChildren) {
    vm.$slots = resolveSlots(renderChildren, parentVnode.context)
    vm.$forceUpdate()
  }
}

// 检测是否在活跃树中
function isInInactiveTree (vm) {
  // 遍历实例的父组件
  while (vm && (vm = vm.$parent)) {
    if (vm._inactive) return true
  }
  return false
}
// 激活子组件
export function activateChildComponent (vm: Component, direct?: boolean) {
  if (direct) {
    vm._directInactive = false
    if (isInInactiveTree(vm)) {
      return
    }
  } else if (vm._directInactive) {
    return
  }
  if (vm._inactive || vm._inactive === null) {
    vm._inactive = false
    for (let i = 0; i < vm.$children.length; i++) {
      activateChildComponent(vm.$children[i])
    }
    callHook(vm, 'activated')
  }
}
// 反激活子组件
export function deactivateChildComponent (vm: Component, direct?: boolean) {
  if (direct) {
    vm._directInactive = true
    if (isInInactiveTree(vm)) {
      return
    }
  }
  if (!vm._inactive) {
    vm._inactive = true
    for (let i = 0; i < vm.$children.length; i++) {
      deactivateChildComponent(vm.$children[i])
    }
    callHook(vm, 'deactivated')
  }
}
// 调用钩子函数的方法
export function callHook (vm: Component, hook: string) {
  // 获取想要调用的钩子函数
  const handlers = vm.$options[hook]
  // 遍历钩子函数（数组）并调用
  if (handlers) {
    for (let i = 0, j = handlers.length; i < j; i++) {
      try {
        handlers[i].call(vm)
      } catch (e) {
        handleError(e, vm, `${hook} hook`)
      }
    }
  }
  // 如果有_hasHookEvent标记则触发
  if (vm._hasHookEvent) {
    vm.$emit('hook:' + hook)
  }
}
