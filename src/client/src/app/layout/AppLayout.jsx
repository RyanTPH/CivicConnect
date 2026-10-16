import NotificationBell from "./NotificationBell";
import { useCallback, useEffect, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { Menu } from "lucide-react";

import MobileMenu from "./MobileMenu";
import {
  requesterNavigation,
  staffNavigation,
  managerNavigation,
  adminNavigation,
} from "./navigation";
import styles from "./AppLayout.module.css";
import { LogoutButton } from "../../modules/auth";

// Section labels displayed in the application header.
const pageTitles = {
  "/dashboard": "Dashboard",
  "/requests": "My Requests",
  "/requests/new": "File a Complaint",
  "/track": "Track Request",
  "/notifications": "Notifications",
  "/profile": "My Profile",
  "/staff/dashboard": "Staff Dashboard",
  "/staff/profile": "Staff Profile",
  "/manager/dashboard": "Management Dashboard",
  "/manager/profile": "Manager Profile",
  "/admin/dashboard": "Admin Dashboard",
  "/admin/profile": "Admin Profile",
  "/manager/team": "Team Overview",
"/admin/team": "Staff Directory",
"/manager/assignments": "Assignment Management",
"/admin/assignments": "Assignment Management",
"/manager/reports": "Service Delivery Reports",
"/admin/reports": "Service Delivery Reports",
"/admin/staff/add": "Add Staff Member",
};

export default function AppLayout({ portal = "requester" }) {
  const { pathname } = useLocation();


  // Shared layout with role-specific navigation and home destinations.
  const portalConfiguration = {
    requester: {
      navigation: requesterNavigation,
      homePath: "/dashboard",
    },
    staff: {
      navigation: staffNavigation,
      homePath: "/staff/dashboard",
    },
    manager: {
      navigation: managerNavigation,
      homePath: "/manager/dashboard",
    },
    admin: {
      navigation: adminNavigation,
      homePath: "/admin/dashboard",
    },
  };

  const { navigation, homePath } =
    portalConfiguration[portal] ?? portalConfiguration.requester;

  // Remember which route opened the navigation drawer.
  const [menuRoute, setMenuRoute] = useState(null);

  const menuOpen = menuRoute === pathname;

  const openMenu = useCallback(() => {
    setMenuRoute(pathname);
  }, [pathname]);

  const closeMenu = useCallback(() => {
    setMenuRoute(null);
  }, []);

  // Close the drawer when switching to desktop layout.
  useEffect(() => {
    const mediaQuery = window.matchMedia("(min-width: 1024px)");

    function handleViewportChange(event) {
      if (event.matches) {
        closeMenu();
      }
    }

    mediaQuery.addEventListener("change", handleViewportChange);

    return () => {
      mediaQuery.removeEventListener("change", handleViewportChange);
    };
  }, [closeMenu]);

  const pageTitle =
  pathname.startsWith("/manager/requests/") ||
  pathname.startsWith("/admin/requests/")
    ? "Request Details"
    : pathname.startsWith("/manager/team/") ||
        pathname.startsWith("/admin/team/")
      ? "Staff Details"
      : pathname.startsWith("/staff/requests/")
        ? "Manage Request"
        : pathname.startsWith("/requests/") &&
            pathname !== "/requests/new"
          ? "Request Details"
          : pageTitles[pathname] || "CivicConnect";

  return (
    <div className={styles.appShell}>
      {/* Permanent desktop navigation */}
      <aside className={styles.sidebar}>
        <NavLink to={homePath} className={styles.brand}>
          CivicConnect
        </NavLink>

        <nav
          className={styles.desktopNavigation}
          aria-label={
            `${portal} navigation`
          }
        >
          {navigation.map(({ label, path, icon: Icon }) => (
            <NavLink
              key={path}
              to={path}
              end={path === "/requests"}
              className={({ isActive }) =>
                `${styles.sidebarLink} ${isActive ? styles.sidebarActive : ""}`
              }
            >
              <Icon size={20} aria-hidden="true" />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className={styles.sidebarFooter}>
          <LogoutButton />
        </div>
      </aside>

      {/* Main page area */}
      <div className={styles.mainArea}>
        <header className={styles.header}>
          <div className={styles.headerLeft}>
            <button
              type="button"
              className={styles.menuButton}
              onClick={openMenu}
              aria-label="Open navigation menu"
              aria-expanded={menuOpen}
              aria-controls="mobile-navigation"
            >
              <Menu size={24} aria-hidden="true" />
            </button>

            <div className={styles.headerText}>
              <span className={styles.headerEyebrow}>CivicConnect</span>

              {/* Section label, not the main page heading */}
              <span className={styles.headerTitle}>{pageTitle}</span>
            </div>
          </div>

          <NotificationBell portal={portal} />
        </header>

        {/* Each page supplies its own h1 via PageHeader */}
        <main className={styles.content} id="main-content">
          <Outlet />
        </main>
      </div>

      <MobileMenu
        isOpen={menuOpen}
        onClose={closeMenu}
        navigation={navigation}
        portal={portal}
      />
    </div>
  );
}
