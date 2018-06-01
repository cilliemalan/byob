const { ok, equal, notEqual, deepEqual } = require('assert');

const { apply_block_transactions } = require('../accounting');

const { generate_nonce, calculate_target } = require('../utils');
const { BLOCK_REWARD } = require('../configuration');

const
    transaction1 = {
        splits: [
            { account: 'abc', amount: -1 },
            { account: 'def', amount: 1 }]
    },
    transaction2 = {
        splits: [
            { account: 'def', amount: -1 },
            { account: 'abc', amount: 0.5 },
            { account: 'jkl', amount: 0.5 }]
    },
    transaction3 = {
        splits: [
            { account: 'abc', amount: -1 },
            { account: 'yyy', amount: 1 }]
    };

const sample_accounts = {
    'abc': 1,
    'def': 2,
    'ghi': 3,
    'jkl': 0
};

module.exports = {
    'apply_block_transactions only applies block reward when no transactions': () => deepEqual({ 'zzz': BLOCK_REWARD, ...sample_accounts }, apply_block_transactions([], 'zzz', sample_accounts)),
    'apply_block_transactions respects block reward arg': () => deepEqual({ 'zzz': 0, ...sample_accounts }, apply_block_transactions([], 'zzz', sample_accounts, 0)),
    'apply_block_transactions applies a normal transaction': () => deepEqual({ ...sample_accounts, 'abc': 0, 'def': 3 }, apply_block_transactions([transaction1], 'abc', sample_accounts, 0)),
    'apply_block_transactions applies a transaction with multiple splits': () => deepEqual({ ...sample_accounts, 'abc': 1.5, 'def': 1, 'jkl': 0.5 }, apply_block_transactions([transaction2], 'abc', sample_accounts, 0)),
    'apply_block_transactions applies multiple transactions': () => deepEqual({ ...sample_accounts, 'abc': 0.5, 'def': 2, 'jkl': 0.5 }, apply_block_transactions([transaction1, transaction2], 'abc', sample_accounts, 0)),
    'apply_block_transactions applies a transaction to a new account': () => deepEqual({ ...sample_accounts, 'abc': 0, 'yyy': 1 }, apply_block_transactions([transaction3], 'abc', sample_accounts, 0)),
}