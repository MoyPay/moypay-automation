import config from '../config';

interface Employee {
  salary?: string | number;
  unrealizedSalary?: string | number;
  totalWithdrawn?: string | number;
  salaryStreamStartTime?: number;
  createdAt?: number;
  streamingActive?: boolean;
  status?: boolean;
}

interface SalaryBalance {
  currentBalance: bigint;
  availableBalance: bigint;
  salaryPerSecond?: bigint;
  timeElapsed?: number;
  isStreaming: boolean;
}

function calculateCurrentSalaryBalance(
  employee: Employee,
  organizationPeriodTime?: number
): SalaryBalance {
  if (!employee.streamingActive || !employee.status) {
    return {
      currentBalance: BigInt(0),
      availableBalance: BigInt(0),
      isStreaming: false,
    };
  }

  const periodTimeSeconds =
    organizationPeriodTime || config.periodTimes.MONTHLY;
  const salary = BigInt(employee.salary || 0);
  const salaryPerSecond = salary / BigInt(periodTimeSeconds);
  const currentTime = Math.floor(Date.now() / 1000);
  const streamStartTime =
    employee.salaryStreamStartTime || employee.createdAt || 0;
  const timeElapsed = Math.max(0, currentTime - Number(streamStartTime));
  const streamedEarnings = salaryPerSecond * BigInt(timeElapsed);
  const unrealizedSalary = BigInt(employee.unrealizedSalary || 0);
  const currentBalance = streamedEarnings + unrealizedSalary;
  const totalWithdrawn = BigInt(employee.totalWithdrawn || 0);
  const availableBalance =
    currentBalance > totalWithdrawn
      ? currentBalance - totalWithdrawn
      : BigInt(0);

  return {
    currentBalance,
    availableBalance,
    salaryPerSecond,
    timeElapsed,
    isStreaming: true,
  };
}

function formatBalance(balance: bigint, decimals = 18): string {
  const divisor = BigInt(10 ** decimals);
  const whole = balance / divisor;
  const fraction = balance % divisor;

  if (fraction === BigInt(0)) {
    return whole.toString();
  }

  const fractionStr = fraction.toString().padStart(decimals, '0');
  const trimmed = fractionStr.replace(/0+$/, '');

  return trimmed ? `${whole}.${trimmed}` : whole.toString();
}

function parseBalance(balanceStr: string, decimals = 18): bigint {
  const [whole = '0', fraction = '0'] = balanceStr.split('.');
  const wholeBigInt = BigInt(whole) * BigInt(10 ** decimals);
  const fractionBigInt = BigInt(
    fraction.padEnd(decimals, '0').slice(0, decimals)
  );
  return wholeBigInt + fractionBigInt;
}

export {
  calculateCurrentSalaryBalance,
  formatBalance,
  parseBalance,
  type Employee,
  type SalaryBalance,
};
