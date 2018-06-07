const db = require('./db');
const blockchain = require('./blockchain');
const validation = require('./validation');
const config = require('./configuration');
const utils = require('./utils');
const solver = require('./solver');
const messaging = require('./messaging');
const accounting = require('./accounting');


// the pool of transactions.
let transactions = [];

// the currently being mined block.
let block;

// the messaging client used to communicate with other nodes
let messaging_client;

const error_exit = (error) => {
    console.error(error);
    setImmediate(() => process.exit(1));
}

const generate_keys_if_needed = () => {
    const keys = db.get_keys();
    if (keys.length == 0) {
        console.log('generating a key pair.');
        const pk = utils.generate_key();
        db.add_key(pk);
        console.log(`generated ${utils.abbreviate(utils.encode(utils.get_public_key_from_private_key(pk)))}`);
    }
}

const reinitialize_block = () => {
    const highest_block = db.get_highest_block();
    const highest_block_accounts = db.get_accounts(highest_block && highest_block.hash) || {};
    const clean_transactions = validation.exclude_invalid_transactions(transactions, highest_block_accounts);
    const new_height = highest_block ? highest_block.height + 1 : 0;
    const public_keys = db.get_keys();
    const author = public_keys[new_height % public_keys.length];

    return blockchain.create_block(
        clean_transactions,
        new_height,
        highest_block && highest_block.hash,
        author);
}

const receive_transaction = async (transaction) => {
    try {
        const transaction_hash = utils.hash(transaction);
        const already_have_transaction = !!transactions.filter(transaction =>
            utils.hash(transaction).equals(transaction_hash)).length;

        if (!already_have_transaction) {
            console.log(`received transaction ${utils.abbreviate(transaction_hash)}`);

            const new_pool = [...transactions, transaction];
            const highest_accounts = db.get_accounts(db.get_highest_block().hash);
            const errors = validation.validate_transactions_deep(new_pool, highest_accounts);

            if (errors.length) {
                console.error('there were problems with the received transaction:');
                errors.forEach(console.error);
            } else {
                transactions = new_pool;

                // pool has changed. restart mining
                mine();
            }
        }
    } catch (e) {
        console.error('error receiving transaction');
        console.error(e);
    }
}

const receive_block = (block) => {
    try {
        const already_have_block = !!db.get_block_by_hash(block.hash);

        if (!already_have_block) {

            console.log(`received block ${utils.abbreviate(block.hash)}`);

            const parent_accounts = db.get_accounts(block.parent);

            const errors = validation.validate_block_deep(block, parent_accounts);
            if (errors.length) {
                console.error('There were problems with the received block:');
                errors.forEach(console.error);
            }
            else {

                // calculate block accounts
                const accounts = accounting.apply_block_transactions(
                    block.transactions,
                    block.author,
                    parent_accounts);
                db.store_accounts(block.hash, accounts);

                // store the block
                db.store_block(block);

                const this_is_highest_block = db.get_highest_block().hash === block.hash;

                if (this_is_highest_block) {
                    console.log(`${utils.abbreviate(block.hash)} is new highest block`);

                    // remove transactions from the transaction pool that are in this block.
                    const hashed_block_transactions =
                        block.transactions.map(transaction => utils.hash(transaction));
                    transactions = transactions.filter(transaction =>
                        hashed_block_transactions.filter(new_transaction_hash =>
                            utils.hash(transaction).equals(new_transaction_hash)).length == 0);

                    // and remove invalid transactions for good measure.
                    transactions = validation.exclude_invalid_transactions(transactions, accounts);

                    // the highest block has changed so we need to restart mining
                    mine();
                }
            }
        }
    } catch (e) {
        console.error('error receiving block');
        console.error(e);
    }
}

const reply_with_highest_block = async (_, from) => {
    try {
        const highest_block = db.get_highest_block();
        const highest_height = highest_block ? highest_block.height : -1;

        console.log(`sending highest block of ${highest_height} to ${utils.abbreviate(from)}`);
        await messaging_client.send_highest(from, highest_height);
    } catch (e) {
        console.error('error replying with highest block:');
        console.error(e);
    }
}

const reply_with_chain = async (_, from) => {
    try {
        let block = db.get_highest_block();
        let chain = [block];

        while (block.parent) {
            block = db.get_block_by_hash(block.parent);
            chain.splice(0, 0, block);
        }

        await messaging_client.send_chain(from, chain);

    } catch (e) {
        console.error('error replying with block chain:');
        console.error(e);
    }
}

let highest_response;
let highest_debounce;
const receive_highest = (height, from) => {

    const my_highest = db.get_highest_block();
    const my_height = my_highest ? my_highest.height : -1;

    // is this height higher than ours
    if (height > my_height) {

        // is this height higher than any recent messages.
        if (!highest_response || height > highest_response.height) {
            highest_response = { height, from };
            if (highest_debounce) clearTimeout(highest_debounce);
            setTimeout(async () => {
                try {
                    // check again
                    const { height, from } = highest_response;
                    const my_highest = db.get_highest_block();
                    const my_height = my_highest ? my_highest.height : -1;

                    if (height > my_height) {
                        console.log(`received highest block report of ${height} from ${utils.abbreviate(from)}`);
                        console.log(`sending chain request to ${utils.abbreviate(from)}`);
                        // send chain request to the first highest chain holder
                        await messaging_client.send_chain_request(from);
                    }
                } catch (e) {
                    console.error('error processing highest block:');
                    console.error(e);
                }

            }, 1000);
        }
    }
}

const submit_block = async (compliment) => {
    // sign and finalize the block
    const signer = db.get_signer(block.author);
    const final_block = blockchain.finalize_block(block, compliment, signer);

    receive_block(final_block);

    // broadcast to the network
    console.log('broadcasting signed block');
    await messaging_client.broadcast_block(final_block);
}

const mine = async () => {
    try {
        block = reinitialize_block(transactions);

        // solve for the current block
        console.log(`mining for block hash ${utils.abbreviate(utils.encode(block.hash))}`);
        let hash_to_solve = block.hash;
        const compliment = await solver.solve(hash_to_solve, config.TARGET);

        // check that the solution is still relevant
        if (compliment && hash_to_solve == block.hash) {
            // a solution has been found!
            console.log('block solution found!');
            await submit_block(compliment);
        }
    } catch (e) {
        console.error(e);
    }
}

async function main() {

    // generate a key pair if the database does not have any.
    generate_keys_if_needed();

    // connect to the message broker
    messaging_client = new messaging.MessagingClient(
        db.get_keys()[0],
        config.BROKER);

    console.log('connecting to the broker...');
    await messaging_client.connect();
    console.log('connected');

    // hook up events
    messaging_client.on('block', receive_block);
    messaging_client.on('transaction', receive_transaction);
    messaging_client.on('request_highest', reply_with_highest_block);
    messaging_client.on('request_chain', reply_with_chain);
    messaging_client.on('highest', receive_highest);

    // request highest
    messaging_client.broadcast('request_highest');

    // start mining
    mine().catch(error_exit);
}

setInterval(() => {/*this keeps node from exiting*/ }, 9999999);

main().catch(error_exit);