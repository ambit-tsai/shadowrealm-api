import '../src/browser/polyfill'

const el = document.querySelector('.code');
el.textContent = `
class ShadowRealm {
    constructor();
    evaluate(sourceText: string): Primitive | Function;
    importValue(specifier: string, bindingName: string): Promise<Primitive | Function>;
}

`;
