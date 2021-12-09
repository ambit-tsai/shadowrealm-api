// @ts-ignore
import vm from 'vm';
import {
    GlobalObject,
    createRealmRecord,
    CreateRealmRecord,
    RealmRecord,
    getWrappedValue,
    GetWrappedValue,
    wrapError,
    WrapError,
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
        getWrappedValue,
        wrapError,
    );
}


type CreateShadowRealmByRealmRecord = typeof createShadowRealmByRealmRecord;


function createShadowRealmInContext(
    this: GlobalObject,
    vm: any,
    createRealmRecord: CreateRealmRecord,
    createShadowRealmByRealmRecord: CreateShadowRealmByRealmRecord,
    globalRealmRec: RealmRecord,
    getWrappedValue: GetWrappedValue,
    wrapError: WrapError,
) {
    const { create, defineProperty } = Object;
    const { TypeError, Promise } = this;

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
            try {
                const result = this.__realm!.intrinsics.eval(sourceText);
                return getWrappedValue(globalRealmRec, result, this.__realm!);
            } catch (error) {
                wrapError(error, globalRealmRec);
            }
        }
        
        importValue(specifier: string, bindingName: string) {
            specifier += '';
            bindingName += '';
            return new Promise((resolve, reject) => {
                this.__import!(specifier)
                    .then((module: any) => {
                        if (!(bindingName in module)) {
                            throw new TypeError(`"${specifier}" has no export named "${bindingName}"`);
                        }
                        const result = getWrappedValue(globalRealmRec, module[bindingName], this.__realm!);
                        resolve(result);
                    }, error => {
                        wrapError(error, globalRealmRec);
                    })
                    .catch(reject);
            });
        }

    }
}
