const EventEmitter = require('events');
const amqp = require('amqplib');


function encodeMessage(msg) {
    return Buffer.from(JSON.stringify(msg));
}

class MessagingClient extends EventEmitter {
    constructor(identity, broker) {
        super();

        this.identity = identity;
        this.broker = broker;
    }

    async connect() {
        this.connection = await amqp.connect(this.broker);
        this.channel = await this.connection.createChannel();
        await this.channel.assertExchange('broadcast', 'fanout');
        await this.channel.assertQueue(this.identity, { exclusive: true });
        await this.channel.bindQueue(this.identity, 'broadcast', '');
        await this.channel.consume(this.identity, ({ content, fields, properties }) => {
            let decoded;
            try {
                decoded = JSON.parse(content.toString());
            } catch (e) {
                console.error('received invalid message on queue')
            }

            if (typeof decoded == "object") {
                const { type, message, from } = decoded;
                if (type && (typeof message !== "undefined") && from) {
                    this.emit(type, message, from);
                }
            }
        }, { noAck: true });
    }

    async broadcast(type, message = {}) {
        await this.channel.publish('broadcast', '', encodeMessage({ from: this.identity, type, message }));
    }

    async send(recipient, type, message = {}) {
        await this.channel.sendToQueue(recipient, encodeMessage({ from: this.identity, type, message }));
    }

    async broadcast_block(block) {
        await this.broadcast('block', block);
    }

    async broadcast_transaction(transaction) {
        await this.broadcast('transaction', transaction);
    }

    async send_highest(to, height) {
        await this.send(to, 'highest', height);
    }

    async send_chain(to, chain) {
        for (let i = 0; i < chain.length; i++) {
            await this.send(to, 'block', chain[i]);
        }
    }

    async send_chain_request(to) {
        await this.send(to, 'request_chain');
    }
}


module.exports = {
    MessagingClient
};