const { ok, equal, notEqual, deepEqual, throws } = require('assert');
const { isArray, isFunction } = require('util');

const { get_signer, add_key, get_keys } = require('../db');
const {
    generate_key,
    verify, encode,
    get_public_key_from_private_key
} = require('../utils');


const k = [generate_key(), generate_key(), generate_key()].map(encode);
const p = k.map(get_public_key_from_private_key).map(encode);


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
}