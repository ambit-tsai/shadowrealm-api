diyTest('pass non-string to evaluate', () => {
    try {
        sr.evaluate(123);
    } catch (error) {
        return error instanceof TypeError;
    }
});

diyTest('undefined', () => {
    return sr.evaluate('undefined') === undefined;
});

diyTest('null', () => {
    return sr.evaluate('null') === null;
});

diyTest('boolean', () => {
    return sr.evaluate('true');
});

diyTest('string', () => {
    return sr.evaluate('"ambit"') === 'ambit';
});

diyTest('symbol', () => {
    return String(sr.evaluate('Symbol(123)')) === 'Symbol(123)';
});

diyTest('number', () => {
    return sr.evaluate('123') === 123;
});

diyTest('bigint', () => {
    return sr.evaluate('123n') === 123n;
});

diyTest('function: return primitive value', () => {
    return sr.evaluate('() => true')();
});

diyTest('function: return callable value', () => {
    const fn = sr.evaluate('() => () => true');
    return fn()();
});

diyTest('function: return object', () => {
    try {
        const fn = sr.evaluate('() => ({})');
        fn();
    } catch (error) {
        return error instanceof TypeError;
    }
});

diyTest('function: pass primitive argument', () => {
    const fn = sr.evaluate('num => num === 123');
    return fn(123);
});

diyTest('function: pass callable argument', () => {
    const callFn = sr.evaluate('fn => fn()');
    return callFn(() => true);
});

diyTest('function: pass object argument', () => {
    try {
        const fn = sr.evaluate('() => {}');
        fn({});
    } catch (error) {
        return error instanceof TypeError;
    }
});

diyTest('object', () => {
    try {
        sr.evaluate('({})');
    } catch (error) {
        return error instanceof TypeError;
    }
});

diyTest('illegal return statement', () => {
    try {
        sr.evaluate('return 123');
    } catch (error) {
        return error instanceof SyntaxError;
    }
});
