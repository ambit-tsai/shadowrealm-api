# ShadowRealm API Polyfill
A implementation of the [ShadowRealm API Proposal](https://tc39.es/proposal-shadowrealm), a JavaScript sandbox, with [TC39 Test262 cases](https://github.com/tc39/test262/tree/main/test/built-ins/ShadowRealm).
```ts
declare class ShadowRealm {
    constructor();
    evaluate(sourceText: string): Primitive | Function;
    importValue(specifier: string, bindingName: string): Promise<Primitive | Function>;
}
```
[Try it now 🎉](https://ambit-tsai.github.io/shadowrealm-api/)


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
Set private property `__debug` to true.
```js
const realm = new ShadowRealm();
realm.__debug = true;
```


## Limitations
1. All code evaluated inside a ShadowRealm runs in strict mode;
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
export const object = {/* ... */}, FunctionName = () => {/* ... */}；

// ✅
const object = {/* ... */};
const FunctionName = () => {/* ... */}；
export { object, FunctionName };
```


## Compatibility
|IE|Edge|Firefox|Chrome|Safari|Opera|
|:-:|:-:|:-:|:-:|:-:|:-:|
|10<sup>[1][2][3]</sup>|12<sup>[1][2][3]</sup>|4<sup>[1][2][3]</sup>|13<sup>[1][2][3]</sup>|6<sup>[1][2][3]</sup>|12.1<sup>[1][2][3]</sup>|
||14|29<sup>[1][3]</sup>|32<sup>[1][3]</sup>|8<sup>[3]</sup>|19<sup>[1][3]</sup>|
|||41|49|10.1|36|

> Notes:
> 1. Don't support destructuring assignment in ESM statement;
> 1. Need `Promise` polyfill in ShadowRealm;
> 1. Need `fetch` polyfill in top window;

Use fetch polyfill:
```js
import "your fetch polyfill";
// Your codes
```
Use Promise polyfill:
```js
const realm = new ShadowRealm();
realm.__shims = [
    'path/to/promise-polyfill.js',
    'other polyfills',
];
```


## Contact
1. WeChat: ambit_tsai
1. QQ Group: 663286147
1. E-mail: ambit_tsai@qq.com
