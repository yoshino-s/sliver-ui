import { FormEvent, useMemo, useState } from "react";
import { createApiClient } from "./api/client";

type NavItemKey =
  | "overview"
  | "implants"
  | "sessions"
  | "beacons"
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

type ApiData = Record<string, unknown> | unknown[] | null;
type TableRow = Record<string, unknown>;

type GatewayStatus = {
  connected?: boolean;
  operator?: string;
  endpoint?: string;
  connectedAt?: string;
  version?: ApiData;
};

type ListenerForm = {
  protocol: "mtls" | "http" | "https" | "dns";
  host: string;
  port: string;
  domain: string;
  website: string;
  persistent: boolean;
  enforceOtp: boolean;
};

type SessionCommandForm = {
  command: "ping" | "ps" | "pwd" | "ls" | "cd" | "execute" | "shell";
  sessionId: string;
  path: string;
  args: string;
  async: boolean;
  output: boolean;
};

type DataSets = {
  version: ApiData;
  operators: ApiData;
  sessions: ApiData;
  beacons: ApiData;
  jobs: ApiData;
  loot: ApiData;
  builds: ApiData;
  profiles: ApiData;
};

const navItems: Array<{ key: NavItemKey; label: string }> = [
  { key: "overview", label: "Overview" },
  { key: "implants", label: "Implants" },
  { key: "sessions", label: "Sessions" },
  { key: "beacons", label: "Beacons" },
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

const commandHelp = [
  "Available commands:",
  "  help       Show available commands",
  "  connect    Connect using pasted operator config",
  "  status     Load gateway connection status",
  "  refresh    Refresh all common resources",
  "  sessions   List active sessions",
  "  beacons    List beacons",
  "  jobs       List jobs and listeners",
  "  loot       List loot",
  "  implants   List implant builds",
  "  clear      Clear console output",
];

const emptyDataSets: DataSets = {
  version: null,
  operators: null,
  sessions: null,
  beacons: null,
  jobs: null,
  loot: null,
  builds: null,
  profiles: null,
};

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
  const [gatewayUrl, setGatewayUrl] = useState("http://localhost:8080");
  const [configInput, setConfigInput] = useState(sampleConfig);
  const [configSummary, setConfigSummary] = useState<ConfigSummary | null>(null);
  const [configError, setConfigError] = useState("");
  const [status, setStatus] = useState<GatewayStatus>({});
  const [dataSets, setDataSets] = useState<DataSets>(emptyDataSets);
  const [loading, setLoading] = useState("");
  const [apiError, setApiError] = useState("");
  const [listenerForm, setListenerForm] = useState<ListenerForm>({
    protocol: "mtls",
    host: "0.0.0.0",
    port: "8888",
    domain: "",
    website: "",
    persistent: false,
    enforceOtp: false,
  });
  const [sessionCommandForm, setSessionCommandForm] =
    useState<SessionCommandForm>({
      command: "ping",
      sessionId: "",
      path: "",
      args: "",
      async: false,
      output: true,
    });
  const [rawPayload, setRawPayload] = useState(
    JSON.stringify(
      {
        config: {
          GOOS: "linux",
          GOARCH: "amd64",
          name: "web-generated",
          isBeacon: false,
          c2: [{ url: "mtls://127.0.0.1:8888", priority: 1 }],
        },
      },
      null,
      2,
    ),
  );
  const [consoleInput, setConsoleInput] = useState("");
  const [consoleLines, setConsoleLines] = useState<string[]>([
    "Sliver Web Client ready.",
    "Start the Go gateway, connect an operator profile, then use refresh/status commands.",
  ]);

  const api = useMemo(() => createApiClient(gatewayUrl), [gatewayUrl]);
  const sessionRows = useMemo(
    () => extractRows(dataSets.sessions, ["sessions"]),
    [dataSets.sessions],
  );
  const beaconRows = useMemo(
    () => extractRows(dataSets.beacons, ["beacons"]),
    [dataSets.beacons],
  );
  const jobRows = useMemo(() => extractRows(dataSets.jobs, ["jobs"]), [dataSets.jobs]);
  const lootRows = useMemo(() => extractRows(dataSets.loot, ["loot"]), [dataSets.loot]);
  const buildRows = useMemo(
    () => extractRows(dataSets.builds, ["builds", "implantBuilds"]),
    [dataSets.builds],
  );
  const profileRows = useMemo(
    () => extractRows(dataSets.profiles, ["profiles"]),
    [dataSets.profiles],
  );

  const gatewayState = useMemo(() => {
    if (status.connected) {
      return { label: "Connected", tone: "success" };
    }
    if (!configSummary) {
      return { label: "Config required", tone: "warning" };
    }
    return { label: "Ready to connect", tone: "neutral" };
  }, [configSummary, status.connected]);

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

  async function connectGateway() {
    await runTask("Connecting", async () => {
      const summary = parseOperatorConfig(configInput);
      setConfigSummary(summary);
      const result = await api.POST("/api/connect", {
        body: JSON.parse(configInput),
      });
      const data = unwrap<{ status: GatewayStatus }>(result);
      setStatus(data.status ?? {});
      appendConsole(`Connected as ${data.status?.operator ?? summary.operator}.`);
      await refreshAll();
    });
  }

  async function disconnectGateway() {
    await runTask("Disconnecting", async () => {
      await api.POST("/api/disconnect");
      setStatus({});
      setDataSets(emptyDataSets);
      appendConsole("Disconnected from Sliver gateway.");
    });
  }

  async function loadStatus() {
    await runTask("Loading status", async () => {
      const result = await api.GET("/api/status");
      setStatus(unwrap<GatewayStatus>(result));
    });
  }

  async function refreshAll() {
    await runTask("Refreshing", async () => {
      const [version, operators, sessions, beacons, jobs, loot, builds, profiles] =
        await Promise.all([
          api.GET("/api/version"),
          api.GET("/api/operators"),
          api.GET("/api/sessions"),
          api.GET("/api/beacons"),
          api.GET("/api/jobs"),
          api.GET("/api/loot"),
          api.GET("/api/implants/builds"),
          api.GET("/api/implants/profiles"),
        ]);

      setDataSets({
        version: unwrap<ApiData>(version),
        operators: unwrap<ApiData>(operators),
        sessions: unwrap<ApiData>(sessions),
        beacons: unwrap<ApiData>(beacons),
        jobs: unwrap<ApiData>(jobs),
        loot: unwrap<ApiData>(loot),
        builds: unwrap<ApiData>(builds),
        profiles: unwrap<ApiData>(profiles),
      });
      appendConsole("Refreshed sessions, beacons, jobs, loot, and implants.");
    });
  }

  async function refreshJobs() {
    const result = await api.GET("/api/jobs");
    setDataSets((current) => ({ ...current, jobs: unwrap<ApiData>(result) }));
  }

  async function startListener(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await runTask("Starting listener", async () => {
      const result = await api.POST("/api/listeners", {
        body: {
          protocol: listenerForm.protocol,
          host: listenerForm.host,
          port: Number(listenerForm.port),
          domain: listenerForm.domain || undefined,
          domains: listenerForm.domain ? [listenerForm.domain] : undefined,
          website: listenerForm.website || undefined,
          persistent: listenerForm.persistent,
          enforceOtp: listenerForm.enforceOtp,
        },
      });
      appendConsole(`Started ${listenerForm.protocol} listener: ${formatJSON(unwrap(result))}`);
      await refreshJobs();
    });
  }

  async function killJob(id: unknown) {
    const numericID = Number(id);
    if (!Number.isFinite(numericID)) {
      setApiError("Job ID is invalid.");
      return;
    }
    await runTask("Killing job", async () => {
      await api.DELETE("/api/jobs/{id}", {
        params: { path: { id: numericID } },
      });
      appendConsole(`Killed job ${numericID}.`);
      await refreshJobs();
    });
  }

  async function runSessionCommand(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await runTask("Running command", async () => {
      const args = sessionCommandForm.args
        .split(" ")
        .map((arg) => arg.trim())
        .filter(Boolean);
      const result = await api.POST("/api/session-command", {
        body: {
          command: sessionCommandForm.command,
          sessionId: sessionCommandForm.sessionId,
          path: sessionCommandForm.path || undefined,
          args,
          async: sessionCommandForm.async,
          output: sessionCommandForm.output,
        },
      });
      appendConsole(formatJSON(unwrap(result)));
    });
  }

  async function runRawJSON(
    label: string,
    path:
      | "/api/implants/generate"
      | "/api/implants/profiles"
      | "/api/loot/content",
  ) {
    await runTask(label, async () => {
      const payload = JSON.parse(rawPayload) as Record<string, unknown>;
      const result = await api.POST(path, { body: payload });
      appendConsole(formatJSON(unwrap(result)));
    });
  }

  async function runTask(label: string, task: () => Promise<void>) {
    setLoading(label);
    setApiError("");
    try {
      await task();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setApiError(message);
      appendConsole(`Error: ${message}`);
    } finally {
      setLoading("");
    }
  }

  function appendConsole(line: string) {
    setConsoleLines((current) => [...current, line]);
  }

  function handleConsoleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const command = consoleInput.trim();
    if (!command) {
      return;
    }
    if (command.toLowerCase() === "clear") {
      setConsoleLines([]);
      setConsoleInput("");
      return;
    }
    setConsoleLines((currentLines) => [...currentLines, `web-client> ${command}`]);
    void runConsoleCommand(command.toLowerCase());
    setConsoleInput("");
  }

  async function runConsoleCommand(command: string) {
    switch (command) {
      case "help":
        setConsoleLines((current) => [...current, ...commandHelp]);
        return;
      case "connect":
        await connectGateway();
        return;
      case "status":
        await loadStatus();
        return;
      case "refresh":
        await refreshAll();
        return;
      case "sessions":
        await refreshAll();
        appendConsole(formatJSON(dataSets.sessions));
        return;
      case "beacons":
        await refreshAll();
        appendConsole(formatJSON(dataSets.beacons));
        return;
      case "jobs":
      case "listeners":
        await refreshJobs();
        appendConsole(formatJSON(dataSets.jobs));
        return;
      case "loot":
        await refreshAll();
        appendConsole(formatJSON(dataSets.loot));
        return;
      case "implants":
        await refreshAll();
        appendConsole(formatJSON(dataSets.builds));
        return;
      default:
        setConsoleLines((current) => [
          ...current,
          `Unknown command: ${command}`,
          "Type help to see commands.",
        ]);
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
            Browser requests go to the Go gateway. The gateway forwards common
            operations to Sliver over mTLS gRPC.
          </p>
        </section>
      </aside>

      <section className="content">
        <header className="hero">
          <div>
            <p className="eyebrow">Operator workspace</p>
            <h2>Sliver client experience for the browser</h2>
            <p className="hero-copy">
              Import an operator profile, connect the Go gateway, and manage
              implants, sessions, beacons, listeners, jobs, loot, and command
              workflows from one web dashboard.
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
              Parse config
            </button>
            <button className="primary-button" onClick={connectGateway} type="button">
              Connect
            </button>
          </div>
        </header>

        {apiError ? <p className="error-banner">{apiError}</p> : null}
        {loading ? <p className="loading-banner">{loading}...</p> : null}

        <section className="stats-grid">
          <StatCard label="Sessions" value={String(sessionRows.length)} />
          <StatCard label="Beacons" value={String(beaconRows.length)} />
          <StatCard label="Jobs" value={String(jobRows.length)} />
          <StatCard
            label="Operator"
            value={status.operator ?? configSummary?.operator ?? "Not loaded"}
          />
        </section>

        <section className="dashboard-grid">
          <ConnectionPanel
            configError={configError}
            configInput={configInput}
            configSummary={configSummary}
            gatewayUrl={gatewayUrl}
            status={status}
            onConfigInputChange={setConfigInput}
            onConnectGateway={connectGateway}
            onDisconnectGateway={disconnectGateway}
            onGatewayUrlChange={setGatewayUrl}
            onImportConfig={importConfig}
            onLoadStatus={loadStatus}
            onRefreshAll={refreshAll}
          />

          <section className="panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Current view</p>
                <h3>{navItems.find((item) => item.key === activeNav)?.label}</h3>
              </div>
              <StatusPill
                label={status.connected ? "Live gateway" : "Not connected"}
                tone={status.connected ? "success" : "warning"}
              />
            </div>
            {renderActiveView({
              activeNav,
              beaconRows,
              buildRows,
              consoleInput,
              consoleLines,
              dataSets,
              handleConsoleSubmit,
              jobRows,
              listenerForm,
              lootRows,
              profileRows,
              rawPayload,
              runGenerateImplant: () =>
                runRawJSON("Generating implant", "/api/implants/generate"),
              runSessionCommand,
              saveImplantProfile: () =>
                runRawJSON("Saving implant profile", "/api/implants/profiles"),
              fetchLootContent: () => runRawJSON("Loading loot", "/api/loot/content"),
              sessionCommandForm,
              sessionRows,
              setConsoleInput,
              setListenerForm,
              setRawPayload,
              setSessionCommandForm,
              startListener,
              killJob,
            })}
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
  status: GatewayStatus;
  onConfigInputChange: (value: string) => void;
  onConnectGateway: () => void;
  onDisconnectGateway: () => void;
  onGatewayUrlChange: (value: string) => void;
  onImportConfig: () => void;
  onLoadStatus: () => void;
  onRefreshAll: () => void;
};

function ConnectionPanel({
  configError,
  configInput,
  configSummary,
  gatewayUrl,
  status,
  onConfigInputChange,
  onConnectGateway,
  onDisconnectGateway,
  onGatewayUrlChange,
  onImportConfig,
  onLoadStatus,
  onRefreshAll,
}: ConnectionPanelProps) {
  return (
    <section className="panel connection-panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Gateway setup</p>
          <h3>Operator configuration</h3>
        </div>
        <StatusPill
          label={status.connected ? "Connected" : "Waiting"}
          tone={status.connected ? "success" : "warning"}
        />
      </div>

      <label className="field">
        <span>Go gateway URL</span>
        <input
          onChange={(event) => onGatewayUrlChange(event.target.value)}
          placeholder="http://localhost:8080"
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
      <div className="button-row">
        <button className="secondary-button" onClick={onConnectGateway} type="button">
          Connect
        </button>
        <button className="secondary-button" onClick={onLoadStatus} type="button">
          Status
        </button>
        <button className="secondary-button" onClick={onRefreshAll} type="button">
          Refresh
        </button>
        <button className="secondary-button danger" onClick={onDisconnectGateway} type="button">
          Disconnect
        </button>
      </div>

      <div className="config-summary">
        <SummaryLine label="Gateway connected" value={status.connected ? "yes" : "no"} />
        <SummaryLine label="Operator" value={status.operator ?? configSummary?.operator ?? "-"} />
        <SummaryLine
          label="Sliver RPC endpoint"
          value={status.endpoint ?? configSummary?.endpoint ?? "-"}
        />
        <SummaryLine label="Token loaded" value={configSummary?.hasToken ? "yes" : "no"} />
        <SummaryLine
          label="Client certificate"
          value={configSummary?.hasClientCertificate ? "yes" : "no"}
        />
        <SummaryLine label="Private key" value={configSummary?.hasPrivateKey ? "yes" : "no"} />
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

type ActiveViewProps = {
  activeNav: NavItemKey;
  beaconRows: TableRow[];
  buildRows: TableRow[];
  consoleInput: string;
  consoleLines: string[];
  dataSets: DataSets;
  handleConsoleSubmit: (event: FormEvent<HTMLFormElement>) => void;
  jobRows: TableRow[];
  listenerForm: ListenerForm;
  lootRows: TableRow[];
  profileRows: TableRow[];
  rawPayload: string;
  runGenerateImplant: () => void;
  runSessionCommand: (event: FormEvent<HTMLFormElement>) => void;
  saveImplantProfile: () => void;
  fetchLootContent: () => void;
  sessionCommandForm: SessionCommandForm;
  sessionRows: TableRow[];
  setConsoleInput: (value: string) => void;
  setListenerForm: (value: ListenerForm) => void;
  setRawPayload: (value: string) => void;
  setSessionCommandForm: (value: SessionCommandForm) => void;
  startListener: (event: FormEvent<HTMLFormElement>) => void;
  killJob: (id: unknown) => void;
};

function renderActiveView(props: ActiveViewProps) {
  switch (props.activeNav) {
    case "overview":
      return <OverviewView dataSets={props.dataSets} />;
    case "implants":
      return (
        <ImplantsView
          buildRows={props.buildRows}
          profileRows={props.profileRows}
          rawPayload={props.rawPayload}
          runGenerateImplant={props.runGenerateImplant}
          saveImplantProfile={props.saveImplantProfile}
          setRawPayload={props.setRawPayload}
        />
      );
    case "sessions":
      return (
        <SessionsView
          rows={props.sessionRows}
          runSessionCommand={props.runSessionCommand}
          sessionCommandForm={props.sessionCommandForm}
          setSessionCommandForm={props.setSessionCommandForm}
        />
      );
    case "beacons":
      return <DataTable rows={props.beaconRows} />;
    case "listeners":
      return (
        <ListenersView
          jobRows={props.jobRows}
          listenerForm={props.listenerForm}
          setListenerForm={props.setListenerForm}
          startListener={props.startListener}
        />
      );
    case "jobs":
      return <JobsView killJob={props.killJob} rows={props.jobRows} />;
    case "loot":
      return (
        <LootView
          fetchLootContent={props.fetchLootContent}
          rawPayload={props.rawPayload}
          rows={props.lootRows}
          setRawPayload={props.setRawPayload}
        />
      );
    case "console":
      return (
        <ConsoleView
          consoleInput={props.consoleInput}
          consoleLines={props.consoleLines}
          handleConsoleSubmit={props.handleConsoleSubmit}
          setConsoleInput={props.setConsoleInput}
        />
      );
    default:
      return null;
  }
}

function OverviewView({ dataSets }: { dataSets: DataSets }) {
  return (
    <>
      <div className="overview-grid">
        <article className="feature-card">
          <h4>mTLS gateway</h4>
          <p>
            The browser talks to the Go gateway over HTTP. The gateway owns the
            Sliver mTLS gRPC client and forwards common operator actions.
          </p>
        </article>
        <article className="feature-card">
          <h4>Generated API contract</h4>
          <p>
            Backend routes generate OpenAPI at runtime and the frontend client
            is generated from the same spec.
          </p>
        </article>
        <article className="feature-card">
          <h4>Client workflow parity</h4>
          <p>
            Sessions, beacons, listeners, jobs, loot, implants, operators, and
            console commands are wired to gateway APIs.
          </p>
        </article>
      </div>
      <JSONInspector title="Version" data={dataSets.version} />
      <JSONInspector title="Operators" data={dataSets.operators} />
    </>
  );
}

type DataTableProps = {
  rows: TableRow[];
};

function DataTable({ rows }: DataTableProps) {
  if (rows.length === 0) {
    return <p className="empty-state">No data available. Connect and refresh first.</p>;
  }

  const columns = Object.keys(rows[0]).slice(0, 10);

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
                <td key={column}>{formatCell(row[column])}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

type SessionsViewProps = {
  rows: TableRow[];
  runSessionCommand: (event: FormEvent<HTMLFormElement>) => void;
  sessionCommandForm: SessionCommandForm;
  setSessionCommandForm: (value: SessionCommandForm) => void;
};

function SessionsView({
  rows,
  runSessionCommand,
  sessionCommandForm,
  setSessionCommandForm,
}: SessionsViewProps) {
  return (
    <div className="stack">
      <DataTable rows={rows} />
      <form className="action-form" onSubmit={runSessionCommand}>
        <h4>Run session command</h4>
        <div className="form-grid">
          <label className="field">
            <span>Command</span>
            <select
              onChange={(event) =>
                setSessionCommandForm({
                  ...sessionCommandForm,
                  command: event.target.value as SessionCommandForm["command"],
                })
              }
              value={sessionCommandForm.command}
            >
              {["ping", "ps", "pwd", "ls", "cd", "execute", "shell"].map((command) => (
                <option key={command} value={command}>
                  {command}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Session ID</span>
            <input
              onChange={(event) =>
                setSessionCommandForm({
                  ...sessionCommandForm,
                  sessionId: event.target.value,
                })
              }
              value={sessionCommandForm.sessionId}
            />
          </label>
          <label className="field">
            <span>Path</span>
            <input
              onChange={(event) =>
                setSessionCommandForm({
                  ...sessionCommandForm,
                  path: event.target.value,
                })
              }
              placeholder="/tmp or /bin/hostname"
              value={sessionCommandForm.path}
            />
          </label>
          <label className="field">
            <span>Args</span>
            <input
              onChange={(event) =>
                setSessionCommandForm({
                  ...sessionCommandForm,
                  args: event.target.value,
                })
              }
              placeholder="-la /tmp"
              value={sessionCommandForm.args}
            />
          </label>
        </div>
        <button className="primary-button" type="submit">
          Run command
        </button>
      </form>
    </div>
  );
}

type ListenersViewProps = {
  jobRows: TableRow[];
  listenerForm: ListenerForm;
  setListenerForm: (value: ListenerForm) => void;
  startListener: (event: FormEvent<HTMLFormElement>) => void;
};

function ListenersView({
  jobRows,
  listenerForm,
  setListenerForm,
  startListener,
}: ListenersViewProps) {
  return (
    <div className="stack">
      <form className="action-form" onSubmit={startListener}>
        <h4>Start listener</h4>
        <div className="form-grid">
          <label className="field">
            <span>Protocol</span>
            <select
              onChange={(event) =>
                setListenerForm({
                  ...listenerForm,
                  protocol: event.target.value as ListenerForm["protocol"],
                })
              }
              value={listenerForm.protocol}
            >
              {["mtls", "http", "https", "dns"].map((protocol) => (
                <option key={protocol} value={protocol}>
                  {protocol}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Host</span>
            <input
              onChange={(event) =>
                setListenerForm({ ...listenerForm, host: event.target.value })
              }
              value={listenerForm.host}
            />
          </label>
          <label className="field">
            <span>Port</span>
            <input
              onChange={(event) =>
                setListenerForm({ ...listenerForm, port: event.target.value })
              }
              type="number"
              value={listenerForm.port}
            />
          </label>
          <label className="field">
            <span>Domain / DNS zone</span>
            <input
              onChange={(event) =>
                setListenerForm({ ...listenerForm, domain: event.target.value })
              }
              value={listenerForm.domain}
            />
          </label>
        </div>
        <button className="primary-button" type="submit">
          Start listener
        </button>
      </form>
      <h4>Listener jobs</h4>
      <DataTable rows={jobRows} />
    </div>
  );
}

function JobsView({
  killJob,
  rows,
}: {
  killJob: (id: unknown) => void;
  rows: TableRow[];
}) {
  return (
    <div className="stack">
      <DataTable rows={rows} />
      <div className="button-row">
        {rows.slice(0, 8).map((row) => (
          <button
            className="secondary-button danger"
            key={String(row.id ?? row.ID)}
            onClick={() => killJob(row.id ?? row.ID)}
            type="button"
          >
            Kill job {String(row.id ?? row.ID)}
          </button>
        ))}
      </div>
    </div>
  );
}

type ImplantsViewProps = {
  buildRows: TableRow[];
  profileRows: TableRow[];
  rawPayload: string;
  runGenerateImplant: () => void;
  saveImplantProfile: () => void;
  setRawPayload: (value: string) => void;
};

function ImplantsView({
  buildRows,
  profileRows,
  rawPayload,
  runGenerateImplant,
  saveImplantProfile,
  setRawPayload,
}: ImplantsViewProps) {
  return (
    <div className="stack">
      <h4>Builds</h4>
      <DataTable rows={buildRows} />
      <h4>Profiles</h4>
      <DataTable rows={profileRows} />
      <RawPayloadEditor
        label="Generate implant / save profile payload"
        rawPayload={rawPayload}
        setRawPayload={setRawPayload}
      />
      <div className="button-row">
        <button className="primary-button" onClick={runGenerateImplant} type="button">
          Generate implant
        </button>
        <button className="secondary-button" onClick={saveImplantProfile} type="button">
          Save profile
        </button>
      </div>
    </div>
  );
}

function LootView({
  fetchLootContent,
  rawPayload,
  rows,
  setRawPayload,
}: {
  fetchLootContent: () => void;
  rawPayload: string;
  rows: TableRow[];
  setRawPayload: (value: string) => void;
}) {
  return (
    <div className="stack">
      <DataTable rows={rows} />
      <RawPayloadEditor
        label="Loot content payload"
        rawPayload={rawPayload}
        setRawPayload={setRawPayload}
      />
      <button className="primary-button" onClick={fetchLootContent} type="button">
        Fetch loot content
      </button>
    </div>
  );
}

function RawPayloadEditor({
  label,
  rawPayload,
  setRawPayload,
}: {
  label: string;
  rawPayload: string;
  setRawPayload: (value: string) => void;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <textarea
        className="small-textarea"
        onChange={(event) => setRawPayload(event.target.value)}
        spellCheck={false}
        value={rawPayload}
      />
    </label>
  );
}

function JSONInspector({ data, title }: { data: ApiData; title: string }) {
  return (
    <section className="json-inspector">
      <h4>{title}</h4>
      <pre>{formatJSON(data ?? {})}</pre>
    </section>
  );
}

type ConsoleViewProps = {
  consoleInput: string;
  consoleLines: string[];
  handleConsoleSubmit: (event: FormEvent<HTMLFormElement>) => void;
  setConsoleInput: (value: string) => void;
};

function ConsoleView({
  consoleInput,
  consoleLines,
  handleConsoleSubmit,
  setConsoleInput,
}: ConsoleViewProps) {
  return (
    <div className="console">
      <pre aria-live="polite">
        {consoleLines.length ? consoleLines.join("\n") : "Console cleared."}
      </pre>
      <form onSubmit={handleConsoleSubmit}>
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

function unwrap<T>(result: { data?: unknown; error?: unknown; response: Response }): T {
  if (result.error) {
    throw new Error(formatJSON(result.error));
  }
  if (!result.response.ok) {
    throw new Error(`HTTP ${result.response.status}`);
  }
  return result.data as T;
}

function extractRows(data: ApiData, preferredKeys: string[]): TableRow[] {
  if (!data) {
    return [];
  }
  if (Array.isArray(data)) {
    return data.filter(isRecord);
  }
  for (const key of preferredKeys) {
    const value = data[key];
    if (Array.isArray(value)) {
      return value.filter(isRecord);
    }
  }
  for (const value of Object.values(data)) {
    if (Array.isArray(value)) {
      return value.filter(isRecord);
    }
  }
  return isRecord(data) ? [data] : [];
}

function isRecord(value: unknown): value is TableRow {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function formatCell(value: unknown) {
  if (value === null || value === undefined) {
    return "-";
  }
  if (typeof value === "object") {
    return JSON.stringify(value);
  }
  return String(value);
}

function formatJSON(value: unknown) {
  return JSON.stringify(value, null, 2);
}

export default App;
