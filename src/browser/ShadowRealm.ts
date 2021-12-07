import { createRealmRecord, RealmRecord } from './RealmRecord';
import { dynamicImportPattern, dynamicImportReplacer } from './es-module/helpers';
import ESModule from './es-module';
import {
    GlobalObject,
    invokeWithErrorHandling,
    getWrappedValue,
    assign,
    globalReservedProperties,
    safeApply,
} from './utils';


export type ShadowRealmConstructor = ReturnType<typeof createShadowRealmInContext>; 
export type ShadowRealm = InstanceType<ShadowRealmConstructor>;
export type Utils = typeof utils;


const codeOfCreateShadowRealm = `(${createShadowRealmInContext.toString()})`;
const utils = {
    createRealmRecord,
    invokeWithErrorHandling,
    dynamicImportPattern,
    dynamicImportReplacer,
    getWrappedValue,
    createShadowRealm,
    ESModule,
    assign,
    globalReservedProperties,
    safeApply,
};


export function createShadowRealm(contentWindow: GlobalObject): ShadowRealmConstructor {
    return contentWindow.eval(codeOfCreateShadowRealm)(utils);
}


function createShadowRealmInContext(utils: Utils) {
    const {
        TypeError,
        Object: { defineProperty },
    } = window;
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
        __import?: (x: string) => Promise<any>;
    
        constructor() {
            if (!(this instanceof ShadowRealm)) {
                throw new TypeError('Constructor requires a new operator');
            }
            const realmRec = utils.createRealmRecord(globalRealmRec, utils, this);
            defineProperty(this, '__realm', { value: realmRec });
            defineProperty(this, '__import', {
                value: realmRec.globalObject.Function('m', 'return import(m)'),
            });
        }
    
        evaluate(sourceText: string) {
            if (typeof sourceText !== 'string') {
                throw new TypeError('evaluate expects a string');
            }
            return utils.invokeWithErrorHandling(() => {
                sourceText = sourceText.replace(utils.dynamicImportPattern, utils.dynamicImportReplacer);
                const result = this.__realm!.globalObject.eval(sourceText);
                return utils.getWrappedValue(globalRealmRec, result, this.__realm!);
            }, globalRealmRec);
        }
    
        importValue(specifier: string, bindingName: string): Promise<any> {
            specifier += '';
            bindingName += '';
            return this.__realm!.esm.import(specifier).then((module: any) => {
                if (!(bindingName in module)) {
                    throw new TypeError(`"${specifier}" has no export named "${bindingName}"`);
                }
                return utils.getWrappedValue(globalRealmRec, module[bindingName], this.__realm!);
            }, err => {
                utils.invokeWithErrorHandling(() => {throw err}, globalRealmRec);
            });
        }
    }
}
