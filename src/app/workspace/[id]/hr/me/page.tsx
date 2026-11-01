"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Download,
  Loader2,
  ReceiptText,
  Upload,
  UserRound,
} from "lucide-react";
import { api } from "@/lib/axios";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { formatDualDate } from "@/lib/nepaliCalendar";
import { AttendanceCorrectionSelfService } from "@/components/hr/AttendanceCorrectionSelfService";
import { MyReimbursementClaims } from "@/components/hr/MyReimbursementClaims";
import { MyEmployeeSupport } from "@/components/hr/MyEmployeeSupport";
import { MyDevelopmentSelfService } from "@/components/hr/MyDevelopmentSelfService";

type Payslip = {
  _id: string;
  periodStart: string;
  periodEnd: string;
  currency: string;
  status: string;
  line: {
    employeeName: string;
    employeeNumber: string;
    salaryType: string;
    baseAmount: string;
    earnings: string;
    deductions: string;
    employerContributions: string;
    netAmount: string;
    recordedHours: number;
    approvedLeaveDays: number;
    warnings: string[];
    components: { code: string; name: string; kind: string; amount: string }[];
    manualAdjustments?: {
      _id: string;
      category: string;
      name: string;
      amount: string;
      reason: string;
    }[];
  };
};
type MySchedule = {
  effectiveFrom: string;
  effectiveTo?: string | null;
  schedule?: {
    name: string;
    timezone: string;
    location?: string;
    weeklyShifts: {
      weekday: number;
      enabled: boolean;
      startTime: string;
      endTime: string;
      breakMinutes: number;
    }[];
    holidays: { date: string; name: string; location?: string }[];
  };
};
function MyScheduleCard({ schedule }: { schedule: MySchedule | null }) {
  if (!schedule?.schedule) return null;
  const weekdayNames = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  return (
    <Card>
      <CardContent className="space-y-4 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">My work schedule</h2>
            <p className="text-sm text-muted-foreground">
              {schedule.schedule.name}
              {schedule.schedule.location
                ? ` · ${schedule.schedule.location}`
                : ""}{" "}
              · {schedule.schedule.timezone}
            </p>
          </div>
          <p className="text-xs text-muted-foreground">
            Effective {new Date(schedule.effectiveFrom).toLocaleDateString()}
            {schedule.effectiveTo
              ? ` – ${new Date(schedule.effectiveTo).toLocaleDateString()}`
              : " – Current"}
          </p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {weekdayNames.map((day, weekday) => {
            const shift = schedule.schedule!.weeklyShifts.find(
              (item) => item.weekday === weekday,
            );
            return (
              <div key={day} className="rounded-lg border p-3">
                <p className="text-sm font-medium">{day}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {shift?.enabled
                    ? `${shift.startTime}–${shift.endTime} · ${shift.breakMinutes}m break`
                    : "Day off"}
                </p>
              </div>
            );
          })}
        </div>
        {schedule.schedule.holidays?.length > 0 && (
          <div className="border-t pt-3">
            <h3 className="text-sm font-semibold">Schedule holidays</h3>
            <ul className="mt-2 flex flex-wrap gap-2">
              {schedule.schedule.holidays.map((holiday, index) => (
                <li
                  key={`${holiday.date}-${index}`}
                  className="rounded-md bg-muted px-2 py-1 text-xs"
                >
                  {new Date(holiday.date).toLocaleDateString()} · {holiday.name}
                  {holiday.location ? ` · ${holiday.location}` : ""}
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
type BankDetails = {
  bankName?: string;
  bankBranch?: string;
  accountNumber?: string;
  routingNumber?: string;
  accountHolderName?: string;
};
type Profile = {
  _id: string;
  employeeNumber: string;
  jobTitle?: string;
  department?: string;
  employmentStatus: string;
  startDate: string;
  phone?: string;
  address?: string;
  emergencyContacts?: { name: string; relationship?: string; phone: string }[];
  governmentIds?: { type: string; lastFour?: string; expiresAt?: string }[];
  bankDetails?: BankDetails;
  panNumber?: string;
  ssfId?: string;
  taxFilingStatus?: string;
  user: { name: string; email: string };
};
type MyChecklist = {
  _id: string;
  status: string;
  items: {
    _id: string;
    title: string;
    category: string;
    status: string;
    required: boolean;
    dueAt?: string;
    documentIds?: { _id: string; name: string }[];
  }[];
};
type MyDocument = {
  _id: string;
  name: string;
  category: string;
  size: number;
  expiresAt?: string | null;
  createdAt: string;
};
export default function MyHrPage() {
  const workspaceId = useParams().id as string;
  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [contact, setContact] = useState({ phone: "", address: "" });
  const [bank, setBank] = useState<BankDetails>({ bankName: "", bankBranch: "", accountNumber: "", routingNumber: "", accountHolderName: "" });
  const [panNumber, setPanNumber] = useState("");
  const [ssfId, setSsfId] = useState("");
  const [taxFilingStatus, setTaxFilingStatus] = useState("single");
  const [emergencyContacts, setEmergencyContacts] = useState<
    { name: string; relationship?: string; phone: string }[]
  >([]);
  const [onboarding, setOnboarding] = useState<MyChecklist[]>([]);
  const [documents, setDocuments] = useState<MyDocument[]>([]);
  const [mySchedule, setMySchedule] = useState<MySchedule | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [documentCategory, setDocumentCategory] = useState("employment");
  const [checklistItemId, setChecklistItemId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const load = async () => {
    const [
      slips,
      ownProfile,
      onboardingResult,
      documentResult,
      scheduleResult,
    ] = await Promise.allSettled([
      api.get(`/workspaces/${workspaceId}/hr/my/payslips`),
      api.get(`/workspaces/${workspaceId}/hr/my/profile`),
      api.get(`/workspaces/${workspaceId}/hr/my/onboarding`),
      api.get(`/workspaces/${workspaceId}/hr/my/documents`),
      api.get(`/workspaces/${workspaceId}/hr/my/schedule`),
    ]);
    if (slips.status === "fulfilled") setPayslips(slips.value.data.data || []);
    else
      toast.error(
        slips.reason?.response?.data?.message || "Could not load your payslips",
      );
    if (ownProfile.status === "fulfilled") {
      const own = ownProfile.value.data.data;
      setProfile(own);
      setContact({ phone: own.phone || "", address: own.address || "" });
      setEmergencyContacts(own.emergencyContacts || []);
      setBank(own.bankDetails || { bankName: "", bankBranch: "", accountNumber: "", routingNumber: "", accountHolderName: "" });
      setPanNumber(own.panNumber || "");
      setSsfId(own.ssfId || "");
      setTaxFilingStatus(own.taxFilingStatus || "single");
    } else if (ownProfile.reason?.response?.status !== 404)
      toast.error(
        ownProfile.reason?.response?.data?.message ||
          "Could not load your HR profile",
      );
    if (onboardingResult.status === "fulfilled")
      setOnboarding(onboardingResult.value.data.data || []);
    else if (onboardingResult.reason?.response?.status !== 404)
      toast.error(
        onboardingResult.reason?.response?.data?.message ||
          "Could not load your onboarding checklist",
      );
    if (documentResult.status === "fulfilled")
      setDocuments(documentResult.value.data.data || []);
    else if (documentResult.reason?.response?.status !== 404)
      toast.error(
        documentResult.reason?.response?.data?.message ||
          "Could not load your documents",
      );
    if (scheduleResult.status === "fulfilled")
      setMySchedule(scheduleResult.value.data.data || null);
    else if (scheduleResult.reason?.response?.status !== 404)
      toast.error(
        scheduleResult.reason?.response?.data?.message ||
          "Could not load your current schedule",
      );
  };
  useEffect(() => {
    let active = true;
    setLoading(true);
    void load().finally(() => {
      if (active) setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [workspaceId]);
  const saveContact = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      const response = await api.patch(
        `/workspaces/${workspaceId}/hr/my/profile`,
        {
          ...contact,
          emergencyContacts,
          bankDetails: bank,
          panNumber,
          ssfId,
          taxFilingStatus,
        },
      );
      setProfile(response.data.data);
      toast.success("Profile and payment details updated");
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message || "Could not update profile details",
      );
    } finally {
      setSaving(false);
    }
  };
  const acknowledge = async (caseId: string, itemId: string) => {
    try {
      await api.patch(
        `/workspaces/${workspaceId}/hr/my/onboarding/${caseId}/items/${itemId}/acknowledge`,
      );
      toast.success("Policy acknowledged");
      await load();
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message || "Could not acknowledge policy",
      );
    }
  };
  const uploadOwnDocument = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!file) {
      toast.error("Choose a document to upload");
      return;
    }
    setSaving(true);
    try {
      const body = new FormData();
      body.append("file", file);
      body.append("category", documentCategory);
      const owningCase = onboarding.find((item) =>
        item.items.some((check) => check._id === checklistItemId),
      );
      if (owningCase && checklistItemId) {
        body.append("onboardingId", owningCase._id);
        body.append("checklistItemId", checklistItemId);
      }
      await api.post(`/workspaces/${workspaceId}/hr/my/documents`, body, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      toast.success("Your document was encrypted and uploaded");
      setFile(null);
      setChecklistItemId("");
      await load();
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message || "Could not upload your document",
      );
    } finally {
      setSaving(false);
    }
  };
  const downloadOwnDocument = async (document: MyDocument) => {
    try {
      const response = await api.get(
        `/workspaces/${workspaceId}/hr/my/documents/${document._id}/download`,
        { responseType: "blob" },
      );
      const url = URL.createObjectURL(response.data);
      const anchor = window.document.createElement("a");
      anchor.href = url;
      anchor.download = document.name;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message || "Could not download your document",
      );
    }
  };
  return (
    <main className="container mx-auto space-y-6 px-4 py-8 md:px-8">
      <header className="flex items-center gap-3">
        <span className="rounded-xl bg-primary/10 p-3 text-primary">
          <UserRound className="h-6 w-6" />
        </span>
        <div>
          <h1 className="text-3xl font-bold">My HR</h1>
          <p className="text-sm text-muted-foreground">
            Your permitted employee details, attendance and leave are in their
            existing workspace tools, and payslips are below.
          </p>
        </div>
        <Link
          href={"/workspace/" + workspaceId + "/attendance"}
          className="inline-flex h-10 items-center rounded-md border px-4 text-sm font-medium hover:bg-muted"
        >
          Attendance & leave
        </Link>
      </header>
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : (
        <>
          <MyScheduleCard schedule={mySchedule} />
          {profile && <MyDevelopmentSelfService workspaceId={workspaceId} />}
          {profile && (
            <AttendanceCorrectionSelfService workspaceId={workspaceId} />
          )}
          {profile && (
            <Card>
              <CardContent className="space-y-4 p-5">
                <div>
                  <h2 className="text-lg font-semibold">{profile.user.name}</h2>
                  <p className="text-sm text-muted-foreground">
                    {profile.jobTitle || "Employee"} ·{" "}
                    {profile.department || "No department"} ·{" "}
                    {profile.employeeNumber} ·{" "}
                    {profile.employmentStatus.replaceAll("_", " ")}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Started {new Date(profile.startDate).toLocaleDateString()}
                  </p>
                </div>
                <form
                  onSubmit={saveContact}
                  className="grid gap-3 sm:grid-cols-2"
                >
                  <label className="space-y-1 text-sm font-medium">
                    Phone
                    <Input
                      value={contact.phone}
                      onChange={(e) =>
                        setContact({ ...contact, phone: e.target.value })
                      }
                    />
                  </label>
                  <label className="space-y-1 text-sm font-medium sm:col-span-2">
                    Address
                    <Input
                      value={contact.address}
                      onChange={(e) =>
                        setContact({ ...contact, address: e.target.value })
                      }
                    />
                  </label>
                  <div className="space-y-3 sm:col-span-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <h3 className="text-sm font-semibold">
                          Emergency contacts
                        </h3>
                        <p className="text-xs text-muted-foreground">
                          Keep up to date the people to contact in an emergency.
                        </p>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={emergencyContacts.length >= 10}
                        onClick={() =>
                          setEmergencyContacts((items) => [
                            ...items,
                            { name: "", relationship: "", phone: "" },
                          ])
                        }
                      >
                        Add contact
                      </Button>
                    </div>
                    {emergencyContacts.length ? (
                      emergencyContacts.map((item, index) => (
                        <div
                          key={index}
                          className="grid items-end gap-2 rounded-lg border p-3 sm:grid-cols-[1fr_1fr_1fr_auto]"
                        >
                          <label className="space-y-1 text-xs font-medium">
                            Name
                            <Input
                              required
                              maxLength={120}
                              value={item.name}
                              onChange={(e) =>
                                setEmergencyContacts((items) =>
                                  items.map((value, i) =>
                                    i === index
                                      ? { ...value, name: e.target.value }
                                      : value,
                                  ),
                                )
                              }
                            />
                          </label>
                          <label className="space-y-1 text-xs font-medium">
                            Relationship
                            <Input
                              maxLength={80}
                              value={item.relationship || ""}
                              onChange={(e) =>
                                setEmergencyContacts((items) =>
                                  items.map((value, i) =>
                                    i === index
                                      ? {
                                          ...value,
                                          relationship: e.target.value,
                                        }
                                      : value,
                                  ),
                                )
                              }
                            />
                          </label>
                          <label className="space-y-1 text-xs font-medium">
                            Phone
                            <Input
                              required
                              maxLength={40}
                              value={item.phone}
                              onChange={(e) =>
                                setEmergencyContacts((items) =>
                                  items.map((value, i) =>
                                    i === index
                                      ? { ...value, phone: e.target.value }
                                      : value,
                                  ),
                                )
                              }
                            />
                          </label>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              setEmergencyContacts((items) =>
                                items.filter((_, i) => i !== index),
                              )
                            }
                          >
                            Remove
                          </Button>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        No emergency contacts added.
                      </p>
                    )}
                  </div>
                  <div className="border-t pt-4 space-y-3 sm:col-span-2">
                    <h3 className="text-sm font-semibold">Salary Banking & Direct Deposit Details</h3>
                    <p className="text-xs text-muted-foreground">Your account information is encrypted and used for bulk salary payments.</p>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="space-y-1 text-xs font-medium">
                        Bank Name
                        <Input value={bank.bankName || ""} onChange={e => setBank({ ...bank, bankName: e.target.value })} placeholder="e.g. Nabil Bank, Chase" />
                      </label>
                      <label className="space-y-1 text-xs font-medium">
                        Bank Branch
                        <Input value={bank.bankBranch || ""} onChange={e => setBank({ ...bank, bankBranch: e.target.value })} placeholder="e.g. Putalisadak" />
                      </label>
                      <label className="space-y-1 text-xs font-medium">
                        Account Holder Name
                        <Input value={bank.accountHolderName || ""} onChange={e => setBank({ ...bank, accountHolderName: e.target.value })} placeholder="As per bank passbook" />
                      </label>
                      <label className="space-y-1 text-xs font-medium">
                        Account Number
                        <Input value={bank.accountNumber || ""} onChange={e => setBank({ ...bank, accountNumber: e.target.value })} placeholder="Bank Account Number" />
                      </label>
                      <label className="space-y-1 text-xs font-medium">
                        Routing / Branch Code / SWIFT
                        <Input value={bank.routingNumber || ""} onChange={e => setBank({ ...bank, routingNumber: e.target.value })} placeholder="Routing number or code" />
                      </label>
                    </div>
                  </div>

                  <div className="border-t pt-4 space-y-3 sm:col-span-2">
                    <h3 className="text-sm font-semibold">Tax & Social Security Identifiers</h3>
                    <div className="grid gap-3 sm:grid-cols-3">
                      <label className="space-y-1 text-xs font-medium">
                        PAN Number
                        <Input value={panNumber} onChange={e => setPanNumber(e.target.value)} placeholder="Permanent Account Number" />
                      </label>
                      <label className="space-y-1 text-xs font-medium">
                        Social Security / SSF ID
                        <Input value={ssfId} onChange={e => setSsfId(e.target.value)} placeholder="e.g. SSF-1029384" />
                      </label>
                      <label className="space-y-1 text-xs font-medium">
                        Tax Filing Category
                        <select
                          aria-label="Tax Filing Category"
                          className="h-10 w-full rounded-md border border-input bg-background px-3 text-xs"
                          value={taxFilingStatus}
                          onChange={e => setTaxFilingStatus(e.target.value)}
                        >
                          <option value="single">Single / Individual</option>
                          <option value="married">Married / Couple</option>
                          <option value="head_of_household">Head of Household</option>
                        </select>
                      </label>
                    </div>
                  </div>

                  <Button disabled={saving} className="sm:col-span-2">
                    {saving ? "Saving…" : "Save my profile & payment details"}
                  </Button>
                </form>
                <div>
                  <h3 className="text-sm font-semibold">
                    Government ID metadata
                  </h3>
                  {profile.governmentIds?.length ? (
                    profile.governmentIds.map((item, index) => (
                      <p
                        key={index}
                        className="mt-1 text-sm text-muted-foreground"
                      >
                        {item.type}
                        {item.lastFour ? ` ending ${item.lastFour}` : ""}
                        {item.expiresAt
                          ? ` · expires ${new Date(item.expiresAt).toLocaleDateString()}`
                          : ""}
                      </p>
                    ))
                  ) : (
                    <p className="mt-1 text-sm text-muted-foreground">
                      None recorded.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
          {onboarding.length > 0 && (
            <Card>
              <CardContent className="space-y-4 p-5">
                <h2 className="text-lg font-semibold">
                  My onboarding checklist
                </h2>
                {onboarding.map((record) => (
                  <div key={record._id} className="space-y-2">
                    {record.items.map((item) => (
                      <div
                        key={item._id}
                        className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3"
                      >
                        <div>
                          <p className="font-medium">
                            {item.title}
                            {item.required ? (
                              <span className="ml-2 text-xs text-red-600">
                                Required
                              </span>
                            ) : null}
                          </p>
                          <p className="text-xs capitalize text-muted-foreground">
                            {item.category.replaceAll("_", " ")} ·{" "}
                            {item.status.replaceAll("_", " ")}
                            {item.dueAt
                              ? ` · Due ${new Date(item.dueAt).toLocaleDateString()}`
                              : ""}
                            {item.documentIds?.length
                              ? ` · ${item.documentIds.length} document(s) attached`
                              : ""}
                          </p>
                        </div>
                        {item.category === "policy" &&
                          item.status !== "completed" &&
                          item.status !== "waived" && (
                            <Button
                              size="sm"
                              onClick={() => acknowledge(record._id, item._id)}
                            >
                              Acknowledge policy
                            </Button>
                          )}
                      </div>
                    ))}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
          {
            <Card>
              <CardContent className="space-y-4 p-5">
                <div>
                  <h2 className="text-lg font-semibold">
                    My confidential documents
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Documents are encrypted before storage and visible to
                    authorized HR users.
                  </p>
                </div>
                <form
                  onSubmit={uploadOwnDocument}
                  className="flex flex-wrap items-end gap-3"
                >
                  <label className="space-y-1 text-sm font-medium">
                    Document
                    <Input
                      type="file"
                      required
                      accept=".pdf,.jpg,.jpeg,.png,.webp,.txt,.doc,.docx"
                      onChange={(event) =>
                        setFile(event.target.files?.[0] || null)
                      }
                    />
                  </label>
                  <label className="space-y-1 text-sm font-medium">
                    Category
                    <select
                      value={documentCategory}
                      onChange={(event) =>
                        setDocumentCategory(event.target.value)
                      }
                      className="h-10 rounded-md border bg-background px-3"
                    >
                      {[
                        "identity",
                        "employment",
                        "tax",
                        "education",
                        "policy_acknowledgment",
                        "reimbursement_receipt",
                        "other",
                      ].map((category) => (
                        <option key={category} value={category}>
                          {category.replaceAll("_", " ")}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="space-y-1 text-sm font-medium">
                    Checklist item (optional)
                    <select
                      value={checklistItemId}
                      onChange={(event) =>
                        setChecklistItemId(event.target.value)
                      }
                      className="h-10 rounded-md border bg-background px-3"
                    >
                      <option value="">No linked item</option>
                      {onboarding
                        .flatMap((record) =>
                          record.items.map((item) => ({
                            ...item,
                            onboardingId: record._id,
                          })),
                        )
                        .filter(
                          (item) =>
                            item.category === "document" &&
                            item.status !== "waived",
                        )
                        .map((item) => (
                          <option key={item._id} value={item._id}>
                            {item.title}
                          </option>
                        ))}
                    </select>
                  </label>
                  <Button disabled={saving}>
                    <Upload className="mr-2 h-4 w-4" />
                    Upload securely
                  </Button>
                </form>
                {documents.length ? (
                  <ul className="divide-y rounded-lg border">
                    {documents.map((document) => (
                      <li
                        key={document._id}
                        className="flex items-center justify-between gap-3 p-3"
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium">
                            {document.name}
                          </span>
                          <span className="text-xs capitalize text-muted-foreground">
                            {document.category.replaceAll("_", " ")} ·{" "}
                            {(document.size / 1024).toFixed(0)} KB ·{" "}
                            {new Date(document.createdAt).toLocaleDateString()}
                            {document.expiresAt
                              ? " · Expires " +
                                new Date(
                                  document.expiresAt,
                                ).toLocaleDateString()
                              : ""}
                          </span>
                        </span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => void downloadOwnDocument(document)}
                        >
                          <Download className="mr-1 h-4 w-4" />
                          Download
                        </Button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No confidential documents uploaded.
                  </p>
                )}
              </CardContent>
            </Card>
          }
          {profile && <MyReimbursementClaims workspaceId={workspaceId} />}
          {profile && <MyEmployeeSupport workspaceId={workspaceId} />}
          {payslips.length ? (
            <section className="space-y-4">
              <h2 className="text-xl font-semibold">Approved payslips</h2>
              {payslips.map((slip) => (
                <Card key={slip._id} className="print:break-inside-avoid">
                  <CardContent className="space-y-4 p-5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h2 className="flex items-center gap-2 text-lg font-semibold">
                          <ReceiptText className="h-5 w-5 text-primary" />
                          {formatDualDate(slip.periodStart, true)}
                        </h2>
                        <p className="text-sm text-muted-foreground">
                          {slip.line.employeeName} · {slip.line.employeeNumber}{" "}
                          · {slip.status}
                        </p>
                      </div>
                      <Button variant="outline" onClick={() => window.print()}>
                        Print / Save PDF
                      </Button>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                      {[
                        ["Base", slip.line.baseAmount],
                        ["Earnings", slip.line.earnings],
                        ["Deductions", slip.line.deductions],
                        [
                          "Employer contributions",
                          slip.line.employerContributions,
                        ],
                        ["Net pay", slip.line.netAmount],
                      ].map(([label, value]) => (
                        <div key={label} className="rounded-lg bg-muted/50 p-3">
                          <p className="text-xs text-muted-foreground">
                            {label}
                          </p>
                          <p className="mt-1 font-semibold">
                            {slip.currency} {value}
                          </p>
                        </div>
                      ))}
                    </div>
                    {slip.line.components.length > 0 && (
                      <div>
                        <h3 className="font-medium">Pay components</h3>
                        <ul className="mt-2 divide-y rounded-lg border">
                          {slip.line.components.map((component, index) => (
                            <li
                              key={`${component.code}-${index}`}
                              className="flex justify-between gap-3 p-3 text-sm"
                            >
                              <span>
                                {component.name}{" "}
                                <span className="capitalize text-muted-foreground">
                                  · {component.kind.replaceAll("_", " ")}
                                </span>
                              </span>
                              <strong>
                                {slip.currency} {component.amount}
                              </strong>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {slip.line.manualAdjustments?.length ? (
                      <div>
                        <h3 className="font-medium">Period adjustments</h3>
                        <ul className="mt-2 divide-y rounded-lg border">
                          {slip.line.manualAdjustments.map((adjustment) => (
                            <li key={adjustment._id} className="p-3 text-sm">
                              <div className="flex justify-between gap-3">
                                <span>
                                  {adjustment.name}{" "}
                                  <span className="capitalize text-muted-foreground">
                                    · {adjustment.category.replaceAll("_", " ")}
                                  </span>
                                </span>
                                <strong>
                                  {slip.currency} {adjustment.amount}
                                </strong>
                              </div>
                              <p className="mt-1 text-xs text-muted-foreground">
                                {adjustment.reason}
                              </p>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                    <p className="text-xs text-muted-foreground">
                      Recorded hours: {slip.line.recordedHours} · Approved leave
                      days: {slip.line.approvedLeaveDays}
                    </p>
                    {slip.line.warnings.length > 0 && (
                      <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
                        Payroll notes: {slip.line.warnings.join("; ")}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </section>
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-sm text-muted-foreground">
                No approved payslips are available for your employee record yet.
              </CardContent>
            </Card>
          )}
        </>
      )}
    </main>
  );
}
