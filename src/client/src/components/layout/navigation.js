import {
  Home,
  FileText,
  PlusCircle,
  Search,
  Bell,
  UserRound,
} from "lucide-react";

// Shared requester navigation used by mobile and desktop layouts.
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
    label: "My Requests",
    path: "/requests",
    icon: FileText,
  },
  {
    label: "Track Request",
    path: "/track",
    icon: Search,
  },
  {
    label: "Notifications",
    path: "/notifications",
    icon: Bell,
  },
  {
    label: "Profile",
    path: "/profile",
    icon: UserRound,
  },
];