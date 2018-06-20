const { BLOCK_REWARD } = require('./configuration');

/**
 * Applies all the transactions of a block. Will return an object with
 * all the new balances. This function applies the accounting logic of the blockchain.
 * @param {*} transactions the transactions of the block.
 * @param {string} author The author of the block.
 * @param {*} parent_accounts The parent accounts record.
 * @returns {*} A new accounts object
 */
const apply_block_transactions = (transactions, author, parent_accounts, block_reward = BLOCK_REWARD) => {
    const accounts = { [author]: 0, ...parent_accounts };

    transactions.forEach(transaction => {
        let spread = 0;
        transaction.splits.forEach(({ account, amount }) => {
            spread -= amount;
            if (!(account in accounts)) {
                accounts[account] = amount;
            } else {
                accounts[account] += amount;
            }
        });

        //spread is the transaction charge
        accounts[author] += spread;
    });

    //apply the block reward for the author
    accounts[author] += block_reward;

    //return new accounts
    return accounts;
}

module.exports = {
    apply_block_transactions
};