import { mine, time } from "@nomicfoundation/hardhat-network-helpers"
import { deployments, getNamedAccounts, ethers } from "hardhat"
import { isDevelopmentNetwork, networkConfig, getNetworkName } from "@/helper-config"
import { Raffle, VRFCoordinatorMock } from "@/typechain-types"
import { assert, expect } from "chai"
import { describe } from "mocha"

describe("Raffle Unit Tests", async () => {
  // Unit testing is only performed in the development environment
  // ⚠️ Arrow function does not support this keyword
  before(function () {
    if (!isDevelopmentNetwork()) {
      this.skip()
    }
  })

  const setupTestEnv = deployments.createFixture(
    async ({ deployments, getNamedAccounts, ethers }, options) => {
      await deployments.fixture(["Mocks", "Raffle"])
      const { deployer } = await getNamedAccounts()
      let vrfCoordinatorMock: VRFCoordinatorMock = await ethers.getContract(
        "VRFCoordinatorMock",
        deployer
      )
      let raffle: Raffle = await ethers.getContract("Raffle", deployer)
      return { vrfCoordinatorMock, raffle }
    }
  )

  describe("Constructor", async function () {
    it("Initialize the raffle contract", async () => {
      const { vrfCoordinatorMock, raffle } = await setupTestEnv()
      const raffleState = await raffle.getRaffleState()
      const entranceFee = await raffle.getEntranceFee()
      const subscriptionId = ""
      assert.equal(raffleState.toString(), "0")
      expect(entranceFee.toString()).to.equal(
        networkConfig[getNetworkName()].entranceFee.toString()
      )
    })
  })
})
