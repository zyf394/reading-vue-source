## 简述

该文件是instance实例的入口文件

## 源码：

```javascript
import { initMixin } from './init'
import { stateMixin } from './state'
import { renderMixin } from './render'
import { eventsMixin } from './events'
import { lifecycleMixin } from './lifecycle'
import { warn } from '../util/index'

function Vue (options) {
  // 如果不是通过 new 调用的，则报错
  if (process.env.NODE_ENV !== 'production' &&
    !(this instanceof Vue)
  ) {
    warn('Vue is a constructor and should be called with the `new` keyword')
  }
  this._init(options)
}

initMixin(Vue) // 混入 init 方法
stateMixin(Vue) // 混入 state 和 props 属性
eventsMixin(Vue) // 混入 events 属性
lifecycleMixin(Vue) // 混入生命周期相关方法
renderMixin(Vue) // 混入 render 方法

export default Vue

```

## 知识点
在函数内可通过 `this instanceof MyFunction` 来判断函数是否是通过new来调用的。

