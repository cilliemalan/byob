const { ok, equal, notEqual, deepEqual } = require('assert');

const { encode, decode, hash, sign_hash, sign,
    verify_sig, verify,
    generate_key, get_public_key_from_private_key,
    abbreviate, calculate_target, generate_nonce,
    xor_buffers } = require('../utils');

const bequal = (a, b) => equal(a.toString(), b.toString());
const bnotEqual = (a, b) => notEqual(a.toString(), b.toString());

const key = generate_key();
const key2 = generate_key();
const pub = get_public_key_from_private_key(key);
const pub2 = get_public_key_from_private_key(key2);

module.exports = {
    'encode encodes an array as base64': () => ok(encode([1, 2, 3, 4])),
    'encode encodes a buffer as base64': () => ok(encode(Buffer.from([1, 2, 3, 4]))),
    'different things encode differently': () => notEqual(encode([1, 2, 3, 4]), encode([2, 3, 4, 5])),
    'decode decodes something': () => ok(decode('asdasd')),
    'decode decodes something into a buffer': () => ok(decode('asdasd') instanceof Buffer),
    'decode decodes something into something with length': () => ok(decode('asdasd').length),
    'decode can decode something encoded into what it once was': () => deepEqual([1, 2, 3, 4], decode(encode([1, 2, 3, 4]))),
    'encode can decode something that was once encoded': () => equal('theanswer-42', encode(decode(encode('theanswer-42')))),

    'hash hashes an object': () => ok(hash({ a: 1 })),
    'hash hashes an empty object': () => ok(hash({})),
    'hash always hashes the same': () => bequal(hash({ a: 2 }), hash({ a: 2 })),
    'hash of different things are different': () => bnotEqual(hash({ a: 3 }), hash({ a: 2 })),
    'hash does not care about order': () => bequal(hash({ a: 2, b: 3 }), hash({ b: 3, a: 2 })),
    'hash does care about null': () => bequal(hash({ a: 2, b: null }), hash({ b: null, a: 2 })),
    'hash does care about undefined': () => bequal(hash({ a: 2, b: undefined }), hash({ b: undefined, a: 2 })),
    'hash does not see null and undefined the same': () => bnotEqual(hash({ a: 2, b: undefined }), hash({ b: null, a: 2 })),
    'hash does not see props if asked': () => bequal(hash({ a: 2, zzz: 'abc' }, ['zzz']), hash({ a: 2, zzz: 'def' }, ['zzz'])),
    'hash does not see props if asked via regex': () => bequal(hash({ a: 2, dzzzc: 'abc' }, [/zzz/]), hash({ a: 2, azzzb: 'def' }, [/zzz/])),

    'sign adds a prop signature': () => ok(sign({ a: 2 }, key).signature),
    'sign adds a prop called signatures if multiple keys are given': () => ok(sign({ a: 2 }, [key, key2]).signatures),
    'sign adds a prop for each signature': () => equal(2, sign({ a: 2 }, [key, key2]).signatures.length),

    'verify can verify a correct signature': () => ok(verify(sign({ a: 1 }, key), pub)),
    'verify can verify an incorrect signature': () => ok(!verify(sign({ a: 1 }, key2), pub)),
    'verify can verify multiple correct signatures': () => ok(verify(sign({ a: 1 }, [key, key2]), [pub, pub2])),
    'verify can verify that signatures are missing': () => ok(!verify(sign({ a: 1 }, [key]), [pub, pub2])),
    'verify doesnt care if there are too many signatures': () => ok(verify(sign({ a: 1 }, [key, key2]), [pub])),
    'verify doesnt care if public key isn\'t given': () => ok(verify(sign({ a: 1, author: pub }, [key]))),
    'verify doesnt care if public keys aren\'t given': () => ok(verify(sign({ a: 1, authors: [pub, pub2] }, [key, key2]))),

    'can get a public key from a private key': () => ok(get_public_key_from_private_key(key)),
    'can get a valid public key from a private key': () => bequal(pub, get_public_key_from_private_key(key)),
    'can get a public key from gibberish': () => ok(get_public_key_from_private_key('gibberish')),
    'can get a valid public key from gibberish': () => ok(verify(sign({ a: 2 }, 'gibberish'), get_public_key_from_private_key('gibberish'))),

    'abbreviate squashes a pubkey': () => ok(abbreviate(pub)),
    'abbreviate squashes a hash': () => ok(abbreviate(key)),
    'abbreviate pubkey has length 10': () => equal(10, abbreviate(pub).length),
    'abbreviate hash has length 10': () => equal(10, abbreviate(key).length),

    'calculate_target divides the rate by time 1': () => bequal(calculate_target(256, 1), Buffer.from('00ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff', 'hex')),
    'calculate_target divides the rate by time 2': () => bequal(calculate_target(65536, 1), Buffer.from('0000ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff', 'hex')),

    'generate_nonce generates a nonce': () => ok(generate_nonce() instanceof Buffer),
    'generate_nonce generates a nonce that by default is 32 long': () => equal(32, generate_nonce().length),
    'generate_nonce generates a nonce that is the length of the arg': () => equal(5, generate_nonce(5).length),
    'generate_nonce generates unique nonces': () => bnotEqual(generate_nonce(), generate_nonce()),

    'xor_buffers generates an XOR of two buffers': () => equal(encode(xor_buffers(Buffer.from([1, 2, 3]), Buffer.from([5, 6, 7]))), encode(Buffer.from([1 ^ 5, 2 ^ 6, 3 ^ 7])))
};
