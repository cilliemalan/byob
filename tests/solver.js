const { ok, equal, notEqual, deepEqual } = require('assert');

const { generate_nonce, calculate_target } = require('../utils');
const { solve } = require('../solver');

module.exports = {
    'solver can solve an easy problem quickly': async () => ok(await solve(generate_nonce(), calculate_target(1000, 1))),
}