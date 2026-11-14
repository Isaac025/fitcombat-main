import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { API_URL, formatNaira } from "../config";

const TOKEN_KEY = "fc_admin_token";

const getToken = () => {
  try { return sessionStorage.getItem(TOKEN_KEY) || ""; } catch { return ""; }
};
const setToken = (t) => {
  try { t ? sessionStorage.setItem(TOKEN_KEY, t) : sessionStorage.removeItem(TOKEN_KEY); } catch { /* ignore */ }
};

const fmtTime = (iso) =>
  iso
    ? new Date(iso).toLocaleString("en-NG", {
        timeZone: "Africa/Lagos",
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : "—";

// Stop spreadsheet apps from running names like "=HYPERLINK(...)" as formulas.
const csvCell = (v) => {
  let s = String(v ?? "");
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
};

const exportCsv = (tickets) => {
  const rows = [
    ["Name", "Email", "Ticket No", "Amount (NGN)", "Paid at", "Entered", "Entered at"],
    ...tickets.map((t) => [
      t.name, t.email, t.ticketNumber, t.amountPaid, fmtTime(t.paidAt),
      t.checkedIn ? "Yes" : "No", fmtTime(t.checkedInAt),
    ]),
  ];
  const csv = "\uFEFF" + rows.map((r) => r.map(csvCell).join(",")).join("\r\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `fitcombat-tickets-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};

/* ------------------------------------------------------------------ */
const Login = ({ onLoggedIn }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const { data } = await axios.post(`${API_URL}/api/admin/login`, { email, password }, { timeout: 60000 });
      setToken(data.token);
      onLoggedIn(data.token);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Couldn’t reach the server. If it was idle it may be waking up — try again in a few seconds.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="adm adm--center">
      <form className="adm-login" onSubmit={submit}>
        <h1>FIT COMBAT</h1>
        <p className="muted">Admin sign in</p>
        {error && <p className="notice notice--warn" role="alert">{error}</p>}
        <label className="field">
          <span>Email</span>
          <input type="email" autoComplete="username" required value={email}
            onChange={(e) => setEmail(e.target.value)} disabled={busy} />
        </label>
        <label className="field">
          <span>Password</span>
          <input type="password" autoComplete="current-password" required value={password}
            onChange={(e) => setPassword(e.target.value)} disabled={busy} />
        </label>
        <button className="btn btn--gold btn--block" disabled={busy}>
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </main>
  );
};

/* ------------------------------------------------------------------ */
const Dashboard = ({ token, onLogout }) => {
  const [data, setData] = useState(null); // { summary, tickets }
  const [loadError, setLoadError] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all"); // all | in | out
  const [busyNo, setBusyNo] = useState("");
  const [banner, setBanner] = useState(null); // { kind: ok|bad, text }
  const searchRef = useRef(null);

  const api = useMemo(
    () => axios.create({ baseURL: `${API_URL}/api/admin`, headers: { Authorization: `Bearer ${token}` }, timeout: 60000 }),
    [token],
  );

  const handleAuthError = useCallback(
    (err) => {
      if (err.response?.status === 401) { onLogout(); return true; }
      return false;
    },
    [onLogout],
  );

  const load = useCallback(async () => {
    try {
      const res = await api.get("/tickets");
      setData(res.data);
      setLoadError("");
    } catch (err) {
      if (handleAuthError(err)) return;
      setLoadError(err.response?.data?.message || "Couldn’t load tickets. Check your connection and retry.");
    }
  }, [api, handleAuthError]);

  useEffect(() => {
    load();
    const id = setInterval(() => { if (!document.hidden) load(); }, 30000);
    return () => clearInterval(id);
  }, [load]);

  const patchTicket = (t) =>
    setData((d) => {
      if (!d) return d;
      const tickets = d.tickets.map((x) => (x.ticketNumber === t.ticketNumber ? t : x));
      const checkedIn = tickets.filter((x) => x.checkedIn).length;
      return { tickets, summary: { ...d.summary, checkedIn, notYetIn: d.summary.totalSold - checkedIn } };
    });

  const admit = async (ticketNumber) => {
    setBusyNo(ticketNumber);
    try {
      const { data: res } = await api.post(`/tickets/${ticketNumber}/check-in`);
      patchTicket(res.ticket);
      setBanner({ kind: "ok", text: `${res.ticket.name} — ${res.ticket.ticketNumber} admitted` });
    } catch (err) {
      if (handleAuthError(err)) return;
      if (err.response?.status === 409) {
        patchTicket(err.response.data.ticket);
        const t = err.response.data.ticket;
        setBanner({ kind: "bad", text: `ALREADY USED — ${t.name} (${t.ticketNumber}) entered at ${fmtTime(t.checkedInAt)}` });
      } else {
        setBanner({ kind: "bad", text: err.response?.data?.message || "Check-in failed. Try again." });
      }
    } finally {
      setBusyNo("");
      setQuery("");
      searchRef.current?.focus();
    }
  };

  const undo = async (ticketNumber) => {
    if (!window.confirm(`Mark ${ticketNumber} as NOT entered?`)) return;
    setBusyNo(ticketNumber);
    try {
      const { data: res } = await api.post(`/tickets/${ticketNumber}/undo-check-in`);
      patchTicket(res.ticket);
      setBanner({ kind: "ok", text: `${ticketNumber} check-in undone` });
    } catch (err) {
      if (!handleAuthError(err)) setBanner({ kind: "bad", text: err.response?.data?.message || "Couldn’t undo." });
    } finally {
      setBusyNo("");
    }
  };

  const q = query.trim().toLowerCase();
  const exact = q && data?.tickets.find((t) => t.ticketNumber.toLowerCase() === q);

  const shown = useMemo(() => {
    if (!data) return [];
    return data.tickets.filter((t) => {
      if (filter === "in" && !t.checkedIn) return false;
      if (filter === "out" && t.checkedIn) return false;
      if (!q) return true;
      return [t.name, t.email, t.ticketNumber].some((v) => v.toLowerCase().includes(q));
    });
  }, [data, q, filter]);

  // A barcode scanner types the ticket number then presses Enter → admit straight away.
  const onSearchKey = (e) => {
    if (e.key !== "Enter" || !q) return;
    e.preventDefault();
    if (exact && !exact.checkedIn) admit(exact.ticketNumber);
  };

  const s = data?.summary;

  return (
    <main className="adm">
      <header className="adm-top">
        <div>
          <h1>FIT COMBAT <span className="muted">· Admin</span></h1>
          <p className="muted">Ticket sales &amp; door check-in</p>
        </div>
        <div className="adm-actions">
          <button className="btn btn--ghost btn--sm" onClick={load}>Refresh</button>
          <button className="btn btn--ghost btn--sm" disabled={!data?.tickets.length} onClick={() => exportCsv(data.tickets)}>Export CSV</button>
          <button className="btn btn--ghost btn--sm" onClick={onLogout}>Log out</button>
        </div>
      </header>

      {loadError && <p className="notice notice--warn" role="alert">{loadError}</p>}

      <section className="adm-stats">
        <div><b>{s ? s.totalSold : "–"}</b><span>Tickets sold</span></div>
        <div><b>{s ? formatNaira(s.revenue) : "–"}</b><span>Revenue</span></div>
        <div><b>{s ? s.checkedIn : "–"}</b><span>Entered</span></div>
        <div><b>{s ? s.notYetIn : "–"}</b><span>Not yet in</span></div>
      </section>

      {banner && (
        <p className={`adm-banner adm-banner--${banner.kind}`} role="status" onClick={() => setBanner(null)}>
          {banner.text}
        </p>
      )}

      <div className="adm-tools">
        <input
          ref={searchRef}
          className="adm-search"
          type="search"
          autoFocus
          placeholder="Scan barcode, or search name / email / ticket no."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onSearchKey}
        />
        <div className="adm-chips" role="group" aria-label="Filter">
          {[["all", "All"], ["out", "Not entered"], ["in", "Entered"]].map(([k, label]) => (
            <button key={k} className={filter === k ? "on" : ""} onClick={() => setFilter(k)}>{label}</button>
          ))}
        </div>
      </div>

      {exact && (
        <section className={`adm-door ${exact.checkedIn ? "adm-door--bad" : "adm-door--ok"}`}>
          <p className="adm-door__status">{exact.checkedIn ? "ALREADY USED" : "VALID TICKET"}</p>
          <p className="adm-door__name">{exact.name}</p>
          <p>{exact.ticketNumber} · {exact.email}</p>
          {exact.checkedIn ? (
            <p>Entered at {fmtTime(exact.checkedInAt)}</p>
          ) : (
            <button className="btn btn--gold btn--lg" disabled={busyNo === exact.ticketNumber} onClick={() => admit(exact.ticketNumber)}>
              {busyNo === exact.ticketNumber ? "Admitting…" : "Admit"}
            </button>
          )}
        </section>
      )}

      {q && !exact && data && shown.length === 0 && (
        <p className="notice notice--warn">No paid ticket matches “{query.trim()}”. Do not admit without checking.</p>
      )}

      <div className="adm-tablewrap">
        <table className="adm-table">
          <thead>
            <tr><th>#</th><th>Name</th><th>Email</th><th>Ticket No</th><th>Paid at</th><th>Status</th></tr>
          </thead>
          <tbody>
            {!data && !loadError && <tr><td colSpan="6" className="muted">Loading…</td></tr>}
            {data && shown.length === 0 && !q && <tr><td colSpan="6" className="muted">No tickets here yet.</td></tr>}
            {shown.map((t, i) => (
              <tr key={t.ticketNumber}>
                <td>{i + 1}</td>
                <td>{t.name}</td>
                <td>{t.email}</td>
                <td className="ref">{t.ticketNumber}</td>
                <td>{fmtTime(t.paidAt)}</td>
                <td>
                  {t.checkedIn ? (
                    <>
                      <span className="adm-tag adm-tag--in">Entered</span>
                      <small className="muted"> {fmtTime(t.checkedInAt)} </small>
                      <button className="link-btn adm-undo" disabled={busyNo === t.ticketNumber} onClick={() => undo(t.ticketNumber)}>undo</button>
                    </>
                  ) : (
                    <button className="btn btn--gold btn--sm" disabled={busyNo === t.ticketNumber} onClick={() => admit(t.ticketNumber)}>
                      {busyNo === t.ticketNumber ? "…" : "Check in"}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="muted adm-foot">Showing {shown.length} of {data?.tickets.length ?? 0} · auto-refreshes every 30s</p>
    </main>
  );
};

/* ------------------------------------------------------------------ */
const AdminPage = () => {
  const [token, setTokenState] = useState(getToken);

  useEffect(() => {
    document.title = "Admin · FIT COMBAT";
    const meta = document.createElement("meta");
    meta.name = "robots";
    meta.content = "noindex,nofollow";
    document.head.appendChild(meta);
    return () => meta.remove();
  }, []);

  const logout = useCallback(() => { setToken(""); setTokenState(""); }, []);

  return token ? <Dashboard token={token} onLogout={logout} /> : <Login onLoggedIn={setTokenState} />;
};

export default AdminPage;
