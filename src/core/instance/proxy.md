## 简述

该文件暴露了一个 `initProxy ` 方法，给 Vue 实例上的属性设置一系列代理。

## 源码

```javascript
/* not type checking this file because flow doesn't play well with Proxy */
/* 由于 Flow 对于 Proxy 支持得不是很好，这个文件不使用 Flow */

import config from 'core/config'
import { warn, makeMap } from '../util/index'

let initProxy
// 如果不是在生产环境
if (process.env.NODE_ENV !== 'production') {
  // 声明一个方法allowedGlobals，可以校验传入的属性是否是全局属性
  // makeMap来自/shared/util.js，可以传入一个属性列表字符串，生成一个可以校验某个属性是否在列表中的方法

  const allowedGlobals = makeMap(
    'Infinity,undefined,NaN,isFinite,isNaN,' +
    'parseFloat,parseInt,decodeURI,decodeURIComponent,encodeURI,encodeURIComponent,' +
    'Math,Number,Date,Array,Object,Boolean,String,RegExp,Map,Set,JSON,Intl,' +
    'require' // for Webpack/Browserify
  )
  // 警告传入的属性不存在的方法
  const warnNonPresent = (target, key) => {
    warn(
      `Property or method "${key}" is not defined on the instance but ` +
      `referenced during render. Make sure to declare reactive data ` +
      `properties in the data option.`,
      target
    )
  }
  // 校验是否支持 Proxy API
  const hasProxy =
    typeof Proxy !== 'undefined' && // Proxy变量必须存在
    Proxy.toString().match(/native code/) // 并且Proxy是原生支持的代码
  // 如果支持 Proxy API
  if (hasProxy) {
    // 声明一个方法isBuiltInModifier，校验是否是内置的修饰符
    const isBuiltInModifier = makeMap('stop,prevent,self,ctrl,shift,alt,meta')
    // config.keyCodes 为用户给 v-on 设置的自定义键，初始值是个空对象，此处给它的赋值操作设置代理
    config.keyCodes = new Proxy(config.keyCodes, {
      // 给keyCodes调用setter方法时设置代理
      // 由上可知 v-on 内置的自定义修饰符包括：stop,prevent,self,ctrl,shift,alt,meta
      set (target, key, value) {
        if (isBuiltInModifier(key)) {
          // 如果设置的值是内置的标识符，则警告
          warn(`Avoid overwriting built-in modifier in config.keyCodes: .${key}`)
          return false
        } else {
          // 否则允许设置值
          target[key] = value
          return true
        }
      }
    })
  }
  //  handler.has() 方法可以看作是针对 in 操作的钩子.
  const hasHandler = {
    // 当对目标调用 in 操作时
    has (target, key) {
      // 判断 key 是否在目标属性 target 中
      const has = key in target
      // 判断是否是允许使用的全局属性，或者首字符是下划线的属性（带_的是私有属性）
      const isAllowed = allowedGlobals(key) || key.charAt(0) === '_'
      if (!has && !isAllowed) {
        // 如果不存在且不是被允许的属性，则报不存在的警告
        warnNonPresent(target, key)
      }
      // 返回布尔值
      return has || !isAllowed
    }
  }
  // 为 handler.get() 读取操作设置代理
  const getHandler = {
    get (target, key) {
      if (typeof key === 'string' && !(key in target)) {
        // 如果读取的值是字符串并且不是 target 的原有属性，给予警告
        warnNonPresent(target, key)
      }
      // 返回目标 target 上的值
      return target[key]
    }
  }
  /**
   * [initProxy description]
   * @param  {[type]} vm [传入一个vue实例]
   * @return {[type]}    [void]
   */
  initProxy = function initProxy (vm) {
    if (hasProxy) {
      // 如果支持 Proxy API
      // 获取 Vue 实例 vm 上的配置项 $options
      const options = vm.$options
      // determine which proxy handler to use
      // 决定使用哪个代理控制器
      // 如果传入了 render 属性并且存在 render._withStripped，则使用 getHandler
      // 否则使用 hasHandler
      const handlers = options.render && options.render._withStripped
        ? getHandler
        : hasHandler
      // 给实例 vm 上的属性 _renderProxy 设置代理
      // 即 vm._renderProxy 相当于一个经代理处理器处理过的 vm 副本
      vm._renderProxy = new Proxy(vm, handlers)
    } else {
      // 如果不支持，则直接将 vm 赋值给 vm._renderProxy，存下一个实例的副本
      vm._renderProxy = vm
    }
  }
}

export { initProxy }

```

## 知识点

### Proxy

Proxy，处理器对象，用来自定义代理对象的各种可代理操作。该新特性属于 ES6 规范。

#### handler.set()

此方法用于拦截设置属性值的操作。

语法：
```
var p = new Proxy({}, {
  /**
   * [set description]
   * @param {[type]} target   [要代理的目标对象]
   * @param {[type]} key      [被设置的属性名]
   * @param {[type]} value    [被设置的新值]
   * @param {[type]} receiver [最初被调用的对象。通常是proxy本身，但handler的set方法也有可能在原型链上或以其他方式被间接地调用（因此不一定是proxy本身）。]
   * @return {[type]}    [set方法应该返回一个布尔值，true代表设置属性成功了，否则返回false。]
   */
  set: function(target, key, value, receiver) {
    return true
  }
});
```

#### handler.get()

此方法用于拦截对象的读取属性操作。

语法：
```
var p = new Proxy({}, {
  /**
   * [get description]
   * @param  {[type]} target   [要代理的目标对象]
   * @param  {[type]} key     [被获取的属性名]
   * @param  {[type]} receiver [Proxy或者继承Proxy的对象]
   * @return {[type]}          [可以返回任意值]
   */
  get: function(target, prop, receiver) {
    return any;
  }
});
```

#### handler.has()

此方法可以看作是针对 in 操作的钩子。

语法：
```
var p = new Proxy({}, {
  /**
   * [has description]
   * @param  {[type]}  target [要代理的目标对象]
   * @param  {[type]}  key   [需要检查是否存在的属性]
   * @return {Boolean}        [返回一个 boolean 属性的值]
   */
  has: function(target, key) {
    console.log('called: ' + key);
    return true;
  }
});

console.log('a' in p); // "called: a"
                       // true
```



