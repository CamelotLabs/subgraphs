# Tokens Subgraph

This subgraph indexes and tracks options and escrow token data on Arbitrum One, providing comprehensive analytics for user balances, exercises, allocations, and redemptions.

## Overview

The Tokens subgraph tracks:
- **Options Token**: Option token that can be exercised for GRAIL at a discount
- **Escrow Token**: Non-transferable governance token with allocation and redemption mechanisms

## Entities

### User
Tracks individual user token interactions and balances:
- `optionsBalance`: Current options balance
- `escrowBalance`: Available escrow balance (not allocated)
- `allocatedBalance`: Escrow tokens allocated to usage contracts
- `redemptionBalance`: Escrow tokens currently being redeemed
- `totalEscrowBalance`: Sum of escrow + allocated balances (excludes redemption)
- `allTimeExercisedLiquid`: Total options exercised for liquid GRAIL
- `allTimeExercisedEscrow`: Total options exercised for escrow tokens
- `allTimeEthPaid`: Total ETH paid for exercises

### Exercise
Records individual options exercise events:
- Exercise amount, payment amount, and discount
- Whether converted to escrow tokens or received as liquid GRAIL
- Transaction details and timestamps

### Token
Global token information:
- Token metadata (symbol, name, decimals)
- Total supply and holder count

### TokenBalance
Individual user balance for each token:
- Links users to their token holdings
- Enables multi-token tracking

### TokenDayData
Daily aggregated metrics:
- Daily volume and exercise amounts
- Daily ETH paid for exercises
- End-of-day supply and holder counts

### GlobalEscrowStats
Protocol-wide escrow token metrics:
- Total escrow token supply
- Total allocated and in redemption
- Unique holder count

## Events Tracked

### Options Token
- `Transfer`: Balance updates
- `Exercise`: Option exercises with ETH payment tracking

### Escrow Token
- `Transfer`: Balance updates
- `Allocate`: Allocations to usage contracts
- `Deallocate`: Deallocations with fee tracking
- `Redeem`: Redemption initiation
- `FinalizeRedeem`: Redemption completion
- `CancelRedeem`: Redemption cancellation

## Key Features

### Balance Tracking
- Real-time tracking of options and escrow token balances
- Separate tracking for allocated and redemption balances
- Historical balance snapshots through day data

### Exercise Analytics
- Tracks liquid vs escrowed exercise choices
- ETH payment tracking for discount calculations
- Individual exercise history per user

### Escrow Token State Management
- Allocation tracking to usage contracts
- Redemption lifecycle (pending → finalized/cancelled)
- Fee tracking on deallocations

### Global Metrics
- Protocol-wide supply and holder statistics
- Daily aggregations for trend analysis
- Separate metrics for options and escrow tokens

## Deployment

### Prerequisites
- Node.js v16+
- Yarn or npm
- Graph CLI installed globally

### Installation
```bash
yarn install
```

### Configuration
Update `networks.json` with the appropriate contract addresses and start blocks for your target network.

### Build
```bash
yarn codegen
yarn build
```

### Deploy
```bash
# Deploy to hosted service
graph deploy --product hosted-service <GITHUB_USER>/<SUBGRAPH_NAME>

# Deploy to decentralized network
graph deploy --product subgraph-studio <SUBGRAPH_NAME>
```

## Query Examples

### Get user token balances
```graphql
query UserBalances($user: ID!) {
  user(id: $user) {
    optionsBalance
    escrowBalance
    allocatedBalance
    redemptionBalance
    totalEscrowBalance
    allTimeExercisedLiquid
    allTimeExercisedEscrow
    allTimeEthPaid
  }
}
```

### Get recent exercises
```graphql
query RecentExercises {
  exercises(first: 10, orderBy: timestamp, orderDirection: desc) {
    amount
    paymentAmount
    discountInBps
    convert
    user {
      id
    }
    timestamp
  }
}
```

### Get global escrow stats
```graphql
query GlobalStats {
  globalEscrowStats(id: "global") {
    totalSupply
    totalAllocated
    totalInRedemption
    holdersCount
  }
}
```

### Get daily token metrics
```graphql
query DailyMetrics($token: ID!, $days: Int!) {
  tokenDayDatas(
    where: { token: $token }
    first: $days
    orderBy: date
    orderDirection: desc
  ) {
    date
    dailyVolumeToken
    dailyExercisedAmount
    dailyEthPaid
    totalSupply
    holderCount
  }
}
```
## License

MIT