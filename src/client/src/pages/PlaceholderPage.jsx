import { Link } from "react-router-dom";
import PageHeader from "../components/ui/PageHeader";
import styles from "./PlaceholderPage.module.css";

// Temporary placeholder until each requester screen is implemented.
export default function PlaceholderPage({
  title,
  description,
}) {
  return (
    <section>
      <PageHeader
        title={title}
        description={description}
      />

      <Link to="/requests/new" className={styles.actionLink}>
        File a Complaint
      </Link>
    </section>
  );
}