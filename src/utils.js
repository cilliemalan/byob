const objecthash = require("object-hash");
const { randomBytes } = require("crypto");
const elliptic = require("elliptic");
const { isArray } = require("util");
const _ = require("lodash");
const bigInt = require("big-integer");

const secp256k1 = new elliptic.ec("secp256k1");

/**
 * Turns base64 into base64url.
 * @param {string} base64 the thing to tweak
 */
const base64url = base64 =>
  base64.replace(/\+|\/|=/gi, m => (m == "+" ? "-" : m == "/" ? "_" : ""));

/**
 * Turns an array or buffer into base64.
 * @param {string|Buffer} wut The thing to encode.
 * @returns {string} an encoded representation of wut.
 */
const encode = wut => {
  if (isArray(wut)) wut = Buffer.from(wut);

  return base64url(wut.toString("base64"));
};

/**
 * Turns base64 into a buffer.
 * @param {string} encoded The encoded string.
 * @returns {Buffer} The data in the encoded string.
 */
const decode = encoded => Buffer.from(encoded, "base64");

/**
 * hashes an object. Will by default not include a prop called "signature" if
 * it exists.
 * @param {object} wut The thing to hash.
 * @param {Array<string|RegExp>} exclude_props An array of regex/string when matched to
 * prop name to exclude from hash calculation. By default includes all props
 * @returns {Buffer} The hash of the object.
 */
const hash = (wut, exclude_props = []) => {
  if (typeof wut != "object") {
    throw "this method only hashes objects";
  }

  // strip to be excluded props
  const tohash = { ...wut };
  const keys = Object.keys(tohash);

  // remove undefined keys
  keys.forEach(key => {
    if (typeof tohash[key] == "undefined") {
      delete tohash[key];
    }
  });

  // remove to-be-excluded keys
  exclude_props.forEach(to_exclude => {
    if (_.isRegExp(to_exclude)) {
      keys.filter(x => to_exclude.test(x)).forEach(x => delete tohash[x]);
    } else if (typeof to_exclude == "string") {
      keys.filter(x => to_exclude == x).forEach(x => delete tohash[x]);
    }
  });

  return objecthash(tohash, { algorithm: "sha256", encoding: "buffer" });
};

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
};

/**
 * Signs an object and returns a new object with the signature
 * embedded.
 * @param {object} wut The thing to sign.
 * @param {string|string[]} keys the private key or keys to sign with.
 * @returns {object} a new object exactly like wut but with a signature.
 */
const sign = (wut, keys) => {
  if (!isArray(keys)) keys = [keys];
  if (!keys.length) throw "must specify at least one key";

  // strip signature from wut if it exists
  wut = { ...wut };
  delete wut.signature;
  delete wut.signatures;

  const objecthash = hash(wut, []);
  const signatures = keys.map(key => encode(sign_hash(objecthash, key)));

  const result =
    signatures.length > 1
      ? { ...wut, signatures }
      : { ...wut, signature: signatures[0] };

  return result;
};

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
  if (typeof hash == "string") hash = decode(hash);

  key = secp256k1.keyFromPublic(pubkey);
  return key.verify(hash, signature);
};

/**
 * Checks the signature of an object.
 * @param {object} wut The object to verify. Must have a prop called signature or signatures.
 * @param {string|Buffer|string[]|Buffer[]} pubkeys the public key or keys to check.
 * If not specified will check author(s) prop
 * @returns {boolean} true if the signature is valid, false otherwise.
 */
const verify = (wut, pubkeys) => {
  if (typeof wut != "object") {
    throw "wut must be an object";
  }

  if (!wut.signature && !(wut.signatures && wut.signatures.length)) {
    return false;
  }

  const object_hash = hash(wut, [/^signatures?$/]);
  const signatures = wut.signatures || [wut.signature];
  if (pubkeys === undefined) pubkeys = wut.author || wut.authors;
  const keys = isArray(pubkeys) ? pubkeys : [pubkeys];
  const all_valid =
    keys.filter(
      key =>
        !!signatures.filter(sig => verify_sig(object_hash, sig, key)).length
    ).length == keys.length;

  return all_valid;
};

/**
 * Generates a private key
 * @returns {Buffer} The private key.
 */
const generate_key = () => {
  return secp256k1
    .genKeyPair()
    .getPrivate()
    .toBuffer();
};

/**
 * Gets the public key corresponding to a private key.
 * @param {string|Buffer} key The private key.
 * @returns {Buffer} The public key.
 */
const get_public_key_from_private_key = key => {
  if (typeof key == "string") key = decode(key);
  const keypair = secp256k1.keyFromPrivate(key);
  const pub = keypair.getPublic();
  return Buffer.from(pub.encode("array", true));
};

/**
 * Abbreviates a public key or hash
 * @param {string|Buffer} hash the thing to abbreviate. Either pubkey or hash.
 */
const abbreviate = hash => {
  if (!hash) return "<na>";

  if (hash instanceof Buffer) hash = encode(hash);
  if (typeof hash != "string") {
    throw "hash must be a string or buffer";
  }

  if (hash.length <= 43) {
    return `${hash.substring(0, 10)}`;
  } else if (hash.length >= 44) {
    return `${hash.substring(0, 4)}..${hash.substring(
      hash.length - 4,
      hash.length
    )}`;
  }
};

/**
 * Calculates the hash target. Given a hash rate in hash per X and the
 * number of X to target, will return the target that will on average
 * reach this target.
 * @param {number|string} hash_rate the hash rate in hash/X (e.g. hash/sec). Must be integer.
 * @param {number|string} target_time the target time in X (e.g. nr of sec if hash rate given in hash/sec). Must be integer.
 * @returns {Buffer} the target as a 256 bit buffer
 */
const calculate_target = (hash_rate, target_time) => {
  const bhr = bigInt(hash_rate);
  const btt = bigInt(target_time);
  const maxh = bigInt(
    "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff",
    16
  );
  const tgt = maxh.divide(btt).divide(bhr);
  const tgts = tgt.toString(16);
  const tgtp = `${"0".repeat(64 - tgts.length)}${tgts}`;
  return Buffer.from(tgtp, "hex");
};

/**
 * Generates a nonce with a default length of 32 bytes. Returns a buffer.
 * @param {string} length
 * @returns {Buffer} a buffer filled with randomness
 */
const generate_nonce = (length = 32) => randomBytes(length);

/**
 * Checks that the bytes from one buffer is less than or equal to the bytes from another.
 * @param {Buffer|string} a The one buffer. Returns true if this one is smaller or equal.
 * @param {Buffer|string} b The other buffer. Returns false if this one is smaller.
 */
const buffer_less_than = (a, b) => {
  if (typeof a == "string") a = decode(a);
  if (typeof b == "string") b = decode(b);

  if (a.length != b.length) {
    throw "both hash and target must have the same length";
  }

  return a <= b;
};

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
  abbreviate,
  calculate_target,
  generate_nonce,
  buffer_less_than
};
