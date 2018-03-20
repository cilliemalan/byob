const { ok, equal, notEqual, deepEqual } = require('assert');

const { encode, decode, hash, sign_hash, sign,
    verify_sig, verify,
    generate_key, get_public_key_from_private_key,
    abbreviate } = require('../utils');

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
    'encode can decode something that was once encoded': () => () => equal('theanswer+42', encode(decode(encode('theanswer+42')))),

    'hash hashes an object': () => ok(hash({ a: 1 })),
    'hash hashes an empty object': () => ok(hash({})),
    'hash always hashes the same': () => bequal(hash({ a: 2 }), hash({ a: 2 })),
    'hash of different things are different': () => bnotEqual(hash({ a: 3 }), hash({ a: 2 })),
    'hash does not care about order': () => bequal(hash({ a: 2, b: 3 }), hash({ b: 3, a: 2 })),
    'hash does care about null': () => bequal(hash({ a: 2, b: null }), hash({ b: null, a: 2 })),
    'hash does care about undefined': () => bequal(hash({ a: 2, b: undefined }), hash({ b: undefined, a: 2 })),
    'hash does not see null and undefined the same': () => bnotEqual(hash({ a: 2, b: undefined }), hash({ b: null, a: 2 })),
    'hash does not see hash': () => bequal(hash({ a: 2, hash: 'abc' }), hash({ a: 2, hash: 'def' })),
    'hash does not see signature by default': () => bequal(hash({ a: 2, signature: 'abc' }), hash({ a: 2, signature: 'def' })),
    'hash does not see signatures by default': () => bequal(hash({ a: 2, signatures: ['abc'] }), hash({ a: 2, signatures: ['def'] })),
    'hash includes signature if asked': () => bnotEqual(hash({ a: 2, signature: 'abc' }, true), hash({ a: 2, signature: 'def' }, true)),
    'hash includes signatures if asked': () => bnotEqual(hash({ a: 2, signatures: ['abc'] }, true), hash({ a: 2, signatures: ['def'] }, true)),

    'sign adds a prop signature': () => ok(sign({ a: 2 }, key).signature),
    'sign adds a prop called signatures if multiple keys are given': () => ok(sign({ a: 2 }, [key, key2]).signatures),
    'sign adds a prop for each signature': () => equal(2, sign({ a: 2 }, [key, key2]).signatures.length),

    'verify can verify a correct signature': () => ok(verify(sign({ a: 1 }, key), pub)),
    'verify can verify an incorrect signature': () => ok(!verify(sign({ a: 1 }, key2), pub)),
    'verify can verify multiple correct signatures': () => ok(verify(sign({ a: 1 }, [key, key2]), [pub, pub2])),
    'verify can verify that signatures are missing': () => ok(!verify(sign({ a: 1 }, [key]), [pub, pub2])),
    'verify doesnt care if there are too many signatures': () => ok(verify(sign({ a: 1 }, [key, key2]), [pub])),

    'can get a public key from a private key': () => ok(get_public_key_from_private_key(key)),
    'can get a valid public key from a private key': () => bequal(pub, get_public_key_from_private_key(key)),
    'can get a public key from gibberish': () => ok(get_public_key_from_private_key('gibberish')),
    'can get a valid public key from gibberish': () => ok(verify(sign({ a: 2 }, 'gibberish'), get_public_key_from_private_key('gibberish'))),

    'abbreviate squashes a pubkey': () => ok(abbreviate(pub)),
    'abbreviate squashes a hash': () => ok(abbreviate(key)),
    'abbreviate pubkey has length 10': () => equal(10, abbreviate(pub).length),
    'abbreviate hash has length 10': () => equal(10, abbreviate(key).length),
};
