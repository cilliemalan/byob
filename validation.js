const { decode, verify, verify_sig, abbreviate } = require('./utils');
const _ = require('lodash');


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
const is_valid_private_key = (key) => {
    if (typeof key == "string") {
        return key.length == 43 &&
            is_valid_base64(key) && is_valid_private_key(decode(key));
    } else if (key instanceof Buffer) {
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
const is_valid_hash = (hash) => is_valid_private_key(hash);

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
    const { splits, signatures, signature, ...rest } = transaction;
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


module.exports = {
    is_valid_base64,
    is_valid_public_key,
    is_valid_private_key,
    is_valid_hash,
    validate_split,
    validate_transaction
};
