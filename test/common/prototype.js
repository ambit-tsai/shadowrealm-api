/*---
features: [ShadowRealm]
---*/

var realm = new ShadowRealm();

assert(
    Object.getPrototypeOf(realm.importValue('')) === Promise.prototype,
    'promise return by importValue'
);
assert(
    realm.evaluate('Object.getPrototypeOf(import("")) === Promise.prototype'),
    'promise return by import()'
);
assert(
    realm.evaluate(`
        const promise = eval('import("")');
        Object.getPrototypeOf(promise) === Promise.prototype;
    `),
    'promise return by import() in eval'
);
assert(
    realm.evaluate(`
        const promise = Function('return import("")')();
        Object.getPrototypeOf(promise) === Promise.prototype;
    `),
    'promise return by import() in Function'
);
