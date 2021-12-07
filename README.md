# ShadowRealm API Polyfill
A implementation of the [ShadowRealm API Proposal](https://tc39.es/proposal-shadowrealm).
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
### For browser
1. Po**n**yfill: non-invasive
```javascript
import ShadowRealm from 'shadowrealm-api'

const realm = new ShadowRealm();
```
2. Po**l**yfill: patch up the global object
```javascript
import 'shadowrealm-api/browser/polyfill'

const realm = new ShadowRealm();
```
> Limitations: 
> 1. All code evaluated inside a ShadowRealm runs in strict mode;
> 1. Partial support for ES Module;

### For node.js
1. Ponyfill
```javascript
const ShadowRealm = require('shadowrealm-api/node');

const realm = new ShadowRealm();
```
2. Polyfill
```javascript
require('shadowrealm-api/node/polyfill');

const realm = new ShadowRealm();
```


## Compatibility
### Without ES Module
|Node.js|IE|Edge|Firefox|Chrome|Safari|Opera|
|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
|0.12.18|10|12|4|13|6|12.1|

### With ES Module
|Node.js|IE|Edge|Firefox|Chrome|Safari|Opera|
|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
|8.5.0|-|12*|29*|32*|8*|19*|
|8.5.0|-|14|39|42|10.1|29|

> \* Work with `fetch` polyfill.


## Contact
1. WeChat: ambit_tsai
1. QQ Group: 663286147
1. E-mail: ambit_tsai@qq.com
