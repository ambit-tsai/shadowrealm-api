type Primitive = undefined | null | boolean | number | string | symbol | bigint;
type Callable = Function;

export default class ShadowRealm {
    evaluate(sourceText: string): Primitive | Callable;
    importValue(specifier: string, bindingName: string): Promise<Primitive | Callable>;
}
