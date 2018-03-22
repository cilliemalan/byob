const fs = require('fs');
const path = require('path');
const _ = require('lodash');

const files = fs.readdirSync(__dirname);

function execute(fn) {
    try {
        const promise = fn.apply({});
        if (promise instanceof Promise) {
            return promise.then(
                x => true,
                e => { console.error(e); return false; });
        } else {
            return Promise.resolve(true);
        }
    } catch (e) {
        console.error(e);
        return Promise.resolve(false);
    }
}

let passed = 0;
let failed = 0;

(async function () {

    const tests = _(files)
        .filter(x => /^(?!index.js).+\.js$/.test(x))
        .map(x => require(`./${x}`))
        .filter(x => _.isObject)
        .map(x => _.toPairs(x))
        .flatMap()
        .value();

    for (let i = 0; i < tests.length; ++i) {
        const kvp = tests[i];

        const { 0: test, 1: fn } = kvp;
        const result = await execute(fn);
        console.log(`${test} - ${result ? '\x1b[0;32mPASS\x1b[0m' : '\x1b[0;31mFAIL\x1b[0m'}`);
        if (!result) {
            ++failed;
        } else {
            ++passed;
        }
    }
    
})().then(() => {

    console.log();
    const color = failed ? "\x1b[0;31m" : "\x1b[0;32m";
    console.log(`${color}passed ${passed}/${passed + failed}\x1b[0m`)

    process.exit(failed);

}, e => {
    console.error(e);
    process.exit(-1);
});