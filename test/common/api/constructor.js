diyTest('call as constructor', () => {
    const sr = new ShadowRealm();
    return sr.evaluate('123') === 123;
});

diyTest('call as function', () => {
    try {
        ShadowRealm();
    } catch (error) {
        return error instanceof TypeError;
    }
});
