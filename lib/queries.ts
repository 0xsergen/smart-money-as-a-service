import { getMinVolumeUsd, getSmartMoneyLimit } from "@/lib/config";

export function leaderboardQuery() {
  return `
    SELECT
      user,
      sum(total_pnl) AS cumulative_pnl,
      sum(total_fees) AS cumulative_fees,
      sum(total_pnl) - sum(total_fees) AS net_pnl,
      sum(volume) AS total_volume,
      sum(fill_count) AS total_fills,
      count() AS active_days,
      countIf(total_pnl > 0) AS winning_days,
      round(countIf(total_pnl > 0) / count() * 100, 1) AS win_rate_pct
    FROM hyperliquid_user_pnl_daily
    WHERE day >= today() - 30
    GROUP BY user
    HAVING total_volume > ${getMinVolumeUsd()} AND active_days >= 3
    ORDER BY net_pnl DESC
    LIMIT ${getSmartMoneyLimit()}
  `;
}

export function displayNamesQuery(addresses: string[]) {
  const values = addresses.map((address) => `'${address.toLowerCase()}'`).join(", ");

  return `
    SELECT user, display_name
    FROM hyperliquid_display_names
    WHERE user IN (${values})
    ORDER BY block_number DESC
    LIMIT 1 BY user
  `;
}

export function recentFillsQuery(address: string) {
  return `
    SELECT
      time,
      coin,
      side,
      dir,
      price,
      size,
      closed_pnl,
      fee,
      is_liquidation,
      start_position,
      hash
    FROM hyperliquid_fills
    WHERE user = '${address.toLowerCase()}'
      AND block_time >= today() - 7
    ORDER BY time DESC
    LIMIT 50
  `;
}
