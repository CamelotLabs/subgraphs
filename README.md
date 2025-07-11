# Camelot Subgraphs Master 

## Subgraphs List
- AMMv2
- AMMv3
- AMMv4
- Blocks
- Incentives

## Building & Deploying
Declare env vars

```
// chain ID for given deployment
CHAIN_ID=

// subgraph versions to deploy
VERSION_AMMV2=
VERSION_AMMV3=
VERSION_AMMV4=
VERSION_BLOCKS=

// subgraph deploy key
DEPLOY_KEY=
```

Deploy a subgraph to given network
`pnpm run deploy-<subgraph_name>`

All individual build, codegen, etc commands can be run for individual subgraphs from the top level using `pnpm run` or by invoking them from within the sub repos directly:

1) Fetch chain list config:
```
pnpm --filter common run get-chain-config
```
2) Write the subgraph config to `packages/xxx/subgraph.yaml`:
```
pnpm --filter <package_name> run set-config
```
3) Generate subgraph artifacts:
```
pnpm --filter <package_name> run codegen
```
4) Build the subgraph:
```
pnpm --filter <package_name> run build
```
5) Deploy the subgraph:
```
pnpm --filter <package_name> run deploy
```
Note: deployments currently only work with Alchemy/Satsuma subgraphs infra. For TheGraph deployments, go from step 1) to 4) manually, then proceed with this command to deploy:
```
pnpm --filter <package_name> exec npx graph <params>
```