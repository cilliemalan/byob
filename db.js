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
db.defaults({ blocks: {} }).write();


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
            p.height > c.height ? p : c,
            { height: -1 })
        .value();

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

    const block_object = {
        ...block
    };

    block_object.balances = calculate_running_balances(block_object);
    block_object.accounts = calculate_accounts(block_object);

    db.get('blocks').set(block_object.hash, block_object).write();
};

/**
 * Applies all the transactions of a block. Will return an object with
 * all the new balances. This function applies the accounting logic of the blockchain.
 * @param {*} block The block containing transactions to be processed
 * @param {*} parent_accounts All account balances of the parent block.
 * @returns {*} An object containing all the changed balances.
 */
const apply_block_transactions = (block, parent_accounts) => {
    const balances = { [block.author]: 0 };

    block.transactions.forEach(transaction => {
        let spread = 0;
        transaction.splits.forEach(({ account, amount }) => {
            spread -= amount;
            if (!balances[account]) {
                balances[account] = (parent_accounts[account] || 0) + amount;
            } else {
                balances[account] += amount;
            }
        });

        //spread is the transaction charge
        balances[block.author] += spread;
    });

    //apply the block reward for the author
    balances[block.author] += BLOCK_REWARD;

    //return changed balances
    return balances;
}

/**
 * Takes the block's parent block and calculates all the balances that are changed by
 * transactions in this block.
 * @param {*} block The block to calculate balances for
 */
const calculate_running_balances = (block) => {

    if (block.balances) {
        return block.balances;
    }

    let parent_accounts;
    if (block.height == 0) {
        parent_accounts = {};
    } else {
        const parent = db.get('blocks').get(block.parent).value();
        parent_accounts = calculate_accounts(parent);
    }

    const balances = apply_block_transactions(block, parent_accounts);

    return balances;
}

/**
 * Calculates all the new account balances (including parent accounts) after the transactions
 * in this block are applied.
 * @param {*} block The block to calculate new accounts for
 */
const calculate_accounts = (block) => {
    if (!block) {
        throw "Called calculate_accounts with no block";
    } else if (block.accounts) {
        return { ...block.accounts };
    } else {

        const parent = block.height != 0 && db.get('blocks').get(block.parent).value();
        const accounts = parent ? calculate_accounts(parent) : {}

        if (block.balances) {
            return { ...accounts, ...block.balances };
        } else {
            throw "found block that did not have running balances";
        }
    }
}


module.exports = {
    get_signer,
    add_key,
    get_keys,
    get_block_by_hash,
    get_highest_block,
    store_block
};