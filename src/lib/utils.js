import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount, currency = "INR") {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatNumber(num) {
  if (num >= 10000000) {
    return (num / 10000000).toFixed(2) + " Cr";
  } else if (num >= 100000) {
    return (num / 100000).toFixed(2) + " L";
  } else if (num >= 1000) {
    return (num / 1000).toFixed(2) + " K";
  }
  return num.toLocaleString("en-IN");
}

export function formatDate(dateString) {
  if (!dateString) return "-";
  const date = new Date(dateString);
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(dateString) {
  if (!dateString) return "-";
  const date = new Date(dateString);
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function getStatusColor(status) {
  const statusColors = {
    planning: "planning",
    in_progress: "in-progress",
    on_hold: "on-hold",
    completed: "completed",
    pending: "pending",
    approved: "approved",
    rejected: "danger",
    draft: "planning",
    submitted: "in-progress",
    irn_generated: "completed",
    cancelled: "danger",
    auth_failed: "on-hold",
    submission_failed: "danger",
  };
  return statusColors[status] || "planning";
}

export function getInitials(name) {
  if (!name) return "??";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function calculatePercentage(value, total) {
  if (!total || total === 0) return 0;
  return Math.round((value / total) * 100);
}

export function generateId() {
  return Math.random().toString(36).substring(2, 9);
}

export const roleLabels = {
  admin: "Administrator",
  site_engineer: "Site Engineer",
  finance: "Finance Manager",
  procurement: "Procurement Officer",
};

export const projectStatusLabels = {
  planning: "Planning",
  in_progress: "In Progress",
  on_hold: "On Hold",
  completed: "Completed",
};
