import { run, deployments } from "hardhat"

export const verify = async function (contractAddress: string, args: any[]) {
  deployments.log("Verifing...")
  try {
    await run("verify:verify", {
      address: contractAddress,
      constructorArguments: args,
    })
    deployments.log("Contract verified successfully!")
  } catch (error) {
    console.error("Failed to verify contract\n", error)
  }
}
