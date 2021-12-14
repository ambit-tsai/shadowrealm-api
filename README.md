# ShadowRealm API Polyfill
A implementation of the [ShadowRealm API Proposal](https://tc39.es/proposal-shadowrealm), and has more than 100 test cases.
```ts
declare class ShadowRealm {
    constructor();
    evaluate(sourceText: string): PrimitiveValue | Function;
    importValue(specifier: string, bindingName: string): Promise<PrimitiveValue | Function>;
}
```

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
import 'shadowrealm-api/browser/polyfill'

const realm = new ShadowRealm();
```


## Debugging Skill
It will output debugging info when the private property `__debug` is true.
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
|10<sup>[1]</sup>|12<sup>[1]</sup>|4<sup>[1]</sup>|13<sup>[1]</sup>|6<sup>[1]</sup>|12.1<sup>[1]</sup>|
||14|41|49|8<sup>[2]</sup>|36|
|||||10.1||

> Notes:
> 1. Without ES Module;
> 2. Available in browser with `fetch` polyfill;


## Contact
1. WeChat: ambit_tsai
1. QQ Group: 663286147
1. E-mail: ambit_tsai@qq.com
