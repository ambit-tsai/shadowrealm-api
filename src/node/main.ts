// @ts-ignore
import vm from 'vm';
import {
    GlobalObject,
    createRealmRecord,
    CreateRealmRecord,
    RealmRecord,
    getWrappedValue,
    GetWrappedValue,
    invokeWithErrorHandling,
    InvokeWithErrorHandling,
} from './utils';


export type ShadowRealmConstructor = ReturnType<typeof createShadowRealmInContext>;


export function createShadowRealm(): ShadowRealmConstructor {
    const realmRec = createRealmRecord(global);
    return createShadowRealmByRealmRecord(realmRec);
}


const codeOfCreateShadowRealm = `(${createShadowRealmInContext.toString()})`;


function createShadowRealmByRealmRecord(realmRec: RealmRecord): ShadowRealmConstructor {
    return realmRec.intrinsics.eval(codeOfCreateShadowRealm)(
        vm,
        createRealmRecord,
        createShadowRealmByRealmRecord,
        realmRec,
        invokeWithErrorHandling,
        getWrappedValue,
    );
}


type CreateShadowRealmByRealmRecord = typeof createShadowRealmByRealmRecord;


function createShadowRealmInContext(
    this: GlobalObject,
    vm: any,
    createRealmRecord: CreateRealmRecord,
    createShadowRealmByRealmRecord: CreateShadowRealmByRealmRecord,
    globalRealmRec: RealmRecord,
    invokeWithErrorHandling: InvokeWithErrorHandling,
    getWrappedValue: GetWrappedValue,
) {
    const { create, defineProperty } = Object;
    const { TypeError } = this;

    return class ShadowRealm {
        __realm?: RealmRecord;
        __import?: (m: string) => Promise<any>;
    
        constructor() {
            if (!(this instanceof ShadowRealm)) {
                throw new TypeError('Constructor requires a new operator');
            }
            const obj = create(null);
            const ctx = vm.createContext(obj);
            const globalObject = vm.runInContext('this', ctx);
            const realmRec = createRealmRecord(globalObject);
            defineProperty(globalObject, 'ShadowRealm', {
                configurable: true,
                writable: true,
                value: createShadowRealmByRealmRecord(realmRec),
            });
            defineProperty(this, '__realm', {
                value: realmRec,
            });
            defineProperty(this, '__import', {
                value: realmRec.intrinsics.Function('m', 'return import(m)'),
            });
        }
    
        evaluate(sourceText: string) {
            if (typeof sourceText !== 'string') {
                throw new TypeError('evaluate expects a string');
            }
            return invokeWithErrorHandling(() => {
                const result = this.__realm!.intrinsics.eval(sourceText);
                return getWrappedValue(globalRealmRec, result, this.__realm!);
            }, globalRealmRec);
        }
        
        importValue(specifier: string, bindingName: string) {
            specifier += '';
            bindingName += '';
            return this.__import!(specifier)
                .then((module: any) => {
                    if (!(bindingName in module)) {
                        throw new TypeError(`"${specifier}" has no export named "${bindingName}"`);
                    }
                    return getWrappedValue(globalRealmRec, module[bindingName], this.__realm!);
                }, err => {
                    invokeWithErrorHandling(() => {throw err}, globalRealmRec);
                });
        }

    }
}
