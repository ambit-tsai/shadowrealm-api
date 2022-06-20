/*---
features: [ShadowRealm]
---*/

var realm = new ShadowRealm();

assert(realm.evaluate('this.window === undefined'), 'this.window');
assert(
    realm.evaluate('eval("this.window") === undefined'),
    'eval("this.window")'
);
assert(
    realm.evaluate('Function("return this && this.window")() === undefined'),
    'Function return this.window'
);
assert(
    realm.evaluate(
        'Function.prototype.constructor("return this && this.window")() === undefined'
    ),
    'Function.prototype.constructor return this.window'
);
assert(
    realm.evaluate(
        '(function(){ return this && this.window }()) === undefined'
    ),
    'function return this.window'
);

assert(realm.evaluate('globalThis.window === undefined'), 'globalThis.window');
assert(
    realm.evaluate('eval("globalThis.window") === undefined'),
    'eval("globalThis.window")'
);
assert(
    realm.evaluate('Function("return globalThis.window")() === undefined'),
    'Function return globalThis.window'
);
assert(
    realm.evaluate(
        'Function.prototype.constructor("return globalThis.window")() === undefined'
    ),
    'Function.prototype.constructor return globalThis.window'
);
assert(
    realm.evaluate('(function(){ return globalThis.window }()) === undefined'),
    'function return globalThis.window'
);

assert(realm.evaluate('typeof window === "undefined"'), 'window');
assert(
    realm.evaluate('eval("typeof window") === "undefined"'),
    'window in eval'
);
assert(
    realm.evaluate('Function("return typeof window")() === "undefined"'),
    'window in Function'
);
assert(
    realm.evaluate(
        'Function.prototype.constructor("return typeof window")() === "undefined"'
    ),
    'window in Function.prototype.constructor'
);
assert(
    realm.evaluate('(function(){ return typeof window }()) === "undefined"'),
    'window in a function'
);

assert(
    realm.evaluate(`
    Object.defineProperty(Object.prototype, Symbol.unscopables, {
        value: { window: true },
    });
    typeof window === 'undefined';
`),
    'set Symbol.unscopables for Object.prototype'
);
assert(
    realm.evaluate(`
    try {
        Object.defineProperty(globalThis, Symbol.unscopables, {
            value: { window: true },
        });
        false;
    } catch (error) {
        typeof window === 'undefined';
    }
`),
    'set Symbol.unscopables for globalThis'
);
