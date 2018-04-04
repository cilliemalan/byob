const { ok, equal, notEqual, deepEqual, throws } = require('assert');
const { isArray, isFunction } = require('util');

const { get_signer, add_key, get_keys } = require('../db');
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


const k = [
    generate_key(), generate_key(), generate_key(),
    generate_key(), generate_key(), generate_key()].map(encode);
const p = k.map(get_public_key_from_private_key).map(encode);

const test_blocks = [];

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

        const errors = [];
        const adderror = e => errors.push(e);

        validate_block(signed0).forEach(adderror);
        validate_block(signed1).forEach(adderror);
        validate_block(signed2).forEach(adderror);
        validate_block(signed3).forEach(adderror);
        validate_block(signed4).forEach(adderror);
        errors.forEach(e => console.log(e));

        equal(0, errors.length);
        ok(is_block_solution_under_target(signed0));
        ok(is_block_solution_under_target(signed1));
        ok(is_block_solution_under_target(signed2));
        ok(is_block_solution_under_target(signed3));
        ok(is_block_solution_under_target(signed4));

        test_blocks.push(signed0);
        test_blocks.push(signed1);
        test_blocks.push(signed2);
        test_blocks.push(signed3);
        test_blocks.push(signed4);
    }
}