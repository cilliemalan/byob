const { encode, hash } = require('./utils');
const { validate_block } = require('./validation');

const validate_throw = (wut, validate, message) => {
    const errors = validate(wut);
    if (errors.length) {
        throw [message, errors.join(". ")].join(" ");
    }
}

/**
 * Initializes a block. The block will be valid but the compliment will be incorrect. In order
 * to accept this block in a blockchain a compliment will need to be chosen that satisfies
 * the PoW requirements, and the block signed.
 * @param {Array} transactions The transactions to include in the block
 * @param {Number} height The height of this block. Must be parent block + 1
 * @param {string|Buffer} parent The parent block hash
 * @param {string|Buffer} private_key The private key with which to sign this blockchain
 * @returns {Object} an initialized, valid block with incorrect compliment.
 */
const create_block = (transactions, height, parent, author) => {
    if (parent instanceof Buffer) parent = encode(parent);
    if (author instanceof Buffer) author = encode(author);
    const block = hash_block({
        compliment: encode(Buffer.alloc(32, 0)),
        transactions,
        height,
        parent,
        author,
    });
    validate_throw(block, validate_block);
    return block;
}

/**
 * Finalize a block, including the compliment and signature.
 * @param {*} block The block to finalize and sign.
 * @param {*} compliment The complicment to include in the block.
 * @param {*} signer A function that will sign the block.
 */
const finalize_block = (block, compliment, signer) => {
    if (compliment instanceof Buffer) compliment = encode(compliment);

    return signer({
        ...block,
        compliment
    });
}

/**
 * Calculates the hash for a block using the special hash config that excludes the
 * props signature, hash, and compliment props. The result will be the block including
 * the hash property.
 * @param {*} block The block to hash
 */
const hash_block = (block) => ({
    ...block,
    hash: encode(hash(block, ['signature', 'hash', 'compliment']))
});

module.exports = {
    create_block,
    hash_block,
    finalize_block
};