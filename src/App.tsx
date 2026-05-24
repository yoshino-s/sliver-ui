import { FormEvent, useMemo, useState } from "react";
import {
  Navigate,
  NavLink as RouterNavLink,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";
import {
  AppShell,
  Badge,
  Box,
  Button,
  Card,
  Code,
  Container,
  FileButton,
  Grid,
  Group,
  JsonInput,
  NavLink,
  NumberInput,
  Paper,
  PasswordInput,
  ScrollArea,
  Select,
  SimpleGrid,
  Stack,
  Switch,
  Table,
  Tabs,
  Text,
  Textarea,
  TextInput,
  Title,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import { createApiClient } from "./api/client";

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

type ListenerFormValues = {
  protocol: "mtls" | "http" | "https" | "dns";
  host: string;
  port: number;
  domain: string;
  website: string;
  persistent: boolean;
  enforceOtp: boolean;
};

type SessionCommandValues = {
  command: "ping" | "ps" | "pwd" | "ls" | "cd" | "execute" | "shell";
  sessionId: string;
  path: string;
  args: string;
  async: boolean;
  output: boolean;
};

const navItems = [
  { path: "/overview", label: "Overview" },
  { path: "/implants", label: "Implants" },
  { path: "/sessions", label: "Sessions" },
  { path: "/beacons", label: "Beacons" },
  { path: "/listeners", label: "Listeners" },
  { path: "/jobs", label: "Jobs" },
  { path: "/loot", label: "Loot" },
  { path: "/console", label: "Console" },
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

function App() {
  const location = useLocation();
  const [gatewayUrl, setGatewayUrl] = useState("http://localhost:8080");
  const [configInput, setConfigInput] = useState(sampleConfig);
  const [configSummary, setConfigSummary] = useState<ConfigSummary | null>(null);
  const [status, setStatus] = useState<GatewayStatus>({});
  const [dataSets, setDataSets] = useState<DataSets>(emptyDataSets);
  const [loading, setLoading] = useState("");
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
  const rows = useMemo(
    () => ({
      sessions: extractRows(dataSets.sessions, ["sessions"]),
      beacons: extractRows(dataSets.beacons, ["beacons"]),
      jobs: extractRows(dataSets.jobs, ["jobs"]),
      loot: extractRows(dataSets.loot, ["loot"]),
      builds: extractRows(dataSets.builds, ["builds", "implantBuilds"]),
      profiles: extractRows(dataSets.profiles, ["profiles"]),
    }),
    [dataSets],
  );

  const connectionTone = status.connected ? "green" : configSummary ? "blue" : "yellow";
  const connectionLabel = status.connected
    ? "Connected"
    : configSummary
      ? "Ready"
      : "Config required";

  function parseConfig(value = configInput) {
    const summary = parseOperatorConfig(value);
    setConfigSummary(summary);
    notifications.show({
      color: "green",
      title: "Operator config parsed",
      message: `${summary.operator} @ ${summary.endpoint}`,
    });
    return summary;
  }

  async function handleConfigFile(file: File | null) {
    if (!file) {
      return;
    }
    const text = await file.text();
    setConfigInput(text);
    try {
      parseConfig(text);
    } catch (error) {
      showError(error);
    }
  }

  async function connectGateway() {
    await runTask("Connecting", async () => {
      const summary = parseConfig();
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

  async function startListener(values: ListenerFormValues) {
    await runTask("Starting listener", async () => {
      const result = await api.POST("/api/listeners", {
        body: {
          protocol: values.protocol,
          host: values.host,
          port: values.port,
          domain: values.domain || undefined,
          domains: values.domain ? [values.domain] : undefined,
          website: values.website || undefined,
          persistent: values.persistent,
          enforceOtp: values.enforceOtp,
        },
      });
      appendConsole(`Started ${values.protocol} listener: ${formatJSON(unwrap(result))}`);
      await refreshJobs();
    });
  }

  async function killJob(id: unknown) {
    const numericID = Number(id);
    if (!Number.isFinite(numericID)) {
      showError(new Error("Job ID is invalid."));
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

  async function runSessionCommand(values: SessionCommandValues) {
    await runTask("Running command", async () => {
      const args = values.args
        .split(" ")
        .map((arg) => arg.trim())
        .filter(Boolean);
      const result = await api.POST("/api/session-command", {
        body: {
          command: values.command,
          sessionId: values.sessionId,
          path: values.path || undefined,
          args,
          async: values.async,
          output: values.output,
        },
      });
      appendConsole(formatJSON(unwrap(result)));
    });
  }

  async function generateImplant() {
    await runTask("Generating implant", async () => {
      const result = await api.POST("/api/implants/generate", {
        body: JSON.parse(rawPayload),
      });
      appendConsole(formatJSON(unwrap(result)));
    });
  }

  async function saveImplantProfile() {
    await runTask("Saving implant profile", async () => {
      const result = await api.POST("/api/implants/profiles", {
        body: JSON.parse(rawPayload),
      });
      appendConsole(formatJSON(unwrap(result)));
    });
  }

  async function fetchLootContent() {
    await runTask("Loading loot", async () => {
      const result = await api.POST("/api/loot/content", {
        body: JSON.parse(rawPayload),
      });
      appendConsole(formatJSON(unwrap(result)));
    });
  }

  async function runTask(label: string, task: () => Promise<void>) {
    setLoading(label);
    try {
      await task();
      notifications.show({ color: "green", title: label, message: "Done" });
    } catch (error) {
      showError(error);
      appendConsole(`Error: ${error instanceof Error ? error.message : String(error)}`);
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
        appendConsole(formatJSON(status));
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
    <AppShell
      header={{ height: 64 }}
      navbar={{ width: 280, breakpoint: "sm" }}
      padding="md"
    >
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Group gap="sm">
            <Badge size="lg" variant="gradient" gradient={{ from: "cyan", to: "teal" }}>
              S
            </Badge>
            <Box>
              <Title order={3}>Sliver Web Client</Title>
              <Text size="xs" c="dimmed">
                React Router + Mantine + Go mTLS Gateway
              </Text>
            </Box>
          </Group>
          <Group>
            <Badge color={connectionTone}>{connectionLabel}</Badge>
            {loading ? <Badge color="blue">{loading}...</Badge> : null}
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="md">
        <Stack gap="xs">
          {navItems.map((item) => (
            <NavLink
              active={location.pathname === item.path}
              component={RouterNavLink}
              key={item.path}
              label={item.label}
              to={item.path}
              variant="filled"
            />
          ))}
        </Stack>
      </AppShell.Navbar>

      <AppShell.Main>
        <Container fluid>
          <Stack gap="md">
            <Hero
              connectGateway={connectGateway}
              handleConfigFile={handleConfigFile}
              parseConfig={() => {
                try {
                  parseConfig();
                } catch (error) {
                  showError(error);
                }
              }}
            />

            <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }}>
              <MetricCard label="Sessions" value={rows.sessions.length} />
              <MetricCard label="Beacons" value={rows.beacons.length} />
              <MetricCard label="Jobs" value={rows.jobs.length} />
              <MetricCard
                label="Operator"
                value={status.operator ?? configSummary?.operator ?? "Not loaded"}
              />
            </SimpleGrid>

            <Grid align="flex-start">
              <Grid.Col span={{ base: 12, lg: 4 }}>
                <ConnectionPanel
                  configInput={configInput}
                  configSummary={configSummary}
                  disconnectGateway={disconnectGateway}
                  gatewayUrl={gatewayUrl}
                  loadStatus={loadStatus}
                  refreshAll={refreshAll}
                  setConfigInput={setConfigInput}
                  setGatewayUrl={setGatewayUrl}
                  status={status}
                  submitConfig={() => {
                    try {
                      parseConfig();
                    } catch (error) {
                      showError(error);
                    }
                  }}
                  connectGateway={connectGateway}
                />
              </Grid.Col>

              <Grid.Col span={{ base: 12, lg: 8 }}>
                <Routes>
                  <Route path="/" element={<Navigate to="/overview" replace />} />
                  <Route
                    path="/overview"
                    element={<OverviewPage dataSets={dataSets} status={status} />}
                  />
                  <Route
                    path="/implants"
                    element={
                      <ImplantsPage
                        buildRows={rows.builds}
                        generateImplant={generateImplant}
                        profileRows={rows.profiles}
                        rawPayload={rawPayload}
                        saveImplantProfile={saveImplantProfile}
                        setRawPayload={setRawPayload}
                      />
                    }
                  />
                  <Route
                    path="/sessions"
                    element={
                      <SessionsPage
                        rows={rows.sessions}
                        runSessionCommand={runSessionCommand}
                      />
                    }
                  />
                  <Route path="/beacons" element={<DataPage rows={rows.beacons} />} />
                  <Route
                    path="/listeners"
                    element={
                      <ListenersPage
                        jobRows={rows.jobs}
                        startListener={startListener}
                      />
                    }
                  />
                  <Route
                    path="/jobs"
                    element={<JobsPage killJob={killJob} rows={rows.jobs} />}
                  />
                  <Route
                    path="/loot"
                    element={
                      <LootPage
                        fetchLootContent={fetchLootContent}
                        rawPayload={rawPayload}
                        rows={rows.loot}
                        setRawPayload={setRawPayload}
                      />
                    }
                  />
                  <Route
                    path="/console"
                    element={
                      <ConsolePage
                        consoleInput={consoleInput}
                        consoleLines={consoleLines}
                        handleConsoleSubmit={handleConsoleSubmit}
                        setConsoleInput={setConsoleInput}
                      />
                    }
                  />
                </Routes>
              </Grid.Col>
            </Grid>
          </Stack>
        </Container>
      </AppShell.Main>
    </AppShell>
  );
}

function Hero({
  connectGateway,
  handleConfigFile,
  parseConfig,
}: {
  connectGateway: () => void;
  handleConfigFile: (file: File | null) => void;
  parseConfig: () => void;
}) {
  return (
    <Card withBorder radius="lg" p="xl">
      <Group justify="space-between" align="flex-start">
        <Box maw={760}>
          <Text tt="uppercase" fw={800} size="xs" c="cyan">
            Operator workspace
          </Text>
          <Title order={1}>Sliver client experience for the browser</Title>
          <Text c="dimmed" mt="sm">
            Import an operator profile, connect the Go gateway, and manage
            implants, sessions, beacons, listeners, jobs, loot, and command
            workflows through Mantine pages backed by generated API clients.
          </Text>
        </Box>
        <Group>
          <FileButton onChange={handleConfigFile} accept=".cfg,.json,application/json">
            {(props) => <Button {...props}>Import sliver.cfg</Button>}
          </FileButton>
          <Button variant="light" onClick={parseConfig}>
            Parse config
          </Button>
          <Button onClick={connectGateway}>Connect</Button>
        </Group>
      </Group>
    </Card>
  );
}

function MetricCard({ label, value }: { label: string; value: number | string }) {
  return (
    <Card withBorder radius="md">
      <Text size="sm" c="dimmed">
        {label}
      </Text>
      <Title order={2} lineClamp={1}>
        {value}
      </Title>
    </Card>
  );
}

function ConnectionPanel({
  configInput,
  configSummary,
  connectGateway,
  disconnectGateway,
  gatewayUrl,
  loadStatus,
  refreshAll,
  setConfigInput,
  setGatewayUrl,
  status,
  submitConfig,
}: {
  configInput: string;
  configSummary: ConfigSummary | null;
  connectGateway: () => void;
  disconnectGateway: () => void;
  gatewayUrl: string;
  loadStatus: () => void;
  refreshAll: () => void;
  setConfigInput: (value: string) => void;
  setGatewayUrl: (value: string) => void;
  status: GatewayStatus;
  submitConfig: () => void;
}) {
  return (
    <Card withBorder radius="lg">
      <Stack>
        <Group justify="space-between">
          <Box>
            <Text tt="uppercase" fw={800} size="xs" c="cyan">
              Gateway setup
            </Text>
            <Title order={3}>Operator configuration</Title>
          </Box>
          <Badge color={status.connected ? "green" : "yellow"}>
            {status.connected ? "Connected" : "Waiting"}
          </Badge>
        </Group>

        <TextInput
          label="Go gateway URL"
          placeholder="http://localhost:8080"
          value={gatewayUrl}
          onChange={(event) => setGatewayUrl(event.currentTarget.value)}
        />
        <Textarea
          autosize
          minRows={10}
          label="Operator config JSON"
          value={configInput}
          onChange={(event) => setConfigInput(event.currentTarget.value)}
        />
        <Group grow>
          <Button variant="light" onClick={submitConfig}>
            Parse
          </Button>
          <Button onClick={connectGateway}>Connect</Button>
        </Group>
        <Group grow>
          <Button variant="default" onClick={loadStatus}>
            Status
          </Button>
          <Button variant="default" onClick={refreshAll}>
            Refresh
          </Button>
          <Button color="red" variant="light" onClick={disconnectGateway}>
            Disconnect
          </Button>
        </Group>

        <SimpleGrid cols={2}>
          <Summary label="Connected" value={status.connected ? "yes" : "no"} />
          <Summary label="Operator" value={status.operator ?? configSummary?.operator ?? "-"} />
          <Summary
            label="RPC endpoint"
            value={status.endpoint ?? configSummary?.endpoint ?? "-"}
          />
          <Summary label="Token" value={configSummary?.hasToken ? "loaded" : "missing"} />
          <Summary
            label="Client cert"
            value={configSummary?.hasClientCertificate ? "loaded" : "missing"}
          />
          <Summary label="Private key" value={configSummary?.hasPrivateKey ? "loaded" : "missing"} />
        </SimpleGrid>
      </Stack>
    </Card>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <Paper withBorder p="sm" radius="md">
      <Text size="xs" c="dimmed">
        {label}
      </Text>
      <Text fw={700} truncate>
        {value}
      </Text>
    </Paper>
  );
}

function OverviewPage({
  dataSets,
  status,
}: {
  dataSets: DataSets;
  status: GatewayStatus;
}) {
  return (
    <Stack>
      <SimpleGrid cols={{ base: 1, md: 3 }}>
        <Card withBorder radius="lg">
          <Title order={4}>mTLS gateway</Title>
          <Text c="dimmed" mt="xs">
            Browser requests are routed to Go, while Go owns the Sliver mTLS gRPC
            client and forwards common operator workflows.
          </Text>
        </Card>
        <Card withBorder radius="lg">
          <Title order={4}>Generated API contract</Title>
          <Text c="dimmed" mt="xs">
            Huma generates OpenAPI from route types, and openapi-typescript
            generates frontend API types from the same spec.
          </Text>
        </Card>
        <Card withBorder radius="lg">
          <Title order={4}>Router pages</Title>
          <Text c="dimmed" mt="xs">
            React Router owns navigation for overview, implants, sessions,
            beacons, listeners, jobs, loot, and console pages.
          </Text>
        </Card>
      </SimpleGrid>
      <JSONPanel title="Gateway status" data={status} />
      <JSONPanel title="Version" data={dataSets.version} />
      <JSONPanel title="Operators" data={dataSets.operators} />
    </Stack>
  );
}

function ImplantsPage({
  buildRows,
  generateImplant,
  profileRows,
  rawPayload,
  saveImplantProfile,
  setRawPayload,
}: {
  buildRows: TableRow[];
  generateImplant: () => void;
  profileRows: TableRow[];
  rawPayload: string;
  saveImplantProfile: () => void;
  setRawPayload: (value: string) => void;
}) {
  return (
    <Stack>
      <Tabs defaultValue="builds">
        <Tabs.List>
          <Tabs.Tab value="builds">Builds</Tabs.Tab>
          <Tabs.Tab value="profiles">Profiles</Tabs.Tab>
          <Tabs.Tab value="payload">Generate / Profile Payload</Tabs.Tab>
        </Tabs.List>
        <Tabs.Panel value="builds" pt="md">
          <DataTable rows={buildRows} />
        </Tabs.Panel>
        <Tabs.Panel value="profiles" pt="md">
          <DataTable rows={profileRows} />
        </Tabs.Panel>
        <Tabs.Panel value="payload" pt="md">
          <Stack>
            <JsonInput
              autosize
              formatOnBlur
              minRows={14}
              label="Raw Sliver GenerateReq / ImplantProfile payload"
              validationError="Invalid JSON"
              value={rawPayload}
              onChange={setRawPayload}
            />
            <Group>
              <Button onClick={generateImplant}>Generate implant</Button>
              <Button variant="light" onClick={saveImplantProfile}>
                Save profile
              </Button>
            </Group>
          </Stack>
        </Tabs.Panel>
      </Tabs>
    </Stack>
  );
}

function SessionsPage({
  rows,
  runSessionCommand,
}: {
  rows: TableRow[];
  runSessionCommand: (values: SessionCommandValues) => void;
}) {
  const form = useForm<SessionCommandValues>({
    initialValues: {
      command: "ping",
      sessionId: "",
      path: "",
      args: "",
      async: false,
      output: true,
    },
  });

  return (
    <Stack>
      <DataTable rows={rows} />
      <Card withBorder radius="lg">
        <form onSubmit={form.onSubmit(runSessionCommand)}>
          <Stack>
            <Title order={4}>Run session command</Title>
            <SimpleGrid cols={{ base: 1, md: 2 }}>
              <Select
                label="Command"
                data={["ping", "ps", "pwd", "ls", "cd", "execute", "shell"]}
                {...form.getInputProps("command")}
              />
              <TextInput label="Session ID" {...form.getInputProps("sessionId")} />
              <TextInput
                label="Path"
                placeholder="/tmp or /bin/hostname"
                {...form.getInputProps("path")}
              />
              <TextInput
                label="Args"
                placeholder="-la /tmp"
                {...form.getInputProps("args")}
              />
            </SimpleGrid>
            <Group>
              <Switch label="Async" {...form.getInputProps("async", { type: "checkbox" })} />
              <Switch
                label="Capture output"
                {...form.getInputProps("output", { type: "checkbox" })}
              />
            </Group>
            <Button type="submit">Run command</Button>
          </Stack>
        </form>
      </Card>
    </Stack>
  );
}

function ListenersPage({
  jobRows,
  startListener,
}: {
  jobRows: TableRow[];
  startListener: (values: ListenerFormValues) => void;
}) {
  const form = useForm<ListenerFormValues>({
    initialValues: {
      protocol: "mtls",
      host: "0.0.0.0",
      port: 8888,
      domain: "",
      website: "",
      persistent: false,
      enforceOtp: false,
    },
  });

  return (
    <Stack>
      <Card withBorder radius="lg">
        <form onSubmit={form.onSubmit(startListener)}>
          <Stack>
            <Title order={4}>Start listener</Title>
            <SimpleGrid cols={{ base: 1, md: 2 }}>
              <Select
                label="Protocol"
                data={["mtls", "http", "https", "dns"]}
                {...form.getInputProps("protocol")}
              />
              <TextInput label="Host" {...form.getInputProps("host")} />
              <NumberInput
                label="Port"
                min={1}
                max={65535}
                {...form.getInputProps("port")}
              />
              <TextInput label="Domain / DNS zone" {...form.getInputProps("domain")} />
              <TextInput label="Website" {...form.getInputProps("website")} />
            </SimpleGrid>
            <Group>
              <Switch
                label="Persistent"
                {...form.getInputProps("persistent", { type: "checkbox" })}
              />
              <Switch
                label="Enforce OTP"
                {...form.getInputProps("enforceOtp", { type: "checkbox" })}
              />
            </Group>
            <Button type="submit">Start listener</Button>
          </Stack>
        </form>
      </Card>
      <Card withBorder radius="lg">
        <Title order={4} mb="md">
          Listener jobs
        </Title>
        <DataTable rows={jobRows} />
      </Card>
    </Stack>
  );
}

function JobsPage({
  killJob,
  rows,
}: {
  killJob: (id: unknown) => void;
  rows: TableRow[];
}) {
  return (
    <Stack>
      <DataTable rows={rows} />
      <Group>
        {rows.slice(0, 8).map((row) => (
          <Button
            color="red"
            key={String(row.id ?? row.ID)}
            onClick={() => killJob(row.id ?? row.ID)}
            variant="light"
          >
            Kill job {String(row.id ?? row.ID)}
          </Button>
        ))}
      </Group>
    </Stack>
  );
}

function LootPage({
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
    <Stack>
      <DataTable rows={rows} />
      <JsonInput
        autosize
        formatOnBlur
        minRows={10}
        label="Loot content payload"
        validationError="Invalid JSON"
        value={rawPayload}
        onChange={setRawPayload}
      />
      <Button onClick={fetchLootContent}>Fetch loot content</Button>
    </Stack>
  );
}

function DataPage({ rows }: { rows: TableRow[] }) {
  return <DataTable rows={rows} />;
}

function DataTable({ rows }: { rows: TableRow[] }) {
  if (rows.length === 0) {
    return (
      <Card withBorder radius="lg">
        <Text c="dimmed">No data available. Connect and refresh first.</Text>
      </Card>
    );
  }

  const columns = Object.keys(rows[0]).slice(0, 10);

  return (
    <Table.ScrollContainer minWidth={720}>
      <Table striped highlightOnHover withTableBorder withColumnBorders>
        <Table.Thead>
          <Table.Tr>
            {columns.map((column) => (
              <Table.Th key={column}>{column}</Table.Th>
            ))}
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {rows.map((row, rowIndex) => (
            <Table.Tr key={rowIndex}>
              {columns.map((column) => (
                <Table.Td key={column}>{formatCell(row[column])}</Table.Td>
              ))}
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </Table.ScrollContainer>
  );
}

function ConsolePage({
  consoleInput,
  consoleLines,
  handleConsoleSubmit,
  setConsoleInput,
}: {
  consoleInput: string;
  consoleLines: string[];
  handleConsoleSubmit: (event: FormEvent<HTMLFormElement>) => void;
  setConsoleInput: (value: string) => void;
}) {
  return (
    <Stack>
      <Paper withBorder radius="lg" p="md" bg="dark.8">
        <ScrollArea h={420}>
          <Code block c="green.2">
            {consoleLines.length ? consoleLines.join("\n") : "Console cleared."}
          </Code>
        </ScrollArea>
      </Paper>
      <form onSubmit={handleConsoleSubmit}>
        <Group align="flex-end">
          <TextInput
            flex={1}
            label="web-client>"
            placeholder="help"
            value={consoleInput}
            onChange={(event) => setConsoleInput(event.currentTarget.value)}
          />
          <Button type="submit">Run</Button>
        </Group>
      </form>
    </Stack>
  );
}

function JSONPanel({ data, title }: { data: unknown; title: string }) {
  return (
    <Card withBorder radius="lg">
      <Title order={4} mb="sm">
        {title}
      </Title>
      <ScrollArea h={240}>
        <Code block>{formatJSON(data ?? {})}</Code>
      </ScrollArea>
    </Card>
  );
}

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

function showError(error: unknown) {
  notifications.show({
    color: "red",
    title: "Operation failed",
    message: error instanceof Error ? error.message : String(error),
  });
}

export default App;
