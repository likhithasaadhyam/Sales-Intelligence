"use client";

import * as React from "react";
import {
  PackageCheck,
  Plus,
  Edit2,
  CheckCircle2,
  Layers,
  Sparkles,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { formatINR, paiseToRupees } from "@/lib/financials";

export default function PackageManagementPage() {
  const [packages, setPackages] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);

  // Add / Edit Modal
  const [showModal, setShowModal] = React.useState(false);
  const [editPkg, setEditPkg] = React.useState<any>(null);
  const [name, setName] = React.useState("");
  const [code, setCode] = React.useState("");
  const [priceRupees, setPriceRupees] = React.useState(25000);
  const [description, setDescription] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const fetchPackages = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/packages");
      if (res.ok) {
        const json = await res.json();
        setPackages(json.packages || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchPackages();
  }, [fetchPackages]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const url = "/api/packages";
      const method = editPkg ? "PUT" : "POST";
      const body = editPkg
        ? { id: editPkg.id, name, priceRupees, description }
        : { name, code, priceRupees, description };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        setShowModal(false);
        setEditPkg(null);
        fetchPackages();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <PackageCheck className="w-6 h-6 text-sky-600" />
            Product & Sales Package Configuration
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Configure company product offerings, price tiers (in paise precision), and default quota assignments
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => {
            setEditPkg(null);
            setName("");
            setCode("");
            setPriceRupees(25000);
            setDescription("");
            setShowModal(true);
          }}
        >
          <Plus className="w-3.5 h-3.5 mr-1" /> Add New Package
        </Button>
      </div>

      {/* Package Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-3 py-12 text-center text-xs text-slate-400">Loading packages...</div>
        ) : (
          packages.map((pkg) => (
            <Card key={pkg.id} className="relative overflow-hidden hover:border-sky-300 dark:hover:border-sky-800 transition-colors">
              <CardHeader className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[11px] font-semibold text-sky-600 dark:text-sky-400">
                    {pkg.code}
                  </span>
                  <Badge status={pkg.isActive ? "ACTIVE" : "INACTIVE"}>
                    {pkg.isActive ? "Active Offering" : "Archived"}
                  </Badge>
                </div>
                <CardTitle className="text-lg">{pkg.name}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-2xl font-black text-slate-900 dark:text-slate-100">
                    {formatINR(BigInt(pkg.pricePaise))}
                  </p>
                  <span className="text-[10px] text-slate-400">Official contract deal value</span>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-400 min-h-[40px]">
                  {pkg.description || "Standard sales intelligence package offering."}
                </p>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditPkg(pkg);
                      setName(pkg.name);
                      setCode(pkg.code);
                      setPriceRupees(paiseToRupees(BigInt(pkg.pricePaise)));
                      setDescription(pkg.description || "");
                      setShowModal(true);
                    }}
                  >
                    <Edit2 className="w-3.5 h-3.5 mr-1" /> Edit Package Price
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Package Modal */}
      <Dialog
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editPkg ? `Edit Package: ${editPkg.name}` : "Create Product Package"}
        description="Prices are stored in integer paise to avoid rounding discrepancies"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <Input
            label="Package Name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Mentneo Starter Growth"
          />

          {!editPkg && (
            <Input
              label="Package Code"
              required
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="e.g. PKG-25K"
            />
          )}

          <Input
            label="Price (INR ₹)"
            type="number"
            required
            value={priceRupees}
            onChange={(e) => setPriceRupees(Number(e.target.value))}
            placeholder="e.g. 25000"
          />

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Package Description & Features
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Package deliverables, target customer segment..."
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-2.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-sky-500"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowModal(false)}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" isLoading={isSubmitting}>
              {editPkg ? "Update Package" : "Create Package"}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
