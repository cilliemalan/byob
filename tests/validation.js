const { ok, equal, notEqual, deepEqual, throws } = require('assert');
const { isRegExp } = require('util');

const contains = (a, b) => ok((isRegExp(b) ? a.filter(x => b.test(x)) : a.filter(x => x == b)).length);
const notContains = (a, b) => ok(!(isRegExp(b) ? a.filter(x => b.test(x)) : a.filter(x => x == b)).length);
const empty = (a) => ok(a.length == 0);
const noInvalidTransaction = (a) => empty(a);
const hasInvalidTransaction = (a) => contains(a, /The transaction .+, after applied yielded a negative balance on the account\(s\) .+\./);

const { encode, decode, hash, sign_hash, sign,
    verify_sig, verify,
    generate_key, get_public_key_from_private_key,
    generate_nonce,
    sign_block } = require('../utils');

const { hash_block } = require('../blockchain');

const { solve } = require('../solver');

const { get_signer, add_key, get_keys,
    get_block_by_hash, get_highest_block,
    store_block } = require('../db');

const {
    is_valid_base64,
    is_valid_public_key,
    is_valid_private_key,
    is_valid_hash,
    validate_split,
    validate_transaction,
    validate_block,
    validate_transactions_deep,
    validate_block_deep,
    is_block_solution_under_target } = require('../validation');

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


let real0, real1, real2, real3, real4, real5, real6, real7, real8;

module.exports = {
    'is_valid_base64 valid for valid base64': () => ok(is_valid_base64('blahdiblah')),
    'is_valid_base64 not valid for invalid base64': () => ok(!is_valid_base64('#&#^$7')),
    'is_valid_public_key valid': () => ok(is_valid_public_key('AmidWK-6LWDvH0ljhWZ7_Qzw3533OkUs_Uz9_IQjocbb')),
    'is_valid_public_key not valid length != 44': () => ok(!is_valid_public_key('A')),
    'is_valid_public_key not valid not starts with A': () => ok(!is_valid_public_key('BmidWK-6LWDvH0ljhWZ7_Qzw3533OkUs_Uz9_IQjocbb')),
    'is_valid_public_key not valid not base64': () => ok(!is_valid_public_key('BmidWK#6LWDvH0ljhWZ7_Qzw3533OkUs_Uz9_IQjocbb')),
    'is_valid_public_key valid buffer': () => ok(is_valid_public_key(Buffer.from('AmidWK-6LWDvH0ljhWZ7_Qzw3533OkUs_Uz9_IQjocbb', 'base64'))),
    'is_valid_public_key not valid length wrong': () => ok(!is_valid_public_key(Buffer.from('AmidWK6LWDvH0ljhWZ7_Qzw3533OkUs_Uz9_IQjocbb', 'base64'))),
    'is_valid_public_key not valid when not string or buffer': () => ok(!is_valid_public_key([1, 2, 3])),

    'is_valid_hash valid': () => ok(is_valid_private_key('2o_57mhaLjzkp4Pnr0xk_JCb7-Ehs3NzN73gjohOr2s')),
    'is_valid_hash not valid for invalid base64': () => ok(!is_valid_private_key('2o#57mhaLjzkp4Pnr0xk_JCb7-Ehs3NzN73gjohOr2s')),
    'is_valid_hash not valid for bad length': () => ok(!is_valid_private_key('2o_57mhaLjzkp4Pnr0xk_JCb7-Ehs3NzN73gjo')),
    'is_valid_hash valid for buffer': () => ok(is_valid_private_key(Buffer.from('2o_57mhaLjzkp4Pnr0xk_JCb7-Ehs3NzN73gjohOr2s', 'base64'))),
    'is_valid_hash not valid when not string or buffer': () => ok(!is_valid_hash([1, 2, 3])),

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
    'validate_block needs only one signature': () => contains(validate_block(sign({}, k)), "The block is not signed"),
    'validate_block passes exactly one signature': () => notContains(validate_block(sign({}, k[0])), "The block is not signed"),
    'validate_block needs signature valid base64': () => contains(validate_block({ signature: '#&#^$7' }), "The block signature was not a valid base64 string"),
    'validate_block needs correct signature': () => contains(validate_block(sign({ author: p[1] }, k[0])), "The block signature is not valid"),
    'validate_block passes correct signature': () => notContains(validate_block(sign({ author: p[1] }, k[1])), "The block signature is not valid"),
    'validate_block rejects extra props': () => contains(validate_block({ notvalid1: 'a', notvalid2: 5 }), "The block contained extra unsupported properties: notvalid1, notvalid2"),
    'validate_block passes valid block 0': () => notContains(validate_block(sign({ transactions: [], compliment: encode(generate_nonce()), height: 0 }, k[1], true)), "The block signature is not valid"),
    'validate_block passes valid block 1': () => equal(0, validate_block(block0)),
    'validate_block passes valid block 2': () => equal(0, validate_block(block1)),
    'validate_block passes valid block 3': () => equal(0, validate_block(block2)),
    'validate_block checks transactions': () => contains(validate_block(sign({ transactions: [{ invalid: true }], compliment: encode(generate_nonce()), height: 2, parent: block1.hash }, k[1], true)), "There were problems with one or more transactions"),

    'validate_transactions_deep passes empty input': () => noInvalidTransaction(validate_transactions_deep()),
    'validate_transactions_deep passes valid transaction': () => noInvalidTransaction(validate_transactions_deep(
        [{ splits: [{ account: 'a', amount: 1 }, { account: 'b', amount: -1 }] }],
        { 'a': 10, 'b': 10 })),
    'validate_transactions_deep fails an invalid transaction': () => hasInvalidTransaction(validate_transactions_deep(
        [{ splits: [{ account: 'a', amount: 1 }, { account: 'b', amount: -1 }] }],
        { 'a': 10, 'b': 0 })),
    'validate_transactions_deep fails an transaction that is invalid because of order': () => hasInvalidTransaction(validate_transactions_deep(
        [
            { splits: [{ account: 'b', amount: 1 }, { account: 'a', amount: -1 }] },
            { splits: [{ account: 'c', amount: 1 }, { account: 'a', amount: -1 }] }
        ], { 'a': 1, 'b': 0, 'c': 0 })),

    'can build test blockchain 2': async () => {

        // create the test chain.
        // Note: default target is set very easy in test config.

        // summary:
        //    block0 signed by p0, no transactions
        //    block1 signed by p1, transactions from p0(0.5)                (charge: 0.01)
        //    block2 signed by p2, transactions from p0(0.5) and p1(1.0)    (charge: 0.02)
        //    block3 signed by p0, transactions from p2(1.0)                (charge: 0.01)
        //    block4 signed by p1, transactions from p0(0.5)                (charge: 0.01)
        //    block5 signed by p2, transactions from p0(100)                (charge: 0.01, invalid)
        //    block6 signed by p0, transactions from p0(0.5)                (charge: 0.01)

        const
            transaction1 = sign({
                splits: [
                    { account: p[0], amount: -0.5 },
                    { account: p[1], amount: 0.245 },
                    { account: p[2], amount: 0.245 }]
            }, k[0]),
            transaction2 = sign({
                splits: [
                    { account: p[0], amount: -0.5 },
                    { account: p[1], amount: 0.245 },
                    { account: p[2], amount: 0.245 }]
            }, k[0]),
            transaction3 = sign({
                splits: [
                    { account: p[1], amount: -1.00 },
                    { account: p[0], amount: 0.495 },
                    { account: p[2], amount: 0.495 }]
            }, k[1]),
            transaction4 = sign({
                splits: [
                    { account: p[2], amount: -1.00 },
                    { account: p[0], amount: 0.495 },
                    { account: p[1], amount: 0.495 }]
            }, k[2]),
            transaction5 = sign({
                splits: [
                    { account: p[0], amount: -0.5 },
                    { account: p[1], amount: 0.49 }]
            }, k[0]),
            transaction6 = sign({
                splits: [
                    { account: p[0], amount: -100 },
                    { account: p[1], amount: 0.49 }]
            }, k[0]),
            transaction7 = sign({
                splits: [
                    { account: p[0], amount: -0.5 },
                    { account: p[1], amount: 0.49 }]
            }, k[0]),
            unsolved0 = hash_block({
                transactions: [],
                height: 0,
                author: p[0]
            }),
            unsolved1 = hash_block({
                transactions: [transaction1],
                height: 1,
                parent: unsolved0.hash,
                author: p[1]
            }),
            unsolved2 = hash_block({
                transactions: [transaction2, transaction3],
                height: 2,
                parent: unsolved1.hash,
                author: p[2]
            }),
            unsolved3 = hash_block({
                transactions: [transaction4],
                height: 3,
                parent: unsolved2.hash,
                author: p[0]
            }),
            unsolved4 = hash_block({
                transactions: [transaction5],
                height: 4,
                parent: unsolved3.hash,
                author: p[1]
            }),
            unsolved5 = hash_block({ // double spend
                transactions: [transaction6],
                height: 5,
                parent: unsolved4.hash,
                author: p[2]
            }),
            unsolved6 = hash_block({ // will be altered
                transactions: [transaction7],
                height: 5,
                parent: unsolved4.hash,
                author: p[2] // will modify this
            }),
            unsolved7 = hash_block({ // level 0 with transactions
                transactions: [transaction1],
                height: 0,
                parent: undefined,
                author: p[1]
            }),
            unsolved8 = hash_block({ // nonexistent parent
                transactions: [],
                height: 99,
                parent: encode(generate_nonce()),
                author: p[2]
            }),
            solved0 = {
                compliment: encode(await solve(unsolved0.hash)),
                ...unsolved0
            },
            solved1 = {
                compliment: encode(await solve(unsolved1.hash)),
                ...unsolved1
            },
            solved2 = {
                compliment: encode(await solve(unsolved2.hash)),
                ...unsolved2
            },
            solved3 = {
                compliment: encode(await solve(unsolved3.hash)),
                ...unsolved3
            },
            solved4 = {
                compliment: encode(await solve(unsolved4.hash)),
                ...unsolved4
            },
            solved5 = {
                compliment: encode(await solve(unsolved5.hash)),
                ...unsolved5
            },
            solved6 = {
                compliment: encode(await solve(unsolved5.hash)),
                ...unsolved5
            },
            solved7 = {
                compliment: encode(await solve(unsolved7.hash)),
                ...unsolved7
            },
            solved8 = {
                compliment: encode(await solve(unsolved8.hash)),
                ...unsolved8
            };

        // alter block 6
        solved6.author = p[0];

        real0 = sign(solved0, k[0]);
        real1 = sign(solved1, k[1]);
        real2 = sign(solved2, k[2]);
        real3 = sign(solved3, k[0]);
        real4 = sign(solved4, k[1]);
        real5 = sign(solved5, k[2]); // invalid double spend
        real6 = sign(hash_block(solved6), k[0]); // altered
        real7 = sign(solved7, k[1]); // inalid level 0
        real8 = sign(solved8, k[2]); // nonexistant parent
    },

    'validate_block_deep validates root block': () => { empty(validate_block_deep(real0)); store_block(real0); },
    'validate_block_deep validates level 1 block': () => { empty(validate_block_deep(real1, get_block_by_hash(real1.parent))); store_block(real1); },
    'validate_block_deep validates level 2 block': () => { empty(validate_block_deep(real2, get_block_by_hash(real2.parent))); store_block(real2); },
    'validate_block_deep validates level 3 block': () => { empty(validate_block_deep(real3, get_block_by_hash(real3.parent))); store_block(real3); },
    'validate_block_deep validates level 4 block': () => { empty(validate_block_deep(real4, get_block_by_hash(real4.parent))); store_block(real4); },
    'validate_block_deep rejects no input': () => contains(validate_block_deep(), /No input was given/),
    'validate_block_deep rejects blank block': () => notEmpty(validate_block_deep({})),
    'validate_block_deep rejects invalid block': () => contains(validate_block_deep(real5, get_block_by_hash(real5.parent)), /The block contained an invalid transaction/),
    'validate_block_deep rejects altered block': () => contains(validate_block_deep(real6, get_block_by_hash(real6.parent)), /The block solution was not under the target/),
    'validate_block_deep rejects root block with transactions': () => contains(validate_block_deep(real7, get_block_by_hash(real7.parent)), /Height 0 block had transactions/),
    'validate_block_deep rejects block with bad parent': () => contains(validate_block_deep(real8, null), /could not find parent block/),

    'is_block_solution_under_target true if block solution is valid': () => ok(is_block_solution_under_target({ compliment: 'fytXW9IZbMDkIMfZGs1aNWEVt4EXBnsiTwEFBDQx8Cw', hash: 'i7BrIRIbPDAcTai7jFl0Hn6gAVX-sf5POMnXF4-3vak' }, 'AAABrX8pq8r0hXh6ZSDsCNI2mRlBGaXDc4e3GQZhQxA')),
    'is_block_solution_under_target true if block solution is valid (harder)': () => ok(is_block_solution_under_target({ compliment: 'tgP1O8_oAKAsRWnmiPXBo2JemPgEl0T7c96Bsg_MpDs', hash: 'smd1QlE4cwE3LU-7j39nKqCtN0jmY2xvAv1H2zkzLoE' }, 'AAAAKvMdxGEYc78_cINKza6fD09TT11gWFpfHBo87Rs')),
    'is_block_solution_under_target true if block solution is valid (easier target but harder solution)': () => ok(is_block_solution_under_target({ compliment: 'tgP1O8_oAKAsRWnmiPXBo2JemPgEl0T7c96Bsg_MpDs', hash: 'smd1QlE4cwE3LU-7j39nKqCtN0jmY2xvAv1H2zkzLoE' }, 'AAABrX8pq8r0hXh6ZSDsCNI2mRlBGaXDc4e3GQZhQxA')),
    'is_block_solution_under_target false if block solution is not valid': () => ok(!is_block_solution_under_target({ compliment: 'wBKCxz4HyF9xcEI5tO4_urn7e_Sz27UbV091CxLC2z8', hash: 'i7BrIRIbPDAcTai7jFl0Hn6gAVX-sf5POMnXF4-3vak' }, 'AAAAAG3zf2de9urfWrmiBy1EJo2X34N-Z0iVblxsIRc')),
}
