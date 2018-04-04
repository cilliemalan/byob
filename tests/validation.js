const { ok, equal, notEqual, deepEqual } = require('assert');

const contains = (a, b) => ok(a.filter(x => x == b).length);
const notContains = (a, b) => ok(!a.filter(x => x == b).length);

const { encode, decode, hash, sign_hash, sign,
    verify_sig, verify,
    generate_key, get_public_key_from_private_key,
    generate_nonce,
    sign_block } = require('../utils');

const { hash_block } = require('../blockchain');

const {
    is_valid_base64,
    is_valid_public_key,
    is_valid_private_key,
    is_valid_hash,
    validate_split,
    validate_transaction,
    buffer_less_than,
    validate_block } = require('../validation');

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
    }, k[2]),
    block0 = sign(hash_block({
        transactions: [
            transaction1,
            transaction2,
            transaction3
        ],
        compliment: encode(generate_nonce()),
        height: 0,
        author: p[0]
    }), k[0]),
    block1 = sign(hash_block({
        transactions: [
            transaction1,
            transaction2,
            transaction3
        ],
        compliment: encode(generate_nonce()),
        height: 1,
        parent: block0.hash,
        author: p[1]
    }), k[1]),
    block2 = sign(hash_block({
        transactions: [],
        compliment: encode(generate_nonce()),
        height: 2,
        parent: block1.hash,
        author: p[2]
    }), k[2]);

module.exports = {
    'is_valid_base64 valid for valid base64': () => ok(is_valid_base64('blahdiblah')),
    'is_valid_base64 not valid for invalid base64': () => ok(!is_valid_base64('#&#^$7')),
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
    'validate_transaction needs signature by correct key': () => contains(validate_transaction({ ...transaction1, signature: null }), "The transaction was not signed with by each from account's private key"),
    'validate_transaction passes signature by correct key': () => notContains(validate_transaction(transaction1), "The transaction was not signed with by each from account's private key"),
    'validate_transaction needs all signatures': () => contains(validate_transaction({ splits: transaction2.splits, signature: transaction2.signatures[0] }), "The transaction was not signed with by each from account's private key"),
    'validate_transaction passes all signatures': () => notContains(validate_transaction(transaction2), "The transaction was not signed with by each from account's private key"),
    'validate_transaction can have a nonce': () => ok(validate_transaction(sign({ ...transaction1, nonce: 'blah' }, k[0]))),
    'validate_transaction with nonce is different from transaction with different nonce': () => ok(sign({ ...transaction1, nonce: 'blah1' }, k[0]).signature != sign({ ...transaction1, nonce: 'blah2' }, k[0])),
    'validate_transaction with nonce is different from transaction without': () => ok(sign({ ...transaction1, nonce: 'blah' }, k[0]).signature != sign({ ...transaction1 }, k[0])),
    'validate_transaction passes a valid transaction 1': () => ok(validate_transaction(transaction1).length == 0),
    'validate_transaction passes a valid transaction 2': () => ok(validate_transaction(transaction2).length == 0),
    'validate_transaction passes a valid transaction 3': () => ok(validate_transaction(transaction3).length == 0),

    'buffer_less_than is true if a is less than b': () => ok(buffer_less_than(Buffer.from([1]), Buffer.from([2]))),
    'buffer_less_than is true if a equals b': () => ok(buffer_less_than(Buffer.from([2]), Buffer.from([2]))),
    'buffer_less_than is false if a is more than b': () => ok(!buffer_less_than(Buffer.from([2]), Buffer.from([1]))),
    'buffer_less_than is true if a is less than b for multiple bytes': () => ok(buffer_less_than(Buffer.from([1, 0, 0]), Buffer.from([2, 0, 0]))),
    'buffer_less_than is true if a is less than b for multiple bytes even if really close': () => ok(buffer_less_than(Buffer.from([1, 0, 0]), Buffer.from([1, 0, 1]))),
    'buffer_less_than is true if a equals b for multiple bytes': () => ok(buffer_less_than(Buffer.from([2, 0, 0]), Buffer.from([2, 0, 0]))),
    'buffer_less_than is false if a is more than b for multiple bytes': () => ok(!buffer_less_than(Buffer.from([2, 0, 0]), Buffer.from([1, 0, 0]))),
    'buffer_less_than is false if a is more than b for multiple bytes even if really close': () => ok(!buffer_less_than(Buffer.from([1, 0, 1]), Buffer.from([1, 0, 0]))),

    'validate_block needs transactions array': () => contains(validate_block({}), "The block does not have a transactions array"),
    'validate_block passes transactions array': () => notContains(validate_block({ transactions: [] }), "The block does not have a transactions array"),
    'validate_block needs transactions to be an array': () => contains(validate_block({ transactions: {} }), "transactions is not an array"),
    'validate_block passes transactions to be an array': () => notContains(validate_block({ transactions: [] }), "transactions is not an array"),
    'validate_block needs compliment': () => contains(validate_block({}), "The block does not have a compliment"),
    'validate_block needs compliment to be string of length > 1': () => contains(validate_block({ compliment: '' }), "The block does not have a compliment"),
    'validate_block needs compliment to be string of length == 43': () => contains(validate_block({ compliment: 'z'.repeat(40) }), "The compliment was not a 43 character long base64 string"),
    'validate_block passes valid compliment': () => notContains(validate_block({ compliment: 'z'.repeat(43) }), "The compliment was not a 43 character long base64 string"),
    'validate_block passes generated compliment': () => notContains(validate_block({ compliment: encode(generate_nonce()) }), "The compliment was not a 43 character long base64 string"),
    'validate_block needs a hash': () => contains(validate_block({}), "The block does not have a hash property"),
    'validate_block passes a hash': () => notContains(validate_block({ hash: 'abc' }), "The block does not have a hash property"),
    'validate_block needs a valid hash': () => contains(validate_block({ hash: 'abc' }), "The block hash is incorrect"),
    'validate_block passes a valid hash': () => notContains(validate_block({ a: 'a', hash: encode(hash({ a: 'a' })) }), "The block hash is incorrect"),
    'validate_block needs an author': () => contains(validate_block({}), "The block has no author"),
    'validate_block needs a valid base64 author': () => contains(validate_block({ author: '###' }), "author is not valid base64"),
    'validate_block needs a valid pubkey author': () => contains(validate_block({ author: 'abcdefg' }), "The block author is not valid"),
    'validate_block passes a valid author': () => notContains(validate_block({ author: p[0] }), "The block author is not valid"),
    'validate_block needs parent to be valid': () => contains(validate_block({ parent: 'vzxvzxv' }), "The block parent is not valid"),
    'validate_block passes parent when valid': () => notContains(validate_block({ parent: encode(hash({})) }), "The block parent is not valid"),
    'validate_block needs height': () => contains(validate_block({}), "The height is not valid"),
    'validate_block needs height to be a number': () => contains(validate_block({ height: '123' }), "The height is not valid"),
    'validate_block needs height to be an integer': () => contains(validate_block({ height: 5.5 }), "The height is not valid"),
    'validate_block passes valid height': () => notContains(validate_block({ height: 4 }), "The height is not valid"),
    'validate_block needs parent when height != 0': () => contains(validate_block({ height: 4 }), "No parent was specified but the height was not 0"),
    'validate_block passes no parent when == 0': () => notContains(validate_block({ height: 0 }), "No parent was specified but the height was not 0"),
    'validate_block passes height when parent': () => notContains(validate_block({ parent: encode(hash({})), height: 100 }), "No parent was specified but the height was not 0"),
    'validate_block needs signature': () => contains(validate_block({}), "The block is not signed"),
    'validate_block needs one signature': () => contains(validate_block(sign({}, k)), "The block is not signed"),
    'validate_block passes one signature': () => notContains(validate_block(sign({}, k[0])), "The block is not signed"),
    'validate_block needs correct signature': () => contains(validate_block(sign({ author: p[1] }, k[0])), "The block signature is not valid"),
    'validate_block passes correct signature': () => notContains(validate_block(sign({ author: p[1] }, k[1])), "The block signature is not valid"),
    'validate_block rejects extra props': () => contains(validate_block({ notvalid1: 'a', notvalid2: 5 }), "The block contained extra unsupported properties: notvalid1, notvalid2"),
    'validate_block passes valid block 0': () => notContains(validate_block(sign({ transactions: [], compliment: encode(generate_nonce()), height: 0 }, k[1], true)), "The block signature is not valid"),
    'validate_block passes valid block 1': () => equal(0, validate_block(block0)),
    'validate_block passes valid block 2': () => equal(0, validate_block(block1)),
    'validate_block passes valid block 3': () => equal(0, validate_block(block2)),
    'validate_block checks transactions': () => contains(validate_block(sign({ transactions: [{ invalid: true }], compliment: encode(generate_nonce()), height: 2, parent: block1.hash }, k[1], true)), "There were problems with one or more transactions")
}
