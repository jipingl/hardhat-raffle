import { HardhatRuntimeEnvironment } from "hardhat/types"
import { DeployFunction } from "hardhat-deploy/types"
import {
  networkConfig,
  isDevelopmentNetwork,
  getNetworkName,
  getWaitConfirmations,
} from "@/helper-config"
import { verify } from "@/utils/verify"
import { VRFCoordinatorMock } from "@/typechain-types/contracts/test/VRFCoordinatorMock"
import { EventLog } from "ethers"

const deployRaffleFunc: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { getNamedAccounts, deployments, network, ethers } = hre
  const { deploy, execute, log } = deployments
  const { deployer } = await getNamedAccounts()

  let vrfCoordinatorMockAddress: string | undefined, subscriptionId: bigint | undefined

  // Get VRFCoordinator address
  if (isDevelopmentNetwork()) {
    const vrfCoordinatorMock: VRFCoordinatorMock = await ethers.getContract("VRFCoordinatorMock")
    vrfCoordinatorMockAddress = await vrfCoordinatorMock.getAddress()
    // create subscription
    const transactionResponse = await vrfCoordinatorMock.createSubscription()
    const transactionReceipt = await transactionResponse.wait(1)
    const event = transactionReceipt?.logs[0]
    if (event instanceof EventLog) {
      subscriptionId = event.args.subId
    }
    // fund the subscription
    if (subscriptionId !== undefined) {
      await vrfCoordinatorMock.fundSubscription(subscriptionId, ethers.parseEther("100"))
    }
  } else {
    vrfCoordinatorMockAddress = networkConfig[getNetworkName()]?.vrfCoordinator
    subscriptionId = networkConfig[getNetworkName()]?.subscriptionId
  }

  // Check of the subscription
  if (vrfCoordinatorMockAddress == undefined || subscriptionId == undefined) {
    throw new Error(
      `Please check, vrfCoordinatorMockAddress: ${vrfCoordinatorMockAddress}, subscriptionId: ${subscriptionId}`
    )
  }

  // Deploy Raffle contract
  const args = [
    networkConfig[getNetworkName()]?.entranceFee,
    vrfCoordinatorMockAddress,
    subscriptionId,
    networkConfig[getNetworkName()]?.keyHash,
    networkConfig[getNetworkName()]?.callbackGasLimit,
    networkConfig[getNetworkName()]?.interval,
  ]
  const raffle = await deploy("Raffle", {
    from: deployer,
    log: true,
    waitConfirmations: getWaitConfirmations(),
    args: args,
  })

  // Register raffle consumer to VRFCoordinator
  // Live environment requires going to the VRF console
  if (isDevelopmentNetwork()) {
    const vrfCoordinatorMock: VRFCoordinatorMock = await ethers.getContract("VRFCoordinatorMock")
    await vrfCoordinatorMock.addConsumer(subscriptionId, raffle.address)
  }

  // Verify deployed contract
  if (!isDevelopmentNetwork()) {
    await verify(raffle.address, args)
  }
}

deployRaffleFunc.tags = ["Raffle"]
deployRaffleFunc.dependencies = ["Mocks"]
export default deployRaffleFunc
