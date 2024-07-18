import { HardhatRuntimeEnvironment } from "hardhat/types"
import { DeployFunction } from "hardhat-deploy/types"
import { developmentNetworks } from "@/helper-config"
import { ethers } from "hardhat"

const BASE_FEE = ethers.parseEther("0.1")
const GAS_PRICE = 10n ** 9n
const WEI_PER_UNIT_LINK = 4154145017575665

const deployMocksFunc: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { getNamedAccounts, deployments, network } = hre
  const { deploy, log } = deployments
  const { deployer } = await getNamedAccounts()

  if (developmentNetworks.includes(network.name)) {
    log("Development network detected! Deploying mocks...")
    await deploy("VRFCoordinatorMock", {
      from: deployer,
      log: true,
      args: [BASE_FEE, GAS_PRICE, WEI_PER_UNIT_LINK],
    })
    log("Mocks deployed successfully!")
  }
}

deployMocksFunc.tags = ["Mocks"]
export default deployMocksFunc
