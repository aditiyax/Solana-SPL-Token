import * as anchor from "@coral-xyz/anchor";
import type { SPLToken } from "../target/types/SPLToken";

// Configure the client to use the local cluster
anchor.setProvider(anchor.AnchorProvider.env());

const program = anchor.workspace.SPLToken as anchor.Program<SPLToken>;

console.log(program.provider.publicKey.toString(), "saying hello:");
//1. Fetch the latest blockhash
let latestBlockhash = await program.provider.connection.getLatestBlockhash('finalized');

//2. Call say_hello and send the transaction to the network
const tx = await program.methods
  .sayHello()
  .rpc();

//3. Confirm the transaction and log the tx URL
await program.provider.connection.confirmTransaction({
  signature: tx,         
  blockhash: latestBlockhash.blockhash,
  lastValidBlockHeight: latestBlockhash.lastValidBlockHeight
});
console.log('Transaction Complete: ',`https://explorer.solana.com/tx/${tx}?cluster=devnet`);