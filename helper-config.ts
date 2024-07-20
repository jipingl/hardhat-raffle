import { ethers, network } from "hardhat"

export interface NetworkConfigItem {
  entranceFee: bigint
  vrfCoordinator?: string
  subscriptionId?: bigint
  keyHash: string
  callbackGasLimit: number
  interval: bigint
}

export interface NetworkConfig {
  [netwotkName: string]: NetworkConfigItem
}

export let networkConfig: NetworkConfig = {
  development: {
    entranceFee: ethers.parseUnits("1", "gwei"),
    keyHash: "0x787d74caea10b2b357790d5b5247c2f63d1d91572a9846f780606e4d953677ae",
    callbackGasLimit: 200_000,
    interval: 30n,
  },
  sepolia: {
    entranceFee: ethers.parseUnits("1", "gwei"),
    vrfCoordinator: "0x9DdfaCa8183c41ad55329BdeeD9F6A8d53168B1B",
    subscriptionId: 64632589518529213581933405568772200777274765879021659614700779271005812976331n,
    keyHash: "0x787d74caea10b2b357790d5b5247c2f63d1d91572a9846f780606e4d953677ae",
    callbackGasLimit: 200_000,
    interval: 30n,
  },
}

export let developmentNetworks = ["hardhat", "localhost"]

export function isDevelopmentNetwork(): boolean {
  return developmentNetworks.includes(network.name)
}

export function getNetworkName(): string {
  return isDevelopmentNetwork() ? "development" : network.name
}

export function getWaitConfirmations(): number {
  return isDevelopmentNetwork() ? 1 : 6
}
