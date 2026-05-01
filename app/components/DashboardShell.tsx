"use client";

import { useEffect, useMemo, useState } from "react";
import { compactAddress, formatNumber, formatUsd } from "@/lib/number";
import type {
  EventsResponse,
  LeaderboardResponse,
  LeaderboardWallet,
  NormalizedEvent,
  WalletProfile
} from "@/lib/types";

type SortKey = "score" | "netPnl" | "winRatePct" | "totalVolume" | "activeDays" | "totalFills";
type SortDirection = "asc" | "desc";
type DetailTab = "overview" | "positions" | "fills";

type Props = {
  leaderboard: LeaderboardResponse;
  events: EventsResponse;
  initialProfile?: WalletProfile;
};

export default function DashboardShell({ leaderboard, events, initialProfile }: Props) {
  const [leaderboardState, setLeaderboardState] = useState(leaderboard);
  const [eventsState, setEventsState] = useState(events);
  const [selectedAddress, setSelectedAddress] = useState(
    initialProfile?.wallet.user ?? leaderboard.wallets[0]?.user ?? ""
  );
  const [profile, setProfile] = useState<WalletProfile | undefined>(initialProfile);
  const [profileStatus, setProfileStatus] = useState<"idle" | "loading" | "error">("idle");

  useEffect(() => {
    const pollEvents = () => {
      fetch("/api/events", { cache: "no-store" })
        .then((response) => {
          if (!response.ok) throw new Error("Events request failed");
          return response.json() as Promise<EventsResponse>;
        })
        .then(setEventsState)
        .catch(() => undefined);
    };

    const interval = window.setInterval(pollEvents, 15_000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    const pollLeaderboard = () => {
      fetch("/api/leaderboard", { cache: "no-store" })
        .then((response) => {
          if (!response.ok) throw new Error("Leaderboard request failed");
          return response.json() as Promise<LeaderboardResponse>;
        })
        .then(setLeaderboardState)
        .catch(() => undefined);
    };

    const interval = window.setInterval(pollLeaderboard, 60_000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!selectedAddress || selectedAddress === profile?.wallet.user) return;

    let cancelled = false;
    setProfileStatus("loading");

    fetch(`/api/wallets/${selectedAddress}`, { cache: "no-store" })
      .then((response) => {
        if (!response.ok) throw new Error("Profile request failed");
        return response.json() as Promise<{ profile: WalletProfile }>;
      })
      .then((data) => {
        if (!cancelled) {
          setProfile(data.profile);
          setProfileStatus("idle");
        }
      })
      .catch(() => {
        if (!cancelled) setProfileStatus("error");
      });

    return () => {
      cancelled = true;
    };
  }, [profile?.wallet.user, selectedAddress]);

  const selectedWallet = useMemo(
    () =>
      leaderboardState.wallets.find((wallet) => wallet.user === selectedAddress) ?? profile?.wallet,
    [leaderboardState.wallets, profile?.wallet, selectedAddress]
  );

  const selectedFills = profile?.wallet.user === selectedAddress ? profile.recentFills : [];
  const selectedEnrichment =
    profile?.wallet.user === selectedAddress ? profile.enrichment : undefined;

  const totals = useMemo(() => {
    const wallets = leaderboardState.wallets;
    return {
      tracked: wallets.length,
      netPnl: wallets.reduce((sum, wallet) => sum + wallet.netPnl, 0),
      volume: wallets.reduce((sum, wallet) => sum + wallet.totalVolume, 0),
      avgWinRate:
        wallets.length > 0
          ? wallets.reduce((sum, wallet) => sum + wallet.winRatePct, 0) / wallets.length
          : 0
    };
  }, [leaderboardState.wallets]);

  return (
    <main className="terminal-shell">
      <section className="topbar" aria-label="Dashboard summary">
        <div>
          <p className="eyebrow">Hyperliquid Wallet Intelligence</p>
          <h1>Smart Money Tracker</h1>
        </div>
        <div className="status-grid">
          <StatusPill label="Data" value={leaderboardState.source === "live" ? "Live SQL" : "Fixtures"} />
          <StatusPill label="Events" value={eventsState.source === "db" ? "Webhook" : "Sample"} />
          <StatusPill
            label="Updated"
            value={new Date(leaderboardState.generatedAt).toLocaleTimeString()}
          />
        </div>
      </section>

      {leaderboardState.warning ? <p className="warning">{leaderboardState.warning}</p> : null}

      <section className="metrics" aria-label="Top wallet metrics">
        <Metric label="Tracked wallets" value={formatNumber(totals.tracked)} />
        <Metric label="30d net PnL" value={formatUsd(totals.netPnl)} tone="good" />
        <Metric label="30d volume" value={formatUsd(totals.volume)} />
        <Metric label="Avg win rate" value={`${totals.avgWinRate.toFixed(1)}%`} />
      </section>

      <PaidApiPanel />

      <EventFeed events={eventsState.events} />

      <section className="workspace">
        <div className="leaderboard-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Ranked by consistency-adjusted score</p>
              <h2>Smart Wallet Leaderboard</h2>
              <p className="panel-note">Leaderboard updates daily automatically.</p>
            </div>
            <span className="kbd">30D</span>
          </div>
          <LeaderboardTable
            wallets={leaderboardState.wallets}
            selectedAddress={selectedAddress}
            onSelect={setSelectedAddress}
          />
        </div>

        <aside className="detail-panel" aria-label="Selected wallet detail">
          {selectedWallet ? (
            <WalletDetail
              wallet={selectedWallet}
              fills={selectedFills}
              enrichment={selectedEnrichment}
              status={profileStatus}
            />
          ) : null}
        </aside>
      </section>
    </main>
  );
}

function PaidApiPanel() {
  const [apiBaseUrl, setApiBaseUrl] = useState("");

  useEffect(() => {
    setApiBaseUrl(window.location.origin);
  }, []);

  const command = `${apiBaseUrl ? `PAID_API_BASE_URL=${apiBaseUrl} ` : ""}EVM_PRIVATE_KEY=0x... pnpm test:paid-api`;

  return (
    <div className="paid-api-badge-wrap">
      <button
        className="paid-api-badge"
        type="button"
        aria-describedby="paid-api-tooltip"
      >
        Paid API
        <span>$0.01 x402</span>
      </button>
      <div className="paid-api-tooltip" id="paid-api-tooltip" role="tooltip">
        <strong>Paywalled JSON API</strong>
        <span>/api/paid/leaderboard</span>
        <span>/api/paid/events</span>
        <span>/api/paid/wallets/[address]</span>
        <p>Base Sepolia / eip155:84532. See scripts/test-paid-api.ts or run:</p>
        <code>{command}</code>
      </div>
    </div>
  );
}

function StatusPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="status-pill">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function Metric({
  label,
  value,
  tone,
  tooltip
}: {
  label: string;
  value: string;
  tone?: "good";
  tooltip?: string;
}) {
  return (
    <div className={`metric ${tone ?? ""}`} title={tooltip}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function LeaderboardTable({
  wallets,
  selectedAddress,
  onSelect
}: {
  wallets: LeaderboardWallet[];
  selectedAddress: string;
  onSelect: (address: string) => void;
}) {
  const [sort, setSort] = useState<{ key: SortKey; direction: SortDirection }>({
    key: "score",
    direction: "desc"
  });

  const sortedWallets = useMemo(() => {
    return [...wallets].sort((a, b) => {
      const delta = a[sort.key] - b[sort.key];
      if (delta === 0) return b.score - a.score || a.user.localeCompare(b.user);
      return sort.direction === "asc" ? delta : -delta;
    });
  }, [sort.direction, sort.key, wallets]);

  const setSortKey = (key: SortKey) => {
    setSort((current) => ({
      key,
      direction: current.key === key && current.direction === "desc" ? "asc" : "desc"
    }));
  };

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Rank</th>
            <th>Wallet</th>
            <SortableHeader
              active={sort.key === "score"}
              direction={sort.direction}
              label="Score"
              onClick={() => setSortKey("score")}
            />
            <SortableHeader
              active={sort.key === "netPnl"}
              direction={sort.direction}
              label="Net PnL"
              onClick={() => setSortKey("netPnl")}
            />
            <SortableHeader
              active={sort.key === "winRatePct"}
              direction={sort.direction}
              label="Win"
              onClick={() => setSortKey("winRatePct")}
            />
            <SortableHeader
              active={sort.key === "totalVolume"}
              direction={sort.direction}
              label="Volume"
              onClick={() => setSortKey("totalVolume")}
            />
            <SortableHeader
              active={sort.key === "totalFills"}
              direction={sort.direction}
              label="Fills"
              onClick={() => setSortKey("totalFills")}
            />
            <SortableHeader
              active={sort.key === "activeDays"}
              direction={sort.direction}
              label="Active"
              onClick={() => setSortKey("activeDays")}
            />
          </tr>
        </thead>
        <tbody>
          {sortedWallets.map((wallet, index) => (
            <tr
              key={wallet.user}
              className={wallet.user === selectedAddress ? "selected-row" : ""}
              onClick={() => onSelect(wallet.user)}
            >
              <td className="rank">{index + 1}</td>
              <td>
                <button className="wallet-button" type="button" onClick={() => onSelect(wallet.user)}>
                  <strong>{wallet.displayName ?? compactAddress(wallet.user)}</strong>
                  <span>{compactAddress(wallet.user)}</span>
                </button>
              </td>
              <td
                className="numeric score"
                title={scoreTooltip(wallet)}
              >
                {wallet.score.toFixed(1)}
              </td>
              <td className="numeric good">{formatUsd(wallet.netPnl)}</td>
              <td className="numeric">{wallet.winRatePct.toFixed(1)}%</td>
              <td className="numeric">{formatUsd(wallet.totalVolume)}</td>
              <td className="numeric">{formatNumber(wallet.totalFills)}</td>
              <td className="numeric">{wallet.activeDays}d</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SortableHeader({
  active,
  direction,
  label,
  onClick
}: {
  active: boolean;
  direction: SortDirection;
  label: string;
  onClick: () => void;
}) {
  const indicator = active ? (direction === "desc" ? "v" : "^") : "-";

  return (
    <th
      className="sortable-heading"
      aria-sort={active ? (direction === "desc" ? "descending" : "ascending") : "none"}
    >
      <button className={active ? "sort-button active" : "sort-button"} type="button" onClick={onClick}>
        <span>{label}</span>
        <span aria-hidden="true">{indicator}</span>
      </button>
    </th>
  );
}

function WalletDetail({
  wallet,
  fills,
  enrichment,
  status
}: {
  wallet: LeaderboardWallet;
  fills: WalletProfile["recentFills"];
  enrichment: WalletProfile["enrichment"];
  status: "idle" | "loading" | "error";
}) {
  const [activeTab, setActiveTab] = useState<DetailTab>("overview");
  const positionCount = enrichment?.positions.length ?? 0;

  return (
    <section className="wallet-detail">
      <div className="wallet-header">
        <div>
          <p className="eyebrow">Selected wallet</p>
          <h2>{wallet.displayName ?? compactAddress(wallet.user)}</h2>
        </div>
        <a
          className="wallet-link"
          href={`https://app.hyperliquid.xyz/explorer/address/${wallet.user}`}
          rel="noreferrer"
          target="_blank"
        >
          <span>{compactAddress(wallet.user)}</span>
          <strong>Explorer</strong>
        </a>
      </div>

      <div className="detail-tabs" role="tablist" aria-label="Selected wallet sections">
        <TabButton active={activeTab === "overview"} label="Overview" onClick={() => setActiveTab("overview")} />
        <TabButton
          active={activeTab === "positions"}
          label={`Positions ${positionCount}`}
          onClick={() => setActiveTab("positions")}
        />
        <TabButton
          active={activeTab === "fills"}
          label={`Fills ${status === "loading" ? "..." : fills.length}`}
          onClick={() => setActiveTab("fills")}
        />
      </div>

      {activeTab === "overview" ? <WalletOverview enrichment={enrichment} wallet={wallet} /> : null}
      {activeTab === "positions" ? <PositionsPanel enrichment={enrichment} /> : null}
      {activeTab === "fills" ? <FillsPanel fills={fills} status={status} /> : null}
    </section>
  );
}

function TabButton({
  active,
  label,
  onClick
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button aria-selected={active} className={active ? "tab-button active" : "tab-button"} onClick={onClick} role="tab" type="button">
      {label}
    </button>
  );
}

function WalletOverview({
  wallet,
  enrichment
}: {
  wallet: LeaderboardWallet;
  enrichment: WalletProfile["enrichment"];
}) {
  return (
    <div className="tab-panel" role="tabpanel">
      <div className="detail-grid">
        <Metric label="Score" value={wallet.score.toFixed(1)} tooltip={scoreTooltip(wallet)} />
        <Metric label="Net PnL" value={formatUsd(wallet.netPnl)} tone="good" />
        <Metric label="Fills" value={formatNumber(wallet.totalFills)} />
        <Metric label="Fees" value={formatUsd(wallet.cumulativeFees)} />
      </div>
      <ScoreBreakdown wallet={wallet} />
      <AccountContext enrichment={enrichment} />
    </div>
  );
}

function ScoreBreakdown({ wallet }: { wallet: LeaderboardWallet }) {
  const parts = [
    ["PnL", wallet.scoreBreakdown.pnl],
    ["Win", wallet.scoreBreakdown.winRate],
    ["Consistency", wallet.scoreBreakdown.consistency],
    ["Volume", wallet.scoreBreakdown.volume],
    ["Penalty", -wallet.scoreBreakdown.activityPenalty]
  ] as const;

  return (
    <section className="score-breakdown" aria-label="Score breakdown">
      <div className="panel-heading compact">
        <h3>Score breakdown</h3>
        <span title={scoreTooltip(wallet)}>{wallet.scoreBreakdown.total.toFixed(1)}</span>
      </div>
      <div className="breakdown-grid">
        {parts.map(([label, value]) => (
          <div className="breakdown-chip" key={label}>
            <span>{label}</span>
            <strong className={value < 0 ? "bad" : ""}>{value.toFixed(1)}</strong>
          </div>
        ))}
      </div>
    </section>
  );
}

function AccountContext({ enrichment }: { enrichment: WalletProfile["enrichment"] }) {
  if (!enrichment) return null;

  return (
    <section className="enrichment-panel" aria-label="Hyperliquid account context">
      <div className="panel-heading compact">
        <div>
          <p className="eyebrow">Live account data</p>
          <h3>Account context</h3>
        </div>
        <span>{enrichmentSourceLabel(enrichment.source)}</span>
      </div>
      {enrichment.warning ? <p className="empty">{enrichment.warning}</p> : null}
      <div className="detail-grid compact-grid">
        <Metric label="Account value" value={formatMaybeUsd(enrichment.accountValue)} />
        <Metric label="Withdrawable" value={formatMaybeUsd(enrichment.withdrawable)} />
        <Metric label="Margin used" value={formatMaybeUsd(enrichment.marginUsed)} />
        <Metric label="Open orders" value={formatNumber(enrichment.openOrderCount ?? 0)} />
      </div>
    </section>
  );
}

function PositionsPanel({ enrichment }: { enrichment: WalletProfile["enrichment"] }) {
  if (!enrichment) {
    return <p className="empty tab-panel">Account context is not available for this wallet.</p>;
  }

  if (enrichment.positions.length === 0) {
    return <p className="empty tab-panel">No open positions returned for this wallet.</p>;
  }

  return (
    <div className="tab-panel position-list" role="tabpanel">
      {enrichment.positions.map((position) => {
        const isLong = position.size >= 0;

        return (
          <article className="position-card" key={position.coin}>
            <div className="card-topline">
              <div>
                <strong>{position.coin}</strong>
                <span>{formatNumber(Math.abs(position.size))}</span>
              </div>
              <span className={isLong ? "badge long" : "badge short"}>{isLong ? "LONG" : "SHORT"}</span>
            </div>
            <div className="mini-grid">
              <MiniStat label="Notional" value={formatMaybeUsd(position.positionValue)} />
              <MiniStat label="Entry" value={formatMaybePriceUsd(position.entryPrice)} />
              <MiniStat label="Lev" value={typeof position.leverage === "number" ? `${formatNumber(position.leverage)}x` : "-"} />
              <MiniStat
                label="ROE"
                tone={(position.returnOnEquityPct ?? 0) >= 0 ? "good" : "bad"}
                value={formatMaybePct(position.returnOnEquityPct)}
              />
            </div>
            <div className="card-pnl">
              <span>uPnL</span>
              <strong className={(position.unrealizedPnl ?? 0) >= 0 ? "good" : "bad"}>
                {formatMaybeExecutionUsd(position.unrealizedPnl)}
              </strong>
            </div>
          </article>
        );
      })}
    </div>
  );
}

function FillsPanel({
  fills,
  status
}: {
  fills: WalletProfile["recentFills"];
  status: "idle" | "loading" | "error";
}) {
  if (status === "error") {
    return <p className="empty tab-panel">Unable to load this wallet profile.</p>;
  }

  if (status === "loading") {
    return <p className="empty tab-panel">Loading recent executions.</p>;
  }

  if (fills.length === 0) {
    return <p className="empty tab-panel">Recent fills load from live SQL for selected live wallets.</p>;
  }

  return (
    <div className="tab-panel fill-list" role="tabpanel">
      {fills.map((fill, index) => (
        <article className="fill-card" key={`${fill.time}-${fill.hash ?? fill.coin}-${fill.coin}-${index}`}>
          <div className="card-topline">
            <div>
              <strong>{fill.coin}</strong>
              <span>{formatFillTime(fill.time)}</span>
            </div>
            <div className="badge-row">
              <span className={fill.side === "B" ? "badge long" : "badge short"}>{fill.side}</span>
              {fill.isLiquidation ? <span className="badge risk">LIQ</span> : null}
            </div>
          </div>
          <strong className="fill-direction">{fill.dir || fillSideLabel(fill.side)}</strong>
          <div className="mini-grid">
            <MiniStat label="Size" value={formatNumber(fill.size)} />
            <MiniStat label="Price" value={formatPriceUsd(fill.price)} />
            <MiniStat label="Fee" value={formatExecutionUsd(fill.fee)} />
            <MiniStat
              label="PnL"
              tone={fill.closedPnl >= 0 ? "good" : "bad"}
              value={formatExecutionUsd(fill.closedPnl)}
            />
          </div>
        </article>
      ))}
    </div>
  );
}

function MiniStat({
  label,
  value,
  tone
}: {
  label: string;
  value: string;
  tone?: "good" | "bad";
}) {
  return (
    <div className="mini-stat">
      <span>{label}</span>
      <strong className={tone ?? ""}>{value}</strong>
    </div>
  );
}

function formatMaybeUsd(value: number | undefined) {
  return typeof value === "number" ? formatUsd(value) : "-";
}

function formatMaybeExecutionUsd(value: number | undefined) {
  return typeof value === "number" ? formatExecutionUsd(value) : "-";
}

function formatMaybePriceUsd(value: number | undefined) {
  return typeof value === "number" ? formatPriceUsd(value) : "-";
}

function formatExecutionUsd(value: number) {
  const abs = Math.abs(value);
  const maximumFractionDigits = abs > 0 && abs < 0.01 ? 6 : abs < 1 ? 4 : 2;

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "standard",
    minimumFractionDigits: abs === 0 ? 2 : 0,
    maximumFractionDigits
  }).format(value);
}

function formatPriceUsd(value: number) {
  const abs = Math.abs(value);

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "standard",
    minimumFractionDigits: 2,
    maximumFractionDigits: abs < 1 ? 6 : abs < 100 ? 4 : 2
  }).format(value);
}

function formatMaybePct(value: number | undefined) {
  return typeof value === "number" ? `${value.toFixed(1)}%` : "-";
}

function enrichmentSourceLabel(source: NonNullable<WalletProfile["enrichment"]>["source"]) {
  if (source === "sdk") return "Live";
  if (source === "fixture") return "Sample";
  return "Unavailable";
}

function fillSideLabel(side: "B" | "A") {
  return side === "B" ? "Buy" : "Sell";
}

function formatFillTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function scoreTooltip(wallet: LeaderboardWallet) {
  return "Score combines normalized PnL, win rate, consistency, volume, minus activity penalty.";
}

function EventFeed({ events }: { events: NormalizedEvent[] }) {
  const [showAll, setShowAll] = useState(false);
  const visibleEvents = showAll ? events : events.slice(0, 5);

  return (
    <section className="event-feed">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Webhook intake</p>
          <h2>Recent Signals Across Watched Wallets</h2>
          <p className="panel-note">Live events from the full KV watchlist, not only the selected wallet.</p>
        </div>
        <div className="event-actions">
          <span className="kbd">{events.length} stored</span>
          {events.length > 5 ? (
            <button
              className="toggle-button"
              type="button"
              aria-pressed={showAll}
              onClick={() => setShowAll((value) => !value)}
            >
              {showAll ? "Show latest" : "Show all"}
            </button>
          ) : null}
        </div>
      </div>
      <div className="event-list signal-strip">
        {visibleEvents.map((event, index) => (
          <article className={`event-row ${eventTone(event)}`} key={`${event.id}-${index}`}>
            <div>
              <span className="event-type">{event.eventType}</span>
              <p>{event.description}</p>
            </div>
            <span>{compactAddress(event.wallet)}</span>
          </article>
        ))}
      </div>
    </section>
  );
}

function eventTone(event: NormalizedEvent) {
  if (event.eventType === "gossipPriorityGasAuction") return "muted-signal";
  if (event.eventType.toLowerCase().includes("withdraw")) return "risk-signal";
  if (event.eventType.toLowerCase().includes("deposit")) return "good-signal";
  return "";
}
