const { unlinkSync, existsSync, readdirSync } = require('fs');
const _ = require('lodash');

//prepare for db tests
const keys_file = `${__dirname}/_test_keys.json`,
    db_file = `${__dirname}/_test_db.json`;

process.env.BYOB_KEYS_FILE = keys_file;
process.env.BYOB_DB_FILE = db_file;
process.env.BYOB_TARGET = 'AEGJN0vGp--dsi0OVgQYk3S8an752yLQ5WBBiTdLxqc';

if (existsSync(keys_file)) unlinkSync(keys_file);
if (existsSync(db_file)) unlinkSync(db_file);

const files = readdirSync(__dirname);

function to_seconds(hrt) {
    return hrt[0], hrt[1] / 100000.0;
}

function execute(fn) {
    const start = process.hrtime();
    try {
        const promise = fn.apply({});
        if (promise instanceof Promise) {
            return promise.then(
                x => ({ result: true, duration: to_seconds(process.hrtime(start)) }),
                e => { console.error(e); return ({ result: false, duration: to_seconds(process.hrtime(start)) }); });
        } else {

            return Promise.resolve({ result: true, duration: to_seconds(process.hrtime(start)) });
        }
    } catch (e) {
        console.error(e);
        return Promise.resolve({ result: false, duration: to_seconds(process.hrtime(start)) });
    }
}

let passed = 0;
let failed = 0;

const _color = (code, message) => `\x1b[0;${code}m${message}\x1b[0m`

const _red = (message) => _color(31, message);
const _green = (message) => _color(32, message);

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
        process.stdout.write(`${test} - `);
        const { result, duration } = await execute(fn);
        const durationms = duration <= 500 ? `(${parseInt(duration)}ms)` : _red(`(${parseInt(duration)}ms)`);
        process.stdout.write(`${result ? _green('PASS') : _red('FAIL')} ${durationms}\n`);
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