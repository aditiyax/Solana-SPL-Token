import BN from "bn.js";
import assert from "assert";
import * as web3 from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";
import type { SPLToken } from "../target/types/SPLToken";

describe("Test Minter", () => {
  // Configure the client to use the local cluster
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.SPLToken as anchor.Program<SPLToken>;
  
  const METADATA_SEED = "metadata";
  const TOKEN_METADATA_PROGRAM_ID = new web3.PublicKey(
    "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"
  );

  const MINT_SEED = "mint";

  const payer = program.provider.publicKey;
  const metadata = {
    name: "Adi Token",
    symbol: "ADI",
    uri: "https://5vfxc4tr6xoy23qefqbj4qx2adzkzapneebanhcalf7myvn5gzja.arweave.net/7UtxcnH13Y1uBCwCnkL6APKsge0hAgacQFl-zFW9NlI",
    decimals: 9,
  };
  const mintAmount = 10;
  const [mint] = web3.PublicKey.findProgramAddressSync(
    [Buffer.from(MINT_SEED)],
    program.programId
  );

  const [metadataAddress] = web3.PublicKey.findProgramAddressSync(
    [
      Buffer.from(METADATA_SEED),
      TOKEN_METADATA_PROGRAM_ID.toBuffer(),
      mint.toBuffer(),
    ],
    TOKEN_METADATA_PROGRAM_ID
  );

  //Testing init token
  it("initialize", async () => {
    const info = await program.provider.connection.getAccountInfo(mint);
    if (info) {
      return;
    }
    console.log("Mint not found. Attempting to initialize.");

    const context = {
      metadata: metadataAddress,
      mint,
      payer,
      rent: web3.SYSVAR_RENT_PUBKEY,
      systemProgram: web3.SystemProgram.programId,
      tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
      tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
    };
    const txHash = await program.methods
      .initToken(metadata)
      .accounts(context)
      .rpc();

    await program.provider.connection.confirmTransaction(txHash, "finalized");
    console.log(`https://explorer.solana.com/tx/${txHash}?cluster=devnet`);
    const newInfo = await program.provider.connection.getAccountInfo(mint);
    assert(newInfo, "Mint should be initialized");
  });

  // Testing mint token
  it("mint Tokens", async () => {
    const destination = await anchor.utils.token.associatedAddress({
      mint: mint,
      owner: payer,
    });

    let initialBalance: number;
    try {
      const balance = await program.provider.connection.getTokenAccountBalance(destination);
      initialBalance = 0;
    } catch {
      initialBalance = 0;
    }

    const context = {
      mint,
      destination,
      payer,
      rent: web3.SYSVAR_RENT_PUBKEY,
      systemProgram: web3.SystemProgram.programId,
      tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
      associatedTokenProgram: anchor.utils.token.ASSOCIATED_PROGRAM_ID,
    };

    const txHash = await program.methods
      .mintTokens(new BN(mintAmount * 10 ** metadata.decimals))
      .accounts(context)
      .rpc();
    await program.provider.connection.confirmTransaction(txHash);
    console.log(`https://explorer.solana.com/tx/${txHash}?cluster=devnet`);

    const postBalance = (
      await program.provider.connection.getTokenAccountBalance(destination)
    ).value.uiAmount;
    assert.equal(
      initialBalance + mintAmount,
      postBalance,
      "Post balance should equal initial plus mint amount"
    );
  });
});
