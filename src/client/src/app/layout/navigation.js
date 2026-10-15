import {
  Home,
  PlusCircle,
  UserRound,
  BarChart3,
  ShieldCheck,
} from "lucide-react";

// Requester navigation shared by desktop and mobile layouts.
export const requesterNavigation = [
  {
    label: "Dashboard",
    path: "/dashboard",
    icon: Home,
  },
  {
    label: "File a Complaint",
    path: "/requests/new",
    icon: PlusCircle,
  },
  {
    label: "Profile",
    path: "/profile",
    icon: UserRound,
  },
];

// General-staff navigation uses the same layout as the requester portal.
export const staffNavigation = [
  {
    label: "Staff Dashboard",
    path: "/staff/dashboard",
    icon: Home,
  },
  {
    label: "My Profile",
    path: "/staff/profile",
    icon: UserRound,
  },
];


// Manager portal: operational monitoring and oversight.
export const managerNavigation = [
  {
    label: "Management Dashboard",
    path: "/manager/dashboard",
    icon: BarChart3,
  },
  {
    label: "My Profile",
    path: "/manager/profile",
    icon: UserRound,
  },
];

// Admin portal: platform oversight.
export const adminNavigation = [
  {
    label: "Admin Dashboard",
    path: "/admin/dashboard",
    icon: ShieldCheck,
  },
  {
    label: "My Profile",
    path: "/admin/profile",
    icon: UserRound,
  },
];
