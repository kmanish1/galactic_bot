import { clusterApiUrl, Connection } from "@solana/web3.js";

/* export const connection = new Connection(
  "https://mainnet.helius-rpc.com/?api-key=7032ddd2-6b08-4f4d-9368-1e616c222480",
  {
    commitment: "confirmed",
  },
); */
export const connection = new Connection(clusterApiUrl("mainnet-beta"));
