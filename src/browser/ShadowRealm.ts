import { createRealmRecord, RealmRecord } from './RealmRecord';
import { dynamicImportPattern, dynamicImportReplacer } from './es-module/helpers';
import ESModule from './es-module';
import {
    getWrappedValue,
    assign,
    globalReservedProperties,
    safeApply,
    wrapError,
} from './utils';


export type ShadowRealmConstructor = ReturnType<typeof createShadowRealmInContext>; 
export type ShadowRealm = InstanceType<ShadowRealmConstructor>;
export type Utils = typeof utils;


export function createShadowRealm(): ShadowRealmConstructor {
    const reservedProperties = [
        'document',
        'eval',
        'Function',
        'Object',
        'Promise',
        'String',
        'Symbol',
        'Error',
        'EvalError',
        'RangeError',
        'ReferenceError',
        'SyntaxError',
        'TypeError',
        'URIError',
        'AggregateError',
    ] as const;
    const intrinsics = {} as Record<string, any>;
    for (const key of reservedProperties) {
        if (window[key]) {
            intrinsics[key] = window[key];
        }
    }
    return createShadowRealmByRealmRecord({
        intrinsics,
        globalObject: window,
    } as RealmRecord);
}


const codeOfCreateShadowRealm = `(${createShadowRealmInContext.toString()})`;
const utils = {
    createRealmRecord,
    dynamicImportPattern,
    dynamicImportReplacer,
    getWrappedValue,
    createShadowRealmByRealmRecord,
    ESModule,
    assign,
    globalReservedProperties,
    safeApply,
    wrapError,
};


function createShadowRealmByRealmRecord(realmRec: RealmRecord): ShadowRealmConstructor {
    return realmRec.intrinsics.eval(codeOfCreateShadowRealm)(realmRec, utils);
}


function createShadowRealmInContext(globalRealmRec: RealmRecord, utils: Utils) {
    const {
        TypeError,
        Object: { defineProperty },
        Promise: {
            prototype: { then },
        },
        String: {
            prototype: { replace },
        },
        Symbol,
    } = globalRealmRec.intrinsics;
    
    const Ctor = class ShadowRealm {
        __realm?: RealmRecord;
        __debug?: boolean;
    
        constructor() {
            if (!(this instanceof ShadowRealm)) {
                throw new TypeError('Constructor requires a new operator');
            }
            const realmRec = utils.createRealmRecord(globalRealmRec, utils, this);
            defineProperty(this, '__realm', { value: realmRec });
            defineProperty(this, '__debug', {
                get: () => realmRec.debug,
                set: val => realmRec.debug = val,
            });
        }
    
        evaluate(sourceText: string) {
            if (typeof sourceText !== 'string') {
                throw new TypeError('evaluate expects a string');
            }
            sourceText = utils.safeApply(replace, sourceText, [
                utils.dynamicImportPattern,
                utils.dynamicImportReplacer,
            ]);
            try {
                const result = this.__realm!.globalObject.eval(sourceText);
                return utils.getWrappedValue(globalRealmRec, result, this.__realm!);
            } catch (error) {
                utils.wrapError(error, globalRealmRec);
            }
        }
    
        importValue(specifier: string, bindingName: string): Promise<any> {
            specifier += '';
            bindingName += '';
            return utils.safeApply(then, this.__realm!.esm.import(specifier, globalRealmRec), [
                (module: Record<PropertyKey, any>) => {
                    if (!(bindingName in module)) {
                        throw new TypeError(`"${specifier}" has no export named "${bindingName}"`);
                    }
                    return utils.getWrappedValue(globalRealmRec, module[bindingName], this.__realm!);
                },
            ]);
        }

    }

    if (Symbol?.toStringTag) {
        defineProperty(Ctor.prototype, Symbol.toStringTag, {
            configurable: true,
            value: 'ShadowRealm',
        });
    }

    return Ctor;
}
