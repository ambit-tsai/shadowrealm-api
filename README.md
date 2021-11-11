# ShadowRealm API Polyfill
A implementation of the [ShadowRealm API Proposal](https://github.com/tc39/proposal-shadowrealm#readme)


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


## Limitations
All code evaluated inside a ShadowRealm runs in strict mode


## Compatibility
### Without `importValue`
|Node.js|Chrome|Firefox|IE|Edge|Opera|Safari|
|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
|0.12.18|13|4|10|12|12.1|6|

### With `importValue`
|Node.js|Chrome|Firefox|IE|Edge|Opera|Safari|
|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
|8.5.0|63|67|-|79|50|11.1|
***Reason:*** `import()` has a poor compatibility


## Contact
1. WeChat: ambit_tsai
1. QQ Group: 663286147
1. E-mail: ambit_tsai@qq.com
