// @ts-ignore
import vm from 'vm';

type CreateShadowRealm = typeof createShadowRealm;


function createSafeShadowRealm(vm: any, createShadowRealm: CreateShadowRealm) {
    const { create, defineProperty } = Object;
    const RawTypeError = TypeError;
    const RawString = String;

    return class ShadowRealm {
        __eval?: typeof eval;
        __import?: (x: string) => Promise<any>;
    
        constructor() {
            const obj = create(null);
            const ctx = vm.createContext(obj);
            const Function = vm.runInContext('Function', ctx);
            defineProperty(ctx, 'ShadowRealm', {
                configurable: true,
                writable: true,
                value: createShadowRealm(Function),
            });
            defineProperty(this, '__eval', {
                value: (x: string) => vm.runInContext(x, ctx),
            });
            defineProperty(this, '__import', {
                value: Function('m', 'return import(m)'),
            });
        }
    
        evaluate(sourceText: string) {
            if (typeof sourceText !== 'string') {
                throw new RawTypeError('Cannot call evaluate with non-string');
            }
            return this.__eval!(sourceText);
        }
        
        importValue(specifier: string, bindingName: string) {
            specifier = RawString(specifier);
            if (bindingName !== undefined) {
                bindingName = RawString(bindingName);
            }
            return this.__import!(specifier).then((module: any) => {
                if (!(bindingName in module)) {
                    throw new TypeError(`The module does not export "${bindingName}"`);
                }
                return module[bindingName];
            });
        }
    }
}


const codeOfCreateSafeShadowRealm = `return ${createSafeShadowRealm.toString()}.apply({}, arguments)`;

export type ShadowRealmConstructor = ReturnType<typeof createSafeShadowRealm>;

export function createShadowRealm(Function: FunctionConstructor): ShadowRealmConstructor {
    return Function(codeOfCreateSafeShadowRealm)(vm, createShadowRealm);
}
