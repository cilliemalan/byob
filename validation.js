const { decode, verify, verify_sig, abbreviate } = require('./utils');
const _ = require('lodash');

const max_private_key = Buffer.from('FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364140', 'hex');

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
    if (typeof key == "string") {
        return key.length == 44 && key[0] == 'A' &&
            is_valid_base64(key) && is_valid_public_key(decode(key));
    } else if (key instanceof Buffer) {
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
const is_valid_hash = (buf) => {
    if (typeof buf == "string") {
        return buf.length == 43 &&
            is_valid_base64(buf) && is_valid_hash(decode(buf));
    } else if (buf instanceof Buffer) {
        return buf.length == 32;
    } else {
        return false;
    }
}

/**
 * Checks if something is a valid private key.
 * @param {*} s the thing to check.
 * @returns {boolean} true or false.
 */
const is_valid_private_key = (key) => is_valid_hash(key) && buffer_less_than(key, max_private_key);

/**
 * Checks if something is a valid split
 * @param {*} split 
 */
const validate_split = (split) => {
    const errors = [];
    const { account, amount, ...rest } = split;
    const restKeys = rest && Object.keys(rest);
    if (!account) errors.push("account is required");
    if (!amount) errors.push("An amount is required and cannot be zero");
    if (amount !== 0 && amount > -1e-15 && amount < 1e-15) errors.push("Amounts must be greater than 1E-15");
    if (account && !is_valid_public_key(account)) errors.push("account is not a valid public key");
    if (restKeys && restKeys.length) errors.push(`The split contained extra unsupported properties: ${restKeys.join(", ")}`);

    return errors;
}

/**
 * Checks if something is a valid transaction
 * @param {*} transaction 
 */
const validate_transaction = (transaction) => {
    const errors = [];
    const { splits, nonce, signatures, signature, ...rest } = transaction;
    if (!splits || !splits.length) {
        errors.push("A transaction must contain at least one split");
    }
    if (!signature && (!signatures || !signatures.length)) {
        errors.push("A transaction must be signed");
    }

    const restKeys = rest && Object.keys(rest);
    if (restKeys && restKeys.length) {
        errors.push(`The transaction contained extra unsupported properties: ${restKeys.join(", ")}`);
    }

    const split_errors = splits && splits
        .map(x => ({ split: x, errors: validate_split(x) }))
        .filter(x => x.errors.length > 0);
    if (split_errors && split_errors.length) {
        errors.push("There were problems with one or more splits");
        split_errors.map(se => `With split ${abbreviate(se.split.account)}/${se.split.amount} there were problems: ${se.errors.join(", ")}`)
            .forEach(x => errors.push(x));
    }

    const from_splits = (splits && splits.filter(x => x.amount < 0)) || [];
    const to_splits = (splits && splits.filter(x => x.amount > 0)) || [];
    const total_from = _.sumBy(from_splits, x => -x.amount);
    const total_to = _.sumBy(to_splits, x => x.amount);
    if (total_from < total_to) {
        errors.push(`The from amount ${total_from} is less than the to amount ${total_to}`);
    }
    if (total_from === total_to) {
        errors.push("No transaction charge was given. The debit and credit totals were equal");
    }

    const from_accounts = _(from_splits)
        .map(x => x.account)
        .uniq()
        .value();

    if (!verify(transaction, from_accounts)) {
        errors.push("The transaction was not signed with by each from account's private key");
    }

    return errors;
}


/**
 * Checks that the bytes from one buffer is less than the bytes from another.
 * @param {Buffer|string} a The one buffer. Returns true if this one is smaller or equal.
 * @param {Buffer|string} b The other buffer. Returns false if this one is smaller.
 */
const buffer_less_than = (a, b) => {
    if (typeof a == "string") a = decode(a);
    if (typeof b == "string") b = decode(b);

    if (a.length != b.length) {
        throw "both hash and target must have the same length";
    }

    const l = a.length;
    for (let i = 0; i < l; ++i) {
        if (a[i] > b[i]) return false;
        if (a[i] < b[i]) return true;
    }

    return true;
}


module.exports = {
    is_valid_base64,
    is_valid_public_key,
    is_valid_private_key,
    is_valid_hash,
    validate_split,
    validate_transaction,
    buffer_less_than
};
