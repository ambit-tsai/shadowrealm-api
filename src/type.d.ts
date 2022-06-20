export type Intrinsics = Omit<typeof window, 'globalThis'> & {
    globalThis: GlobalObject;
};

export type GlobalObject = Omit<typeof window, 'globalThis'> & {
    globalThis: GlobalObject;
    ShadowRealm?: BuiltinShadowRealm;
    __import(specifier: string, base?: string): Promise<Record<string, any>>;
};

export interface BuiltinShadowRealm {
    evaluate(): any;
    importValue(): Promise<any>;
    __realm: RealmRecord;
    __debug: boolean;
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
