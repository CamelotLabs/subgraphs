import { Transfer as TransferEvent, Exercise as ExerciseEvent } from '../../generated/OptionsToken/OptionsToken'
import { User, Exercise, Token, TokenBalance, GlobalOptionsStats } from '../../generated/schema'
import { Address, BigInt, log } from '@graphprotocol/graph-ts'
import {
  ZERO_BI,
  ONE_BI,
  ZERO_BD,
  convertTokenToDecimal,
  loadOrCreateUser,
  loadOrCreateToken,
  loadOrCreateTokenBalance,
  loadOrCreateTransaction,
  updateTokenDayData,
  loadOrCreateGlobalOptionsStats
} from './helpers'
import { TARGET_CHAIN } from 'common'
let OPTIONS_DECIMALS = BigInt.fromI32(18)
let ETH_DECIMALS = BigInt.fromI32(18)

export function handleTransfer(event: TransferEvent): void {
  let timestamp = event.block.timestamp
  let from = event.params.from
  let to = event.params.to
  let value = convertTokenToDecimal(event.params.value, OPTIONS_DECIMALS)
  
  // Load or create token
  let token = loadOrCreateToken(
    Address.fromString(TARGET_CHAIN.optionsToken),
    'OPTIONS',
    'Options Token',
    OPTIONS_DECIMALS
  )
  
  // Handle from user (sender)
  if (from.toHex() != '0x0000000000000000000000000000000000000000') {
    let fromUser = loadOrCreateUser(from, timestamp)
    fromUser.optionsBalance = fromUser.optionsBalance.minus(value)
    fromUser.updatedAt = timestamp
    fromUser.save()
    
    // Update token balance for sender
    let fromBalance = loadOrCreateTokenBalance(fromUser.id, token.id, timestamp)
    fromBalance.amount = fromUser.optionsBalance
    fromBalance.updatedAt = timestamp
    fromBalance.save()
    
    // Update holder count if balance reaches zero
    if (fromUser.optionsBalance.equals(ZERO_BD)) {
      token.holderCount = token.holderCount.minus(ONE_BI)
    }
  } else {
    // Minting - increase total supply
    token.totalSupply = token.totalSupply.plus(value)
  }
  
  // Handle to user (receiver)
  if (to.toHex() != '0x0000000000000000000000000000000000000000') {
    let toUser = loadOrCreateUser(to, timestamp)
    let previousBalance = toUser.optionsBalance
    toUser.optionsBalance = toUser.optionsBalance.plus(value)
    toUser.updatedAt = timestamp
    toUser.save()
    
    // Update token balance for receiver
    let toBalance = loadOrCreateTokenBalance(toUser.id, token.id, timestamp)
    toBalance.amount = toUser.optionsBalance
    toBalance.updatedAt = timestamp
    toBalance.save()
    
    // Update holder count if this is first token
    if (previousBalance.equals(ZERO_BD) && !toUser.optionsBalance.equals(ZERO_BD)) {
      token.holderCount = token.holderCount.plus(ONE_BI)
    }
  } else {
    // Burning - decrease total supply
    token.totalSupply = token.totalSupply.minus(value)
  }
  
  token.save()
  
  // Update day data
  updateTokenDayData(
    token.id,
    timestamp,
    value,
    ZERO_BD,
    ZERO_BD
  )
}

export function handleExercise(event: ExerciseEvent): void {
  let timestamp = event.block.timestamp
  let blockNumber = event.block.number
  let txHash = event.transaction.hash
  let logIndex = event.logIndex
  
  // Create unique ID for this exercise event
  let exerciseId = txHash.toHex() + '-' + logIndex.toString()
  
  // Load or create user
  let user = loadOrCreateUser(event.params.sender, timestamp)
  
  // Convert amounts to decimal
  let amount = convertTokenToDecimal(event.params.amount, OPTIONS_DECIMALS)
  let paymentAmount = convertTokenToDecimal(event.params.paymentAmount, ETH_DECIMALS)
  
  // Update user exercise statistics
  if (event.params.convert) {
    // If converted to xToken
    user.allTimeExercisedEscrowToken = user.allTimeExercisedEscrowToken.plus(amount)
  } else {
    // If received as main token
    user.allTimeExercisedMainToken = user.allTimeExercisedMainToken.plus(amount)
  }
  user.allTimeEthPaid = user.allTimeEthPaid.plus(paymentAmount)
  user.updatedAt = timestamp
  user.save()
  
  // Update global options statistics
  let globalStats = loadOrCreateGlobalOptionsStats()
  globalStats.totalExercises = globalStats.totalExercises.plus(ONE_BI)
  if (event.params.convert) {
    globalStats.totalEscrowTokenConversions = globalStats.totalEscrowTokenConversions.plus(ONE_BI)
    globalStats.totalEscrowTokenConverted = globalStats.totalEscrowTokenConverted.plus(amount)
  } else {
    globalStats.totalMainTokenConversions = globalStats.totalMainTokenConversions.plus(ONE_BI)
    globalStats.totalMainTokenConverted = globalStats.totalMainTokenConverted.plus(amount)
  }
  globalStats.totalETHCollected = globalStats.totalETHCollected.plus(paymentAmount)
  globalStats.lastUpdateBlock = blockNumber
  globalStats.lastUpdateTimestamp = timestamp
  globalStats.save()
  
  // Create transaction entity
  let transaction = loadOrCreateTransaction(txHash, blockNumber, timestamp)
  
  // Create exercise entity
  let exercise = new Exercise(exerciseId)
  exercise.user = user.id
  exercise.recipient = event.params.recipient
  exercise.amount = amount
  exercise.paymentAmount = paymentAmount
  exercise.discountInBps = event.params.discountInBps
  exercise.convert = event.params.convert
  exercise.transaction = transaction.id
  exercise.timestamp = timestamp
  exercise.blockNumber = blockNumber
  exercise.save()
  
  // Update token day data
  let token = Token.load(TARGET_CHAIN.optionsToken)
  if (token !== null) {
    updateTokenDayData(
      token.id,
      timestamp,
      amount,
      amount,
      paymentAmount
    )
  }
  
  log.info('Exercise processed: user={}, amount={}, ethPaid={}, convert={}', [
    user.id,
    amount.toString(),
    paymentAmount.toString(),
    event.params.convert.toString()
  ])
}