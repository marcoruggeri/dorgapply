# Decentralized Arbitrage Bot

_The current version of the bot is configured to work with cover protocol claim/noclaim balancer pools but can be easily tweaked to work with any dex pools_

The bot is composed by a Solidity smart contract and a Node.js application that polls the Ethereum blockchain for prices info and call the arbitrage functions on the smart contract when there is an arbitrage opportunity.

## Arbs.sol

The contract is composed by four public functions that executes the arbitrage trade and two view functions that are used to check if there is an arbitrage opportunity.

The buy functions buy the same amount of claim and noclaim tokens on the balancer pool using DAI and convert them back to DAI with a net profit after fees.

The sell functions first convert DAI into the same amount of claim and noclaim tokens and then sells them on the balancer pool for a net profit after fees.

## Node.js application

The Node.js application polls constantly an Ethereum node to check if there is an arbitrage opportunity through the view functions on the contract, if there is an arbitrage opportunity it calls the appropriate public function on the contract to execute the trade.

The index.js file include the addresses for the pools required to call the smart contract functions, it then set up intervals to poll the blockchain continuously.

The newFuncs.js file include the logic to call the contract functions using ethers library.
