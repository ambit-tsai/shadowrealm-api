import type { ShadowRealm, Utils } from './ShadowRealm';
import { GlobalObject } from './utils';
import ESModule from './es-module';


export interface RealmRecord {
    intrinsics: GlobalObject;
    globalObject: GlobalObject;
    esm: ESModule,
}


const codeOfCreateRealmRecord = `(${createRealmRecordInContext.toString()})`;

const waitForGarbageCollection: (
    realmRec: RealmRecord,
    shadowRealm: ShadowRealm,
    iframe: HTMLIFrameElement,
) => void = window.FinalizationRegistry
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
    shadowRealm: ShadowRealm,
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
    createShadowRealm,
    ESModule,
    assign,
    globalReservedProperties,
    safeApply,
}: Utils): RealmRecord {
    const win = window;
    const { Object, Function } = win;
    const { defineProperty, getOwnPropertyNames } = Object;

    class Global {
        constructor() {
            defineProperty(this, 'ShadowRealm', {
                configurable: true,
                writable: true,
                value: createShadowRealm(win),
            });
        }
    }

    const intrinsics = {} as GlobalObject;
    const globalObject = new Global() as GlobalObject;
    const realmRec = {
        intrinsics,
        globalObject,
    } as RealmRecord;
    const esm = new ESModule(realmRec);
    realmRec.esm = esm;

    if (Symbol.unscopables) {
        defineProperty(globalObject, Symbol.unscopables, {
            value: Object.create(null),
        });
    }
    // Intercept the props of EventTarget.prototype
    for (const key of getOwnPropertyNames(EventTarget.prototype)) {
        if (key !== 'constructor') {
            defineProperty(Global.prototype, key, { value: undefined });
        }
    }
    // Add helpers for ES Module
    defineProperty(Global.prototype, '__import', {
        value: (specifier: string) => esm.import(specifier),
    });
    defineProperty(Global.prototype, '__from', {
        value: (specifier: string) => esm.get(specifier),
    });
    defineProperty(Global.prototype, '__export', {
        set: (val) => assign(esm.exports, val),
    });
    defineProperty(Global.prototype, '__default', {
        set: (val) => esm.exports!.default = val,
    });

    for (const key of getOwnPropertyNames(win) as any[]) {
        const descriptor = <PropertyDescriptor> Object.getOwnPropertyDescriptor(win, key);
        defineProperty(intrinsics, key, descriptor);
        const isExisted = globalReservedProperties.indexOf(key) !== -1;
        if (key === 'eval') {
            defineEval();
        } else if (isExisted) {
            defineProperty(globalObject, key, descriptor);  // copy to new global object
        }
        if (descriptor.configurable) {
            delete win[key];
        } else if (descriptor.writable) {
            win[key] = undefined as any;
        } else if (!isExisted) {
            // Intercept properties that cannot be deleted
            defineProperty(Global.prototype, key, { value: undefined });
        }
    }
    // @ts-ignore: `globalThis` is writable
    globalObject.globalThis = globalObject;
    globalObject.Function = createFunction();
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
        const safeEval = Function('with(this)return eval(arguments[0])');
        return {
            eval(x: string) {
                // @ts-ignore: `intrinsics` is the key to use raw `eval`
                globalObject.eval = intrinsics;
                return safeApply(safeEval, globalObject, [`'use strict';${x}`]);
            },
        }.eval; // fix: TS1215: Invalid use of 'eval'
    }


    function createFunction(): FunctionConstructor {
        const RawFunction = intrinsics.Function;
        const { toString } = RawFunction;
        function Function() {
            const rawFn = safeApply(RawFunction, null, arguments);
            const rawFnStr = safeApply(toString, rawFn, []);
            const wrapFn = RawFunction(`with(this)return function(){'use strict';return ${rawFnStr}}`);
            const safeFn: Function = safeApply(wrapFn, globalObject, [])();
            return function (this: any) {
                const ctx = this === win ? undefined : this;
                return safeApply(safeFn, ctx, arguments);
            };
        }
        RawFunction.prototype.constructor = Function;
        return Function as any;
    }
}
