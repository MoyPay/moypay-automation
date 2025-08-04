import { ethers } from 'ethers';
import config from '../config';
import { logger } from '../utils/logger';

const ORGANIZATION_ABI = [
  'function autoEarn(address _user) external',
  'function employeeSalary(address) external view returns (string memory name, uint256 salary, uint256 unrealizedSalary, uint256 startStream, uint256 createdAt, bool status)',
  'function userEarn(address, uint256) external view returns (address protocol, uint256 shares, uint256 autoEarnAmount, bool isAutoEarn)',
];

const provider = new ethers.JsonRpcProvider(config.rpcUrl);
const wallet = new ethers.Wallet(config.privateKey, provider);

logger.info(`Initialized blockchain service with wallet: ${wallet.address}`);

export async function executeAutoEarn(
  organizationAddress: string,
  employeeAddress: string
) {
  try {
    logger.info(
      `Executing autoEarn for employee ${employeeAddress} in organization ${organizationAddress}`
    );

    const contract = new ethers.Contract(
      organizationAddress,
      ORGANIZATION_ABI,
      wallet
    );

    if (!contract['autoEarn']) {
      throw new Error('autoEarn function not found on the contract');
    }

    const gasEstimate = await contract['autoEarn'].estimateGas(employeeAddress);
    const gasLimit = (gasEstimate * BigInt(120)) / BigInt(100);

    logger.info(
      `Gas estimate: ${gasEstimate.toString()}, using limit: ${gasLimit.toString()}`
    );

    const tx = await contract['autoEarn'](employeeAddress, {
      gasLimit: gasLimit,
    });

    logger.info(`AutoEarn transaction sent: ${tx.hash}`);

    const receipt = await tx.wait();

    if (receipt.status === 1) {
      logger.info(
        `AutoEarn transaction confirmed: ${tx.hash} (block: ${receipt.blockNumber})`
      );
      return {
        success: true,
        txHash: tx.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
      };
    } else {
      throw new Error(`Transaction failed with status: ${receipt.status}`);
    }
  } catch (error) {
    logger.error(`Failed to execute autoEarn for ${employeeAddress}: ${error}`);
    return {
      success: false,
      error: (error as Error).message,
      employeeAddress,
      organizationAddress,
    };
  }
}

export async function getWalletBalance() {
  try {
    const balance = await provider.getBalance(wallet.address);
    return ethers.formatEther(balance);
  } catch (error) {
    logger.error(`Failed to get wallet balance: ${error}`);
    return '0';
  }
}

export async function hasSufficientBalance(minBalanceEth = '0.01') {
  try {
    const balance = await getWalletBalance();
    return parseFloat(balance) >= parseFloat(minBalanceEth);
  } catch (error) {
    logger.error(`Failed to check wallet balance: ${error}`);
    return false;
  }
}

export async function getGasPrice() {
  try {
    const gasPrice = await provider.getFeeData();
    return {
      gasPrice: gasPrice.gasPrice
        ? ethers.formatUnits(gasPrice.gasPrice, 'gwei')
        : '0',
      maxFeePerGas: gasPrice.maxFeePerGas
        ? ethers.formatUnits(gasPrice.maxFeePerGas, 'gwei')
        : '0',
      maxPriorityFeePerGas: gasPrice.maxPriorityFeePerGas
        ? ethers.formatUnits(gasPrice.maxPriorityFeePerGas, 'gwei')
        : '0',
    };
  } catch (error) {
    logger.error(`Failed to get gas price: ${error}`);
    return { gasPrice: '0', maxFeePerGas: '0', maxPriorityFeePerGas: '0' };
  }
}

export { provider, wallet };
