/* eslint-disable prefer-const */
import { BigInt, BigDecimal, Address } from '@graphprotocol/graph-ts'
import { Factory as FactoryContract } from '../types/templates/Pool/Factory'
import { TARGET_CHAIN } from 'common'

const ADDRESS_ZERO = '0x0000000000000000000000000000000000000000'
const FACTORY_ADDRESS = TARGET_CHAIN.factoryV3
const WRAPPED_NATIVE = TARGET_CHAIN.wrappedNative
const USDC_WMatic_03_POOL = TARGET_CHAIN.wrappedNativeUSDCPoolV3
const MINIMUM_Matic_LOCKED = TARGET_CHAIN.minimumLiquidityThresholdETH
const WHITELIST_TOKENS: string[] = TARGET_CHAIN.whitelistTokens
const STABLE_COINS: string[] = TARGET_CHAIN.stableCoins

let ZERO_BI = BigInt.fromI32(0)
let ONE_BI = BigInt.fromI32(1)
let ZERO_BD = BigDecimal.fromString('0')
let ONE_BD = BigDecimal.fromString('1')
let BI_18 = BigInt.fromI32(18)
let TICK_SPACING = BigInt.fromI32(1)

let factoryContract = FactoryContract.bind(Address.fromString(FACTORY_ADDRESS))

let poolsList = [""]

export {
  ADDRESS_ZERO,
  FACTORY_ADDRESS,
  WRAPPED_NATIVE,
  USDC_WMatic_03_POOL,
  MINIMUM_Matic_LOCKED,
  WHITELIST_TOKENS,
  STABLE_COINS,
  ZERO_BI,
  ONE_BI,
  ZERO_BD,
  ONE_BD,
  BI_18,
  TICK_SPACING,
  factoryContract,
  poolsList
}