# ShadowRealm API Polyfill
A implementation of the <a href="https://tc39.es/proposal-shadowrealm" target="_blank">ShadowRealm API Proposal</a>, a JavaScript sandbox, test with <a href="https://github.com/tc39/test262/tree/main/test/built-ins/ShadowRealm" target="_blank">TC39 Test262</a> cases.

[简体中文](https://gitee.com/ambit/shadowrealm-api) | English
```ts
declare class ShadowRealm {
    constructor();
    evaluate(sourceText: string): Primitive | Function;
    importValue(specifier: string, bindingName: string): Promise<Primitive | Function>;
}
```
<a href="https://ambit-tsai.github.io/shadowrealm-api/" target="_blank">Try it now 🎉</a>

## Install
```
npm i -S shadowrealm-api
```


## Usage
### Po**n**yfill: non-invasive
```javascript
import ShadowRealm from 'shadowrealm-api'

const realm = new ShadowRealm();
```

### Po**l**yfill: patch up the global object
```javascript
import 'shadowrealm-api/browser/polyfill.mjs'

const realm = new ShadowRealm();
```


## Debugging
Print internal info for debugging
```js
ShadowRealm.__debug = true;
```


## Limitations
1. All code evaluated inside a ShadowRealm runs in **strict mode**;
2. The ESM statement must not contain redundant comments;
```js
// ❌
import/* */defaultExport from "module-name";
export default/* */'xxx';

// ✅
import defaultExport from "module-name";
export default 'xxx';
```
3. Exporting variable declarations is not supported;
```js
// ❌
export const obj = {...}, fn = () => {...};

// ✅
const obj = {...}, fn = () => {...};
export { obj, fn };
```


## Compatibility
|IE|Edge|Firefox|Chrome|Safari|Opera|
|:-:|:-:|:-:|:-:|:-:|:-:|
|10<sup>[1][2][3]</sup>|12<sup>[1][2][3]</sup>|4<sup>[1][2][3][4]</sup>|13<sup>[1][2][3][4]</sup>|6<sup>[1][2][3]</sup>|12.1<sup>[1][2][3][4]</sup>|
||14|19<sup>[1][2][3]</sup>|19<sup>[1][2][3]</sup>|8<sup>[3]</sup>|15<sup>[1][2][3]</sup>|
|||29<sup>[1][3]</sup>|32<sup>[1][3]</sup>|10.1|19<sup>[1][3]</sup>|
|||41|49||36|

> Notes:
> 1. Don't support destructuring assignment in ESM statement;
> 1. Need `Promise` polyfill in ShadowRealm;
> 1. Need `fetch` polyfill in top window;
> 1. Need `URL` polyfill in top window;

Use `fetch` or `URL` polyfill:
```js
import "fetch polyfill";
import "URL polyfill";
import "shadowrealm-api/browser/polyfill.mjs";
// Your codes
```
Use `Promise` polyfill:
```js
ShadowRealm.__shims = [
    'path/to/promise-polyfill.js',
    'other polyfills',
];
```


## Contact
1. WeChat: cai_fanwei
1. QQ Group: 663286147
1. E-mail: ambit_tsai@qq.com
