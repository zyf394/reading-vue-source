/* @flow */

import config from '../config'
import { initProxy } from './proxy'
import { initState } from './state'
import { initRender } from './render'
import { initEvents } from './events'
import { mark, measure } from '../util/perf'
import { initLifecycle, callHook } from './lifecycle'
import { initProvide, initInjections } from './inject'
import { extend, mergeOptions, formatComponentName } from '../util/index'

let uid = 0

export function initMixin (Vue: Class<Component>) {
  Vue.prototype._init = function (options?: Object) {
    // 赋值Vue实例（this）给vm变量
    const vm: Component = this
    // a uid
    vm._uid = uid++
    // 非生产环境，记录相关性能数据
    let startTag, endTag
    /* istanbul ignore if */
    if (process.env.NODE_ENV !== 'production' && config.performance && mark) {
      startTag = `vue-perf-init:${vm._uid}`
      endTag = `vue-perf-end:${vm._uid}`
      mark(startTag)
    }
    // 立一个名为_isVue的flag避免被观察，vue实例上的一些属性会被数据观察者监听并触发DOM更新
    // a flag to avoid this being observed
    vm._isVue = true
    // 合并传入的配置参数
    // merge options
    if (options && options._isComponent) {
      // 如果传入了options，options是组件，则优化内部组件实例化，
      // 因为动态的合并配置是非常慢的，并且内部组件的配置项不需要特别处理
      // optimize internal component instantiation
      // since dynamic options merging is pretty slow, and none of the
      // internal component options needs special treatment.
      // 初始化内部组件
      initInternalComponent(vm, options)
    } else {
      // 如果没传，则合并构造函数VUE上的options和传入的options，赋值给vm上的$options
      vm.$options = mergeOptions(
        resolveConstructorOptions(vm.constructor),
        options || {},
        vm
      )
    }
    /* istanbul ignore else */
    if (process.env.NODE_ENV !== 'production') {
      // 生成环境要加入代理
      initProxy(vm)
    } else {
      vm._renderProxy = vm
    }
    // expose real self
    vm._self = vm // 通过一个自定义值_self把实例暴露出来
    initLifecycle(vm) // 初始化生命周期
    initEvents(vm) // 初始化事件系统
    initRender(vm) // 初始化渲染方法
    callHook(vm, 'beforeCreate') // 调用beforeCreate事件
    initInjections(vm) // resolve injections before data/props 解析注入
    initState(vm) // 初始化state
    initProvide(vm) // resolve provide after data/props 解析Privider
    callHook(vm, 'created') // 调用created事件

    /* istanbul ignore if */
    // 性能埋点，测量init所花的时间
    if (process.env.NODE_ENV !== 'production' && config.performance && mark) {
      vm._name = formatComponentName(vm, false)
      mark(endTag)
      measure(`${vm._name} init`, startTag, endTag)
    }
    // 如果options配置项里有el属性，那么对它执行vm.$mount函数
    if (vm.$options.el) {
      vm.$mount(vm.$options.el)
    }
  }
}

function initInternalComponent (vm: Component, options: InternalComponentOptions) {
  // 初始化内部Component
  // 克隆构造函数Vue的options属性，赋值给vm.$options，并缓存options到变量opts
  const opts = vm.$options = Object.create(vm.constructor.options)
  // 在opts上保存下列属性，以便快速调用，避免动态枚举
  // doing this because it's faster than dynamic enumeration.
  opts.parent = options.parent
  opts.propsData = options.propsData
  opts._parentVnode = options._parentVnode
  opts._parentListeners = options._parentListeners
  opts._renderChildren = options._renderChildren
  opts._componentTag = options._componentTag
  opts._parentElm = options._parentElm
  opts._refElm = options._refElm
  if (options.render) {
    // 如果传入了render属性，则需要存下render、staticRenderFns属性
    opts.render = options.render
    opts.staticRenderFns = options.staticRenderFns
  }
}

export function resolveConstructorOptions (Ctor: Class<Component>) {
  // 解析Constructor的参数项
  let options = Ctor.options
  // 如果构造器Ctor有超类，什么是超类？
  if (Ctor.super) {
    // 递归调用自身获取超类上的options
    const superOptions = resolveConstructorOptions(Ctor.super)
    // 获取构造器上的超类配置项superOptions
    const cachedSuperOptions = Ctor.superOptions
    if (superOptions !== cachedSuperOptions) {
      // 如果 superOptions 不等价于 cachedSuperOptions，说明超类的option改变了，则需要解析新的options
      // super option changed,
      // need to resolve new options.
      // 修改构造函数的superOptions的引用
      Ctor.superOptions = superOptions
      // check if there are any late-modified/attached options (#4976)
      // 检查并获取改变了的options
      const modifiedOptions = resolveModifiedOptions(Ctor)
      // update base extend options
      // 将改变了的options与基础的options合并
      if (modifiedOptions) {
        extend(Ctor.extendOptions, modifiedOptions)
      }
      // 最后，将 superOptions 和 Ctor.extendOptions 合并，并赋值给构造器的options属性和
      options = Ctor.options = mergeOptions(superOptions, Ctor.extendOptions)
      // 如果传入了name属性，将构造器赋值给options.components[options.name]
      if (options.name) {
        options.components[options.name] = Ctor
      }
    }
  }
  // 返回options
  return options
}

function resolveModifiedOptions (Ctor: Class<Component>): ?Object {
  // 解析Modify的参数项
  let modified
  // 获取最新配置项
  const latest = Ctor.options
  // 获取被扩展进来的配置项
  const extended = Ctor.extendOptions
  // 获取被封禁的配置项
  const sealed = Ctor.sealedOptions
  // 遍历最新的配置项
  for (const key in latest) {
    // 排除被封禁的属性
    if (latest[key] !== sealed[key]) {
      if (!modified) modified = {}
      modified[key] = dedupe(latest[key], extended[key], sealed[key])
    }
  }
  return modified
}

function dedupe (latest, extended, sealed) {
  // 数据去重
  // 对比最新配置项和被封禁的配置项，确保生命周期钩子函数们在合并时不被重复
  // compare latest and sealed to ensure lifecycle hooks won't be duplicated
  // between merges
  // 如果latest是数组
  if (Array.isArray(latest)) {
    const res = []
    // 获取被封禁的配置项
    sealed = Array.isArray(sealed) ? sealed : [sealed]
    // 获取被扩展进来的配置项
    extended = Array.isArray(extended) ? extended : [extended]
    for (let i = 0; i < latest.length; i++) {
      // 如果被扩展进来的配置项 options 中或者被封禁的配置项 options 中，存在最新的配置项，
      // 则将该最新项压入 res 变量中
      // push original options and not sealed options to exclude duplicated options
      if (extended.indexOf(latest[i]) >= 0 || sealed.indexOf(latest[i]) < 0) {
        res.push(latest[i])
      }
    }
    return res
  } else {
    return latest
  }
}
