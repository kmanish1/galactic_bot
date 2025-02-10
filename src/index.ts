import { PrismaClient } from "@prisma/client";
import {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  CommandInteraction,
  Interaction,
} from "discord.js";
import { commands } from "./commands";
import { formatPortfolioMessage, getTokenBalances } from "./solana/tokens";
import { connection } from "./data";
import { LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { transferSOl } from "./solana/transfer";
import { privy, privysign } from "./privy";
import { getTokenDecimals, swap } from "./solana/swap";
import dotenv from "dotenv";
dotenv.config();

const prisma = new PrismaClient();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

const rest = new REST({ version: "10" }).setToken(
  process.env.DISCORD_BOT_TOKEN!
);

(async () => {
  try {
    console.log("Started refreshing application (/) commands.");
    await rest.put(Routes.applicationCommands(process.env.DISCORD_CLIENT_ID!), {
      body: commands,
    });
    console.log("Successfully reloaded application (/) commands.");
  } catch (error) {
    console.error(error);
  }
})();

client.on("interactionCreate", async (interaction: Interaction) => {
  if (!interaction.isCommand()) return;

  const { commandName, options, user } = interaction as CommandInteraction;
  const discordId = user.id;

  const wallet = await prisma.user.findUnique({
    where: { discordId },
  });

  try {
    switch (commandName) {
      case "login":
        if (!wallet) {
          const { id, address } = await privy.walletApi.create({
            chainType: "solana",
          });
          await prisma.user.create({
            data: {
              discordId,
              privyId: id,
              solAddress: address,
            },
          });
          await interaction.reply({
            content: `Wallet created successfully: ${address}`,
            ephemeral: true,
          });
          break;
        } else {
          const addr = wallet.solAddress;
          await interaction.reply({
            content: `Login Successful. Your address is \`${addr}\`. Top up your wallet with SOL to cover gas fees.`,
            ephemeral: true,
          });
          break;
        }

      case "wallet":
        await interaction.deferReply();

        if (!wallet) {
          return interaction.reply({
            content: "Please log in first using `/login`.",
            ephemeral: true,
          });
        }

        const publicKey = wallet.solAddress;

        const tokens = await getTokenBalances(publicKey);
        const sol = await connection.getBalance(new PublicKey(publicKey));

        await interaction.editReply({
          content: formatPortfolioMessage(
            publicKey,
            sol / LAMPORTS_PER_SOL,
            tokens
          ),
        });

        break;

      case "transfer":
        await interaction.deferReply();

        if (!wallet) {
          return interaction.reply({
            content: "Please log in first using `/login`.",
          });
        }

        const toAddress = options.data[0].value;
        const amount = options.data[1].value;

        const transaction = await transferSOl(
          new PublicKey(wallet.solAddress),
          new PublicKey(toAddress as string),
          Number(amount)
        );

        const signature = await privysign(wallet.privyId, transaction);
        const url = `https://solscan.io/tx/${signature}`;

        await interaction.editReply({
          content: url,
        });
        break;

      case "swap":
        await interaction.deferReply();

        if (!wallet) {
          return interaction.reply({
            content: "Please log in first using `/login`.",
          });
        }

        const input_mint = options.data[0].value;
        const output_mint = options.data[1].value;
        const quantity = options.data[2].value;
        const decimals = await getTokenDecimals(
          new PublicKey(input_mint as string)
        );

        const tx = await swap(
          new PublicKey(wallet.solAddress),
          input_mint as string,
          output_mint as string,
          Number(quantity) * Math.pow(10, decimals)
        );

        const sign = await privysign(wallet.privyId, tx);
        await interaction.editReply({
          content: `https://solscan.io/tx/${sign}`,
        });
    }
  } catch (e) {
    console.error(e);
  }
});

process.on("SIGINT", async () => {
  console.log("Received SIGINT. Cleaning up...");
  await prisma.$disconnect();
  client.destroy();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("Received SIGTERM. Cleaning up...");
  await prisma.$disconnect();
  client.destroy();
  process.exit(0);
});

client.once("ready", () => {
  console.log(`Logged in as ${client.user?.tag}`);
});

client.login(process.env.DISCORD_BOT_TOKEN!);
