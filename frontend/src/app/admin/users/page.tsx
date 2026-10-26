"use client";

import * as React from "react";
import {
  UserCheck,
  Search,
  Shield,
  Edit2,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";
import { Select } from "@/components/ui/select";
import { formatISTDateOnly } from "@/lib/date-utils";

export default function UserRoleManagementPage() {
  const [users, setUsers] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState("");
  const [selectedUser, setSelectedUser] = React.useState<any>(null);
  const [newRole, setNewRole] = React.useState("");
  const [newStatus, setNewStatus] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const fetchUsers = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/users");
      if (res.ok) {
        const json = await res.json();
        setUsers(json.users || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedUser.id,
          role: newRole,
          status: newStatus,
        }),
      });

      if (res.ok) {
        setSelectedUser(null);
        fetchUsers();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filtered = users.filter((u) =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    u.role.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <UserCheck className="w-6 h-6 text-sky-600" />
            User & System Role Management
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Configure system permissions across Super Admin, Sales Manager, and Sales Executive roles
          </p>
        </div>
      </div>

      {/* Users Table */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <CardTitle>System Accounts & Assigned Roles</CardTitle>
          <input
            type="text"
            placeholder="Search user or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 px-3 rounded-lg text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 w-60"
          />
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 uppercase font-semibold text-[11px] tracking-wider">
              <tr>
                <th className="py-3 px-4">User</th>
                <th className="py-3 px-3">Email Address</th>
                <th className="py-3 px-3">System Role</th>
                <th className="py-3 px-3">Assigned Territory</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-3">Created Date</th>
                <th className="py-3 px-4 text-right">Edit Role</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">Loading user accounts...</td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">No users found.</td>
                </tr>
              ) : (
                filtered.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-850/50">
                    <td className="py-3 px-4 font-semibold text-slate-900 dark:text-slate-100">
                      {user.name}
                      {user.employeeCode !== "—" && (
                        <span className="font-mono text-slate-400 text-[10px] ml-1.5">({user.employeeCode})</span>
                      )}
                    </td>

                    <td className="py-3 px-3 text-slate-600 dark:text-slate-400 font-mono text-[11px]">
                      {user.email}
                    </td>

                    <td className="py-3 px-3">
                      <Badge
                        variant={
                          user.role === "SUPER_ADMIN"
                            ? "danger"
                            : user.role === "ADMIN_MANAGER"
                            ? "purple"
                            : "info"
                        }
                      >
                        {user.role.replace(/_/g, " ")}
                      </Badge>
                    </td>

                    <td className="py-3 px-3 text-slate-600 dark:text-slate-300">
                      {user.territory}
                    </td>

                    <td className="py-3 px-3 text-center">
                      <Badge status={user.status}>{user.status}</Badge>
                    </td>

                    <td className="py-3 px-3 text-slate-500">
                      {formatISTDateOnly(user.createdAt)}
                    </td>

                    <td className="py-3 px-4 text-right">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          setSelectedUser(user);
                          setNewRole(user.role);
                          setNewStatus(user.status);
                        }}
                      >
                        <Edit2 className="w-3.5 h-3.5 mr-1" /> Edit
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Edit Role Dialog */}
      <Dialog
        isOpen={Boolean(selectedUser)}
        onClose={() => setSelectedUser(null)}
        title={`Edit Role & Permissions: ${selectedUser?.name}`}
        description="Modify role permissions or deactivate user account with audit logging"
      >
        <form onSubmit={handleUpdateUser} className="space-y-4">
          <Select
            label="System Role"
            value={newRole}
            onChange={(e) => setNewRole(e.target.value)}
          >
            <option value="SUPER_ADMIN">SUPER ADMIN (Full company access & settings)</option>
            <option value="ADMIN_MANAGER">ADMIN / SALES MANAGER (Team oversight & lead assignment)</option>
            <option value="SALES_EXECUTIVE">SALES EXECUTIVE (Strictly personal leads, calls & reports)</option>
          </Select>

          <Select
            label="Account Status"
            value={newStatus}
            onChange={(e) => setNewStatus(e.target.value)}
          >
            <option value="ACTIVE">ACTIVE</option>
            <option value="INACTIVE">INACTIVE</option>
            <option value="SUSPENDED">SUSPENDED</option>
          </Select>

          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setSelectedUser(null)}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" isLoading={isSubmitting}>
              Save Role Changes
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
