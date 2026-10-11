import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat";
import { PageHeader } from "@/components/shell/page-header";
import { formatNpr } from "@/lib/money";
import { getAdminStats } from "@/lib/server/admin";
import { getAppContext } from "@/lib/server/data";
import { formatDate } from "@/lib/utils";
import { Activity, DoorOpen, HandCoins, Receipt, UserPlus, Users } from "lucide-react";
import { notFound } from "next/navigation";

export default async function AdminPage() {
  const { user } = await getAppContext();
  // Everyone else gets a plain 404, so the page's existence isn't advertised.
  if (!user.isAdmin) notFound();
  const stats = await getAdminStats();

  return (
    <div>
      <PageHeader title="Admin" subtitle="How RoomKhata is being used, across all rooms" />

      <div className="mb-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label="Registered users"
          value={stats.users}
          hint={`${stats.verifiedUsers} with a verified email`}
          icon={<Users size={16} />}
        />
        <StatCard
          label="New users"
          value={stats.newUsers7d}
          hint={`last 7 days · ${stats.newUsers30d} in the last 30`}
          icon={<UserPlus size={16} />}
        />
        <StatCard
          label="Active users"
          value={stats.activeUsers30d}
          hint="signed in during the last 30 days"
          icon={<Activity size={16} />}
        />
        <StatCard
          label="Rooms"
          value={stats.rooms}
          hint="not archived"
          icon={<DoorOpen size={16} />}
        />
        <StatCard
          label="Expenses recorded"
          value={stats.expenses}
          hint={`${formatNpr(stats.expenseVolume)} in total`}
          icon={<Receipt size={16} />}
        />
        <StatCard
          label="Payments recorded"
          value={stats.settlements}
          hint="settlements between members"
          icon={<HandCoins size={16} />}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Users</CardTitle>
          <CardDescription>
            Newest first. Room names and expense details are not shown here.
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto pt-0">
          <table className="w-full min-w-[42rem] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="py-2 pr-3 font-medium">User</th>
                <th className="px-3 py-2 font-medium">Joined</th>
                <th className="px-3 py-2 font-medium">Last sign-in</th>
                <th className="px-3 py-2 text-right font-medium">Rooms</th>
                <th className="py-2 pl-3 text-right font-medium">Expenses added</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {stats.userRows.map((u) => (
                <tr key={u.id}>
                  <td className="py-2.5 pr-3">
                    <div className="flex items-center gap-3">
                      <Avatar name={u.name} color={u.avatarColor} size="sm" />
                      <div className="min-w-0">
                        <p className="flex items-center gap-2 font-medium">
                          <span className="truncate">{u.name}</span>
                          {!u.emailVerified && <Badge tone="warning">Unverified</Badge>}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 whitespace-nowrap">{formatDate(u.joinedAt)}</td>
                  <td className="px-3 py-2.5 whitespace-nowrap text-muted-foreground">
                    {u.lastLoginAt ? formatDate(u.lastLoginAt) : "—"}
                  </td>
                  <td className="px-3 py-2.5 text-right tabular">{u.rooms}</td>
                  <td className="py-2.5 pl-3 text-right tabular">{u.expensesAdded}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
