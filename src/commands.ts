export const commands = [
  {
    name: "login",
    description: "create a solana wallet",
  },
  {
    name: "wallet",
    description: "Get your wallet and portfolio details",
  },
  {
    name: "transfer",
    description: "Transfer SOL to another wallet",
    options: [
      {
        name: "recipient",
        description: "The recipient address.",
        type: 3,
        required: true,
      },
      {
        name: "amount",
        description: "The amount of SOL to transfer.",
        type: 10,
        required: true,
      },
    ],
  },
  {
    name: "swap",
    description: "Swap Tokens",
    options: [
      {
        name: "input_mint",
        description: "The address of the token to swap.",
        type: 3,
        required: true,
      },
      {
        name: "output_mint",
        description: "The address of the token to which you want to swap",
        type: 3,
        required: true,
      },
      {
        name: "quantity",
        description: "The amount of tokens to transfer.",
        type: 10,
        required: true,
      },
    ],
  },
];
