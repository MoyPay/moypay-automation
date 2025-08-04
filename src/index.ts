import express from 'express';
import cron from 'node-cron';
import config from './config';
import { logger } from './utils/logger';
import {
  executeAutoEarn,
  getWalletBalance,
  getGasPrice,
  hasSufficientBalance,
  wallet,
} from './services/blockchain';
import {
  getEmployeesWithAutoEarn,
  getAutoEarnConfigurations,
} from './services/graphql';
import { calculateCurrentSalaryBalance, formatBalance } from './utils/salary';

const app = express();
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    walletAddress: wallet.address,
  });
});

app.get('/wallet/balance', async (req, res) => {
  try {
    const balance = await getWalletBalance();
    const gasPrice = await getGasPrice();
    res.json({ balance, gasPrice });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

app.post('/trigger-autoearn', async (req, res) => {
  try {
    const { organizationAddress, employeeAddress } = req.body;

    if (!organizationAddress || !employeeAddress) {
      return res
        .status(400)
        .json({
          error: 'organizationAddress and employeeAddress are required',
        });
    }

    const result = await executeAutoEarn(organizationAddress, employeeAddress);
    return res.json(result);
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
});

cron.schedule(config.cronSchedule, async () => {
  try {
    logger.info('Running cron job to check employee auto-earn statuses');

    const hasBalance = await hasSufficientBalance();
    if (!hasBalance) {
      logger.warn('Insufficient wallet balance for gas fees');
      return;
    }

    const employeesData = await getEmployeesWithAutoEarn();
    const autoEarnConfigs = await getAutoEarnConfigurations();

    if (
      !employeesData.employeeLists?.items ||
      !autoEarnConfigs.employeeAutoEarns?.items
    ) {
      logger.warn('No employee data or auto-earn configurations found');
      return;
    }

    const organizationMap = new Map();
    if (employeesData.organizationLists?.items) {
      employeesData.organizationLists.items.forEach((org: any) => {
        organizationMap.set(org.organization, org);
      });
    }

    const processedEmployees = new Set();

    for (const autoEarnConfig of autoEarnConfigs.employeeAutoEarns.items) {
      const {
        employee: employeeAddress,
        autoEarnAmount,
        organization,
        isAutoEarn,
        isActive,
      } = autoEarnConfig;

      if (!isAutoEarn || !isActive) {
        continue;
      }

      if (processedEmployees.has(employeeAddress)) {
        continue;
      }

      const employeeData = employeesData.employeeLists.items.find(
        (emp: any) =>
          emp.employee.toLowerCase() === employeeAddress.toLowerCase()
      );

      if (!employeeData) {
        logger.warn(`Employee data not found for address: ${employeeAddress}`);
        continue;
      }

      if (!employeeData.status || !employeeData.streamingActive) {
        logger.info(
          `Employee ${employeeAddress} is not active or streaming, skipping`
        );
        continue;
      }

      const orgData = organizationMap.get(organization);
      const periodTime = orgData?.periodTime
        ? Number(orgData.periodTime)
        : undefined;

      const salaryBalance = calculateCurrentSalaryBalance(
        {
          salary: employeeData.salary,
          unrealizedSalary: employeeData.unrealizedSalary,
          totalWithdrawn: employeeData.totalWithdrawn,
          salaryStreamStartTime: employeeData.salaryStreamStartTime,
          createdAt: employeeData.createdAt,
          streamingActive: employeeData.streamingActive,
          status: employeeData.status,
        },
        periodTime
      );

      const formattedCurrentBalance = formatBalance(
        salaryBalance.currentBalance
      );
      const formattedAvailableBalance = formatBalance(
        salaryBalance.availableBalance
      );

      logger.info(
        `Employee ${employeeAddress}: currentBalance=${formattedCurrentBalance} USDC (${salaryBalance.currentBalance.toString()} wei), autoEarnAmount=${autoEarnAmount}, availableBalance=${formattedAvailableBalance} USDC (${salaryBalance.availableBalance.toString()} wei)`
      );

      if (salaryBalance.currentBalance >= BigInt(autoEarnAmount)) {
        logger.info(
          `Triggering auto-earn for employee ${employeeAddress} (current: ${formattedCurrentBalance} USDC, threshold: ${autoEarnAmount})`
        );

        const result = await executeAutoEarn(organization, employeeAddress);

        if (result.success) {
          logger.info(
            `Auto-earn successful for ${employeeAddress}: ${result.txHash}`
          );
        } else {
          logger.error(
            `Auto-earn failed for ${employeeAddress}: ${result.error}`
          );
        }

        processedEmployees.add(employeeAddress);

        await new Promise(resolve => setTimeout(resolve, 1000));
      } else {
        logger.debug(
          `Employee ${employeeAddress} has not reached auto-earn threshold (${formattedCurrentBalance} ETH < ${autoEarnAmount})`
        );
      }
    }

    logger.info(
      `Cron job completed. Processed ${processedEmployees.size} employees.`
    );
  } catch (error) {
    logger.error(`Error in cron job: ${(error as Error).message}`, { error });
  }
});

app.listen(config.port, () => {
  logger.info(`Backend server running on port ${config.port}`);
});
