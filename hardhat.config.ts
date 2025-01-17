import { HardhatUserConfig, vars } from "hardhat/config"
import "@nomicfoundation/hardhat-chai-matchers"
import "@nomicfoundation/hardhat-ethers"
import "@nomicfoundation/hardhat-verify"
import "@typechain/hardhat"
import "hardhat-deploy"
import "hardhat-deploy-ethers"
import "tsconfig-paths/register"
import "hardhat-gas-reporter"
import "solidity-coverage"

const SEPOLIA_RPC_URL = vars.get("SEPOLIA_RPC_URL")
const DEPLOYER_PRIVATE_KEY = vars.get("DEPLOYER_PRIVATE_KEY")
const ETHERSCAN_API_KEY = vars.get("ETHERSCAN_API_KEY")
const COINMARKETCAP_API_KEY = vars.get("COINMARKETCAP_API_KEY")
export const SEPOLIA_VRF_SUBSCRIPTION_ID = vars.get("SEPOLIA_VRF_SUBSCRIPTION_ID")

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
  networks: {
    hardhat: {
      live: false,
      saveDeployments: true,
      tags: ["hardhat"],
    },
    localhost: {
      live: false,
      saveDeployments: true,
      tags: ["localhost"],
    },
    sepolia: {
      url: SEPOLIA_RPC_URL,
      accounts: [DEPLOYER_PRIVATE_KEY],
      live: true,
      saveDeployments: true,
      tags: ["staging"],
    },
  },
  namedAccounts: {
    deployer: {
      default: 0,
    },
  },
  etherscan: {
    apiKey: ETHERSCAN_API_KEY,
  },
  sourcify: {
    enabled: false,
  },
  paths: {
    deployments: "deployments",
  },
  gasReporter: {
    enabled: false,
    currency: "USD",
    coinmarketcap: COINMARKETCAP_API_KEY,
    L1Etherscan: ETHERSCAN_API_KEY,
    L1: "ethereum",
    darkMode: true,
    offline: false,
  },
  mocha: {
    timeout: 10 * 60 * 1000,
  },
}

export default config
