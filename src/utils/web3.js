import { PublicKey, TransactionInstruction } from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  SYSTEM_PROGRAM_ID,
  RENT_PROGRAM_ID,
} from "./id";

export async function findProgramAddress(seeds, programId) {
  const [publicKey, nonce] = await PublicKey.findProgramAddress(
    seeds,
    programId
  );
  return { publicKey, nonce };
}

export async function findAssociatedTokenAddress(
  walletAddress,
  tokenMintAddress
) {
  const { publicKey } = await findProgramAddress(
    [
      walletAddress.toBuffer(),
      TOKEN_PROGRAM_ID.toBuffer(),
      tokenMintAddress.toBuffer(),
    ],
    ASSOCIATED_TOKEN_PROGRAM_ID
  );
  return publicKey;
}

export async function createAssociatedTokenAccount(
  tokenMintAddress,
  owner,
  transaction
) {
  const associatedTokenAddress = await findAssociatedTokenAddress(
    owner,
    tokenMintAddress
  );

  const keys = [
    {
      pubkey: owner,
      isSigner: true,
      isWritable: true,
    },
    {
      pubkey: associatedTokenAddress,
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: owner,
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: tokenMintAddress,
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: SYSTEM_PROGRAM_ID,
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: TOKEN_PROGRAM_ID,
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: RENT_PROGRAM_ID,
      isSigner: false,
      isWritable: false,
    },
  ];

  transaction.add(
    new TransactionInstruction({
      keys,
      programId: ASSOCIATED_TOKEN_PROGRAM_ID,
      data: Buffer.from([]),
    })
  );

  return associatedTokenAddress;
}

export async function getMultipleAccounts(
  connection,
  publicKeys,
  commitment = connection.commitment
) {
  const keyList = [];
  let tempKeys = [];

  publicKeys.forEach((k) => {
    // 100 accounts max for each request
    if (tempKeys.length >= 100) {
      keyList.push(tempKeys);
      tempKeys = [];
    }
    tempKeys.push(k.toBase58());
  });
  if (tempKeys.length > 0) {
    keyList.push(tempKeys);
  }

  // for (let index = 0; index < Math.ceil(publicKeys.length / 100); index++) {
  //   keyList.push(publicKeys.slice(0, 100));
  // }

  const accounts = [];

  for (const key of keyList) {
    const args = [key, { commitment }];

    // eslint-disable-next-line
    // @ts-ignore
    const res = await connection._rpcRequest("getMultipleAccounts", args);
    if (res.error) {
      throw new Error(
        "failed to get info about accounts " +
          publicKeys.map((k) => k.toBase58()).join(", ") +
          ": " +
          res.error.message
      );
    }

    if (typeof res.result === "undefined") {
      throw new Error("result is undefined");
    }

    for (const account of res.result.value) {
      let value = null;
      if (account === null) {
        accounts.push(null);
        continue;
      }
      if (res.result.value) {
        const { executable, owner, lamports, data } = account;

        if (data[1] !== "base64") {
          throw new Error("first data is not base64");
        }

        value = {
          executable,
          owner: new PublicKey(owner),
          lamports,
          data: Buffer.from(data[0], "base64"),
        };
      }
      if (value === null) {
        throw new Error("Invalid response");
      }
      accounts.push(value);
    }
  }

  return accounts.map((account, idx) => {
    if (account === null) {
      return null;
    }
    return {
      publicKey: publicKeys[idx],
      account,
    };
  });
}

export async function signTransaction(
  connection,
  wallet,
  transaction,
  signers = []
) {
  transaction.recentBlockhash = (
    await connection.getRecentBlockhash()
  ).blockhash;
  transaction.setSigners(wallet.publicKey, ...signers.map((s) => s.publicKey));
  if (signers.length > 0) {
    transaction.partialSign(...signers);
  }
  return await wallet.signTransaction(transaction);
}

export async function sendSignedTransaction(connection, signedTransaction) {
  const rawTransaction = signedTransaction.serialize();

  const txid = await connection.sendRawTransaction(rawTransaction, {
    skipPreflight: true,
    preflightCommitment: connection.commitment,
  });

  return txid;
}

export async function sendTransaction(
  connection,
  wallet,
  transaction,
  signers = []
) {
  const signedTransaction = await signTransaction(
    connection,
    wallet,
    transaction,
    signers
  );
  return await sendSignedTransaction(connection, signedTransaction);
}
