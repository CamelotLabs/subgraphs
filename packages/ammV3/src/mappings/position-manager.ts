/* eslint-disable prefer-const */
import {
  Collect,
  IncreaseLiquidity,
  DecreaseLiquidity,
  NonfungiblePositionManager,
  Transfer
} from '../types/NonfungiblePositionManager/NonfungiblePositionManager'
import { Position, PositionSnapshot, Token, User, PoolUser } from '../types/schema'
import { ADDRESS_ZERO, factoryContract, ZERO_BD, ZERO_BI, poolsList} from '../utils/constants'
import { BigInt, Bytes, ethereum } from '@graphprotocol/graph-ts'
import { convertTokenToDecimal, loadTransaction } from '../utils'
import { getEthPriceInUSD } from '../utils/pricing'

function getUser(address: Bytes) : User {
  let user = User.load(address)
  if(user === null) {
    user = new User(address)
    user.save()
  }
  return user
}

function getPoolUser(pool: string, user: Bytes) : PoolUser {
  let id = Bytes.fromHexString(pool).concat(user)
  let poolUser = PoolUser.load(id)
  if(poolUser === null) {
    poolUser = new PoolUser(id)
    poolUser.user = user
    poolUser.pool = pool
    poolUser.collectedFeesUsd = ZERO_BD
    poolUser.collectedFeesToken0 = ZERO_BD
    poolUser.collectedFeesToken1 = ZERO_BD
    poolUser.save()
  }
  return poolUser
}

function getPosition(event: ethereum.Event, tokenId: BigInt): Position | null {
  let position = Position.load(tokenId.toString())
  if (position === null) {
    let contract = NonfungiblePositionManager.bind(event.address)
    let positionCall = contract.try_positions(tokenId)

    // the following call reverts in situations where the position is minted
    // and deleted in the same block 
    const stringBoolean = `${positionCall.reverted}`;
    if (!positionCall.reverted) {
      let positionResult = positionCall.value
      let poolAddress = factoryContract.poolByPair(positionResult.value2, positionResult.value3)
      let owner = getUser(Bytes.fromHexString(ADDRESS_ZERO))

      position = new Position(tokenId.toString())
      // The owner gets correctly updated in the Transfer handler
      position.owner = owner.id
      position.pool = poolAddress.toHexString()
      if(poolsList.includes(position.pool)){
        position.token0 = positionResult.value3.toHexString()
        position.token1 = positionResult.value2.toHexString()
      }
      else{
        position.token0 = positionResult.value2.toHexString()
        position.token1 = positionResult.value3.toHexString()
      } 
      position.tickLower = position.pool.concat('#').concat(positionResult.value4.toString())
      position.tickUpper = position.pool.concat('#').concat(positionResult.value5.toString())
      position.liquidity = ZERO_BI
      position.depositedToken0 = ZERO_BD
      position.depositedToken1 = ZERO_BD
      position.withdrawnToken0 = ZERO_BD
      position.withdrawnToken1 = ZERO_BD
      position.collectedToken0 = ZERO_BD
      position.collectedToken1 = ZERO_BD
      position.collectedFeesToken0 = ZERO_BD
      position.collectedFeesToken1 = ZERO_BD
      position.transaction = loadTransaction(event).id
      position.feeGrowthInside0LastX128 = positionResult.value7
      position.feeGrowthInside1LastX128 = positionResult.value8
    }
  }

  return position
  
  return null 
}


function updateFeeVars(position: Position, event: ethereum.Event, tokenId: BigInt): Position {

  let positionManagerContract = NonfungiblePositionManager.bind(event.address)
  let positionResult = positionManagerContract.try_positions(tokenId)
  if (!positionResult.reverted) {
    position.feeGrowthInside0LastX128 = positionResult.value.value7
    position.feeGrowthInside1LastX128 = positionResult.value.value8
  }
  return position
}

function savePositionSnapshot(position: Position, event: ethereum.Event): void {
  
  let positionSnapshot = new PositionSnapshot(position.id.concat('#').concat(event.block.number.toString()))
  positionSnapshot.owner = position.owner
  positionSnapshot.pool = position.pool
  positionSnapshot.position = position.id
  positionSnapshot.blockNumber = event.block.number
  positionSnapshot.timestamp = event.block.timestamp
  positionSnapshot.liquidity = position.liquidity

  if(poolsList.includes(position.pool)){
    positionSnapshot.depositedToken0 = position.depositedToken1
    positionSnapshot.depositedToken1 = position.depositedToken0
    positionSnapshot.withdrawnToken0 = position.withdrawnToken1
    positionSnapshot.withdrawnToken1 = position.withdrawnToken0
    positionSnapshot.collectedFeesToken0 = position.collectedFeesToken1
    positionSnapshot.collectedFeesToken1 = position.collectedFeesToken0
    positionSnapshot.transaction = loadTransaction(event).id
    positionSnapshot.feeGrowthInside0LastX128 = position.feeGrowthInside1LastX128
    positionSnapshot.feeGrowthInside1LastX128 = position.feeGrowthInside0LastX128
  }
  else{
    positionSnapshot.depositedToken0 = position.depositedToken0
    positionSnapshot.depositedToken1 = position.depositedToken1
    positionSnapshot.withdrawnToken0 = position.withdrawnToken0
    positionSnapshot.withdrawnToken1 = position.withdrawnToken1
    positionSnapshot.collectedFeesToken0 = position.collectedFeesToken0
    positionSnapshot.collectedFeesToken1 = position.collectedFeesToken1
    positionSnapshot.transaction = loadTransaction(event).id
    positionSnapshot.feeGrowthInside0LastX128 = position.feeGrowthInside0LastX128
    positionSnapshot.feeGrowthInside1LastX128 = position.feeGrowthInside1LastX128
  }

  positionSnapshot.save()
}

export function handleIncreaseLiquidity(event: IncreaseLiquidity): void {
  
  let position = getPosition(event, event.params.tokenId)

  // position was not able to be fetched
  if (position == null) {
    return
  }

  let token0 = Token.load(position.token0)
  let token1 = Token.load(position.token1)



  let amount1 = ZERO_BD
  let amount0 = ZERO_BD

    if(poolsList.includes(position.pool))
      amount0 = convertTokenToDecimal(event.params.amount1, token0!.decimals)
    else
      amount0 = convertTokenToDecimal(event.params.amount0, token0!.decimals)

    if(poolsList.includes(position.pool))
      amount1 = convertTokenToDecimal(event.params.amount0, token1!.decimals)
    else
      amount1 = convertTokenToDecimal(event.params.amount1, token1!.decimals)

  position.liquidity = position.liquidity.plus(event.params.liquidity)
  position.depositedToken0 = position.depositedToken0.plus(amount0)
  position.depositedToken1 = position.depositedToken1.plus(amount1)
  

  // recalculatePosition(position)
  
  
  position.save()

  savePositionSnapshot(position, event)
  
}

export function handleDecreaseLiquidity(event: DecreaseLiquidity): void {
  let position = getPosition(event, event.params.tokenId)

  // position was not able to be fetched
  if (position == null) {
    return
  }

  let token0 = Token.load(position.token0)
  let token1 = Token.load(position.token1)


  let amount1 = ZERO_BD
  let amount0 = ZERO_BD

    if(poolsList.includes(position.pool))
      amount0 = convertTokenToDecimal(event.params.amount1, token0!.decimals)
    else
      amount0 = convertTokenToDecimal(event.params.amount0, token0!.decimals)
  

    if(poolsList.includes(position.pool))
      amount1 = convertTokenToDecimal(event.params.amount0, token1!.decimals)
    else
      amount1 = convertTokenToDecimal(event.params.amount1, token1!.decimals)
  

  position.liquidity = position.liquidity.minus(event.params.liquidity)
  position.withdrawnToken0 = position.withdrawnToken0.plus(amount0)
  position.withdrawnToken1 = position.withdrawnToken1.plus(amount1)

  position = updateFeeVars(position, event, event.params.tokenId)
  // recalculatePosition(position)

  position.save()

  savePositionSnapshot(position, event)
}


export function handleCollect(event: Collect): void {
  let position = getPosition(event, event.params.tokenId)

  // position was not able to be fetched
  if (position == null) {
    return
  }

  let token0 = Token.load(position.token0)
  let token1 = Token.load(position.token1)

  let owner = getUser(position.owner)
  let poolUser = getPoolUser(position.pool, owner.id)

  let amount1 = ZERO_BD
  let amount0 = ZERO_BD


    if(poolsList.includes(position.pool))
      amount0 = convertTokenToDecimal(event.params.amount1, token0!.decimals)
    else
      amount0 = convertTokenToDecimal(event.params.amount0, token0!.decimals)
  
  
    if(poolsList.includes(position.pool))
      amount1 = convertTokenToDecimal(event.params.amount0, token1!.decimals)
    else
      amount1 = convertTokenToDecimal(event.params.amount1, token1!.decimals)


  position.collectedToken0 = position.collectedToken0.plus(amount0)
  position.collectedToken1 = position.collectedToken1.plus(amount1)

  let prevCollectedFeesToken0 = position.collectedFeesToken0
  let prevCollectedFeesToken1 = position.collectedFeesToken1

  position.collectedFeesToken0 = position.collectedToken0.minus(position.withdrawnToken0)
  position.collectedFeesToken1 = position.collectedToken1.minus(position.withdrawnToken1)

  position = updateFeeVars(position, event, event.params.tokenId)

  poolUser.collectedFeesToken0 = poolUser.collectedFeesToken0.plus(position.collectedFeesToken0.minus(prevCollectedFeesToken0))
  poolUser.collectedFeesToken1 = poolUser.collectedFeesToken1.plus(position.collectedFeesToken1.minus(prevCollectedFeesToken1))

  poolUser.collectedFeesUsd = poolUser.collectedFeesUsd.plus(
    (position.collectedFeesToken0.minus(prevCollectedFeesToken0)).times(token0!.derivedMatic).times(getEthPriceInUSD())
  ).plus(
    (position.collectedFeesToken1.minus(prevCollectedFeesToken1)).times(token1!.derivedMatic).times(getEthPriceInUSD())
  )

  // recalculatePositi5on(position)

  position.save()
  poolUser.save()

  savePositionSnapshot(position, event)
}

export function handleTransfer(event: Transfer): void {
  
  let position = getPosition(event, event.params.tokenId)

  // position was not able to be fetched
  if (position == null) {
    return
  }

  let owner = getUser(event.params.to)
  position.owner = owner.id
  position.save()

  savePositionSnapshot(position, event)
  
  
}

