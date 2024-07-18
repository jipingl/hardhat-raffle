import { HardhatUserConfig } from "hardhat/config";
import "tsconfig-paths/register";
import "hardhat-deploy";

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.19",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  defaultNetwork: "hardhat",
  namedAccounts: {
    deployer: {
      default: 0,
    },
  },
};

export default config;
