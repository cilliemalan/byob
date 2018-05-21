const { ok, equal, notEqual, deepEqual, throws } = require('assert');
const { isArray, isFunction } = require('util');

const { get_signer, add_key, get_keys,
    get_block_by_hash, get_highest_block,
    store_block } = require('../db');
const { validate_block, is_block_solution_under_target } = require('../validation');
const {
    generate_key,
    verify, encode,
    sign,
    get_public_key_from_private_key
} = require('../utils');
const {
    hash_block
} = require('../blockchain');
const { solve } = require('../solver');
const { BLOCK_REWARD } = require('../configuration');


const k = [
    generate_key(), generate_key(), generate_key(),
    generate_key(), generate_key(), generate_key()].map(encode);
const p = k.map(get_public_key_from_private_key).map(encode);

const test_blocks = [];
const validate_and_load_test_blocks = (...blocks) => {

    const errors = [];
    const adderror = e => errors.push(e);

    blocks.forEach(block => validate_block(block).forEach(adderror));
    errors.forEach(e => console.log(e));

    equal(0, errors.length);
    blocks.forEach(block => ok(is_block_solution_under_target(block)));

    blocks.forEach(block => test_blocks.push(block));
}

module.exports = {
    'get_keys initially returns an array': () => ok(isArray(get_keys())),
    'get_keys initially returns an empty array': () => equal(0, get_keys().length),
    'add_key succeeds': () => add_key(k[0]),
    'get_keys now return 1 key': () => equal(1, get_keys().length),
    'get_keys now returns the added key': () => equal(p[0], get_keys()[0]),
    'get_signer returns a function for an existing key': () => ok(isFunction(get_signer(p[0]))),
    'get_signer throws for a nonexisting key': () => throws(() => get_signer(p[1]), /^Cannot sign for .+\. No corresponding private key is stored$/),
    'get_signer can sign an object': () => ok(get_signer(p[0])({}).signature),
    'get_signer signature can be verified': () => ok(verify(get_signer(p[0])({}), p[0])),
    'add_key succeeds if a key is already in the db': () => add_key(k[1]) || add_key(k[2]),
    'get_signer can sign an object with multiple keys': () => ok(get_signer(p[0], p[1])({}).signatures),
    'get_signer signatures can be verified when more than one is present': () => ok(verify(get_signer(p[0], p[1])({}), [p[0], p[1]])),
    'can build test blockchain': async () => {

        // create the test chain.
        // Note: default target is set very easy in test config.

        // summary:
        //    block0 signed by p0, no transactions
        //    block1 signed by p1, transactions from p0(0.5)                (charge: 0.01)
        //    block2 signed by p2, transactions from p0(0.5) and p1(1.0)    (charge: 0.02)
        //    block3 signed by p0, transactions from p2(1.0)                (charge: 0.01)
        //    block4 signed by p1, transactions from p0(1.0)                (charge: 0.01)

        const
            transaction1 = sign({
                splits: [
                    { account: p[0], amount: -0.5 },
                    { account: p[1], amount: 0.245 },
                    { account: p[2], amount: 0.245 }]
            }, k[0]),
            transaction2 = sign({
                splits: [
                    { account: p[0], amount: -0.5 },
                    { account: p[1], amount: 0.245 },
                    { account: p[2], amount: 0.245 }]
            }, k[0]),
            transaction3 = sign({
                splits: [
                    { account: p[1], amount: -1.00 },
                    { account: p[0], amount: 0.495 },
                    { account: p[2], amount: 0.495 }]
            }, k[1]),
            transaction4 = sign({
                splits: [
                    { account: p[2], amount: -1.00 },
                    { account: p[0], amount: 0.495 },
                    { account: p[1], amount: 0.495 }]
            }, k[2]),
            transaction5 = sign({
                splits: [
                    { account: p[0], amount: -1.00 },
                    { account: p[1], amount: 0.495 },
                    { account: p[2], amount: 0.495 }]
            }, k[0]),
            unsolved0 = hash_block({
                transactions: [],
                height: 0,
                author: p[0]
            }),
            unsolved1 = hash_block({
                transactions: [transaction1],
                height: 1,
                parent: unsolved0.hash,
                author: p[1]
            }),
            unsolved2 = hash_block({
                transactions: [transaction2, transaction3],
                height: 2,
                parent: unsolved1.hash,
                author: p[2]
            }),
            unsolved3 = hash_block({
                transactions: [transaction4],
                height: 3,
                parent: unsolved2.hash,
                author: p[0]
            }),
            unsolved4 = hash_block({
                transactions: [transaction5],
                height: 4,
                parent: unsolved3.hash,
                author: p[1]
            }),
            solved0 = {
                compliment: encode(await solve(unsolved0.hash)),
                ...unsolved0
            },
            solved1 = {
                compliment: encode(await solve(unsolved1.hash)),
                ...unsolved1
            },
            solved2 = {
                compliment: encode(await solve(unsolved2.hash)),
                ...unsolved2
            },
            solved3 = {
                compliment: encode(await solve(unsolved3.hash)),
                ...unsolved3
            },
            solved4 = {
                compliment: encode(await solve(unsolved4.hash)),
                ...unsolved4
            },
            signed0 = sign(solved0, k[0]),
            signed1 = sign(solved1, k[1]),
            signed2 = sign(solved2, k[2]),
            signed3 = sign(solved3, k[0]),
            signed4 = sign(solved4, k[1]);

        validate_and_load_test_blocks(signed0, signed1, signed2, signed3, signed4);
    },
    'store_block will store the initial block': () => store_block(test_blocks[0]),
    'get_block_by_hash retrieves the initial block': () => ok(get_block_by_hash(test_blocks[0].hash)),
    'get_block_by_hash retrieves the initial block and it has the same hash': () => equal(test_blocks[0].hash, get_block_by_hash(test_blocks[0].hash).hash),
    'get_highest_block retrieves the first block': () => equal(test_blocks[0].hash, get_highest_block().hash),
    'store_block stores the initial block, and it has running balances': () => ok(get_block_by_hash(test_blocks[0].hash).balances),
    'store_block stores the initial block, and it has accounts': () => ok(get_block_by_hash(test_blocks[0].hash).accounts),
    'store_block stores the author\'s block reward as a balance (1st)': () => equal(BLOCK_REWARD, get_block_by_hash(test_blocks[0].hash).balances[test_blocks[0].author]),
    'store_block stores the author\'s block reward as an account (1st)': () => equal(BLOCK_REWARD, get_block_by_hash(test_blocks[0].hash).accounts[test_blocks[0].author]),
    'store_block stores only one balance in the first block': () => equal(1, Object.keys(get_block_by_hash(test_blocks[0].hash).balances).length),
    'store_block stores only one account in the first block': () => equal(1, Object.keys(get_block_by_hash(test_blocks[0].hash).accounts).length),
    'store_block will store the second block': () => store_block(test_blocks[1]),
    'get_block_by_hash retrieves the second block': () => ok(get_block_by_hash(test_blocks[1].hash)),
    'get_highest_block retrieves the second block': () => equal(test_blocks[1].hash, get_highest_block().hash),
    'store_block will store the third block': () => store_block(test_blocks[2]),
    'get_block_by_hash retrieves the third block': () => ok(get_block_by_hash(test_blocks[2].hash)),
    'get_highest_block retrieves the third block': () => equal(test_blocks[2].hash, get_highest_block().hash),
    'store_block will store the fourth block': () => store_block(test_blocks[3]),
    'get_block_by_hash retrieves the fourth block': () => ok(get_block_by_hash(test_blocks[3].hash)),
    'get_highest_block retrieves the fourth block': () => equal(test_blocks[3].hash, get_highest_block().hash),
    'store_block will store the fifth block': () => store_block(test_blocks[4]),
    'get_block_by_hash retrieves the fifth block': () => ok(get_block_by_hash(test_blocks[4].hash)),
    'get_highest_block retrieves the fifth block': () => equal(test_blocks[4].hash, get_highest_block().hash),
    'can add a new block at height 3': async () => {
        const
            unsolved5 = hash_block({
                transactions: [],
                height: 3,
                author: p[3],
                parent: test_blocks[2].hash,
            }),
            solved5 = {
                compliment: encode(await solve(unsolved5.hash)),
                ...unsolved5
            },
            signed5 = sign(solved5, k[3]);

        validate_and_load_test_blocks(signed5);
    },
    'store_block will store the sixth block': () => store_block(test_blocks[5]),
    'get_block_by_hash retrieves the sixth block': () => ok(get_block_by_hash(test_blocks[5].hash)),
    'get_highest_block still retrieves the fifth block': () => equal(test_blocks[4].hash, get_highest_block().hash),
    'can add a new block at height 4 and 5': async () => {
        const
            unsolved6 = hash_block({
                transactions: [],
                height: 4,
                author: p[3],
                parent: test_blocks[5].hash,
            }),
            unsolved7 = hash_block({
                transactions: [],
                height: 5,
                author: p[3],
                parent: unsolved6.hash,
            }),
            solved6 = {
                compliment: encode(await solve(unsolved6.hash)),
                ...unsolved6
            },
            solved7 = {
                compliment: encode(await solve(unsolved7.hash)),
                ...unsolved7
            },
            signed6 = sign(solved6, k[3]),
            signed7 = sign(solved7, k[3]);

        validate_and_load_test_blocks(signed6, signed7);
    },
    'store_block will store the seventh block': () => store_block(test_blocks[6]),
    'store_block will store the eighth block': () => store_block(test_blocks[7]),
    'get_block_by_hash retrieves the seventh block': () => ok(get_block_by_hash(test_blocks[6].hash)),
    'get_block_by_hash retrieves the eighth block': () => ok(get_block_by_hash(test_blocks[7].hash)),
    'get_highest_block now retrieves the eighth block': () => equal(test_blocks[7].hash, get_highest_block().hash),

    'store_block fails if nonzero height with no parent': () => throws(() => store_block({ ...test_blocks[0], height: 4 })),
    'store_block fails if parent does not exist': () => throws(() => store_block({ ...test_blocks[2], parent: 'blahblahblah' })),
    'store_block fails if height is invalid': () => throws(() => store_block({ ...test_blocks[2], height: 99 })),
}
