import { useState } from "react";
import { createServiceRequest } from "./requestService";

function RequestForm() {
    const [formData, setFormData] = useState({
        category: "",
        title: "",
        description: "",
    });

    const [submittedRequest, setSubmittedRequest] = useState(null);
    const [error, setError] = useState("");

    function handleChange(event) {
        const { name, value } = event.target;

        setFormData((current) => ({
            ...current,
            [name]: value,
        }));
    }

    function handleSubmit(event) {
        event.preventDefault();

        try {
            const request = createServiceRequest(formData);

            setSubmittedRequest(request);
            setError("");

            setFormData({
                category: "",
                title: "",
                description: "",
            });
        } catch (err) {
            setSubmittedRequest(null);
            setError(err.message);
        }
    }

    return (
        <section className="request-section">
            <div className="request-heading">
                <p className="eyebrow">Service Requests</p>
                <h2>Submit a service request</h2>
                <p>
                    Report an issue or request a service and receive a reference number
                    for tracking.
                </p>
            </div>

            <form className="request-form" onSubmit={handleSubmit}>
                <div className="field">
                    <label htmlFor="category">Category</label>
                    <input
                        id="category"
                        name="category"
                        type="text"
                        value={formData.category}
                        onChange={handleChange}
                        required
                    />
                </div>

                <div className="field">
                    <label htmlFor="title">Request title</label>
                    <input
                        id="title"
                        name="title"
                        type="text"
                        value={formData.title}
                        onChange={handleChange}
                        maxLength="120"
                        required
                    />
                </div>

                <div className="field">
                    <label htmlFor="description">Description</label>
                    <textarea
                        id="description"
                        name="description"
                        value={formData.description}
                        onChange={handleChange}
                        rows="5"
                        required
                    />
                </div>

                <button type="submit">Submit request</button>
            </form>

            {error && (
                <p className="message error" role="alert">
                    {error}
                </p>
            )}

            {submittedRequest && (
                <div className="message success" aria-live="polite">
                    <strong>Request submitted.</strong>
                    <span>
                        Reference: {submittedRequest.referenceNumber}
                    </span>
                    <span>Status: {submittedRequest.status}</span>
                </div>
            )}
        </section>
    );
}

export default RequestForm;