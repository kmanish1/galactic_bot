import {
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";
import { connection } from "../data";

export async function transferSol(
  from: PublicKey,
  to: PublicKey,
  amount: number
) {
  try {
    if (!from || !to || isNaN(amount) || amount <= 0) {
      throw new Error("Invalid sender, recipient, or amount.");
    }

    const ix = SystemProgram.transfer({
      fromPubkey: from,
      toPubkey: to,
      lamports: amount * LAMPORTS_PER_SOL,
    });

    const { blockhash, lastValidBlockHeight } =
      await connection.getLatestBlockhash();

    if (!blockhash || !lastValidBlockHeight) {
      throw new Error("Failed to fetch latest blockhash.");
    }

    const tx = new Transaction({
      blockhash,
      lastValidBlockHeight,
      feePayer: from,
    });

    tx.add(ix);

    return tx;
  } catch (error) {
    console.error("Error creating transfer transaction:", error);
    return null;
  }
}
