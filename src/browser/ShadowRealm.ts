import { GlobalObject, invokeWithErrorHandling, InvokeWithErrorHandling, getWrappedValue, GetWrappedValue } from './utils';
import { createRealmRecord, CreateRealmRecord, RealmRecord } from './RealmRecord';


export type ShadowRealmConstructor = ReturnType<typeof createShadowRealmInContext>; 
export type ShadowRealm = InstanceType<ShadowRealmConstructor>;
export type CreateShadowRealm = typeof createShadowRealm;


const codeOfCreateShadowRealm = `(${createShadowRealmInContext.toString()})`;


export function createShadowRealm(contentWindow: GlobalObject): ShadowRealmConstructor {
    return contentWindow.eval(codeOfCreateShadowRealm)(
        createRealmRecord,
        createShadowRealm,
        invokeWithErrorHandling,
        getWrappedValue,
    );
}


function createShadowRealmInContext(
    createRealmRecord: CreateRealmRecord,
    createShadowRealm: CreateShadowRealm,
    invokeWithErrorHandling: InvokeWithErrorHandling,
    getWrappedValue: GetWrappedValue,
) {
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
                throw new TypeError("Constructor ShadowRealm requires 'new'");
            }
            const realmRec = createRealmRecord(globalRealmRec, createShadowRealm, this);
            defineProperty(this, '__realm', { value: realmRec });
            defineProperty(this, '__import', {
                value: realmRec.globalObject.Function('m', 'return import(m)'),
            });
        }
    
        evaluate(sourceText: string) {
            if (typeof sourceText !== 'string') {
                throw new TypeError('evaluate expects a string');
            }
            return invokeWithErrorHandling(() => {
                const result = this.__realm!.globalObject.eval(sourceText);
                return getWrappedValue(globalRealmRec, result, this.__realm!);
            }, globalRealmRec);
        }
    
        importValue(specifier: string, bindingName: string): Promise<any> {
            specifier += '';
            bindingName += '';
            // FIXME: `import()` works under the global scope
            return this.__import!(specifier).then((module: any) => {
                if (!(bindingName in module)) {
                    throw new TypeError(`${specifier} has no export named ${bindingName}`);
                }
                return getWrappedValue(globalRealmRec, module[bindingName], this.__realm!);
            });
        }
    }
}
