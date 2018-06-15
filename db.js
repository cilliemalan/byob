const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
const { chmodSync } = require('fs');

const { KEYS_FILE, DB_FILE, BLOCK_REWARD } = require('./configuration');
const { get_public_key_from_private_key, encode, abbreviate, sign } = require('./utils');

// create/load dbs
const keys_db = low(new FileSync(KEYS_FILE));
chmodSync(KEYS_FILE, 0o600);
const db = low(new FileSync(DB_FILE));
chmodSync(DB_FILE, 0o600);
keys_db.defaults({ keys: {} }).write();
db.defaults({ blocks: {}, accounts: {} }).write();


// key related stuff

/**
 * Gets all public keys that we have a corresponding private key for.
 * @returns {string[]} the encoded public keys.
 */
const get_keys = () =>
    keys_db.get('keys').keys().value();

/**
 * Add a private key to the keys database.
 * @param {string|Buffer} private_key The private key to store.
 */
const add_key = (private_key) => {
    keys_db.get('keys')
        .set(
            encode(get_public_key_from_private_key(private_key)),
            encode(private_key))
        .write();
}

/**
 * Creates a function that can be used to sign an object with the private key or keys
 * corresponding to the given public key or keys.
 * @param {string[]|Buffer[]} pubkeys The public key or keys to sign with.
 */
const get_signer = (...pubkeys) => {
    const private_keys = pubkeys.map(x => x instanceof Buffer ? encode(x) : x)
        .map(p => {
            const pk = keys_db.get('keys').get(p).value();
            if (!pk) {
                throw `Cannot sign for ${abbreviate(p)}. No corresponding private key is stored`;
            }

            return pk;
        });

    return (wut) => sign(wut, private_keys);
};

// block related stuff
const get_block_by_hash = (hash) =>
    db.get('blocks').get(hash).value()

const get_highest_block = () =>
    db.get('blocks')
        .reduce((p, c) =>
            p ? (p.height > c.height ? p : c) : c)
        .value();

/**
 * Returns all blocks that do not have children.
 */
const get_leaf_blocks = () => {
    const all_parents = db.get('blocks')
        .map(block => block.parent)
        .filter(hash => hash)
        .uniq()
        .value();
    const leaf_blocks = db.get('blocks')
        .filter(block => all_parents.indexOf(block.hash) == -1)
        .value();
    return leaf_blocks;
}

/**
 * Stores a block on the blockchain. The block needs to already have been validated.
 * If the block is the tallest block in the chain it will be considered, henceforth, to
 * be the authoritative block.
 * @param {*} block The block to store
 */
const store_block = (block) => {

    // some checks to make 200% sure
    if (!block.parent) {
        if (block.height != 0) {
            throw "invalid block has no parent with nonzero height";
        }
    } else {
        const parent = db.get('blocks').get(block.parent).value();
        if (!parent) {
            throw "could not find block parent";
        } else if (block.height != parent.height + 1) {
            throw "invalid block height. Height was not one more than parent";
        }
    }

    db.get('blocks').set(block.hash, block).write();
};

/**
 * Removes a block by its hash. Will also remove any descendent blocks.
 * @param {*} hash 
 */
const remove_block_by_hash = (hash) => {
    const find_children = (hashes) =>
        db.get('blocks')
            .filter(block => block.parent && hashes.indexOf(block.parent) != -1)
            .map(block => block.hash)
            .value();


    // returns the blocks array with its children
    const with_children = (hashes) => {
        if (!hashes || !hashes.length) {
            return [];
        } else {
            const children = find_children(hashes);
            const including = [...hashes, ...with_children(children)];
            return including;
        }
    }

    const find_descendents = (hashes) =>
        with_children(hashes);

    const all_descendents = find_descendents([hash]);

    let removing = db.get('blocks');
    all_descendents.forEach(hash => removing.unset(hash).write());
}

/**
 * Stores the account balances as ancilliary information that
 * goes side-by-side with the block chain.
 * @param {*} hash The block hash to store accounts for.
 * @param {*} accounts The accounts object to store.
 */
const store_accounts = (hash, accounts) => {
    db.get('accounts').set(hash, accounts).write();
}

/**
 * Retrieves the accounts calculated for a block in the blockchain.
 * @param {*} hash The hash of the block to retrieve accounts for.
 */
const get_accounts = (hash) =>
    db.get('accounts').get(hash).value();


module.exports = {
    get_signer,
    add_key,
    get_keys,
    get_block_by_hash,
    get_highest_block,
    get_leaf_blocks,
    store_block,
    remove_block_by_hash,
    store_accounts,
    get_accounts
};