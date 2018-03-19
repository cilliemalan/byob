const { decode, verify } = require('./utils');


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



module.exports = {
    is_valid_base64,
    is_valid_public_key,
    is_valid_private_key,
    is_valid_hash,
    validate_split
};
