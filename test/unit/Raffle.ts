import { mine, time } from "@nomicfoundation/hardhat-network-helpers"
import { deployments, getNamedAccounts, ethers } from "hardhat"
import { isDevelopmentNetwork } from "@/helper-config"
import { assert, expect } from "chai"
import { Raffle, VRFCoordinatorMock } from "@/typechain-types"

describe("Raffle Unit Tests", async () => {
  // Unit testing is only performed in the development environment
  // ⚠️ Arrow function does not support this keyword
  before(function () {
    if (!isDevelopmentNetwork()) {
      this.skip()
    }
  })

  let vrfCoordinatorMock: VRFCoordinatorMock
  let raffle: Raffle
  beforeEach(async () => {
    await deployments.fixture(["Mocks", "Raffle"])
    vrfCoordinatorMock = await ethers.getContract("VRFCoordinatorMock")
    raffle = await ethers.getContract("Raffle")
  })

  it("constructor", async function () {})
})
