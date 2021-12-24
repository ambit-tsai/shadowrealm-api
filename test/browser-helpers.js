
/**
 * Create data uri by code
 * @param {string} code 
 * @returns {string}
 */
window.createSpecifier = function (code) {
    return 'data:text/javascript;base64,' + btoa(code);
};


window.specifierMap = {
    './import-value_FIXTURE.js': createSpecifier('export var x = 1;'),
    './import-value_syntax_error_FIXTURE.js': createSpecifier('This is an invalid JavaScript Module file.'),
    './import-value_throws_FIXTURE.js': createSpecifier(`throw new Error('foobar');`),
};
