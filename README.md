# MoyPay Auto-Earn

A TypeScript-based cron job service that automatically executes earning transactions for employees in the MoyPay salary streaming system on Etherlink (Tezos Layer 2).

## Overview

MoyPay is a decentralized payroll system that enables real-time salary streaming and automatic earning features. This backend service monitors employee configurations and automatically triggers earning transactions when certain thresholds are met, providing a seamless experience for users who want to automatically compound their earnings into DeFi protocols.

## Features

- **Automated Cron Jobs**: Runs on configurable intervals to check employee auto-earn statuses
- **Smart Contract Integration**: Executes `autoEarn` functions on organization contracts
- **GraphQL Integration**: Fetches employee and organization data from the MoyPay indexer
- **Real-time Salary Calculations**: Computes current salary balances based on streaming parameters
- **Gas Management**: Checks wallet balance and estimates gas costs before transactions
- **Comprehensive Logging**: Winston-based logging with configurable levels
- **REST API**: Provides health checks and manual trigger endpoints

## Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Cron Service  │    │   GraphQL API    │    │  Blockchain     │
│                 │───▶│  (Indexer)       │    │  (Etherlink)    │
│ • Check configs │    │ • Employee data  │    │ • Organization  │
│ • Calculate     │    │ • Auto-earn      │    │   contracts     │
│   balances      │    │   settings       │    │ • Auto-earn     │
│ • Trigger txs   │    │                  │    │   execution     │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## Installation

### Prerequisites

- Node.js 18+ 
- pnpm package manager
- A funded Ethereum wallet (for gas fees)
- Access to MoyPay GraphQL indexer

### Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd backend
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Build the project**
   ```bash
   pnpm build
   ```

## Configuration

Create a `.env` file based on `.env.example`:

```bash
# RPC Configuration
RPC_URL=https://node.ghostnet.etherlink.com
CHAIN_ID=128123

# Private Key for executing transactions (should be a wallet with ETH for gas)
PRIVATE_KEY=your_private_key_here

# Contract Addresses
FACTORY_ADDRESS=0xad059404d7e1afcd19d7bef3a01f4416989a8d64

# Indexer/GraphQL API Configuration
INDEXER_URL=https://indexer.moypay.xyz
GRAPHQL_ENDPOINT=https://indexer.moypay.xyz/graphql

# Cronjob Configuration
CRON_SCHEDULE=*/5 * * * *  # Check every 5 minutes

# Server Configuration
PORT=3001

# Logging
LOG_LEVEL=info
```

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `RPC_URL` | Etherlink RPC endpoint | `https://node.ghostnet.etherlink.com` |
| `CHAIN_ID` | Etherlink chain ID | `128123` |
| `PRIVATE_KEY` | Private key for transaction execution | **Required** |
| `FACTORY_ADDRESS` | MoyPay factory contract address | `0xad059404d7e1afcd19d7bef3a01f4416989a8d64` |
| `INDEXER_URL` | MoyPay indexer base URL | `https://indexer.moypay.xyz` |
| `GRAPHQL_ENDPOINT` | GraphQL API endpoint | `https://indexer.moypay.xyz/graphql` |
| `CRON_SCHEDULE` | Cron expression for job frequency | `*/5 * * * *` |
| `PORT` | Server port | `3001` |
| `LOG_LEVEL` | Logging level (debug, info, warn, error) | `info` |

## Usage

### Development

```bash
# Run in development mode with hot reload
pnpm dev

# Run with file watching
pnpm dev:watch
```

### Production

```bash
# Build and start
pnpm build
pnpm start
```

### Scripts

- `pnpm dev` - Run in development mode
- `pnpm dev:watch` - Run with nodemon watching
- `pnpm build` - Compile TypeScript to JavaScript
- `pnpm build:watch` - Build with watching
- `pnpm start` - Run compiled JavaScript
- `pnpm format` - Format code with Prettier
- `pnpm format:check` - Check code formatting

## API Endpoints

### Health Check
```http
GET /health
```
Returns service status and wallet information.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "walletAddress": "0x742d35Cc6000C4532e4305f5F065295B7Bb2a"
}
```

### Wallet Balance
```http
GET /wallet/balance
```
Returns current wallet balance and gas price information.

**Response:**
```json
{
  "balance": "0.5",
  "gasPrice": {
    "gasPrice": "20.0",
    "maxFeePerGas": "25.0",
    "maxPriorityFeePerGas": "2.0"
  }
}
```

### Manual Auto-Earn Trigger
```http
POST /trigger-autoearn
Content-Type: application/json

{
  "organizationAddress": "0x...",
  "employeeAddress": "0x..."
}
```

Manually triggers an auto-earn transaction for a specific employee.

**Response:**
```json
{
  "success": true,
  "txHash": "0x...",
  "blockNumber": 12345,
  "gasUsed": "50000"
}
```

## How It Works

1. **Cron Job Execution**: The service runs on the configured schedule (default: every 5 minutes)

2. **Data Fetching**: 
   - Fetches all employees with auto-earn enabled from GraphQL API
   - Retrieves auto-earn configurations and organization settings

3. **Balance Calculation**:
   - Calculates current salary balance based on streaming parameters
   - Considers salary per second, time elapsed, and previous withdrawals

4. **Threshold Checking**:
   - Compares current balance against auto-earn threshold
   - Only processes employees who have reached their threshold

5. **Transaction Execution**:
   - Estimates gas costs for the transaction
   - Executes `autoEarn` function on the organization contract
   - Logs transaction details and results

## Smart Contract Integration

The service interacts with Organization contracts that implement the auto-earn functionality:

```solidity
interface IOrganization {
    function autoEarn(address _user) external;
    function employeeSalary(address) external view returns (
        string memory name,
        uint256 salary,
        uint256 unrealizedSalary,
        uint256 startStream,
        uint256 createdAt,
        bool status
    );
    function userEarn(address, uint256) external view returns (
        address protocol,
        uint256 shares,
        uint256 autoEarnAmount,
        bool isAutoEarn
    );
}
```

## Monitoring and Logging

The service uses Winston for structured logging with the following levels:

- **Error**: Transaction failures, critical errors
- **Warn**: Insufficient balance, missing data
- **Info**: Successful transactions, cron job completions
- **Debug**: Detailed balance calculations, gas estimates

Example log output:
```
2024-01-15T10:30:00.000Z [info]: Running cron job to check employee auto-earn statuses
2024-01-15T10:30:05.000Z [info]: Employee 0x742d35Cc6000C4532e4305f5F065295B7Bb2a: currentBalance=150.5 USDC, autoEarnAmount=100, availableBalance=150.5 USDC
2024-01-15T10:30:10.000Z [info]: Auto-earn successful for 0x742d35Cc6000C4532e4305f5F065295B7Bb2a: 0x123...abc
2024-01-15T10:30:15.000Z [info]: Cron job completed. Processed 1 employees.
```

## Security Considerations

- **Private Key Management**: Store private keys securely, never commit to version control
- **Gas Price Monitoring**: The service includes gas price checks to prevent excessive fees
- **Balance Verification**: Always checks wallet balance before executing transactions
- **Rate Limiting**: Built-in delays between transactions to prevent spam

## Development

### Project Structure

```
src/
├── config/
│   └── index.ts          # Configuration management
├── services/
│   ├── blockchain.ts     # Blockchain interactions
│   └── graphql.ts        # GraphQL API client
├── utils/
│   ├── logger.ts         # Logging configuration
│   └── salary.ts         # Salary calculations
└── index.ts              # Main application entry
```

### Key Components

- **Blockchain Service**: Handles smart contract interactions and transaction execution
- **GraphQL Service**: Fetches data from the MoyPay indexer
- **Salary Utils**: Calculates real-time salary balances based on streaming parameters
- **Logger**: Structured logging with Winston

## Troubleshooting

### Common Issues

1. **Insufficient Gas**
   ```
   Error: insufficient funds for gas
   ```
   - Ensure wallet has enough ETH for gas fees
   - Check current gas prices on the network

2. **GraphQL Connection Issues**
   ```
   GraphQL query failed: connect ECONNREFUSED
   ```
   - Verify `GRAPHQL_ENDPOINT` is correct and accessible
   - Check network connectivity

3. **Transaction Failures**
   ```
   Transaction failed with status: 0
   ```
   - Check contract addresses are correct
   - Verify employee has sufficient balance for auto-earn
   - Ensure auto-earn is enabled and active

### Debugging

Enable debug logging:
```bash
LOG_LEVEL=debug pnpm dev
```

Check wallet balance:
```bash
curl http://localhost:3001/wallet/balance
```

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Related Projects

- **MoyPay Smart Contracts**: Core contracts for the salary streaming system
- **MoyPay Indexer**: GraphQL API for querying blockchain data

## Support

For support and questions:
- Create an issue in this repository
- Contact the MoyPay team

