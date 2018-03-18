const objecthash = require('object-hash');
const { createHash } = require('crypto');
const elliptic = require("elliptic");
const { isArray } = require('util');

const secp256k1 = new elliptic.ec('secp256k1');

/**
 * Turns base64 into base64url.
 * @param {string} base64 the thing to tweak
 */
const base64url = (base64) => base64.replace(/\+|\/|=/gi, (m) => m == '+' ? '-' : m == '/' ? '_' : '');

/**
 * Turns an array or buffer into base64.
 * @param {string|Buffer} wut The thing to encode.
 * @returns {string} an encoded representation of wut.
 */
const encode = (wut, encoding) => {
    if (isArray(wut)) wut = Buffer.from(wut);

    return base64url(wut.toString('base64'));
}

/**
 * Turns base64 into a buffer.
 * @param {string} encoded The encoded string.
 * @returns {Buffer} The data in the encoded string.
 */
const decode = (encoded) => Buffer.from(encoded, 'base64');

/**
 * hashes an object. Will not include a prop called "signature" if
 * it exists.
 * @param {object} wut The thing to hash.
 * @returns {Buffer} The hash of the object.
 */
const hash = (wut) => {
    if (typeof wut != "object") {
        throw "this method only hashes objects";
    }

    // strip signature
    if (wut.signature) {
        wut = { ...wut };
        delete wut.signature;
    }

    const hashed = objecthash(wut, { algorithm: 'sha256', encoding: 'base64' });
    return Buffer.from(hashed, 'base64');
}

/**
 * Signs a hash with a private key and returns the signature as a Buffer.
 * @param {string|Buffer} hash The hash to sign.
 * @param {string|Buffer} key The private key to sign with.
 * @returns {Buffer} The signature.
 */
const sign_hash = (hash, key) => {
    if (typeof key == "string") key = decode(key);
    if (typeof hash == "string") hash = decode(hash);

    const privkey = secp256k1.keyFromPrivate(key);
    const sig = privkey.sign(hash);
    return Buffer.from(sig.toDER());
}

/**
 * Signs an object and returns a new object with the signature
 * embedded.
 * @param {object} wut The thing to sign.
 * @param {*} key the private key to sign with.
 * @returns {object} a new object exactly like wut but with a signature.
 */
const sign = (wut, key) => {
    // strip signature from wut if it exists
    if (wut.signature) {
        wut = { ...wut };
        delete wut.signature;
    }
    const objecthash = hash(wut);
    const signature = encode(sign_hash(objecthash, key));
    return { ...wut, signature };
}

/**
 * Checks a signature of a hash against a pubkey
 * @param {string|Buffer} hash the Hash of the data.
 * @param {string|Buffer} signature the signature to check.
 * @param {string|Buffer} pubkey the public key to check against.
 * @returns {boolean} true if the signature is valid, false otherwise.
 */
const verify_sig = (hash, signature, pubkey) => {
    if (typeof pubkey == "string") pubkey = decode(pubkey);
    if (typeof signature == "string") signature = decode(signature);
    if (typeof hash == "string") signature = decode(hash);

    key = secp256k1.keyFromPublic(pubkey);
    return key.verify(hash, signature)
}

/**
 * Checks the signature of an object.
 * @param {object} wut The object to verify. Must have a prop called signature.
 * @param {string|Buffer} pubkey the public key to check.
 * @returns {boolean} true if the signature is valid, false otherwise.
 */
const verify = (wut, pubkey) => {
    if (typeof wut != "object") {
        throw "wut must be an object";
    }

    if (!wut.signature) {
        throw "wut must have a signature";
    }

    return verify_sig(hash(wut), wut.signature, pubkey);
}

/**
 * Generates a private key
 * @returns {Buffer} The private key.
 */
const generate_key = () => {
    return secp256k1.genKeyPair().getPrivate().toBuffer();
}

/**
 * Gets the public key corresponding to a private key.
 * @param {string|Buffer} key The private key.
 * @returns {Buffer} The public key.
 */
const get_public_key_from_private_key = (key) => {
    if (typeof key == "string") key = decode(key);
    const keypair = secp256k1.keyFromPrivate(key);
    const pub = keypair.getPublic();
    return Buffer.from(pub.encode('array', true));
}

/**
 * Checks if a string is valid base64.
 * @param {*} s the string to check.
 * @returns {boolean} true or false.
 */
const is_valid_base64 = (s) => {
    return typeof s == "string" && (s == "" || /[-a-zA-Z0-9_+/]/.test(s));
}

/**
 * Checks if something is a valid public key.
 * @param {*} s the thing to check.
 * @returns {boolean} true or false.
 */
const is_valid_public_key = (key) => {
    if(typeof key == "string") {
        return key.length == 44 && key[0] == 'A' &&
            isValidBase64(key) && isValidPublicKey(decode(key));
    } else if(key instanceof Buffer) {
        return key.length == 33 && (key[0] == 2 || key[0] == 3);
    } else {
        return false;
    }
}

/**
 * Checks if something is a valid private key.
 * @param {*} s the thing to check.
 * @returns {boolean} true or false.
 */
const is_valid_private_key = (key) => {
    if(typeof key == "string") {
        return key.length == 43 && 
        isValidBase64(key) && isValidPrivateKey(decode(key));
    } else if(key instanceof Buffer) {
        return key.length == 32;
    } else {
        return false;
    }
}

/**
 * Checks if something is a valid private key.
 * @param {*} s the thing to check.
 * @returns {boolean} true or false.
 */
const is_valid_hash = (hash) => isValidPrivateKey(hash);

module.exports = {
    encode,
    decode,
    hash,
    sign_hash,
    sign,
    verify_sig,
    verify,
    generate_key,
    get_public_key_from_private_key,

    is_valid_base64,
    is_valid_public_key,
    is_valid_private_key,
    is_valid_hash
};
