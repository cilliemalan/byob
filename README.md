# Build Your Own Blockchain

A working blockchain example written in node.js.

## How to run

Note: The broker used for communication may or may not be available.

```
yarn install
yarn start
```

# Missing stuff

## Blockchain synchronization
Currently a blockchain is only requested on startup, so in kind-of-likely chance that you
start your node when nothing else is running, you'll start your own chain and will reject
any blocks created by other nodes when they start again.

## Proof of Work is completely broken
I have discovered that the proof of work algorithm that I devised is completely broken.
Homework assignment: create a PR that fixes it.

## Database
The lowdb database probably has its limits. I guess we'll find them...

## Broker
In leu of a proper peer-to-peer communication protocol we just use a message broker to
pass messages between nodes. This broker can just be a stock standard RabbitMQ instance
with a user that can create queues and bind them to exchanges.

# License

See LICENSE.
