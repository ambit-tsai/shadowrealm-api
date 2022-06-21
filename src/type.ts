export type Intrinsics = Omit<typeof window, 'globalThis'> & {
    globalThis: GlobalObject;
};

export type GlobalObject = Omit<typeof window, 'globalThis'> & {
    globalThis: GlobalObject;
    ShadowRealm: ShadowRealmConstructor;
    __import(specifier: string, base?: string): Promise<Record<string, any>>;
};

export interface ShadowRealmConstructor {
    new (): ShadowRealm;
    __debug: boolean;
}

type Primitive = undefined | null | boolean | number | string | symbol | bigint;
type Callable = Function;

export interface ShadowRealm {
    evaluate(sourceText: string): Primitive | Callable;
    importValue(
        specifier: string,
        bindingName: string
    ): Promise<Primitive | Callable>;
}

export interface BuiltinShadowRealm extends ShadowRealm {
    readonly __realm: RealmRecord;
}

export interface RealmRecord {
    intrinsics: GlobalObject;
    globalObject: GlobalObject;
    evalInContext: (x: string) => any;
}

export interface Module {
    exports: object;
    promise?: Promise<string>;
}
