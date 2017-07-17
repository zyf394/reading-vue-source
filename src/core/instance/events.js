/* @flow */

import { updateListeners } from '../vdom/helpers/index'
import { toArray, tip, hyphenate, formatComponentName } from '../util/index'

export function initEvents (vm: Component) {
  // 创建 events 对象
  vm._events = Object.create(null)
  // 是否有钩子事件
  vm._hasHookEvent = false
  // init parent attached events
  // 初始化父类绑定事件，如果有则更新 component 的监听器
  const listeners = vm.$options._parentListeners
  if (listeners) {
    updateComponentListeners(vm, listeners)
  }
}
// 声明变量 target
let target: Component

// add 函数，第三个参数指定绑定一次
function add (event, fn, once) {
  // 如果 once 为 true，则调用 $once 绑定
  if (once) {
    target.$once(event, fn)
  // 否则调用 $on 绑定
  } else {
    target.$on(event, fn)
  }
}
// remove，清除所有event对应的事件
function remove (event, fn) {
  target.$off(event, fn)
}

// 更新组件事件监听器的方法
export function updateComponentListeners (
  vm: Component,
  listeners: Object,
  oldListeners: ?Object
) {
  // 将传入的实例 vm 赋值给变量 target
  target = vm
  // 更新事件监听器
  updateListeners(listeners, oldListeners || {}, add, remove, vm)
}
// 将 events 属性混合到 Vue 原型中的方法
export function eventsMixin (Vue: Class<Component>) {
  // 声明正则：匹配开头是 hook:
  const hookRE = /^hook:/
  // 在 Vue.prototype 上定义 $on 方法
  Vue.prototype.$on = function (event: string | Array<string>, fn: Function): Component {
    // 获取实例 this，并命名为 vm
    const vm: Component = this
    if (Array.isArray(event)) {
      // 如果 传入的 event 是数组
      // 则遍历绑定事件
      for (let i = 0, l = event.length; i < l; i++) {
        // 调用自己原型上的 $on 方法
        this.$on(event[i], fn)
      }
    } else {
      // 如果不是数组
      // 匹配实例 vm 上的 _events 对象上的事件 event，将传入的方法 fn 压入对应的 event 数组中
      (vm._events[event] || (vm._events[event] = [])).push(fn)
      // optimize hook:event cost by using a boolean flag marked at registration
      // instead of a hash lookup
      // 优化 hook:event 绑定，使用一个布尔值标记注册过的事件，如果有了这个 _hasHookEvent 则不会进行哈希检查
      if (hookRE.test(event)) {
        // 实例拥有钩子函数的标记
        vm._hasHookEvent = true
      }
    }
    // 将实例返回
    return vm
  }
  // 在 Vue 原型上定义 $once 方法
  Vue.prototype.$once = function (event: string, fn: Function): Component {
    // 获取实例 this
    const vm: Component = this
    // 用一个自定义 on 方法替代传入的 fn
    function on () {
      // 先解绑实例上的事件，保证只一次触发事件
      vm.$off(event, on)
      // 调用事件，并修改上下文为 vm
      fn.apply(vm, arguments)
    }
    // 将 fn 作为一个属性绑定到 on 方法上
    on.fn = fn
    // 调用 vm.$on 绑定 on 方法
    vm.$on(event, on)
    // 将实例返回
    return vm
  }
  // 在 Vue 原型上定义 $off 方法
  Vue.prototype.$off = function (event?: string | Array<string>, fn?: Function): Component {
    // 获取实例 this
    const vm: Component = this
    // all
    // 如果没有传参，则解绑所有事件
    if (!arguments.length) {
      // 将实例上的 _events 置空
      vm._events = Object.create(null)
      // 将实例返回
      return vm
    }
    // array of events
    // 如果传入的 events 是数组，则遍历解绑
    if (Array.isArray(event)) {
      for (let i = 0, l = event.length; i < l; i++) {
        // 调用实例上的 $off 方法
        this.$off(event[i], fn)
      }
      // 将实例返回
      return vm
    }
    // specific event
    // 特殊事件处理
    // 获取实例上的 _events 中保存的 event 方法
    const cbs = vm._events[event]
    // 如果不存在 cbs
    if (!cbs) {
      // 将实例返回
      return vm
    }
    // 如果只传一个参数，则解绑对应 event 的所有事件
    if (arguments.length === 1) {
      vm._events[event] = null
      return vm
    }
    // specific handler
    // 特殊处理器
    // 声明一个 cb 变量
    let cb
    // 声明一个 i 变量，获取 cbs 的长度
    let i = cbs.length
    // while 式循环，可以少写好些代码
    // 遍历 cbs 回调函数数组并删除想要删除的函数，注意是通过指针来判断是否相等
    while (i--) {
      cb = cbs[i]
      // 如果 cb 或者 cb.fn 指向的地址与 fn 相同
      if (cb === fn || cb.fn === fn) {
        // 将该项删除
        cbs.splice(i, 1)
        break
      }
    }
    // 将实例返回
    return vm
  }
  // 在 Vue 原型上定义 $emit 方法
  Vue.prototype.$emit = function (event: string): Component {
    // 获取实例 this
    const vm: Component = this
    // 非开发环境提示事件命名不能用驼峰
    if (process.env.NODE_ENV !== 'production') {
      // 将 event 转为小写
      const lowerCaseEvent = event.toLowerCase()
      // 如果不存在该事件 event，则提示
      if (lowerCaseEvent !== event && vm._events[lowerCaseEvent]) {
        // 提示：注意 HTML 的属性是大小写不敏感的，不能在 templates 中使用 v-on 绑定驼峰命名的事件
        tip(
          `Event "${lowerCaseEvent}" is emitted in component ` +
          `${formatComponentName(vm)} but the handler is registered for "${event}". ` +
          `Note that HTML attributes are case-insensitive and you cannot use ` +
          `v-on to listen to camelCase events when using in-DOM templates. ` +
          `You should probably use "${hyphenate(event)}" instead of "${event}".`
        )
      }
    }
    // 获取回调函数列表
    let cbs = vm._events[event]
    if (cbs) {
      // 如果存在 cbs，则事件回调转换为数组
      cbs = cbs.length > 1 ? toArray(cbs) : cbs
      // 获取所有传入的参数，并转为数组
      const args = toArray(arguments, 1)
      // 遍历回调数组，并逐一执行
      for (let i = 0, l = cbs.length; i < l; i++) {
        cbs[i].apply(vm, args)
      }
    }
    // 将实例返回
    return vm
  }
}
