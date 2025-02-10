import { PublicKey, Transaction, VersionedTransaction } from "@solana/web3.js";
import {
  NATIVE_MINT,
  TOKEN_2022_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import axios from "axios";
import { API_URLS } from "@raydium-io/raydium-sdk-v2";
import { parseTokenAccountResp } from "@raydium-io/raydium-sdk-v2";
import { connection } from "../data";

/**
 * @param address solana address
 * @param inputMint mint address
 * @param outputMint mint address
 * @param amount amount to swap no in decimals
 */
export async function swap(
  address: PublicKey,
  inputMint: string,
  outputMint: string,
  amount: number,
) {
  try {
    const slippage = 0.5;
    const txVersion = "V0";
    const isV0Tx = txVersion === "V0";

    const [isInputSol, isOutputSol] = [
      inputMint === NATIVE_MINT.toBase58(),
      outputMint === NATIVE_MINT.toBase58(),
    ];
    const { tokenAccounts } = await fetchTokenAccountData(address);
    const inputTokenAcc = tokenAccounts.find(
      (a) => a.mint.toBase58() === inputMint,
    )?.publicKey;
    const outputTokenAcc = tokenAccounts.find(
      (a) => a.mint.toBase58() === outputMint,
    )?.publicKey;

    if (!inputTokenAcc && !isInputSol) {
      console.error("do not have input token account");
      return;
    }

    const { data: swapResponse } = await axios.get(
      `${
        API_URLS.SWAP_HOST
      }/compute/swap-base-in?inputMint=${inputMint}&outputMint=${outputMint}&amount=${amount}&slippageBps=${
        slippage * 100
      }&txVersion=${txVersion}`,
    );

    if (!swapResponse.success) {
      console.error("Error Getting Swap");
      return;
    }

    const { data } = await axios.get<{
      id: string;
      success: boolean;
      data: { default: { vh: number; h: number; m: number } };
    }>(`${API_URLS.BASE_HOST}${API_URLS.PRIORITY_FEE}`);

    const { data: swapTransactions } = await axios.post(
      `${API_URLS.SWAP_HOST}/transaction/swap-base-in`,
      {
        computeUnitPriceMicroLamports: String(data.data.default.m),
        swapResponse,
        txVersion,
        wallet: new PublicKey(address).toBase58(),
        wrapSol: isInputSol,
        unwrapSol: isOutputSol, // true means output mint receive sol, false means output mint received wsol
        inputAccount: isInputSol ? undefined : inputTokenAcc?.toBase58(),
        outputAccount: isOutputSol ? undefined : outputTokenAcc?.toBase58(),
      },
    );

    const allTxBuf = swapTransactions.data.map((tx: any) =>
      Buffer.from(tx.transaction, "base64"),
    );

    const allTransactions = allTxBuf.map((txBuf: any) =>
      isV0Tx
        ? VersionedTransaction.deserialize(txBuf)
        : Transaction.from(txBuf),
    );
    return allTransactions;
  } catch (err) {
    console.log(err);
  }
}

export const fetchTokenAccountData = async (address: PublicKey) => {
  const solAccountResp = await connection.getAccountInfo(address);
  const tokenAccountResp = await connection.getTokenAccountsByOwner(address, {
    programId: TOKEN_PROGRAM_ID,
  });
  const token2022Req = await connection.getTokenAccountsByOwner(address, {
    programId: TOKEN_2022_PROGRAM_ID,
  });
  const tokenAccountData = parseTokenAccountResp({
    owner: address,
    solAccountResp,
    tokenAccountResp: {
      context: tokenAccountResp.context,
      value: [...tokenAccountResp.value, ...token2022Req.value],
    },
  });
  return tokenAccountData;
};

export async function getTokenDecimals(mintAddress: PublicKey) {
  try {
    const mintPublicKey = new PublicKey(mintAddress);

    const mintInfo = await connection.getParsedAccountInfo(mintPublicKey);

    if (!mintInfo.value || !mintInfo.value.data) {
      throw new Error("Invalid mint account");
    }

    // @ts-ignore
    const decimals = mintInfo.value.data.parsed.info.decimals;

    return decimals;
  } catch (error) {
    console.error("Error getting token decimals:", error);
    throw error;
  }
}

getTokenDecimals(new PublicKey("DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263"));
