import {
  Home,
  PlusCircle,
  UserRound,
  BarChart3,
  ShieldCheck,
  UsersRound,
  ClipboardList,
  UserPlus,
  ClipboardCheck,
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
    icon: ShieldCheck,
  },
  {
  label: "My Assigned Requests",
  path: "/manager/my-requests",
  icon: ClipboardCheck,
},
  {
  label: "Team Overview",
  path: "/manager/team",
  icon: UsersRound,
},
{
  label: "Manage Assignments",
  path: "/manager/assignments",
  icon: ClipboardList,
},
{
  label: "Reports",
  path: "/manager/reports",
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
  label: "Team Overview",
  path: "/admin/team",
  icon: UsersRound,
},
{
  label: "Add Staff Member",
  path: "/admin/staff/add",
  icon: UserPlus,
},
{
  label: "Manage Assignments",
  path: "/admin/assignments",
  icon: ClipboardList,
},
{
  label: "Reports",
  path: "/admin/reports",
  icon: BarChart3,
},
{
    label: "My Profile",
    path: "/admin/profile",
    icon: UserRound,
  },
];
