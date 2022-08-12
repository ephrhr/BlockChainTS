import crypto from "crypto";
import * as elliptic from "elliptic";
const EC = elliptic.ec;
const ec = new EC("secp256k1");

class Transaction {
  fromAddress: string;
  toAddress: string;
  amount: number;
  timestamp: number;
  signature: string;
  constructor(_fromAddress: string, _toAddress: string, _amount: number) {
    this.fromAddress = _fromAddress;
    this.toAddress = _toAddress;
    this.amount = _amount;
    this.timestamp = Date.now();
    this.signature = "";
  }

  calculateHash() {
    return crypto
      .createHash("sha256")
      .update(this.fromAddress + this.toAddress + this.amount + this.timestamp)
      .digest("hex");
  }

  signTransaction(signingKey: any) {
    if (signingKey.getPublic("hex") !== this.fromAddress)
      throw new Error("You cannot sign transactions for other wallets!");

    const hashTx = this.calculateHash();
    const sig = signingKey.sign(hashTx, "base64");

    this.signature = sig.toDER("hex");
  }

  isValid() {
    if (this.fromAddress === "") return true;
    if (!this.signature || this.signature.length === 0)
      throw new Error("No signature in this transaction");
    const publicKey = ec.keyFromPublic(this.fromAddress, "hex");
    return publicKey.verify(this.calculateHash(), this.signature);
  }
}

class Block {
  timestamp: number;
  transactions: Transaction[];
  previousHash: string;
  hash: string;
  nonce: number;
  constructor(
    _timestamp: number,
    _transactions: Transaction[],
    _previousHash: string = ""
  ) {
    this.previousHash = _previousHash;
    this.timestamp = _timestamp;
    this.transactions = _transactions;
    this.hash = this.calculateHash();
    this.nonce = 0;
  }

  calculateHash() {
    return crypto
      .createHash("sha256")
      .update(
        this.previousHash +
          this.timestamp +
          JSON.stringify(this.transactions) +
          this.nonce
      )
      .digest("hex");
  }
  mineBlock(difficulity: number) {
    while (
      this.hash.substring(0, difficulity) !== Array(difficulity + 1).join("0")
    ) {
      this.nonce++;
      this.hash = this.calculateHash();
    }

    console.log(`Block mined: ${this.hash}`);
  }
  hasValidTransactions() {
    for (const tx of this.transactions) {
      if (!tx.isValid()) return false;
    }
    return true;
  }
}

class Blockchain {
  chain: Block[];
  difficulty: number;
  pendingTransactions: Transaction[];
  miningReward: number;
  constructor() {
    this.chain = [this.createGenesisBlock()];
    this.difficulty = 2;
    this.pendingTransactions = [];
    this.miningReward = 100;
  }

  createGenesisBlock() {
    return new Block(Date.parse("2022-01-01"), [], "0");
  }

  getLatestBlock() {
    return this.chain[this.chain.length - 1];
  }

  minePendingTransactions(miningRewardAddress) {
    const rewardTx = new Transaction(
      "",
      miningRewardAddress,
      this.miningReward
    );
    this.pendingTransactions.push(rewardTx);

    const block = new Block(
      Date.now(),
      this.pendingTransactions,
      this.getLatestBlock().hash
    );
    block.mineBlock(this.difficulty);

    console.log("Block successfully mined!");

    this.chain.push(block);
    this.pendingTransactions = [];
  }

  addTransaction(_transaction: Transaction) {
    if (!_transaction.fromAddress || !_transaction.toAddress) {
      throw new Error("Transaction must include from and to address");
    }

    // Verify the transactiion
    if (!_transaction.isValid()) {
      throw new Error("Cannot add invalid transaction to chain");
    }

    if (_transaction.amount <= 0) {
      throw new Error("Transaction amount should be higher than 0");
    }

    // Making sure that the amount sent is not greater than existing balance
    const walletBalance = this.getBalanceOfAddress(_transaction.fromAddress);

    if (walletBalance < _transaction.amount) {
      throw new Error("Not enough balance");
    }
    // Get all other pending transactions for the "from" wallet
    const pendingTxForWallet = this.pendingTransactions.filter(
      (tx) => tx.fromAddress === _transaction.fromAddress
    );
    // If the wallet has more pending transactions, calculate the total amount
    // of spend coins so far. If this exceeds the balance, we refuse to add this
    // transaction.
    if (pendingTxForWallet.length > 0) {
      const totalPendingAmount = pendingTxForWallet
        .map((tx) => tx.amount)
        .reduce((prev, curr) => prev + curr);

      const totalAmount = totalPendingAmount + _transaction.amount;
      if (totalAmount > walletBalance) {
        throw new Error(
          "Pending transactions for this wallet is higher than its balance."
        );
      }
    }

    this.pendingTransactions.push(_transaction);
    console.log("transaction added: %s", _transaction);
  }

  getBalanceOfAddress(address: string) {
    let balance = 0;

    for (const block of this.chain) {
      for (const trans of block.transactions) {
        if (trans.fromAddress === address) balance -= trans.amount;
        if (trans.toAddress === address) balance += trans.amount;
      }
    }
    console.log("getBalanceOfAdrees: %s", balance);
    return balance;
  }

  getAllTransactionsForWallet(address) {
    const txs: Transaction[] = [];

    for (const block of this.chain) {
      for (const tx of block.transactions) {
        if (tx.fromAddress === address || tx.toAddress === address) {
          txs.push(tx);
        }
      }
    }

    console.log("get transactions for wallet count: %s", txs.length);
    return txs;
  }

  isChainValid() {
    const realGenesis = JSON.stringify(this.createGenesisBlock());
    if (realGenesis !== JSON.stringify(this.chain[0])) return false;

    for (let i = 1; i < this.chain.length; i++) {
      const currBlock = this.chain[i];
      const prevBlock = this.chain[i - 1];

      if (
        prevBlock.hash !== currBlock.previousHash ||
        !currBlock.hasValidTransactions() ||
        currBlock.hash !== currBlock.calculateHash()
      )
        return false;
    }
    return true;
  }
}

export { Block, Blockchain, Transaction };
