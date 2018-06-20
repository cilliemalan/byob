const { ok, equal, notEqual, deepEqual, throws } = require('assert');

const { generate_nonce, calculate_target } = require('../src/utils');

const {
    create_block,
    hash_block,
    finalize_block
} = require('../src/blockchain');

module.exports = {

}