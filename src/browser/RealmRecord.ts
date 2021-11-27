import type { ShadowRealm, CreateShadowRealm } from './ShadowRealm';
import { GlobalObject, GLOBAL_PROPERTY_KEYS, safeApply, SafeApply } from './utils';


export interface RealmRecord {
    intrinsics: GlobalObject;
    globalObject: GlobalObject;
}
export type CreateRealmRecord = typeof createRealmRecord;


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
    createShadowRealm: CreateShadowRealm,
    shadowRealm: ShadowRealm,
): RealmRecord {
    const { document } = parentRealmRec.intrinsics;
    const iframe = document.createElement('iframe');
    iframe.name = 'ShadowRealm';
    document.head.appendChild(iframe);
    const realmRec = (iframe.contentWindow as GlobalObject).eval(codeOfCreateRealmRecord)(
        createShadowRealm,
        GLOBAL_PROPERTY_KEYS,
        safeApply,
    );
    waitForGarbageCollection(realmRec, shadowRealm, iframe);
    return realmRec;
}


function createRealmRecordInContext(
    createShadowRealm: CreateShadowRealm,
    GLOBAL_PROPERTY_KEYS: string[],
    safeApply: SafeApply,
): RealmRecord {
    const win = window;
    const { Object, Function } = win;
    const { defineProperty, getOwnPropertyNames, getOwnPropertyDescriptor } = Object;

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

    if (Symbol.unscopables) {
        defineProperty(globalObject, Symbol.unscopables, {
            value: Object.create(null),
        });
    }
    // Intercept the props of EventTarget.prototype
    for (const key of getOwnPropertyNames(EventTarget.prototype)) {
        if (key !== 'constructor') {
            defineProperty(Global.prototype, key, {
                writable: true,
                value: undefined,
            });
        }
    }

    for (const key of getOwnPropertyNames(win) as any[]) {
        const descriptor = <PropertyDescriptor> getOwnPropertyDescriptor(win, key);
        defineProperty(intrinsics, key, descriptor);
        const isExisted = GLOBAL_PROPERTY_KEYS.indexOf(key) !== -1;
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
            defineProperty(Global.prototype, key, {
                writable: true,
                value: undefined,
            });
        }
    }
    // @ts-ignore: `globalThis` is writable
    globalObject.globalThis = globalObject;
    globalObject.Function = createFunction();
    return {
        intrinsics,
        globalObject,
    };


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
