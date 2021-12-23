type Primitive = undefined | null | boolean | number | string | symbol | bigint;
type Callable = Function;

export interface ShadowRealm {
    evaluate(sourceText: string): Primitive | Callable;
    importValue(specifier: string, bindingName: string): Promise<Primitive | Callable>;
}
