diyTest('__from', () => {
    return sr.evaluate('__from.hasOwnProperty === Object.prototype.hasOwnProperty');
});

diyTest('__export', () => {
    return sr.evaluate(`
        const desc = Object.getOwnPropertyDescriptor(globalThis, '__export');
        desc.set.hasOwnProperty === Object.prototype.hasOwnProperty;
    `);
});

diyTest('__default', () => {
    return sr.evaluate(`
        const desc = Object.getOwnPropertyDescriptor(globalThis, '__default');
        desc.set.hasOwnProperty === Object.prototype.hasOwnProperty;
    `);
});

diyTest('__import', () => {
    return sr.evaluate('__import.hasOwnProperty === Object.prototype.hasOwnProperty');
});

diyTest('__proto__ of global context', () => {
    return sr.evaluate('__proto__ === Object.prototype');
});

diyTest('constructor of global context', () => {
    return sr.evaluate('constructor === Object');
});

diyTest('addEventListener of global context', () => {
    return sr.evaluate('addEventListener === undefined');
});
