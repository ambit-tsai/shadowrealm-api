import { createRealmRecord, RealmRecord } from './RealmRecord';
import { dynamicImportPattern, dynamicImportReplacer } from './es-module/helpers';
import ESModule from './es-module';
import {
    GlobalObject,
    getWrappedValue,
    assign,
    globalReservedProperties,
    safeApply,
    wrapError,
} from './utils';


export type ShadowRealmConstructor = ReturnType<typeof createShadowRealmInContext>; 
export type ShadowRealm = InstanceType<ShadowRealmConstructor>;
export type Utils = typeof utils;


const codeOfCreateShadowRealm = `(${createShadowRealmInContext.toString()})`;
const utils = {
    createRealmRecord,
    dynamicImportPattern,
    dynamicImportReplacer,
    getWrappedValue,
    createShadowRealm,
    ESModule,
    assign,
    globalReservedProperties,
    safeApply,
    wrapError,
};


export function createShadowRealm(contentWindow: GlobalObject): ShadowRealmConstructor {
    return contentWindow.eval(codeOfCreateShadowRealm)(utils);
}


function createShadowRealmInContext(utils: Utils) {
    const {
        TypeError,
        Object: { defineProperty },
        Promise,
    } = window;
    const { replace } = String.prototype;
    const globalRealmRec = {
        intrinsics: {
            document,
            Function,
            Error,
            EvalError,
            RangeError,
            ReferenceError,
            SyntaxError,
            TypeError,
            URIError,
        },
        globalObject: window,
    } as RealmRecord;
    
    return class ShadowRealm {
        __realm?: RealmRecord;
    
        constructor() {
            if (!(this instanceof ShadowRealm)) {
                throw new TypeError('Constructor requires a new operator');
            }
            const realmRec = utils.createRealmRecord(globalRealmRec, utils, this);
            defineProperty(this, '__realm', { value: realmRec });
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
            return new Promise((resolve, reject) => {
                this.__realm!.esm.import(specifier).then((module: Record<PropertyKey, any>) => {
                    if (!(bindingName in module)) {
                        throw new TypeError(`"${specifier}" has no export named "${bindingName}"`);
                    }
                    const result = utils.getWrappedValue(globalRealmRec, module[bindingName], this.__realm!);
                    resolve(result);
                }, error => {
                    utils.wrapError(error, globalRealmRec);
                })
                .catch(reject);
            });
        }
    }
}
