import {
  Home,
  PlusCircle,
  UserRound,
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
