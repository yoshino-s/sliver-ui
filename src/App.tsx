import { FormEvent, useMemo, useState } from "react";

type NavItemKey =
  | "overview"
  | "implants"
  | "sessions"
  | "listeners"
  | "jobs"
  | "loot"
  | "console";

type OperatorConfig = {
  operator: string;
  token: string;
  lhost: string;
  lport: number;
  ca_certificate: string;
  private_key: string;
  certificate: string;
};

type ConfigSummary = {
  operator: string;
  endpoint: string;
  hasToken: boolean;
  hasClientCertificate: boolean;
  hasPrivateKey: boolean;
  hasCaCertificate: boolean;
};

type TableRow = Record<string, string>;

const navItems: Array<{ key: NavItemKey; label: string }> = [
  { key: "overview", label: "Overview" },
  { key: "implants", label: "Implants" },
  { key: "sessions", label: "Sessions" },
  { key: "listeners", label: "Listeners" },
  { key: "jobs", label: "Jobs" },
  { key: "loot", label: "Loot" },
  { key: "console", label: "Console" },
];

const sampleConfig = `{
  "operator": "alice",
  "token": "paste-your-token-here",
  "lhost": "127.0.0.1",
  "lport": 31337,
  "ca_certificate": "-----BEGIN CERTIFICATE-----\\n...\\n-----END CERTIFICATE-----\\n",
  "private_key": "-----BEGIN EC PRIVATE KEY-----\\n...\\n-----END EC PRIVATE KEY-----\\n",
  "certificate": "-----BEGIN CERTIFICATE-----\\n...\\n-----END CERTIFICATE-----\\n"
}`;

const implantRows: TableRow[] = [
  {
    name: "win-x64-blue",
    os: "windows/amd64",
    format: "service",
    profile: "mtls",
    stage: "ready",
  },
  {
    name: "linux-edge",
    os: "linux/amd64",
    format: "shellcode",
    profile: "https",
    stage: "draft",
  },
  {
    name: "mac-arm64-dev",
    os: "darwin/arm64",
    format: "macho",
    profile: "wg",
    stage: "ready",
  },
];

const sessionRows: TableRow[] = [
  {
    id: "#18",
    host: "DESKTOP-41",
    user: "lab\\analyst",
    transport: "mtls",
    lastSeen: "22s ago",
    status: "active",
  },
  {
    id: "#21",
    host: "edge-node",
    user: "www-data",
    transport: "https",
    lastSeen: "3m ago",
    status: "active",
  },
  {
    id: "#27",
    host: "macbook-pro",
    user: "operator",
    transport: "wg",
    lastSeen: "18m ago",
    status: "idle",
  },
];

const listenerRows: TableRow[] = [
  {
    name: "mtls-main",
    protocol: "mTLS",
    bind: "0.0.0.0:8888",
    status: "running",
  },
  {
    name: "https-cdn",
    protocol: "HTTPS",
    bind: "0.0.0.0:443",
    status: "running",
  },
  {
    name: "dns-lab",
    protocol: "DNS",
    bind: "lab.example",
    status: "stopped",
  },
];

const jobRows: TableRow[] = [
  {
    id: "31",
    task: "shell whoami",
    target: "#18",
    owner: "alice",
    status: "completed",
  },
  {
    id: "32",
    task: "download /tmp/report.zip",
    target: "#21",
    owner: "alice",
    status: "running",
  },
  {
    id: "33",
    task: "screenshot",
    target: "#27",
    owner: "alice",
    status: "queued",
  },
];

const lootRows: TableRow[] = [
  {
    name: "browser-profile.zip",
    type: "archive",
    source: "#18",
    size: "4.2 MB",
  },
  {
    name: "process-list.txt",
    type: "text",
    source: "#21",
    size: "18 KB",
  },
  {
    name: "screen-2026-05-24.png",
    type: "image",
    source: "#27",
    size: "912 KB",
  },
];

const commandHelp = [
  "Available commands:",
  "  help       Show available commands",
  "  connect    Validate web gateway settings",
  "  implants   List generated implants",
  "  sessions   List active sessions",
  "  listeners  List listener state",
  "  jobs       List job state",
  "  clear      Clear console output",
];

function parseOperatorConfig(input: string): ConfigSummary {
  const parsed = JSON.parse(input) as Partial<OperatorConfig>;
  const requiredFields: Array<keyof OperatorConfig> = [
    "operator",
    "token",
    "lhost",
    "lport",
    "ca_certificate",
    "private_key",
    "certificate",
  ];

  for (const field of requiredFields) {
    if (!parsed[field]) {
      throw new Error(`Missing required field: ${field}`);
    }
  }

  if (typeof parsed.operator !== "string") {
    throw new Error("operator must be a string");
  }

  if (typeof parsed.lhost !== "string") {
    throw new Error("lhost must be a string");
  }

  if (typeof parsed.lport !== "number") {
    throw new Error("lport must be a number");
  }

  return {
    operator: parsed.operator,
    endpoint: `${parsed.lhost}:${parsed.lport}`,
    hasToken: Boolean(parsed.token),
    hasClientCertificate: Boolean(parsed.certificate),
    hasPrivateKey: Boolean(parsed.private_key),
    hasCaCertificate: Boolean(parsed.ca_certificate),
  };
}

function App() {
  const [activeNav, setActiveNav] = useState<NavItemKey>("overview");
  const [gatewayUrl, setGatewayUrl] = useState("https://127.0.0.1:8443");
  const [configInput, setConfigInput] = useState(sampleConfig);
  const [configSummary, setConfigSummary] = useState<ConfigSummary | null>(
    null,
  );
  const [configError, setConfigError] = useState("");

  const gatewayState = useMemo(() => {
    if (!configSummary) {
      return {
        label: "Config required",
        tone: "warning",
      };
    }

    if (!gatewayUrl.trim()) {
      return {
        label: "Gateway required",
        tone: "warning",
      };
    }

    return {
      label: "Ready for gateway",
      tone: "success",
    };
  }, [configSummary, gatewayUrl]);

  const sessionCount = sessionRows.filter((row) => row.status === "active").length;
  const runningJobs = jobRows.filter((row) => row.status === "running").length;
  const runningListeners = listenerRows.filter(
    (row) => row.status === "running",
  ).length;

  function importConfig() {
    try {
      setConfigSummary(parseOperatorConfig(configInput));
      setConfigError("");
    } catch (error) {
      setConfigSummary(null);
      setConfigError(error instanceof Error ? error.message : "Invalid JSON");
    }
  }

  async function handleConfigFile(file: File | null) {
    if (!file) {
      return;
    }

    const text = await file.text();
    setConfigInput(text);
    try {
      setConfigSummary(parseOperatorConfig(text));
      setConfigError("");
    } catch (error) {
      setConfigSummary(null);
      setConfigError(error instanceof Error ? error.message : "Invalid JSON");
    }
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">S</div>
          <div>
            <p className="eyebrow">Sliver</p>
            <h1>Web Client</h1>
          </div>
        </div>

        <nav className="nav-list" aria-label="Primary navigation">
          {navItems.map((item) => (
            <button
              key={item.key}
              className={activeNav === item.key ? "nav-item active" : "nav-item"}
              onClick={() => setActiveNav(item.key)}
              type="button"
            >
              {item.label}
            </button>
          ))}
        </nav>

        <section className="sidebar-card">
          <p className="eyebrow">Connection</p>
          <StatusPill label={gatewayState.label} tone={gatewayState.tone} />
          <p className="muted">
            Browsers cannot hold the native Sliver mTLS channel directly. Use a
            trusted HTTPS or WebSocket gateway for live operations.
          </p>
        </section>
      </aside>

      <section className="content">
        <header className="hero">
          <div>
            <p className="eyebrow">Operator workspace</p>
            <h2>Sliver client experience for the browser</h2>
            <p className="hero-copy">
              Import an operator profile, point this UI at a gateway, and manage
              implants, sessions, listeners, jobs, loot, and command workflows
              from a web dashboard.
            </p>
          </div>

          <div className="hero-actions">
            <label className="file-button">
              Import sliver.cfg
              <input
                accept=".cfg,.json,application/json"
                onChange={(event) => handleConfigFile(event.target.files?.[0] ?? null)}
                type="file"
              />
            </label>
            <button className="primary-button" onClick={importConfig} type="button">
              Parse pasted config
            </button>
          </div>
        </header>

        <section className="stats-grid">
          <StatCard label="Active sessions" value={String(sessionCount)} />
          <StatCard label="Running listeners" value={String(runningListeners)} />
          <StatCard label="Running jobs" value={String(runningJobs)} />
          <StatCard
            label="Operator"
            value={configSummary?.operator ?? "Not loaded"}
          />
        </section>

        <section className="dashboard-grid">
          <ConnectionPanel
            configError={configError}
            configInput={configInput}
            configSummary={configSummary}
            gatewayUrl={gatewayUrl}
            onConfigInputChange={setConfigInput}
            onGatewayUrlChange={setGatewayUrl}
            onImportConfig={importConfig}
          />

          <section className="panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Current view</p>
                <h3>{navItems.find((item) => item.key === activeNav)?.label}</h3>
              </div>
              <StatusPill label="Prototype data" tone="neutral" />
            </div>
            {renderActiveView(activeNav)}
          </section>
        </section>
      </section>
    </main>
  );
}

type StatusPillProps = {
  label: string;
  tone: string;
};

function StatusPill({ label, tone }: StatusPillProps) {
  return <span className={`status-pill ${tone}`}>{label}</span>;
}

type StatCardProps = {
  label: string;
  value: string;
};

function StatCard({ label, value }: StatCardProps) {
  return (
    <article className="stat-card">
      <p>{label}</p>
      <strong>{value}</strong>
    </article>
  );
}

type ConnectionPanelProps = {
  configError: string;
  configInput: string;
  configSummary: ConfigSummary | null;
  gatewayUrl: string;
  onConfigInputChange: (value: string) => void;
  onGatewayUrlChange: (value: string) => void;
  onImportConfig: () => void;
};

function ConnectionPanel({
  configError,
  configInput,
  configSummary,
  gatewayUrl,
  onConfigInputChange,
  onGatewayUrlChange,
  onImportConfig,
}: ConnectionPanelProps) {
  return (
    <section className="panel connection-panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Gateway setup</p>
          <h3>Operator configuration</h3>
        </div>
        <StatusPill
          label={configSummary ? "Config parsed" : "Waiting for config"}
          tone={configSummary ? "success" : "warning"}
        />
      </div>

      <label className="field">
        <span>Web gateway URL</span>
        <input
          onChange={(event) => onGatewayUrlChange(event.target.value)}
          placeholder="https://127.0.0.1:8443"
          type="url"
          value={gatewayUrl}
        />
      </label>

      <label className="field">
        <span>Operator config JSON</span>
        <textarea
          onChange={(event) => onConfigInputChange(event.target.value)}
          spellCheck={false}
          value={configInput}
        />
      </label>

      {configError ? <p className="error-text">{configError}</p> : null}

      <button className="primary-button full-width" onClick={onImportConfig} type="button">
        Parse operator config
      </button>

      <div className="config-summary">
        <SummaryLine label="Operator" value={configSummary?.operator ?? "-"} />
        <SummaryLine label="Sliver RPC endpoint" value={configSummary?.endpoint ?? "-"} />
        <SummaryLine
          label="Token loaded"
          value={configSummary?.hasToken ? "yes" : "no"}
        />
        <SummaryLine
          label="Client certificate"
          value={configSummary?.hasClientCertificate ? "yes" : "no"}
        />
        <SummaryLine
          label="Private key"
          value={configSummary?.hasPrivateKey ? "yes" : "no"}
        />
        <SummaryLine
          label="CA certificate"
          value={configSummary?.hasCaCertificate ? "yes" : "no"}
        />
      </div>
    </section>
  );
}

type SummaryLineProps = {
  label: string;
  value: string;
};

function SummaryLine({ label, value }: SummaryLineProps) {
  return (
    <div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function renderActiveView(activeNav: NavItemKey) {
  switch (activeNav) {
    case "overview":
      return <OverviewView />;
    case "implants":
      return <DataTable rows={implantRows} />;
    case "sessions":
      return <DataTable rows={sessionRows} />;
    case "listeners":
      return <DataTable rows={listenerRows} />;
    case "jobs":
      return <DataTable rows={jobRows} />;
    case "loot":
      return <DataTable rows={lootRows} />;
    case "console":
      return <ConsoleView />;
    default:
      return null;
  }
}

function OverviewView() {
  return (
    <div className="overview-grid">
      <article className="feature-card">
        <h4>Operator-safe import</h4>
        <p>
          The UI parses the Sliver operator profile in memory and only displays
          metadata, so secrets are not written to the application bundle.
        </p>
      </article>
      <article className="feature-card">
        <h4>Gateway-first design</h4>
        <p>
          Live actions should be proxied through a server that owns the native
          Sliver client connection and exposes browser-safe APIs.
        </p>
      </article>
      <article className="feature-card">
        <h4>Client workflow parity</h4>
        <p>
          The dashboard mirrors common sliver-client areas: implants, sessions,
          listeners, jobs, loot, and an operator console.
        </p>
      </article>
    </div>
  );
}

type DataTableProps = {
  rows: TableRow[];
};

function DataTable({ rows }: DataTableProps) {
  if (rows.length === 0) {
    return <p className="empty-state">No data available.</p>;
  }

  const columns = Object.keys(rows[0]);

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column}>{column}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {columns.map((column) => (
                <td key={column}>{row[column]}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ConsoleView() {
  const [consoleInput, setConsoleInput] = useState("");
  const [consoleLines, setConsoleLines] = useState<string[]>([
    "Prototype console ready.",
    "Type help to list local commands.",
  ]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const command = consoleInput.trim().toLowerCase();

    if (!command) {
      return;
    }

    if (command === "clear") {
      setConsoleLines([]);
      setConsoleInput("");
      return;
    }

    setConsoleLines((currentLines) => [
      ...currentLines,
      `web-client> ${command}`,
      ...runStaticCommand(command),
    ]);
    setConsoleInput("");
  }

  return (
    <div className="console">
      <pre aria-live="polite">
        {consoleLines.length ? consoleLines.join("\n") : "Console cleared."}
      </pre>
      <form onSubmit={handleSubmit}>
        <span>web-client&gt;</span>
        <input
          aria-label="Console command"
          onChange={(event) => setConsoleInput(event.target.value)}
          placeholder="help"
          value={consoleInput}
        />
      </form>
    </div>
  );
}

function runStaticCommand(command: string): string[] {
  switch (command) {
    case "help":
      return commandHelp;
    case "implants":
      return implantRows.map((row) => `${row.name} ${row.os} ${row.stage}`);
    case "sessions":
      return sessionRows.map((row) => `${row.id} ${row.host} ${row.status}`);
    case "listeners":
      return listenerRows.map((row) => `${row.name} ${row.bind} ${row.status}`);
    case "jobs":
      return jobRows.map((row) => `${row.id} ${row.target} ${row.status}`);
    case "connect":
      return ["Connect command is reserved for the gateway integration layer."];
    default:
      return [`Unknown command: ${command}`, "Type help to see commands."];
  }
}

export default App;
