const {
    sign,
    encode,
    decode,
    get_public_key_from_private_key,
    hash } = require('./utils');
const { validate_block, validate_transaction, validate_split } = require('./validation');

const TARGET = decode(require('./configuration').TARGET);

const validate_throw = (wut, validate, message) => {
    const errors = validate(wut);
    if (errors.length) {
        throw [message, errors.join(". ")].join(" ");
    }
}

/**
 * Creates a transaction split. A split represents the movement of
 * funds from one account to another. fromAmount and toAmound may
 * differ in which case the difference is considered the transaction
 * charge.
 * @param {string} account The account to debit/credit.
 * @param {string} amount The amount. Positive is debit. Negative is credit.
 */
const create_split = (account, amount) => {
    const split = { account, amount };
    validate_throw(split, validate_split);
    return split;
};

/**
 * Creates a transaction. A transaction consists of one or more splits.
 * The keys for all the splits with negative (credit) amounts
 * @param {*} splits The splits to include in the transaction.
 * @param {*} keys The keys for all the negative splits.
 */
const create_transaction = (splits, keys) => {
    if (typeof splits != "array") throw "splits must be an array";
    if (splits.length == 0) throw "must have at least one split";
    const transaction = sign({ splits }, keys);
    validate_throw(transaction, validate_transaction);
    return transaction;
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
        compliment: encode(new Buffer(32)),
        transactions,
        height,
        parent,
        author,
    });
    validate_throw(block, validate_block);
    return block;
}

/**
 * Recreates a block using a new set of transactions.
 * @param {*} block The block to replace the transactions of.
 * @param {*} transactions The new set of transactions.
 */
const recreate_block = (block, transactions) => {
    const { height, parent, author } = block;
    return create_block(transactions, height, parent, author);
}

/**
 * Finalize a block, including the compliment and signature.
 * @param {*} block The block to finalize and sign.
 * @param {*} private_key The private key to sign with.
 * @param {*} compliment The complicment to include in the block
 */
const finalize_block = (block, private_key, compliment) => {
    const author = encode(get_public_key_from_private_key(private_key));
    block = sign({
        ...block,
        author,
        compliment
    }, private_key);
}

/**
 * Calculates the hash for a block using the special hash config that excludes the
 * props signature, hash, and compliment props. The result will be the block including
 * the hash property.
 * @param {*} block The block to hash
 */
const hash_block = (block) => ({
    ...block,
    hash: encode(hash(block, ['signature', 'hash', 'compliment', 'accounts']))
});

module.exports = {
    create_split,
    create_transaction,
    create_block,
    hash_block
};