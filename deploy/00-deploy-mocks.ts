import { HardhatRuntimeEnvironment } from "hardhat/types"
import { DeployFunction } from "hardhat-deploy/types"
import { developmentNetworks } from "@/config"

const BASE_FEE = 10n ** 17n
const GAS_PRICE = 10n ** 9n
const WEI_PER_UNIT_LINK = 4154145017575665

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, network } = hre
  const { deploy, log } = deployments
  const { deployer } = await getNamedAccounts()

  if (developmentNetworks.includes(network.name)) {
    log("Development network detected! Deploying mocks...")
    await deploy("VRFCoordinatorMock", {
      from: deployer,
      log: true,
      args: [BASE_FEE, GAS_PRICE, WEI_PER_UNIT_LINK],
    })
  }
}

export default func
