import {
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";
import { connection } from "../data";

export async function transferSOl(
  from: PublicKey,
  to: PublicKey,
  amount: number,
) {
  try {
    const ix = SystemProgram.transfer({
      fromPubkey: from,
      toPubkey: to,
      lamports: amount * LAMPORTS_PER_SOL,
    });

    const { blockhash, lastValidBlockHeight } =
      await connection.getLatestBlockhash();

    const tx = new Transaction({
      blockhash,
      lastValidBlockHeight,
      feePayer: from,
    });

    tx.add(ix);

    return tx;
  } catch (Err) {
    console.error(Err);
  }
}
