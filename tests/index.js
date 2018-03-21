const fs = require('fs');
const path = require('path');
const _ = require('lodash');

const files = fs.readdirSync(__dirname);

function execute(fn) {
    try {
        fn.apply({});
        return true;
    } catch (e) {
        console.error(e);
    }
}

let passed = 0;
let failed = 0;
_(files)
    .filter(x => /^(?!index.js).+\.js$/.test(x))
    .map(x => require(`./${x}`))
    .filter(x => _.isObject)
    .map(x => _.toPairs(x))
    .flatMap()
    .forEach(kvp => {
        const { 0: test, 1: fn } = kvp;
        const result = execute(fn);
        console.log(`${test} - ${result ? '\x1b[0;32mPASS\x1b[0m' : '\x1b[0;31mFAIL\x1b[0m'}`);
        if (!result) {
            ++failed;
        } else {
            ++passed;
        }
    });

console.log();
const color = failed ? "\x1b[0;31m" : "\x1b[0;32m";
console.log(`${color}passed ${passed}/${passed + failed}\x1b[0m`)

process.exit(failed);

