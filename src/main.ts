import { Transaction, Blockchain } from "./blockchain";
import * as elliptic from "elliptic";
const EC = elliptic.ec;
const ec = new EC("secp256k1");

const myKey = ec.keyFromPrivate(
  "1939a0b7aad960cf5bcd862914a327023797fad253fecaa51f0e061056d1f11f"
);

const myWalletAddress = myKey.getPublic("hex");

// Create new instance of Blockchain class
const coin = new Blockchain();

// Mine first block
coin.minePendingTransactions(myWalletAddress);

// Create a transaction & sign it with your key
const tx1 = new Transaction(myWalletAddress, "address2", 100);
tx1.signTransaction(myKey);
coin.addTransaction(tx1);

// Mine block
coin.minePendingTransactions(myWalletAddress);

// Create second transaction
const tx2 = new Transaction(myWalletAddress, "address1", 50);
tx2.signTransaction(myKey);
coin.addTransaction(tx2);

// Mine block
coin.minePendingTransactions(myWalletAddress);

console.log();
console.log(`Balance of USER is ${coin.getBalanceOfAddress(myWalletAddress)}`);

console.log("Blockchain valid?", coin.isChainValid() ? "Yes" : "No");
