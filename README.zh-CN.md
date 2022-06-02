# ShadowRealm API Polyfill
依照 <a href="https://tc39.es/proposal-shadowrealm" target="_blank">ShadowRealm API</a> 提案实现的 JavaScript 沙箱，使用 <a href="https://github.com/tc39/test262/tree/main/test/built-ins/ShadowRealm" target="_blank">TC39 Test262</a> 的用例进行测试。

简体中文 | [English](https://github.com/ambit-tsai/shadowrealm-api)
```ts
declare class ShadowRealm {
    constructor();
    evaluate(sourceText: string): Primitive | Function;
    importValue(specifier: string, bindingName: string): Promise<Primitive | Function>;
}
```
<a href="https://ambit-tsai.github.io/shadowrealm-api/" target="_blank">在线试用一下 🎉</a>


## 安装
```
npm i -S shadowrealm-api
```


## 使用
### Po**n**yfill: 无侵入性
```javascript
import ShadowRealm from 'shadowrealm-api'

const realm = new ShadowRealm();
```

### Po**l**yfill: 修补全局对象
```javascript
import 'shadowrealm-api/browser/polyfill.mjs'

const realm = new ShadowRealm();
```


## 调试
打印内部调试信息
```js
ShadowRealm.__debug = true;
```


## 限制
1. 在 ShadowRealm 中运行的所有代码都处于**严格模式**下；
2. ESM 语句不能含有冗余的注释；
```js
// ❌
import/* */defaultExport from "module-name";
export default/* */'xxx';

// ✅
import defaultExport from "module-name";
export default 'xxx';
```
3. 不支持导出变量声明；
```js
// ❌
export const obj = {...}, fn = () => {...};

// ✅
const obj = {...}, fn = () => {...};
export { obj, fn };
```


## 兼容性
|IE|Edge|Firefox|Chrome|Safari|Opera|
|:-:|:-:|:-:|:-:|:-:|:-:|
||14|29<sup>[1][2]</sup>|32<sup>[1][2]</sup>|8<sup>[2]</sup>|19<sup>[1][2]</sup>|
|||41|49|10.1|36|

> Notes:
> 1. ESM 语句不支持解构赋值；
> 1. 顶层作用域需要`fetch`垫片；

使用 fetch 或 URL 垫片:
```js
import "fetch polyfill";
import "shadowrealm-api/browser/polyfill.mjs";
// Your codes
```


## 联系
1. 微信: cai_fanwei
1. QQ群: 663286147
1. 邮箱: ambit_tsai@qq.com
