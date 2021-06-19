import { PublicKey } from "@solana/web3.js";

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
