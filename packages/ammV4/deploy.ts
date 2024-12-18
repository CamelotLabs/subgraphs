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

const { VERSION_AMMV4, NODE_AMMV4, DEPLOY_KEY  } = process.env

let ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'

if (TARGET_CHAIN.factoryV4 === ZERO_ADDRESS) throw new Error(`AMM V4: missing factory contract for ${TARGET_CHAIN.network}`)
if (TARGET_CHAIN.nftPositionManagerV4 === ZERO_ADDRESS) throw new Error(`AMM V4: missing NFT position manager contract for ${TARGET_CHAIN.network}`)
if (TARGET_CHAIN.wrappedNative === ZERO_ADDRESS) throw new Error(`AMM V4: missing wrapped native contract for ${TARGET_CHAIN.network}`)
if (TARGET_CHAIN.wrappedNativeUSDCPoolV4 === ZERO_ADDRESS) throw new Error(`AMM V4: missing wrapped native USDC pool contract for ${TARGET_CHAIN.network}`)
if (TARGET_CHAIN.stableCoins.length === 0) throw new Error(`AMM V4: missing stablecoin contract for ${TARGET_CHAIN.network}`)

execSync(`graph deploy ${TARGET_CHAIN.ammv4Name} --version-label ${VERSION_AMMV4} --node ${NODE_AMMV4 || "https://subgraphs.alchemy.com/api/subgraphs/deploy"} --deploy-key ${DEPLOY_KEY} --ipfs https://ipfs.satsuma.xyz`, { stdio: 'inherit' })