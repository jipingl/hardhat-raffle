import { mine, time } from "@nomicfoundation/hardhat-network-helpers"
import { deployments, getNamedAccounts, ethers, getUnnamedAccounts } from "hardhat"
import { isDevelopmentNetwork, networkConfig, getNetworkName } from "@/helper-config"
import { Raffle, VRFCoordinatorMock } from "@/typechain-types"
import { assert, expect } from "chai"
import { describe, it } from "mocha"
import { vrf } from "@/typechain-types/@chainlink/contracts/src/v0.8"
import { EventLog } from "ethers"
import { any, bigint, boolean } from "hardhat/internal/core/params/argumentTypes"
import { WinnerPickedEvent } from "@/typechain-types/contracts/Raffle"

describe("Raffle", () => {
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

  describe("#constructor()", function () {
    it("raffleState should be OPEN", async () => {
      const { raffle } = await setupTestEnv()
      const raffleState = await raffle.getRaffleState()
      expect(raffleState.toString()).to.equal("0")
    })

    it("entranceFee should be equals with the config", async () => {
      const { raffle } = await setupTestEnv()
      const entranceFee = await raffle.getEntranceFee()
      expect(entranceFee.toString()).to.equal(
        networkConfig[getNetworkName()].entranceFee.toString()
      )
    })

    it("lastTimestamp should be less than or equal to the latest block time ", async () => {
      const { raffle } = await setupTestEnv()
      const lastTimestamp = await raffle.getLastTimestamp()
      const blockNumber = await ethers.provider.getBlockNumber()
      const block = await ethers.provider.getBlock(blockNumber)
      expect(block).to.exist
      expect(lastTimestamp).to.lte(block?.timestamp)
    })

    it("interval should be equals with the config", async () => {
      const { raffle } = await setupTestEnv()
      const interval = await raffle.getInterval()
      expect(interval).to.equal(networkConfig[getNetworkName()].interval)
    })
  })

  describe("#enter()", () => {
    it("revert when you don't pay enough", async () => {
      const { raffle } = await setupTestEnv()
      await expect(raffle.enter()).to.be.revertedWithCustomError(
        raffle,
        "Raffle__NotEnoughETHEntered"
      )
    })

    it("players should be recorded after enter", async () => {
      const { raffle } = await setupTestEnv()
      const entranceFee = await raffle.getEntranceFee()
      await raffle.enter({ value: entranceFee })
      const playerAddress = await raffle.getPlayer(0)
      const { deployer } = await getNamedAccounts()
      expect(playerAddress).to.equal(deployer)
    })

    it("emits event on enter", async () => {
      const { raffle } = await setupTestEnv()
      const entranceFee = await raffle.getEntranceFee()
      const { deployer } = await getNamedAccounts()
      await expect(raffle.enter({ value: entranceFee }))
        .to.emit(raffle, "RaffleEnter")
        .withArgs(deployer)
    })

    it("not allowed to join while raffle is calculating", async () => {
      const { raffle } = await setupTestEnv()
      const entranceFee = await raffle.getEntranceFee()
      await raffle.enter({ value: entranceFee })
      await time.increase(networkConfig[getNetworkName()].interval + 1n)
      await raffle.performUpkeep(new Uint8Array())
      await expect(raffle.enter({ value: entranceFee })).to.be.revertedWithCustomError(
        raffle,
        "Raffle__NotOpen"
      )
    })
  })

  describe("#checkUpkeep()", () => {
    it("return false when there are no players", async () => {
      const { raffle } = await setupTestEnv()
      await time.increase(networkConfig[getNetworkName()].interval + 1n)
      const { upkeepNeeded } = await raffle.checkUpkeep(new Uint8Array())
      expect(upkeepNeeded).to.be.false
    })

    it("return false when the time has not been reached", async () => {
      const { raffle } = await setupTestEnv()
      const entranceFee = await raffle.getEntranceFee()
      await raffle.enter({ value: entranceFee })
      const { upkeepNeeded } = await raffle.checkUpkeep(new Uint8Array())
      expect(upkeepNeeded).to.be.false
    })

    it("return false when status is not OPEN", async () => {
      const { raffle } = await setupTestEnv()
      const entranceFee = await raffle.getEntranceFee()
      await raffle.enter({ value: entranceFee })
      await time.increase(networkConfig[getNetworkName()].interval + 1n)
      await raffle.performUpkeep(new Uint8Array())
      const { upkeepNeeded } = await raffle.checkUpkeep(new Uint8Array())
      expect(upkeepNeeded).to.be.false
    })

    it("return true when both time and player are met", async () => {
      const { raffle } = await setupTestEnv()
      const entranceFee = await raffle.getEntranceFee()
      await raffle.enter({ value: entranceFee })
      await time.increase(networkConfig[getNetworkName()].interval + 1n)
      const { upkeepNeeded } = await raffle.checkUpkeep(new Uint8Array())
      expect(upkeepNeeded).to.be.true
    })
  })

  describe("#performUpkeep()", () => {
    it("it will revert when check upkeep false", async () => {
      const { raffle } = await setupTestEnv()
      await expect(raffle.performUpkeep(new Uint8Array())).to.be.revertedWithCustomError(
        raffle,
        "Raffle__UpkeepNotNeeded"
      )
    })

    it("it will emit event when check upkeep true", async () => {
      const { raffle } = await setupTestEnv()
      const entranceFee = await raffle.getEntranceFee()
      await raffle.enter({ value: entranceFee })
      await time.increase(networkConfig[getNetworkName()].interval + 1n)
      await expect(raffle.performUpkeep(new Uint8Array()))
        .to.emit(raffle, "RequestedRaffleWinner")
        .withArgs((requestId: bigint) => {
          return requestId > 0
        })
      expect(await raffle.getRaffleState()).to.equal(1)
    })
  })

  describe("#fulfillRandomWords()", () => {
    it("can only be called after performUpkeep", async () => {
      const { raffle, vrfCoordinatorMock } = await setupTestEnv()
      // the requestId start with 1 so that 0 is a invalid one
      await expect(
        vrfCoordinatorMock.fulfillRandomWords(0, raffle.getAddress())
      ).to.revertedWithCustomError(vrfCoordinatorMock, "InvalidRequest")
    })

    it("pick the winner", async () => {
      const { raffle, vrfCoordinatorMock } = await setupTestEnv()
      const raffleAddress = await raffle.getAddress()
      const vrfCoordinatorMockAddress = await vrfCoordinatorMock.getAddress()
      const entranceFee = await raffle.getEntranceFee()
      const lastTimestamp = await raffle.getLastTimestamp()
      const presetWinnerIndex = 1
      // enter
      const accounts = await ethers.getSigners()
      for (let i = 0; i < 3; i++) {
        const newRaffle = raffle.connect(accounts[i])
        await newRaffle.enter({ value: entranceFee })
      }
      await time.increase(networkConfig[getNetworkName()].interval + 1n)
      const preWinnerBalance: bigint = await ethers.provider.getBalance(accounts[presetWinnerIndex])
      const preRaffleBalance: bigint = await ethers.provider.getBalance(raffle)
      // perform upkeep
      const transResp = await raffle.performUpkeep(new Uint8Array())
      const transReceipt = await transResp.wait(1)
      let requestId: bigint = 0n
      transReceipt?.logs.forEach((log) => {
        if (log.address === raffleAddress) {
          const parsedLog = raffle.interface.parseLog(log)
          if (parsedLog?.name == "RequestedRaffleWinner") {
            requestId = parsedLog.args.requestId
          }
        }
      })
      expect(requestId).to.gt(0)
      // listen on the WinnerPicked event
      await new Promise<void>(async (resolve, reject) => {
        raffle.once(raffle.filters.WinnerPicked, async (winner: string) => {
          try {
            const recentWinner = await raffle.getRecentWinner()
            const endingTimestamp = await raffle.getLastTimestamp()
            const raffleState = await raffle.getRaffleState()
            const nowBalance: bigint = await ethers.provider.getBalance(accounts[presetWinnerIndex])
            // after the raffle the player list will be cleared
            // panic code 0x32 (Array accessed at an out-of-bounds or negative index)
            await expect(raffle.getPlayer(0)).to.be.revertedWithPanic("0x32")
            expect(await raffle.getNumberOfPlayers()).to.equal(0)
            expect(recentWinner).to.equal(accounts[presetWinnerIndex].address)
            expect(endingTimestamp).to.be.gt(lastTimestamp)
            expect(raffleState).to.equal(0)
            expect(winner).to.equal(accounts[presetWinnerIndex].address)
            expect(nowBalance).to.equal(preWinnerBalance + preRaffleBalance)
            resolve()
          } catch (err) {
            reject(err)
          }
        })

        // fulfill random words (set the player with index 1 as the winner)
        const ffrwTransResp = await vrfCoordinatorMock.fulfillRandomWordsWithOverride(
          requestId,
          raffleAddress,
          [presetWinnerIndex]
        )
        const ffrwTransReceipt = await ffrwTransResp.wait(1)
        ffrwTransReceipt?.logs.forEach((log) => {
          if (log.address === vrfCoordinatorMockAddress) {
            const parsedLog = vrfCoordinatorMock.interface.parseLog(log)
            if (parsedLog?.name === "RandomWordsFulfilled") {
              expect(parsedLog.args.success).to.be.true
            }
          }
        })
      })
    })
  })
})
