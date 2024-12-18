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

const { VERSION_AMMV3, NODE_AMMV3, DEPLOY_KEY  } = process.env

let ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'

if (TARGET_CHAIN.factoryV3 === ZERO_ADDRESS) throw new Error(`AMM V3: missing factory contract for ${TARGET_CHAIN.network}`)
if (TARGET_CHAIN.nftPositionManagerV3 === ZERO_ADDRESS) throw new Error(`AMM V3: missing NFT position manager contract for ${TARGET_CHAIN.network}`)
if (TARGET_CHAIN.wrappedNative === ZERO_ADDRESS) throw new Error(`AMM V3: missing wrapped native contract for ${TARGET_CHAIN.network}`)
if (TARGET_CHAIN.wrappedNativeUSDCPoolV3 === ZERO_ADDRESS) throw new Error(`AMM V3: missing wrapped native USDC pool contract for ${TARGET_CHAIN.network}`)
if (TARGET_CHAIN.stableCoins.length === 0) throw new Error(`AMM V3: missing stablecoin contract for ${TARGET_CHAIN.network}`)

execSync(`graph deploy ${TARGET_CHAIN.ammv3Name} --version-label ${VERSION_AMMV3} --node ${NODE_AMMV3 || "https://subgraphs.alchemy.com/api/subgraphs/deploy"} --deploy-key ${DEPLOY_KEY} --ipfs https://ipfs.satsuma.xyz`, { stdio: 'inherit' })