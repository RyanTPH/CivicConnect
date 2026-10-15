import {
  Home,
  PlusCircle,
  Search,
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
