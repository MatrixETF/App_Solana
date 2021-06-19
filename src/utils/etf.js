import {
  PublicKey,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import { struct, u64, u8 } from "@project-serum/borsh";
import { seq } from "buffer-layout";
import { TOKEN_PROGRAM_ID, CLOCK_PROGRAM_ID, ETF_PROGRAM_ID } from "./id";
import {
  findProgramAddress,
  createAssociatedTokenAccount,
  sendTransaction,
} from "./web3";

export async function mint(
  connection,
  wallet,
  etfPoolId,
  etfInfo,
  userMdiTokenAccount,
  etfVaults,
  userTokenAccounts,
  amountsIn,
  minMdiOut
) {
  const transaction = new Transaction();
  const signers = [];

  const owner = wallet.publicKey;

  const { fluxAggregator, etfMdiMint } = etfInfo;

  let newUserMdiTokenAccount;
  if (!userMdiTokenAccount) {
    newUserMdiTokenAccount = await createAssociatedTokenAccount(
      etfMdiMint,
      owner,
      transaction
    );
  }

  transaction.add(
    await mintInstruction(
      new PublicKey(etfPoolId),
      fluxAggregator,
      etfMdiMint,
      userMdiTokenAccount ?? newUserMdiTokenAccount,
      owner,
      etfVaults,
      userTokenAccounts,
      amountsIn,
      minMdiOut
    )
  );

  return await sendTransaction(connection, wallet, transaction, signers);
}

export async function mintInstruction(
  etfPoolId,
  etfFluxAggregator,
  etfMdiMint,
  userMdiTokenAccount,
  userOwner,
  etfVaults,
  userTokenAccounts,
  amountsIn,
  minMdiOut
) {
  if (etfVaults.length !== userTokenAccounts.length) {
    throw new Error("etfVaults length not equals userTokenAccounts length");
  }

  const LAYOUT = struct([
    u8("instruction"),
    seq(u64(), 3, "amountsIn"),
    u64("minMdiOut"),
  ]);

  const { publicKey: authority } = await findProgramAddress(
    [etfPoolId.toBuffer()],
    ETF_PROGRAM_ID
  );

  const keys = [
    { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: true },
    { pubkey: CLOCK_PROGRAM_ID, isSigner: false, isWritable: true },
    { pubkey: etfPoolId, isSigner: false, isWritable: true },
    { pubkey: etfFluxAggregator, isSigner: false, isWritable: true },
    { pubkey: authority, isSigner: false, isWritable: true },
    { pubkey: etfMdiMint, isSigner: false, isWritable: true },
    { pubkey: userMdiTokenAccount, isSigner: false, isWritable: true },
    { pubkey: userOwner, isSigner: true, isWritable: true },
  ];

  etfVaults.forEach((vault, index) => {
    keys.push({
      pubkey: vault,
      isSigner: false,
      isWritable: true,
    });
    keys.push({
      pubkey: userTokenAccounts[index],
      isSigner: false,
      isWritable: true,
    });
  });

  const data = Buffer.alloc(LAYOUT.span);
  LAYOUT.encode(
    {
      instruction: 1,
      amountsIn,
      minMdiOut,
    },
    data
  );

  return new TransactionInstruction({
    keys,
    programId: ETF_PROGRAM_ID,
    data,
  });
}
