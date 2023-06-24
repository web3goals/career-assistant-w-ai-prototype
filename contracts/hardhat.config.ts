import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";
import { HardhatUserConfig } from "hardhat/config";

dotenv.config();

const accounts = [];
if (process.env.PRIVATE_KEY_1) {
  accounts.push(process.env.PRIVATE_KEY_1);
}
if (process.env.PRIVATE_KEY_2) {
  accounts.push(process.env.PRIVATE_KEY_2);
}

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.18",
  },
  networks: {
    auroraTestnet: {
      url: process.env.RPC_URL_AURORA_TESTNET || "",
      accounts: accounts,
    },
    auroraMainnet: {
      url: process.env.RPC_URL_AURORA_MAINNET || "",
      accounts: accounts,
    },
  },
};

export default config;
