/* eslint-disable prefer-const */
import { BigInt, BigDecimal, Address, bigDecimal } from '@graphprotocol/graph-ts'
import { Factory as FactoryContract } from '../types/templates/Pool/Factory'
import { TARGET_CHAIN } from 'common'

export const ADDRESS_ZERO = '0x0000000000000000000000000000000000000000'
export const FACTORY_ADDRESS = TARGET_CHAIN.factoryV4
export const WRAPPED_NATIVE = TARGET_CHAIN.wrappedNative
export const USDC_WMatic_03_POOL = TARGET_CHAIN.wrappedNativeUSDCPoolV4
export const MINIMUM_Matic_LOCKED = TARGET_CHAIN.minimumLiquidityThresholdETH
export const WHITELIST_TOKENS = TARGET_CHAIN.whitelistTokens
export const STABLE_COINS = TARGET_CHAIN.stableCoins

export const FEE_DENOMINATOR = BigDecimal.fromString('1000000') 

export let ZERO_BI = BigInt.fromI32(0)
export let ONE_BI = BigInt.fromI32(1)
export let ZERO_BD = BigDecimal.fromString('0')
export let ONE_BD = BigDecimal.fromString('1')
export let BI_18 = BigInt.fromI32(18)

export let factoryContract = FactoryContract.bind(Address.fromString(FACTORY_ADDRESS))

export let poolsList = [""]