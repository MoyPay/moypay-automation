import axios from 'axios';
import config from '../config';
import { logger } from '../utils/logger';

const endpoint = config.graphqlEndpoint;

export async function query(
  query: string,
  variables: Record<string, any> = {}
): Promise<any> {
  try {
    const response = await axios.post(endpoint, {
      query,
      variables,
    });

    if (response.data.errors) {
      throw new Error(
        `GraphQL errors: ${JSON.stringify(response.data.errors)}`
      );
    }

    return response.data.data;
  } catch (error) {
    logger.error(`GraphQL query failed: ${(error as Error).message}`);
    throw error;
  }
}

export async function getEmployeesWithAutoEarn(): Promise<any> {
  const gqlQuery = `
    query GetEmployeesWithAutoEarn {
      employeeLists {
        items {
          id
          employee
          organization
          salary
          status
          streamingActive
          autoEarnStatus
          salaryStreamStartTime
          createdAt
          unrealizedSalary
          totalWithdrawn
          currentSalaryBalance
          availableBalance
          lastBalanceUpdate
        }
      }
      organizationLists {
        items {
          id
          organization
          periodTime
        }
      }
    }
  `;

  return await query(gqlQuery);
}

export async function getAutoEarnConfigurations(): Promise<any> {
  const gqlQuery = `
    query GetAutoEarnConfigurations {
      employeeAutoEarns {
        items {
          id
          organization
          employee
          protocol
          autoEarnAmount
          isAutoEarn
          isActive
          enabledAt
          disabledAt
        }
      }
    }
  `;

  return await query(gqlQuery);
}

export async function getEmployeeAutoEarnConfigs(
  employeeAddress: string
): Promise<any> {
  const gqlQuery = `
    query GetEmployeeAutoEarnConfigs($employee: String!) {
      employeeAutoEarns(where: { employee: $employee, isActive: true }) {
        items {
          id
          organization
          employee
          protocol
          autoEarnAmount
          isAutoEarn
          isActive
          enabledAt
        }
      }
    }
  `;

  return await query(gqlQuery, { employee: employeeAddress });
}

export async function getOrganization(
  organizationAddress: string
): Promise<any> {
  const gqlQuery = `
    query GetOrganization($id: String!) {
      organizationList(id: $id) {
        id
        organization
        periodTime
        totalSalary
        currentBalance
      }
    }
  `;

  return await query(gqlQuery, { id: organizationAddress });
}
