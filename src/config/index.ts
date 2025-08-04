import dotenv from 'dotenv';

dotenv.config();

interface Config {
  rpcUrl: string;
  chainId: number;
  privateKey: string;
  factoryAddress: string;
  indexerUrl: string;
  graphqlEndpoint: string;
  cronSchedule: string;
  port: number;
  logLevel: string;
  periodTimes: {
    DAILY: number;
    WEEKLY: number;
    MONTHLY: number;
    YEARLY: number;
  };
}

const config: Config = {
  rpcUrl: process.env.RPC_URL || 'https://node.ghostnet.etherlink.com',
  chainId: parseInt(process.env.CHAIN_ID || '128123'),
  privateKey: process.env.PRIVATE_KEY || '',
  factoryAddress:
    process.env.FACTORY_ADDRESS || '0xad059404d7e1afcd19d7bef3a01f4416989a8d64',
  indexerUrl: process.env.INDEXER_URL || 'https://indexer.moypay.xyz',
  graphqlEndpoint:
    process.env.GRAPHQL_ENDPOINT || 'https://indexer.moypay.xyz/graphql',
  cronSchedule: process.env.CRON_SCHEDULE || '*/5 * * * *',
  port: parseInt(process.env.PORT || '3001'),
  logLevel: process.env.LOG_LEVEL || 'info',
  periodTimes: {
    DAILY: 86400,
    WEEKLY: 604800,
    MONTHLY: 2592000,
    YEARLY: 31536000,
  },
};

if (!config.privateKey) {
  throw new Error('PRIVATE_KEY environment variable is required');
}

export default config;
