const fixtureMap = {
    '/import-value_FIXTURE.js': 'export var x = 1;',
    '/import-value_syntax_error_FIXTURE.js': 'This is an invalid JavaScript Module file.',
    '/import-value_throws_FIXTURE.js': `throw new Error('foobar');`,
};

const rawFetch = window.fetch;

window.fetch = function (url, opts) {
    if (typeof url === 'string') {
        for (const [file, code] of Object.entries(fixtureMap)) {
            if (url.endsWith(file)) {
                return rawFetch('data:text/javascript;base64,' + btoa(code), opts);
            }
        }
    }
    return rawFetch(url, opts);
};
