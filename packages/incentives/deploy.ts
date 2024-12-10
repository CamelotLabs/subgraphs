import TARGET_CHAIN from "common/generated/targetChain"
import { fileURLToPath } from 'url'
import path from "path"
import {execSync} from "child_process"
import dotenv from "dotenv"

const getCurrentDir = () => {
  const __filename = fileURLToPath(import.meta.url)
  return path.dirname(__filename)
}
const currentDir = getCurrentDir()
dotenv.config({ path: path.resolve(currentDir, '../../.env') });

const { VERSION_INCENTIVES, NODE_INCENTIVES, DEPLOY_KEY  } = process.env

let ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'

if (TARGET_CHAIN.campaignFactory === ZERO_ADDRESS) throw new Error(`Incentives: missing campaign factory contract for ${TARGET_CHAIN.network}`)
if (TARGET_CHAIN.distributor === ZERO_ADDRESS) throw new Error(`Incentives: missing distributor contract for ${TARGET_CHAIN.network}`)

execSync(`graph deploy ${TARGET_CHAIN.incentivesName} --version-label ${VERSION_INCENTIVES} --node ${NODE_INCENTIVES || "https://subgraphs.alchemy.com/api/subgraphs/deploy"} --deploy-key ${DEPLOY_KEY} --ipfs https://ipfs.satsuma.xyz`, { stdio: 'inherit' })