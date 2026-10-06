import RequestForm from "./features/requests/RequestForm";

function App() {
    return (
        <main className="app-shell">
            <header className="app-header">
                <h1>CivicConnect</h1>
                <p>Community service request management</p>
            </header>

            <RequestForm />
        </main>
    );
}

export default App;