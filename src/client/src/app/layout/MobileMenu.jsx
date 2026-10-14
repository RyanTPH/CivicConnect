import { useEffect, useRef } from "react";
import { NavLink } from "react-router-dom";
import { X } from "lucide-react";

import { requesterNavigation } from "./navigation";
import styles from "./AppLayout.module.css";
import {LogoutButton} from "../../modules/auth";



export default function MobileMenu({ isOpen, onClose }) {
  const menuRef = useRef(null);
  const closeButtonRef = useRef(null);

  // Move keyboard focus into the drawer when it opens.
  useEffect(() => {
    if (!isOpen) return;

    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        onClose();
      }

      // Keep keyboard focus inside the open drawer.
      if (event.key === "Tab") {
        const elements = menuRef.current?.querySelectorAll(
          'a[href], button:not([disabled])'
        );

        if (!elements?.length) return;

        const first = elements[0];
        const last = elements[elements.length - 1];

        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (
          !event.shiftKey &&
          document.activeElement === last
        ) {
          event.preventDefault();
          first.focus();
        }
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
      previousFocus?.focus();
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className={styles.mobileMenuLayer}>
      <button
        type="button"
        className={styles.menuOverlay}
        onClick={onClose}
        aria-label="Close navigation menu"
        tabIndex={-1}
      />

      <aside
        id="mobile-navigation"
        ref={menuRef}
        className={styles.mobileMenu}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
      >
        <div className={styles.menuHeader}>
          <span className={styles.menuBrand}>CivicConnect</span>

          <button
            ref={closeButtonRef}
            type="button"
            className={styles.closeButton}
            onClick={onClose}
            aria-label="Close menu"
          >
            <X size={24} />
          </button>
        </div>

        <nav
          className={styles.mobileNavigation}
          aria-label="Mobile requester navigation"
        >
          {requesterNavigation.map(({ label, path, icon: Icon }) => (
            <NavLink
              key={path}
              to={path}
              end={path === "/requests"}
              onClick={onClose}
              className={({ isActive }) =>
                `${styles.mobileNavLink} ${
                  isActive ? styles.mobileNavActive : ""
                }`
              }
            >
              <Icon size={20} aria-hidden="true" />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className={styles.mobileMenuFooter}>
          <LogoutButton onSignedOut={onClose} />
        </div>
      </aside>
    </div>
  );
}