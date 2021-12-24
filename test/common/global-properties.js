/*---
features: [ShadowRealm]
---*/

var realm = new ShadowRealm();

function evaluateInShadowRealm() {
    function isObject(val) {
        return val ? typeof val === 'object' || typeof val === 'function' : false;
    }

    var keys = [].concat(
        Object.getOwnPropertyNames(globalThis),
        Object.getOwnPropertySymbols(globalThis),
    );
    var brokenList = [];

    for (var key of keys) {
        var desc = Object.getOwnPropertyDescriptor(globalThis, key);
        if (desc.writable != null) {
            if (isObject(desc.value)
                && Object.getPrototypeOf(desc.value)
                && desc.value.hasOwnProperty !== Object.prototype.hasOwnProperty
            ) {
                brokenList.push(key);
            }
        } else if (desc.get) {
            if (desc.get.hasOwnProperty !== Object.prototype.hasOwnProperty) {
                brokenList.push(key);
            }
        } else if (desc.set) {
            if (desc.set.hasOwnProperty !== Object.prototype.hasOwnProperty) {
                brokenList.push(key);
            }
        }
    }

    return brokenList.join();
}

var result = realm.evaluate(`(${evaluateInShadowRealm.toString()})()`);

assert.sameValue(result, '');
