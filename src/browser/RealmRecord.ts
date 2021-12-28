import type { BuiltinShadowRealm, Utils } from './ShadowRealm';
import { GlobalObject, topGlobal } from './utils';
import ESModule from './es-module';

export interface RealmRecord {
    intrinsics: GlobalObject;
    globalObject: GlobalObject;
    esm: ESModule;
}


const codeOfCreateRealmRecord = `(${createRealmRecordInContext.toString()})`;

const waitForGarbageCollection: (
    realmRec: RealmRecord,
    shadowRealm: BuiltinShadowRealm,
    iframe: HTMLIFrameElement,
) => void = topGlobal.FinalizationRegistry
    ? ({ intrinsics }, shadowRealm, iframe) => {
        // TODO: need test
        const registry = new intrinsics.FinalizationRegistry((iframe: HTMLIFrameElement) => {
            iframe.parentNode!.removeChild(iframe);
        });
        registry.register(shadowRealm, iframe);
    }
    : () => {};



export function createRealmRecord(
    parentRealmRec: RealmRecord,
    utils: Utils,
    shadowRealm: BuiltinShadowRealm,
): RealmRecord {
    const { document } = parentRealmRec.intrinsics;
    const iframe = document.createElement('iframe');
    iframe.name = 'ShadowRealm';
    document.head.appendChild(iframe);
    const realmRec = (iframe.contentWindow as GlobalObject).eval(codeOfCreateRealmRecord)(utils);
    waitForGarbageCollection(realmRec, shadowRealm, iframe);
    return realmRec;
}


function createRealmRecordInContext({
    defineShadowRealm,
    ESModule,
    assign,
    globalReservedProperties,
    safeApply,
    dynamicImportPattern,
    dynamicImportReplacer,
}: Utils): RealmRecord {
    const win = window;
    const { Object, String } = win;
    const { defineProperty, getOwnPropertyNames } = Object;
    const { replace } = String.prototype;
    const intrinsics = {} as GlobalObject;
    const globalObject = {} as GlobalObject;

    // Handle window object
    for (const key of getOwnPropertyNames(win) as any[]) {
        intrinsics[key] = win[key];
        const isReserved = globalReservedProperties.indexOf(key) !== -1;
        const descriptor = <PropertyDescriptor> Object.getOwnPropertyDescriptor(win, key);
        if (key === 'eval') {
            defineEval();
        } else if (isReserved) {
            defineProperty(globalObject, key, descriptor);  // copy to new global object
        }
        if (descriptor.configurable) {
            delete win[key];
        } else if (descriptor.writable) {
            win[key] = undefined as any;
        } else if (!isReserved) {
            // Intercept properties that cannot be deleted
            defineProperty(globalObject, key, { value: undefined });
        }
    }
    
    if (intrinsics.Symbol?.unscopables) {
        // Prevent escape from the `with` environment 
        defineProperty(globalObject, intrinsics.Symbol.unscopables, {
            value: Object.preventExtensions(Object.create(null)),
        });
    }
    // Intercept the props of EventTarget.prototype
    for (const key of getOwnPropertyNames(intrinsics.EventTarget.prototype)) {
        if (key !== 'constructor') {
            defineProperty(globalObject, key, { value: undefined });
        }
    }
    
    globalObject.globalThis = globalObject;
    globalObject.Function = createFunction();
    
    const realmRec = { intrinsics, globalObject } as RealmRecord;
    defineShadowRealm(globalObject, realmRec);

    // Add helpers for ES Module
    const esm = new ESModule(realmRec);
    realmRec.esm = esm;
    defineProperty(globalObject, '__from', {
        value: (specifier: string) => esm.get(specifier),
    });
    defineProperty(globalObject, '__export', {
        set: val => assign(esm.exports, val),
    });
    defineProperty(globalObject, '__default', {
        set: val => esm.exports!.default = val,
    });
    defineProperty(globalObject, '__import', {
        value: (specifier: string) => esm.import(specifier),
    });

    return realmRec;


    function defineEval() {
        let isInnerCall = false;
        const newEval = createEval();
        defineProperty(globalObject, 'eval', {
            get() {
                if (isInnerCall) {
                    isInnerCall = false;
                    return intrinsics.eval; // used by safe eval
                }
                return newEval;
            },
            set(val) {
                if (val === intrinsics) isInnerCall = true;
            },
        });
    }


    function createEval() {
        const safeEval = intrinsics.Function('with(this)return eval(arguments[0])');
        return {
            eval(x: string) {
                // `'use strict'` is used to enable strict mode
                // `undefined`  is used to ensure that the return value remains unchanged 
                x = safeApply(replace, `'use strict';undefined;${x}`, [
                    dynamicImportPattern,
                    dynamicImportReplacer,
                ]);
                // @ts-ignore: `intrinsics` is the key to use raw `eval`
                globalObject.eval = intrinsics;
                return safeApply(safeEval, globalObject, [x]);
            },
        }.eval; // fix: TS1215: Invalid use of 'eval'
    }


    function createFunction(): FunctionConstructor {
        const RawFunction = intrinsics.Function;
        const { toString } = RawFunction;
        function Function() {
            const rawFn = safeApply(RawFunction, null, arguments);
            let rawFnStr = safeApply(toString, rawFn, []);
            rawFnStr = safeApply(replace, rawFnStr, [
                dynamicImportPattern,
                dynamicImportReplacer,
            ]);
            const wrapFn = RawFunction(`with(this)return function(){'use strict';return ${rawFnStr}}`);
            const safeFn: Function = safeApply(wrapFn, globalObject, [])();
            return function (this: any) {
                const ctx = this === win ? undefined : this;
                return safeApply(safeFn, ctx, arguments);
            };
        }
        Function.prototype = RawFunction.prototype;
        RawFunction.prototype.constructor = Function;
        return Function as any;
    }
}
