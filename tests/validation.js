const { ok, equal, notEqual, deepEqual } = require('assert');

const contains = (a, b) => ok(a.filter(x => x == b).length);
const notContains = (a, b) => ok(!a.filter(x => x == b).length);

const { encode, decode, hash, sign_hash, sign,
    verify_sig, verify,
    generate_key, get_public_key_from_private_key } = require('../utils');

const {
    is_valid_base64,
    is_valid_public_key,
    is_valid_private_key,
    is_valid_hash,
    validate_split,
    validate_transaction } = require('../validation');

const k = [generate_key(), generate_key(), generate_key()].map(encode);
const p = k.map(get_public_key_from_private_key).map(encode);

const
    transaction1 = sign({
        splits: [
            { account: p[0], amount: -1.01 },
            { account: p[1], amount: 1 }]
    }, k[0]),
    transaction2 = sign({
        splits: [
            { account: p[1], amount: -1.005 },
            { account: p[2], amount: -1.005 },
            { account: p[0], amount: 2 }]
    }, [k[1], k[2]]),
    transaction3 = sign({
        splits: [
            { account: p[2], amount: -2.01 },
            { account: p[1], amount: 1 },
            { account: p[0], amount: 1 }]
    }, k[2]);

module.exports = {
    'is_valid_base64 valid for valid base64': () => ok(is_valid_base64('blahdiblah')),
    'is_valid_base64 not valid for invalid base64': () => ok(!is_valid_base64('%(*^$^')),
    'is_valid_public_key valid': () => ok(is_valid_public_key('AmidWK-6LWDvH0ljhWZ7_Qzw3533OkUs_Uz9_IQjocbb')),
    'is_valid_public_key not valid length != 44': () => ok(!is_valid_public_key('A')),
    'is_valid_public_key not valid not starts with A': () => ok(!is_valid_public_key('BmidWK-6LWDvH0ljhWZ7_Qzw3533OkUs_Uz9_IQjocbb')),
    'is_valid_public_key not valid not base64': () => ok(!is_valid_public_key('BmidWK#6LWDvH0ljhWZ7_Qzw3533OkUs_Uz9_IQjocbb')),
    'is_valid_public_key valid buffer': () => ok(is_valid_public_key(Buffer.from('AmidWK-6LWDvH0ljhWZ7_Qzw3533OkUs_Uz9_IQjocbb', 'base64'))),
    'is_valid_public_key not valid length wrong': () => ok(!is_valid_public_key(Buffer.from('AmidWK6LWDvH0ljhWZ7_Qzw3533OkUs_Uz9_IQjocbb', 'base64'))),

    'is_valid_hash valid': () => ok(is_valid_private_key('2o_57mhaLjzkp4Pnr0xk_JCb7-Ehs3NzN73gjohOr2s')),
    'is_valid_hash not valid for invalid base64': () => ok(!is_valid_private_key('2o#57mhaLjzkp4Pnr0xk_JCb7-Ehs3NzN73gjohOr2s')),
    'is_valid_hash not valid for bad length': () => ok(!is_valid_private_key('2o_57mhaLjzkp4Pnr0xk_JCb7-Ehs3NzN73gjo')),
    'is_valid_hash valid for buffer': () => ok(is_valid_private_key(Buffer.from('2o_57mhaLjzkp4Pnr0xk_JCb7-Ehs3NzN73gjohOr2s', 'base64'))),

    'is_valid_private_key valid': () => ok(is_valid_private_key('2o_57mhaLjzkp4Pnr0xk_JCb7-Ehs3NzN73gjohOr2s')),
    'is_valid_private_key not valid for invalid base64': () => ok(!is_valid_private_key('2o#57mhaLjzkp4Pnr0xk_JCb7-Ehs3NzN73gjohOr2s')),
    'is_valid_private_key not valid for bad length': () => ok(!is_valid_private_key('2o_57mhaLjzkp4Pnr0xk_JCb7-Ehs3NzN73gjo')),
    'is_valid_private_key not valid when too high': () => ok(!is_valid_private_key('_____________________rqu3OavSKA7v9JejNA2QUE')),
    'is_valid_private_key valid when not too high': () => ok(is_valid_private_key('_____________________rqu3OavSKA7v9JejNA2QUA')),
    'is_valid_private_key valid for buffer': () => ok(is_valid_private_key(Buffer.from('2o_57mhaLjzkp4Pnr0xk_JCb7-Ehs3NzN73gjohOr2s', 'base64'))),

    'validate_split needs account': () => contains(validate_split({}), "account is required"),
    'validate_split passes account': () => notContains(validate_split({ account: 'aaa' }), "account is required"),
    'validate_split needs amount': () => contains(validate_split({}), "An amount is required and cannot be zero"),
    'validate_split needs amount nonzero': () => contains(validate_split({ amount: 0 }), "An amount is required and cannot be zero"),
    'validate_split passes amount': () => notContains(validate_split({ amount: 123 }), "An amount is required and cannot be zero"),
    'validate_split needs amount != 0': () => contains(validate_split({ amount: 1E-20 }), "Amounts must be greater than 1E-15"),
    'validate_split needs account valid pubkey': () => contains(validate_split({ account: 'zzz' }), "account is not a valid public key"),
    'validate_split passes account valid pubkey': () => notContains(validate_split({ account: 'AmidWK-6LWDvH0ljhWZ7_Qzw3533OkUs_Uz9_IQjocbb' }), "account is not a valid public key"),
    'validate_split rejects extra props': () => contains(validate_split({ hippo: true, crates: false }), "The split contained extra unsupported properties: hippo, crates"),

    'all stock splits valid': () => ok(transaction1.splits.concat(transaction2.splits).concat(transaction3.splits).filter(s => validate_split(s).length != 0).length == 0),

    'validate_transaction needs splits': () => contains(validate_transaction({}), "A transaction must contain at least one split"),
    'validate_transaction needs splits nonempty': () => contains(validate_transaction({ splits: [] }), "A transaction must contain at least one split"),
    'validate_transaction passes splits': () => notContains(validate_transaction({ splits: [{}] }), "A transaction must contain at least one split"),
    'validate_transaction needs signature': () => contains(validate_transaction({ splits: [] }), "A transaction must be signed"),
    'validate_transaction passes signature': () => notContains(validate_transaction(sign({ splits: [] }, k[0])), "A transaction must be signed"),
    'validate_transaction passes signatures': () => notContains(validate_transaction(sign({ splits: [] }, [k[0], k[1]])), "A transaction must be signed"),
    'validate_transaction rejects extra props': () => contains(validate_transaction({ hippo: true, crates: false }), "The transaction contained extra unsupported properties: hippo, crates"),
    'validate_transaction needs valid splits': () => contains(validate_transaction({ splits: [{}] }), "There were problems with one or more splits"),
    'validate_transaction passes valid splits': () => notContains(validate_transaction({ splits: transaction1.splits }), "There were problems with one or more splits"),
    'validate_transaction needs valid amounts': () => contains(validate_transaction({ splits: [transaction1.splits[0], { ...transaction1.splits[1], amount: 2 }] }), "The from amount 1.01 is less than the to amount 2"),
    'validate_transaction passes valid amounts': () => notContains(validate_transaction({ splits: [transaction1.splits[0], { ...transaction1.splits[1], amount: 1 }] }), "The from amount 1 is less than the to amount 2"),
    'validate_transaction needs transaction charge': () => contains(validate_transaction({ splits: [{ ...transaction1.splits[0], amount: -1 }, transaction1.splits[1]] }), "No transaction charge was given. The debit and credit totals were equal"),
    'validate_transaction needs signature': () => contains(validate_transaction({ ...transaction1, signature: null }), "The transaction was not signed with by each from account's private key"),
    'validate_transaction passes signature': () => notContains(validate_transaction(transaction1), "The transaction was not signed with by each from account's private key"),
    'validate_transaction needs all signatures': () => contains(validate_transaction({ splits: transaction2.splits, signature: transaction2.signatures[0] }), "The transaction was not signed with by each from account's private key"),
    'validate_transaction passes all signatures': () => notContains(validate_transaction(transaction2), "The transaction was not signed with by each from account's private key"),
    'validate_transaction passes a valid transaction 1': () => ok(validate_transaction(transaction1).length == 0),
    'validate_transaction passes a valid transaction 2': () => ok(validate_transaction(transaction2).length == 0),
    'validate_transaction passes a valid transaction 3': () => ok(validate_transaction(transaction3).length == 0),
}