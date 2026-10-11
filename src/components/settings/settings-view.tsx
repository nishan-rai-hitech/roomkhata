"use client";

import { changePasswordAction } from "@/app/actions/auth";
import {
  deleteAccountAction,
  updatePreferencesAction,
  updateProfileAction,
  type PreferencesInput,
} from "@/app/actions/settings";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { Toggle } from "@/components/ui/toggle";
import { PageHeader } from "@/components/shell/page-header";
import type { User } from "@/lib/types";
import { useState, useTransition } from "react";

export function SettingsView({ user, settings }: { user: User; settings: PreferencesInput }) {
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const [prefs, setPrefs] = useState(settings);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [pending, startAction] = useTransition();

  function saveProfile(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const input = { name: String(fd.get("name") || ""), email: String(fd.get("email") || "") };
    startAction(async () => {
      const result = await updateProfileAction(input);
      setNotice(
        result.ok ? { ok: true, text: "Profile saved." } : { ok: false, text: result.error },
      );
    });
  }

  /** Preferences save as soon as they change. */
  function updatePrefs(patch: Partial<PreferencesInput>) {
    const previous = prefs;
    const next = { ...prefs, ...patch };
    setPrefs(next);
    startAction(async () => {
      const result = await updatePreferencesAction(next);
      if (!result.ok) {
        setPrefs(previous);
        setNotice({ ok: false, text: result.error });
      }
    });
  }

  function changePassword(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const newPassword = String(fd.get("new") || "");
    if (newPassword !== String(fd.get("confirm") || "")) {
      setModalError("The two new passwords don't match.");
      return;
    }
    setModalError(null);
    startAction(async () => {
      const result = await changePasswordAction({
        currentPassword: String(fd.get("current") || ""),
        newPassword,
      });
      if (!result.ok) {
        setModalError(result.error);
        return;
      }
      setPasswordOpen(false);
      setNotice({ ok: true, text: "Password changed. Other devices have been signed out." });
    });
  }

  function deleteAccount(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const password = String(new FormData(e.currentTarget).get("password") || "");
    setModalError(null);
    startAction(async () => {
      // On success the action redirects to the login page and never returns.
      const result = await deleteAccountAction({ password });
      if (result && !result.ok) setModalError(result.error);
    });
  }

  return (
    <div>
      <PageHeader title="Settings" subtitle="Manage your profile, preferences, and account." />

      {notice && (
        <div
          className={`mb-5 flex items-center justify-between gap-3 rounded-lg px-4 py-3 text-sm ${
            notice.ok ? "bg-primary-soft text-primary" : "bg-negative-soft text-negative"
          }`}
        >
          <span>{notice.text}</span>
          <button onClick={() => setNotice(null)} className="font-medium hover:underline">
            Dismiss
          </button>
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-[1fr_1.4fr]">
        {/* Profile */}
        <Card className="lg:row-span-2">
          <CardHeader>
            <CardTitle>Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-4 flex items-center gap-3">
              <Avatar name={user.name} color={user.avatarColor} size="lg" />
              <div>
                <p className="font-medium">{user.name}</p>
                <p className="text-sm text-muted">{user.email}</p>
              </div>
            </div>
            <form onSubmit={saveProfile} className="space-y-3">
              <div>
                <Label htmlFor="name">Full name</Label>
                <Input id="name" name="name" defaultValue={user.name} />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" defaultValue={user.email} />
              </div>
              <Button type="submit" size="sm" className="w-full" disabled={pending}>
                Save profile
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Preferences */}
        <Card>
          <CardHeader>
            <CardTitle>Preferences</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="lang">Language</Label>
                <Select
                  id="lang"
                  value={prefs.language}
                  onChange={(e) => updatePrefs({ language: e.target.value })}
                >
                  <option value="en">English</option>
                  <option value="ne">नेपाली (Nepali)</option>
                </Select>
              </div>
              <div>
                <Label htmlFor="currency">Default currency</Label>
                <Select id="currency" defaultValue="NPR" disabled>
                  <option value="NPR">NPR (Rs)</option>
                </Select>
              </div>
            </div>
            <p className="text-xs text-muted">
              Switch light/dark using the toggle in the top bar — your choice is remembered on this
              device. Your language choice is saved, but the app is only available in English for
              now.
            </p>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader>
            <CardTitle>Notifications</CardTitle>
          </CardHeader>
          <CardContent className="divide-y divide-border">
            <Toggle
              checked={prefs.notifyExpense}
              onChange={(v) => updatePrefs({ notifyExpense: v })}
              label="New expense added"
              description="When someone adds an expense to a room you're in."
            />
            <Toggle
              checked={prefs.notifySettlement}
              onChange={(v) => updatePrefs({ notifySettlement: v })}
              label="Payments & settlements"
              description="When a payment involving you is recorded."
            />
            <Toggle
              checked={prefs.notifyMonthly}
              onChange={(v) => updatePrefs({ notifyMonthly: v })}
              label="Monthly report"
              description="A summary at the start of each month."
            />
            <Toggle
              checked={prefs.notifyReminders}
              onChange={(v) => updatePrefs({ notifyReminders: v })}
              label="Reminders"
              description="Nudges when you owe money for a while."
            />
            <p className="pt-3 text-xs text-muted">
              These choices are saved to your account. Notifications aren&apos;t being sent yet.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Account */}
      <Card className="mt-5">
        <CardHeader>
          <CardTitle>Account & data</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setModalError(null);
              setPasswordOpen(true);
            }}
          >
            Change password
          </Button>
          {/* A plain link, not a client navigation: the route answers with a file download. */}
          <a href="/api/export" download>
            <Button variant="outline" size="sm">
              Export my data
            </Button>
          </a>
          <Button
            variant="outline"
            size="sm"
            className="ml-auto text-negative"
            onClick={() => {
              setModalError(null);
              setDeleteOpen(true);
            }}
          >
            Delete account
          </Button>
        </CardContent>
      </Card>

      <Modal
        open={passwordOpen}
        onClose={() => setPasswordOpen(false)}
        title="Change password"
        description="You'll stay signed in here; every other device is signed out."
      >
        <form onSubmit={changePassword} className="space-y-4">
          {modalError && (
            <div className="rounded-lg bg-negative-soft px-3 py-2 text-sm text-negative">
              {modalError}
            </div>
          )}
          <div>
            <Label htmlFor="current">Current password</Label>
            <Input id="current" name="current" type="password" autoComplete="current-password" autoFocus />
          </div>
          <div>
            <Label htmlFor="new">New password</Label>
            <Input
              id="new"
              name="new"
              type="password"
              autoComplete="new-password"
              placeholder="At least 8 characters"
            />
          </div>
          <div>
            <Label htmlFor="confirm">Confirm new password</Label>
            <Input id="confirm" name="confirm" type="password" autoComplete="new-password" />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" onClick={() => setPasswordOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : "Change password"}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Delete your account?"
        description="This is permanent and cannot be undone."
      >
        <form onSubmit={deleteAccount} className="space-y-4">
          <p className="text-sm text-muted">
            You must settle all outstanding balances and transfer ownership of any rooms you own
            before your account can be deleted — this keeps shared ledgers intact for others. Your
            past expenses stay in those rooms under the name “Deleted user”.
          </p>
          {modalError && (
            <div className="rounded-lg bg-negative-soft px-3 py-2 text-sm text-negative">
              {modalError}
            </div>
          )}
          <div>
            <Label htmlFor="dpassword">Confirm with your password</Label>
            <Input id="dpassword" name="password" type="password" autoComplete="current-password" autoFocus />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="danger" disabled={pending}>
              {pending ? "Deleting…" : "Delete account"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
