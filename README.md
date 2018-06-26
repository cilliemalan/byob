# Build Your Own Blockchain
[![Travis CI](https://secure.travis-ci.org/cilliemalan/byob.png?branch=master)](https://secure.travis-ci.org/puleos/object-hash?branch=master)
[![Coverage Status](https://coveralls.io/repos/github/cilliemalan/byob/badge.svg?branch=master)](https://coveralls.io/github/cilliemalan/byob?branch=master)
A working blockchain example written in node.js.

## How to run

Note: The broker used for communication may or may not be available.

```
yarn install
yarn start
```

# Issues

## Security
The system has not been security tested and probably has a lot of vulnerabilities. Though the blockchain itself will retain its cryptographic integrity, there may be all sorts of other
vulnerabilities.

## Database
The lowdb database probably has its limits. I guess we'll find them...

## Broker
In leu of a proper peer-to-peer communication protocol we just use a message broker to
pass messages between nodes. This broker can just be a stock standard RabbitMQ instance
with a user that can create queues and bind them to exchanges.

# License

See LICENSE.
