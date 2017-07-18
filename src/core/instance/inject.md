## 简述

该文件暴露了 `initInjections` `resolveInject` 等方法，处理一些 `provide` 和 `inject`
 相关的操作。

> 这对选项需要一起使用，以允许一个祖先组件向其所有子孙后代注入一个依赖。

## 源码
```javascript
/* @flow */

import { hasSymbol } from 'core/util/env'
import { warn } from '../util/index'
import { defineReactive } from '../observer/index'
// 初始化Provide
export function initProvide (vm: Component) {
  const provide = vm.$options.provide
  // 调用Provide
  if (provide) {
    vm._provided = typeof provide === 'function'
      ? provide.call(vm)
      : provide
  }
}
// 初始化Injections
export function initInjections (vm: Component) {
  // 解析Injections
  const result = resolveInject(vm.$options.inject, vm)
  // 遍历Injections
  if (result) {
    Object.keys(result).forEach(key => {
      /* istanbul ignore else */
      if (process.env.NODE_ENV !== 'production') {
        defineReactive(vm, key, result[key], () => {
          // 警告：避免直接变更一个插入的值，因为在组件重新渲染时的任意时间点，这个变更都会被重写
          warn(
            `Avoid mutating an injected value directly since the changes will be ` +
            `overwritten whenever the provided component re-renders. ` +
            `injection being mutated: "${key}"`,
            vm
          )
        })
      } else {
        defineReactive(vm, key, result[key])
      }
    })
  }
}
// 解析Injections
export function resolveInject (inject: any, vm: Component): ?Object {
  if (inject) {
    // 这里没有用flow的:any定义数据类型，因为flow不够只能，无法处理cache是数组的情况？
    // inject is :any because flow is not smart enough to figure out cached
    // isArray here
    // 判断是否是数组
    const isArray = Array.isArray(inject)
    // 创建一个空对象
    const result = Object.create(null)
    const keys = isArray
      ? inject // 如果是数组，则直接赋值inject给key
      : hasSymbol // 如果不是，则判断是否支持Symbol
        ? Reflect.ownKeys(inject) // 如果支持Symbol，则处理？Reflect.ownKeys的用法？
                                  // Reflect是es6提供操作对象的新API，ownKeys方法返回对象上的所有属性，包括Symbol属性
        : Object.keys(inject) // 如果不支持Symbol，则将inject的键转为数组
    // 遍历inject的键
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i]
      const provideKey = isArray ? key : inject[key]
      let source = vm
      // 循环查找VM实例及父实例上是否存在provideKey，如果有则将结果推入result对象中
      while (source) {
        if (source._provided && provideKey in source._provided) {
          result[key] = source._provided[provideKey]
          break
        }
        // 向父上继续查找
        source = source.$parent
      }
    }
    // 将结果返回
    return result
  }
}

```
## 知识点
### Reflect.ownKeys

Reflect是es6提供操作对象的新API，ownKeys方法返回对象上的所有属性，包括Symbol属性。
