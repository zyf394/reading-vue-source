## 简述

该文件是处理 Vue 实例非常重要的一个文件，暴露了一个 `initState` 方法，给 Vue 实例上的属性设置`data`、`prop`、`computed`、`computed`、`watch` 几个非常常用的 API。深入这个文件的源码，就可以基本掌握这些常用 API 都有哪些玩法了。

## 源码
```javascript
/* @flow */

import config from '../config'
import Dep from '../observer/dep'
import Watcher from '../observer/watcher'

import {
  set,
  del,
  observe,
  observerState,
  defineReactive
} from '../observer/index'

import {
  warn,
  bind,
  noop,
  hasOwn,
  isReserved,
  handleError,
  validateProp,
  isPlainObject
} from '../util/index'

// 设置共享的属性描述
const sharedPropertyDefinition = {
  enumerable: true,
  configurable: true,
  get: noop,
  set: noop
}
// 设置代理
export function proxy (target: Object, sourceKey: string, key: string) {
  // 设置getter代理器
  sharedPropertyDefinition.get = function proxyGetter () {
    return this[sourceKey][key]
  }
  // 设置setter代理器
  sharedPropertyDefinition.set = function proxySetter (val) {
    this[sourceKey][key] = val
  }
  // 设置对象的属性描述
  Object.defineProperty(target, key, sharedPropertyDefinition)
}
// 初始化 state 的方法
export function initState (vm: Component) {
  // vm 实例上设置一个 _watchers 数组，用于收集观察者
  vm._watchers = []
  // 获取实例上的配置项
  const opts = vm.$options
  // 初始化props属性
  if (opts.props) initProps(vm, opts.props)
  // 初始化method属性
  if (opts.methods) initMethods(vm, opts.methods)
  // 初始化data属性
  if (opts.data) {
    initData(vm)
  } else {
    // 如果没有设置data属性，则设置默认值，观察实例上的 _data 属性，_data 被当做是根数据
    observe(vm._data = {}, true /* asRootData */)
  }
  // 初始化computed属性
  if (opts.computed) initComputed(vm, opts.computed)
  // 初始化watch
  if (opts.watch) initWatch(vm, opts.watch)
}
// 设置 prop 保留字，即设置 prop 属性时，不能以它们为命名
const isReservedProp = {
  key: 1,
  ref: 1,
  slot: 1
}
// 检查 options 配置项的类型
function checkOptionType (vm: Component, name: string) {
  // 获取某个配置项
  const option = vm.$options[name]
  // 如果不是一般对象，则报错
  if (!isPlainObject(option)) {
    warn(
      `component option "${name}" should be an object.`,
      vm
    )
  }
}
// 初始化 props 的方法
function initProps (vm: Component, propsOptions: Object) {
  // 获取配置项上的 propsData
  const propsData = vm.$options.propsData || {}
  // 获取配置项上的 props
  const props = vm._props = {}
  // 缓存props的键key，以使将来更新props时可以直接遍历数组，避免动态的对象遍历，因为遍历数组要比遍历对象速度快
  // cache prop keys so that future props updates can iterate using Array
  // instead of dynamic object key enumeration.
  const keys = vm.$options._propKeys = []
  // 判断是否是根节点，如果没有 $parent 属性即为根节点
  const isRoot = !vm.$parent
  // 根节点的 props 应被转换
  // root instance props should be converted
  observerState.shouldConvert = isRoot
  // 遍历 props 的配置项
  for (const key in propsOptions) {
    keys.push(key)
    // 校验 prop，并返回校验处理过的值
    const value = validateProp(key, propsOptions, propsData, vm)
    /* istanbul ignore else */
    if (process.env.NODE_ENV !== 'production') {
      // 如果是不是生产环境
      if (isReservedProp[key] || config.isReservedAttr(key)) {
      // 如果是 prop 保留字，或者 attr 保留字，则报错
        warn(
          // 警告："${key}" 是保留字属性，不可以作为组件的prop
          `"${key}" is a reserved attribute and cannot be used as component prop.`,
          vm
        )
      }
      // 主体函数defineReactive，设置响应式 prop
      defineReactive(props, key, value, () => {
        if (vm.$parent && !observerState.isSettingProps) {
          // 如果 vm 实例存在父节点，并且observerState不是正在设置prop，则报错
          warn(
            // 警告：避免直接改变一个prop，因为这个prop会因为父节点的重新渲染而被改写。
            // 可以使用基于 prop 的 data 或者 computed 属性来设置值
            // 正在被改变的 prop 是"${key}"
            `Avoid mutating a prop directly since the value will be ` +
            `overwritten whenever the parent component re-renders. ` +
            `Instead, use a data or computed property based on the prop's ` +
            `value. Prop being mutated: "${key}"`,
            vm
          )
        }
      })
    } else {
      // 设置响应式 prop
      defineReactive(props, key, value)
    }
    // static props are already proxied on the component's prototype
    // during Vue.extend(). We only need to proxy props defined at
    // instantiation here.
    // 为 vm 实例上的 _props 设置代理
    // 静态 props 已经执行 Vue.extend() 时在组件的原型上被代理过。
    // 此处只需要代理在实例化过程中被定义的 props
    if (!(key in vm)) {
      // key 不在 vm 实例中才会被代理
      proxy(vm, `_props`, key)
    }
  }
  // 设置 observerState.shouldConvert 值为 true。这个值有什么作用呢？
  observerState.shouldConvert = true
}
// 初始化 data 的方法
function initData (vm: Component) {
  // 获取配置项上的 data
  let data = vm.$options.data
  // 同时给 data 和 vm._data 赋值
  // 如果 data 是 function 类型，则调用 getData 方法获取 vm 实例上的 data，如果不是则直接赋值为 data 或者初始值空对象{}
  data = vm._data = typeof data === 'function'
    ? getData(data, vm)
    : data || {}
  if (!isPlainObject(data)) {
    // 如果不是一般对象，则给 data 赋值空对象{}
    data = {}
    process.env.NODE_ENV !== 'production' && warn(
      // 非生产环境警告：data 方法应该返回一个对象
      'data functions should return an object:\n' +
      'https://vuejs.org/v2/guide/components.html#data-Must-Be-a-Function',
      vm
    )
  }
  // proxy data on instance
  // 代理 vm 实例上的 data
  // Object.keys 获取 data 上的所有键
  const keys = Object.keys(data)
  // 获取配置项上的 prop
  const props = vm.$options.props
  let i = keys.length
  // 遍历键
  while (i--) {
    if (props && hasOwn(props, keys[i])) {
      // 如果 data 的 key 已经在 props 上定义过了，则抛出警告
      process.env.NODE_ENV !== 'production' && warn(
        // 警告：data 上的 "${keys[i]}" 属性已经在 prop 上定义过了，使用 prop default 值来代替
        `The data property "${keys[i]}" is already declared as a prop. ` +
        `Use prop default value instead.`,
        vm
      )
    } else if (!isReserved(keys[i])) {
      // 如果不是保留字的值，则给 vm 实例上的 _data 属性里的每个值做代理
      proxy(vm, `_data`, keys[i])
    }
  }
  // 在此观察data变化
  // observe data
  observe(data, true /* asRootData */)
}

function getData (data: Function, vm: Component): any {
  try {
    // 修改 data 的上下文为 vm 实例
    return data.call(vm)
  } catch (e) {
    // 报错
    handleError(e, vm, `data()`)
    return {}
  }
}
// 设置 computed 属性的默认为 { lazy: true }
const computedWatcherOptions = { lazy: true }

// 初始化 computed 的方法
function initComputed (vm: Component, computed: Object) {
  // 非生产环境下，检测 vm 的 computed 属性是否是一个对象
  process.env.NODE_ENV !== 'production' && checkOptionType(vm, 'computed')
  // 初始化 watchers 为一个空对象，并在 vm 实例上存一个副本，命名为 _computedWatchers
  const watchers = vm._computedWatchers = Object.create(null)
  // 遍历 computed 属性上的所有 key 
  for (const key in computed) {
    // 声明一个变量 userDef ，存放获取用户定义的值
    const userDef = computed[key]
    // 设置读取操作 getter 方法，如果 userDef 是函数，则直接将函数复制给 getter
    // 否则调用 userDef 的 getter 方法
    let getter = typeof userDef === 'function' ? userDef : userDef.get
    if (process.env.NODE_ENV !== 'production') {
      // 如果非生产环境
      if (getter === undefined) {
        // 如果 getter 是 undefined 则报错
        warn(
          // 警告：没有给 computed 上的 "${key}" 属性定义 getter 方法
          `No getter function has been defined for computed property "${key}".`,
          vm
        )
        // 将其赋值给一个啥都不干的函数
        getter = noop
      }
    }
    // create internal watcher for the computed property.
    // 为computed上的每个属性创建内部 watcher，并压入 watchers 数组中，主功能函数是 Watcher，来自'../observer/watcher'
    watchers[key] = new Watcher(vm, getter, noop, computedWatcherOptions)

    // component-defined computed properties are already defined on the
    // component prototype. We only need to define computed properties defined
    // at instantiation here.
    // 组件上定义的 computed 属性已经在组件的原型上定义过了。
    // 我们只需要在实例化的时候定义未曾定义过的 computed 属性
    if (!(key in vm)) {
      // 如果 vm 实例上不存在此key，则调用 defineComputed 方法
      defineComputed(vm, key, userDef)
    } else if (process.env.NODE_ENV !== 'production') {
      // 非生产环境下
      if (key in vm.$data) {
        // 如果 key 已经在 vm.$data 上了
        // 报警：computed 属性 "${key}" 已经在 data 属性上被定义过了
        warn(`The computed property "${key}" is already defined in data.`, vm)
      } else if (vm.$options.props && key in vm.$options.props) {
        // 若果 key 已经在 vm.$options.props 上了
        // 报警：computed 属性 "${key}" 已经被定义为了一个 prop
        warn(`The computed property "${key}" is already defined as a prop.`, vm)
      }
    }
  }
}
// 定义 computed 的方法
export function defineComputed (target: any, key: string, userDef: Object | Function) {
  if (typeof userDef === 'function') {
    // 如果用户定义的 userDef 是函数
    // 设置共享的 getter 和 setter
    sharedPropertyDefinition.get = createComputedGetter(key) // 调用 createComputedGetter 方法设置 getter
    sharedPropertyDefinition.set = noop // 空函数
  } else {
    // 如果用户定义的 userDef 不是函数
    // 设置共享的 getter
    sharedPropertyDefinition.get = userDef.get // 如果 userDef 存在 getter
      ? userDef.cache !== false // 如果 userDef 的缓存属性 cache 为 false
        ? createComputedGetter(key) // 调用 createComputedGetter 方法设置 getter
        : userDef.get // 直接将 userDef.get 赋值给 sharedPropertyDefinition.get
      : noop // 赋值一个空函数
    // 设置共享的 setter
    sharedPropertyDefinition.set = userDef.set // 如果 userDef 存在 getter
      ? userDef.set // 直接将 userDef.set 赋值给 sharedPropertyDefinition.set
      : noop // 赋值一个空函数
  }
  // 调用 Object.defineProperty 设置传入的 key 的属性描述
  Object.defineProperty(target, key, sharedPropertyDefinition)
}

// 生成 computed 属性的 getter 函数
function createComputedGetter (key) {
  // 返回一个 computedGetter 函数
  return function computedGetter () {
    // 获取传入的 key 的 watcher
    const watcher = this._computedWatchers && this._computedWatchers[key]
    if (watcher) {
      // 如果存在 watcher
      if (watcher.dirty) {
        // 如果 watcher.dirty 为 true，则调用 watcher.evaluate()？作用？
        watcher.evaluate()
      }
      if (Dep.target) {
        // 如果存在 Dep.target ，则调用 watcher.depend()？作用？
        watcher.depend()
      }
      // 返回 watcher.value
      return watcher.value
    }
  }
}
// 初始化 methods 的方法
function initMethods (vm: Component, methods: Object) {
  // 非生产环境下，检测 vm 的 methods 属性是否是一个对象
  process.env.NODE_ENV !== 'production' && checkOptionType(vm, 'methods')
  // 获取配置项上的 prop
  const props = vm.$options.props
  // 遍历methoods
  for (const key in methods) {
    // 如果传入的 methods 的 key 是 null，则赋值一个空函数
    // 如果不是 null ，则修改单个method的上下文为实例 vm
    vm[key] = methods[key] == null ? noop : bind(methods[key], vm)
    if (process.env.NODE_ENV !== 'production') {
      // 非生产环境下
      if (methods[key] == null) {
        // 如果methods[key] 是 null，则报错
        warn(
          // 警告：组件定义 method 的 "${key}" 有一个未定义的值
          // 你是否正确声明了方法
          `method "${key}" has an undefined value in the component definition. ` +
          `Did you reference the function correctly?`,
          vm
        )
      }
      if (props && hasOwn(props, key)) {
        // 如果存在 props，并且 props 上已经定义了 key，则报错
        warn(
          // 警告：method 的 "${key}" 属性已经被定义为一个 prop
          `method "${key}" has already been defined as a prop.`,
          vm
        )
      }
    }
  }
}
// 初始化 watch 的方法
function initWatch (vm: Component, watch: Object) {
  // 非生产环境下，检测 vm 的 watch 属性是否是一个对象
  process.env.NODE_ENV !== 'production' && checkOptionType(vm, 'watch')
  // 遍历watch
  for (const key in watch) {
    // 获取 watch 上的值，命名为 handler
    const handler = watch[key]
    if (Array.isArray(handler)) {
      // 如果 handler 是数组，则遍历数组 handler
      for (let i = 0; i < handler.length; i++) {
        // 调用 createWatcher 方法生成 watcher
        createWatcher(vm, key, handler[i])
      }
    } else {
      // 如果 handler 不是数组，
      // 调用 createWatcher 方法生成 watcher
      createWatcher(vm, key, handler)
    }
  }
}

// 生成 watcher 的方法
function createWatcher (
  vm: Component,
  keyOrFn: string | Function,
  handler: any,
  options?: Object
) {
  if (isPlainObject(handler)) {
    // 如果 handler 是一般对象，做一些兼容处理
    options = handler
    handler = handler.handler
  }
  if (typeof handler === 'string') {
    // 如果 handler 是一个字符串，则尝试从 vm 实例上获取它
    handler = vm[handler]
  }
  // 调用 vm.$watch() ，并返回它的结果
  return vm.$watch(keyOrFn, handler, options)
}
// 在 vm 实例中混入 state 属性的方法
export function stateMixin (Vue: Class<Component>) {
  // flow somehow has problems with directly declared definition object
  // when using Object.defineProperty, so we have to procedurally build up
  // the object here.
  // flow 对通过 Object.defineProperty 声明的对象处理有问题，所以我们程序上要在此创建一个对象
  // 声明一个数据定义空对象 dataDef
  const dataDef = {}
  // 让 dataDef 的读取操作 getter 返回 this._data
  dataDef.get = function () { return this._data }
  // 声明一个数据定义空对象 propsDef
  const propsDef = {}
  // 让 propsDef 的读取操作 getter 返回 this._props
  propsDef.get = function () { return this._props }
  if (process.env.NODE_ENV !== 'production') {
    // 非生产环境
    // dataDef 的设置 setter 操作会报错
    dataDef.set = function (newData: Object) {
      warn(
        //警告：避免修改根实例的 $data，使用嵌套的数据属性来替代
        'Avoid replacing instance root $data. ' +
        'Use nested data properties instead.',
        this
      )
    }
    // propsDef 的设置 setter 操作会报错
    propsDef.set = function () {
      // 警告：$props 是只读的
      warn(`$props is readonly.`, this)
    }
  }
  // 将 $data、$props 属性挂载到 Vue.prototyp 上
  Object.defineProperty(Vue.prototype, '$data', dataDef)
  Object.defineProperty(Vue.prototype, '$props', propsDef)

  // Vue.prototype 上新增 $set、$delete 方法
  Vue.prototype.$set = set // 响应式 set 方法，来自于 '../util/index'，对 setter 操作封装了一些自定义功能
  Vue.prototype.$delete = del  // 删除一个属性并触发一些改变，来自于 '../util/index'

  // Vue.prototype 上新增 $watch 方法
  Vue.prototype.$watch = function (
    expOrFn: string | Function,
    cb: any,
    options?: Object
  ): Function {
    // 获取 vm 实例
    const vm: Component = this
    if (isPlainObject(cb)) {
      // 如果传入的回调函数 cb 是一般对象，则调用 createWatcher 并返回一个 watcher
      return createWatcher(vm, expOrFn, cb, options)
    }
    // 如果没传 options ，给 options 一个默认值
    options = options || {}
    // options 上设置一个用户标识为 true
    options.user = true
    // 实例化一个 Watcher
    const watcher = new Watcher(vm, expOrFn, cb, options)
    if (options.immediate) {
      // 如果有 options.immediate，则修改回调函数的上下文，并把 watcher.value 作为参数传进去
      cb.call(vm, watcher.value)
    }
    // 返回一个函数，再次调用 stateMixin 则会销毁 watcher
    return function unwatchFn () {
      watcher.teardown()
    }
  }
}

```
## 知识点

### Object.defineProperty(obj, prop, descriptor)

>Object.defineProperty() 方法会直接在一个对象上定义一个新属性，或者修改一个对象的现有属性， 并返回这个对象。

>参数：obj是要在其上定义属性的对象；prop是要定义或修改的属性的名称；descriptor是将被定义或修改的属性的描述符。

重点来说说 `descriptor`

#### descriptor的可设置属性
| 属性 | 说明 | 默认值 |
| --- | --- | --- |
| configurable | 决定 属性 prop 的描述符 descriptor 能否被改变或删除 | false |
| enumerable | 决定 属性 prop 能否出现在对象的枚举属性中 | false |
| value | 决定 属性 prop 的值 | undefined |
| writable | 决定 属性 prop 是否能被赋值运算符改变 | false |
| get | 一个给属性提供 getter 的方法，如果没有 getter 则为 undefined。该方法返回值被用作属性值 | undefined |
| set | 一个给属性提供 setter 的方法，如果没有 setter 则为 undefined。该方法将接受唯一参数，并将该参数的新值分配给该属性 | undefined |

示例：
```javascript
var obj = {}
Object.defineProperty(obj, "myProp", {
  value : 'hello world',
  writable : true,
  enumerable : true,
  configurable : true
});
// 返回：Object {myProp: "hello world"}
```






