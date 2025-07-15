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

const { VERSION_AMMV2_VANILLA, NODE_AMMV2_VANILLA, DEPLOY_KEY  } = process.env

let ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'

if (TARGET_CHAIN.factoryV2 === ZERO_ADDRESS) throw new Error(`AMM V2 Vanilla: missing factory contract for ${TARGET_CHAIN.network}`)
if (TARGET_CHAIN.wrappedNative === ZERO_ADDRESS) throw new Error(`AMM V2 Vanilla: missing wrapped native contract for ${TARGET_CHAIN.network}`)
if (TARGET_CHAIN.wrappedNativeUSDCPoolV2 === ZERO_ADDRESS) throw new Error(`AMM V2 Vanilla: missing wrapped native USDC pool contract for ${TARGET_CHAIN.network}`)
if (TARGET_CHAIN.stableCoin === ZERO_ADDRESS) throw new Error(`AMM V2 Vanilla: missing stablecoin contract for ${TARGET_CHAIN.network}`)

execSync(`graph deploy ${TARGET_CHAIN.ammv2Name} --version-label ${VERSION_AMMV2_VANILLA} --node ${NODE_AMMV2_VANILLA || "https://subgraphs.alchemy.com/api/subgraphs/deploy"} --deploy-key ${DEPLOY_KEY} --ipfs https://ipfs.satsuma.xyz`, { stdio: 'inherit' })