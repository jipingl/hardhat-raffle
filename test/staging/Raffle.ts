import { deployments, ethers } from "hardhat"
import { isDevelopmentNetwork } from "@/helper-config"
import { Raffle } from "@/typechain-types"
import { expect } from "chai"
import { describe, it } from "mocha"

describe("(StagingTest)Raffle", () => {
  before(function () {
    if (isDevelopmentNetwork()) {
      this.skip()
    }
  })

  const setupTestEnv = deployments.createFixture(async ({ getNamedAccounts, ethers }) => {
    const { deployer } = await getNamedAccounts()
    const raffle: Raffle = await ethers.getContract("Raffle", deployer)
    const entranceFee: bigint = await raffle.getEntranceFee()
    return { raffle, entranceFee, deployer }
  })

  describe("#fulfillRandomWords()", () => {
    it("work with live chainlink keeper and vrf and then get a random winner", async () => {
      const { raffle, entranceFee, deployer } = await setupTestEnv()
      const lastTimestamp = await raffle.getLastTimestamp()
      const transResp = await raffle.enter({ value: entranceFee })
      // ⚠️ must wait block mined before query balance
      await transResp.wait(1)
      const preBalance = await ethers.provider.getBalance(deployer)
      const preRaffleBalance: bigint = await ethers.provider.getBalance(raffle)

      // listen on WinnerPick event
      await new Promise<void>((resolve, reject) => {
        raffle.once(raffle.filters.WinnerPicked, async (winner: string) => {
          console.log("Winner picked: ", winner)
          try {
            const nowBalance = await ethers.provider.getBalance(deployer)
            const recentWinner = await raffle.getRecentWinner()
            const raffleState = await raffle.getRaffleState()
            const endingTimestamp = await raffle.getLastTimestamp()
            await expect(raffle.getPlayer(0)).to.be.revertedWithPanic("0x32")
            expect(await raffle.getNumberOfPlayers()).to.equal(0)
            expect(recentWinner).to.equal(deployer)
            expect(raffleState).to.equal(0)
            expect(winner).to.equal(deployer)
            expect(endingTimestamp).to.be.gt(lastTimestamp)
            expect(nowBalance).to.equal(preBalance + preRaffleBalance + 1n)
            resolve()
          } catch (err) {
            reject(err)
          }
        })
      })
    })
  })
})
