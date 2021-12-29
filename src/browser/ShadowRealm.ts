import type ShadowRealm from '../../index';
import { createRealmRecord, RealmRecord } from './RealmRecord';
import { dynamicImportPattern, dynamicImportReplacer } from './es-module/helpers';
import ESModule from './es-module';
import {
    getWrappedValue,
    assign,
    globalReservedProperties,
    safeApply,
    wrapError,
    GlobalObject,
    shared,
} from './utils';


export interface BuiltinShadowRealm extends ShadowRealm { 
    __realm: RealmRecord;
}


export type Utils = typeof utils;


export function defineShadowRealm(globalObject: GlobalObject, realmRec?: RealmRecord) {
    Object.defineProperty(globalObject, 'ShadowRealm', {
        configurable: true,
        writable: true,
        value: createShadowRealm(globalObject, realmRec),
    });
}


export function createShadowRealm(globalObject: GlobalObject, realmRec?: RealmRecord) {
    if (!realmRec) {
        const intrinsics = { document: globalObject.document } as any;
        for (const key of globalReservedProperties) {
            if (globalObject[key]) {
                intrinsics[key] = globalObject[key];
            }
        }
        realmRec = { intrinsics, globalObject } as RealmRecord;
    }
    return createShadowRealmBuiltIn(realmRec);
}


const codeOfCreateShadowRealm = `(${createShadowRealmInContext.toString()})`;
const utils = {
    createRealmRecord,
    dynamicImportPattern,
    dynamicImportReplacer,
    getWrappedValue,
    defineShadowRealm,
    ESModule,
    assign,
    globalReservedProperties,
    safeApply,
    wrapError,
    shared,
};


function createShadowRealmBuiltIn(realmRec: RealmRecord) {
    return realmRec.intrinsics.eval(codeOfCreateShadowRealm)(realmRec, utils);
}


function createShadowRealmInContext(globalRealmRec: RealmRecord, utils: Utils) {
    const {
        TypeError,
        Object: { defineProperty },
        Promise: { prototype: { then } },
        String,
        Symbol,
    } = globalRealmRec.intrinsics;
    const { replace } = String.prototype;
    
    const Ctor = function ShadowRealm(this: BuiltinShadowRealm) {
        if (!(this instanceof ShadowRealm)) {
            throw new TypeError('Constructor requires a new operator');
        }
        const realmRec = utils.createRealmRecord(globalRealmRec, utils, this);
        defineProperty(this, '__realm', { value: realmRec });
    };

    // `__debug` and `__shims` are enabled only on the top window
    if (!globalRealmRec.intrinsics.top) {
        defineProperty(Ctor, '__debug', {
            get: () => utils.shared.debug,
            set: val => utils.shared.debug = val,
        });
        defineProperty(Ctor, '__shims', {
            get: () => utils.shared.shims,
            set: val => utils.shared.shims = val,
        });
    }
    
    function evaluate(this: BuiltinShadowRealm, sourceText: string) {
        if (typeof sourceText !== 'string') {
            throw new TypeError('evaluate expects a string');
        }
        sourceText = utils.safeApply(replace, sourceText, [
            utils.dynamicImportPattern,
            utils.dynamicImportReplacer,
        ]);
        try {
            const result = this.__realm.globalObject.eval(sourceText);
            return utils.getWrappedValue(globalRealmRec, result, this.__realm);
        } catch (error) {
            utils.wrapError(error, globalRealmRec);
        }
    }
    
    function importValue(this: BuiltinShadowRealm, specifier: string, bindingName: string) {
        specifier = String(specifier);
        bindingName = String(bindingName);
        return utils.safeApply(then, this.__realm.esm.import(specifier, globalRealmRec), [
            (module: Record<PropertyKey, any>) => {
                if (!(bindingName in module)) {
                    throw new TypeError(`"${specifier}" has no export named "${bindingName}"`);
                }
                return utils.getWrappedValue(globalRealmRec, module[bindingName], this.__realm);
            },
        ]);
    }

    const { prototype } = Ctor;
    defineProperty(prototype, 'evaluate', {
        configurable: true,
        writable: true,
        value: evaluate,
    });
    defineProperty(prototype, 'importValue', {
        configurable: true,
        writable: true,
        value: importValue,
    });
    if (Symbol?.toStringTag) {
        defineProperty(prototype, Symbol.toStringTag, {
            configurable: true,
            value: 'ShadowRealm',
        });
    }

    return Ctor;
}
