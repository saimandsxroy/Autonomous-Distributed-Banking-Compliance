import { apiRequest } from "./api";

export function parseTransactionDate(dateVal) {
  if (Array.isArray(dateVal)) {
    const [year, month, day, hour = 0, minute = 0, second = 0] = dateVal;
    return new Date(year, month - 1, day, hour, minute, second);
  }
  return new Date(dateVal);
}

export async function fetchBalance(accountNumber) {
  return apiRequest(`/api/v1/user/balanceEnquiry?accountNumber=${accountNumber}`, {
    method: "GET",
  });
}

export async function fetchRecentTransactions(accountNumber) {
  const response = await apiRequest(
    `/api/v1/transactions/history?accountNumber=${accountNumber}`,
    {
      method: "GET",
    },
  );
  return response.data ?? response;
}

export async function lookupAccountName(accountNumber) {
  return apiRequest(`/api/v1/user/nameEnquiry?accountNumber=${accountNumber}`, {
    method: "GET",
  });
}

export async function transferFunds(request) {
  await apiRequest("/api/v1/transactions/transfer", {
    method: "POST",
    body: JSON.stringify(request),
  });
}

export async function fetchProfile(accountNumber) {
  const response = await apiRequest(
    `/api/v1/user/profile?accountNumber=${accountNumber}`,
    {
      method: "GET",
    },
  );
  if (!response.data) throw new Error("Profile not found");
  return response.data;
}

export async function updateProfile(accountNumber, request) {
  await apiRequest(`/api/v1/user/profile?accountNumber=${accountNumber}`, {
    method: "PUT",
    body: JSON.stringify(request),
  });
}

export async function updatePassword(accountNumber, request) {
  await apiRequest(`/api/v1/user/password?accountNumber=${accountNumber}`, {
    method: "PUT",
    body: JSON.stringify(request),
  });
}

export async function requestStatement(accountNumber, startDate, endDate) {
  const response = await apiRequest(
    `/api/v1/bankstatement/email?accountNumber=${accountNumber}&start=${startDate}&end=${endDate}`,
    {
      method: "POST",
    },
  );
  return response.data ?? response;
}

