import { AccountLayout, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { Connection, PublicKey } from "@solana/web3.js";

const connection = new Connection(
  "https://mainnet.helius-rpc.com/?api-key=7032ddd2-6b08-4f4d-9368-1e616c222480",
  {
    commitment: "confirmed",
  },
);

export async function getTokenBalances(addr: string): Promise<TokenBalance[]> {
  if (!addr) return [];

  const tokenAccounts = await connection.getTokenAccountsByOwner(
    new PublicKey(addr),
    { programId: TOKEN_PROGRAM_ID },
  );

  const tokenBalances: TokenBalance[] = [];

  for (const { account } of tokenAccounts.value) {
    const accountData = AccountLayout.decode(account.data);
    const mintAddress = new PublicKey(accountData.mint).toString();
    const amount = accountData.amount;

    const mintInfo = await connection.getParsedAccountInfo(
      new PublicKey(accountData.mint),
    );
    if (mintInfo.value && "parsed" in mintInfo.value.data) {
      const decimals = mintInfo.value.data["parsed"].info.decimals;
      if (decimals === 0 && amount === BigInt(1)) continue;

      const tokenInfoRes = await fetch(
        `https://api.dexscreener.com/tokens/v1/solana/${mintAddress}`,
      );
      const tokenInfo = await tokenInfoRes.json();

      const balance = Number(amount) / Math.pow(10, decimals);
      const balanceUSD = balance * tokenInfo[0].priceUsd;

      tokenBalances.push({
        mintAddress,
        balanceUSD,
        ticker: tokenInfo[0].baseToken.symbol,
        amount: balance,
      });
    }
  }
  return tokenBalances;
}
type TokenBalance = {
  mintAddress: string;
  balanceUSD: number;
  ticker: string;
  amount: number;
};

function formatBalance(amount: number): string {
  return amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  });
}

function formatUSD(amount: number): string {
  return amount.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });
}

export function formatPortfolioMessage(
  publicKey: string,
  solBalance: number,
  tokens: TokenBalance[],
): string {
  let message = `🔑 **Wallet Address**\n\`${publicKey}\`\n\n`;
  message += `💰 **Portfolio Summary**\n`;
  message += `• SOL: ${solBalance} SOL\n`;

  let totalUSD = 0;

  if (tokens.length > 0) {
    message += "\n**Token Balances**\n";
    tokens.forEach((token) => {
      if (token.balanceUSD > 0) {
        message += `• ${token.ticker}: ${formatBalance(token.amount)} `;
        message += `(${formatUSD(token.balanceUSD)})\n`;
        totalUSD += token.balanceUSD;
      }
    });

    message += `\n📊 **Total Portfolio Value**: ${formatUSD(totalUSD)}`;
  }

  return message;
}
