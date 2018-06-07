const readline = require('readline');

const db = require('./db');
const blockchain = require('./blockchain');
const validation = require('./validation');
const config = require('./configuration');
const utils = require('./utils');
const solver = require('./solver');
const messaging = require('./messaging');
const accounting = require('./accounting');

const keys = db.get_keys();
const highest_block = db.get_highest_block();
const accounts = db.get_accounts(highest_block.hash);

console.log('accounts you have keys for:');
keys.forEach(key => console.log(`   ${key} (balance: ${accounts[key] || 0})`));

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});


const ask_key = (then) => {
    rl.question('what key do you want to use? [first by default]', (answer) => {
        if (!answer) {
            answer = keys[0];
        }

        if (keys.indexOf(answer) == -1) {
            console.log('you don\'t have the private key for that.');
            ask_key(then);
        } else if (!accounts[answer]) {
            console.log('that account has no balance. Mine a bit more...');
            ask_key(then);
        } else {
            then(answer);
        }
    });
}

const ask_amount = (key, then) => {
    rl.question('how much do you want to transfer? (default is 1)', (answer) => {
        if (answer === '') {
            answer = 1;
        }

        const amt = parseFloat(answer);
        if (!isFinite(amt)) {
            console.log('that\'s invalid');
            ask_amount(key, then);
        } else if (amt <= 0) {
            console.log(`the amount must be positive`);
            ask_amount(key, then);
        } else if (amt > (accounts[key] || 0)) {
            console.log(`that's too much. The balance for that account is ${accounts[key]}`);
            ask_amount(key, then);
        } else {
            then(amt);
        }
    })
}

const ask_destination = (then) => {
    rl.question('what is the destination account? (default is random)', (answer) => {
        if (!answer) {
            const account_names = Object.keys(accounts);
            answer = account_names[parseInt(Math.random() * account_names.length)];
            console.log(`picked account ${answer}`)
        }

        if (!validation.is_valid_public_key(answer)) {
            console.log('that\'s invalid');
            ask_destination(then);
        } else {
            then(answer);
        }
    });
}


const ask_transaction_charge = (then) => {
    rl.question('what is the transaction charge? (default is 0.1)', (answer) => {
        if (answer === '') {
            answer = 0.1;
        }

        const amt = parseFloat(answer);
        if (!isFinite(amt)) {
            console.log('that\'s invalid');
            ask_transaction_charge(key, then);
        } else if (amt <= 0) {
            console.log(`the amount must be positive`);
            ask_transaction_charge(key, then);
        } else {
            then(amt);
        }
    })
}


ask_key(key => {
    ask_amount(key, amount => {
        ask_destination(dest => {
            ask_transaction_charge(charge => {

                try {
                    const transaction = blockchain.create_transaction([
                        { account: key, amount: -amount - charge },
                        { account: dest, amount: amount }
                    ], db.get_signer(key));

                    console.log('sending transaction:');
                    console.log(transaction);
                    const client = new messaging.MessagingClient(utils.encode(utils.generate_nonce()), config.BROKER);
                    client.connect().then(() => {
                        client.broadcast_transaction(transaction).then(() => {
                            console.log('transaction sent!');
                            setTimeout(() => { client.close(); process.exit(0) }, 1000);
                        })
                    });
                } catch (e) {
                    console.error('something went badly:');
                    console.error(e);
                }
            })
        })
    })
})