import { PrivyClient } from "@privy-io/server-auth";

export const privy = new PrivyClient(
  "cm6ngonn302x1eultxl3yj869",
  "5mvmFLEhiVEMhUoZBktErqdeTMVdbFYV4cuvRX4yymyJmFypwagrn9WVfVygCQU2QZW1DTu4yMR4rvwUVroejvY5",
);

export async function privysign(id: string, transaction: any) {
  const { hash } = await privy.walletApi.solana.signAndSendTransaction({
    walletId: id,
    caip2: "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp",
    transaction: transaction,
  });
  return hash;
}
