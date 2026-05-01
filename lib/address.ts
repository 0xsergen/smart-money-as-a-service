const EVM_ADDRESS_PATTERN = /^0x[a-fA-F0-9]{40}$/;

export function normalizeAddress(address: string) {
  const value = address.trim().toLowerCase();
  if (!EVM_ADDRESS_PATTERN.test(value)) {
    throw new Error("Invalid wallet address");
  }
  return value;
}

export function isAddress(value: string | undefined) {
  return Boolean(value && EVM_ADDRESS_PATTERN.test(value));
}
