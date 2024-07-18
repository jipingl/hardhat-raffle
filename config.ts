const networkConfig = {
  sepolia: {
    entranceFee: 50n * 10n ** 9n,
    vrfCoordinator: "0x9DdfaCa8183c41ad55329BdeeD9F6A8d53168B1B",
    subscriptionId: 64632589518529213581933405568772200777274765879021659614700779271005812976331n,
    keyHash: "0x787d74caea10b2b357790d5b5247c2f63d1d91572a9846f780606e4d953677ae",
    callbackGasLimit: 20_000,
    interval: 2 * 60 * 1000, // 2 minutes
  },
}

const developmentNetworks = ["hardhat", "localhost"]

export { networkConfig, developmentNetworks }
