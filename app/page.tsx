import DashboardShell from "@/app/components/DashboardShell";
import { getLeaderboard, getRecentEvents, getWalletProfile } from "@/lib/data/service";

export const dynamic = "force-dynamic";

export default async function Home() {
  const leaderboard = await getLeaderboard();
  const selectedAddress = leaderboard.wallets[0]?.user;
  const [events, selectedProfile] = await Promise.all([
    getRecentEvents(),
    selectedAddress ? getWalletProfile(selectedAddress) : undefined
  ]);

  return (
    <DashboardShell
      leaderboard={leaderboard}
      events={events}
      initialProfile={selectedProfile?.profile}
    />
  );
}
