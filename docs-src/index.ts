import './index.css';
import '../src/browser/polyfill'

const code = `
class ShadowRealm {
    constructor();
    evaluate(sourceText: string): Primitive | Function;
    importValue(specifier: string, bindingName: string): Promise<Primitive | Function>;
}

`;

setTimeout(() => {
    const el = document.querySelector('.code');
    el.textContent = code;
});
