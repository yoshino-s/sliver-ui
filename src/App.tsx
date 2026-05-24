import { FormEvent, useMemo, useState } from "react";
import {
  Navigate,
  NavLink as RouterNavLink,
  Outlet,
  Route,
  Routes,
  useLocation,
  useNavigate,
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
  ScrollArea,
  Select,
  SimpleGrid,
  Stack,
  Switch,
  Table,
  Tabs,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import { createPromiseClient, type Interceptor } from "@connectrpc/connect";
import { createConnectTransport } from "@connectrpc/connect-web";
import type { Message } from "@bufbuild/protobuf";
import { Empty, Request as SliverRequest } from "./gen/commonpb/common_pb";
import {
  DeleteReq,
  DNSListenerReq,
  GenerateReq,
  HTTPListenerReq,
  ImplantProfile,
  KillJobReq,
  Loot,
  MTLSListenerReq,
} from "./gen/clientpb/client_pb";
import {
  CreateSessionRequest,
  DeleteSessionRequest,
  GetSessionRequest,
  OperatorConfig,
  Session,
} from "./gen/gatewaypb/session_pb";
import { GatewaySessionService } from "./gen/gatewaypb/session_connect";
import { SliverRPC } from "./gen/rpcpb/services_connect";
import {
  CdReq,
  ExecuteReq,
  LsReq,
  Ping,
  PsReq,
  PwdReq,
  ShellReq,
} from "./gen/sliverpb/sliver_pb";

type ApiData = Record<string, unknown> | unknown[] | null;
type TableRow = Record<string, unknown>;

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

type SliverClients = ReturnType<typeof createClients>;

const sessionHeader = "X-Sliver-Session-Id";
const storedSessionKey = "sliver-web-session";

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
  "  refresh    Refresh all common resources via generated Connect RPC",
  "  sessions   Print cached sessions",
  "  beacons    Print cached beacons",
  "  jobs       Print cached jobs",
  "  loot       Print cached loot",
  "  implants   Print cached implant builds",
  "  clear      Clear console output",
];

function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const [configInput, setConfigInput] = useState(sampleConfig);
  const [activeSession, setActiveSession] = useState<Session | null>(() =>
    loadStoredSession(),
  );
  const [dataSets, setDataSets] = useState<DataSets>(emptyDataSets);
  const [loading, setLoading] = useState("");
  const [rawPayload, setRawPayload] = useState(
    JSON.stringify(
      {
        Config: {
          GOOS: "linux",
          GOARCH: "amd64",
          Name: "web-generated",
          IsBeacon: false,
          C2: [{ URL: "mtls://127.0.0.1:8888", Priority: 1 }],
        },
      },
      null,
      2,
    ),
  );
  const [consoleInput, setConsoleInput] = useState("");
  const [consoleLines, setConsoleLines] = useState<string[]>([
    "Sliver Web Client ready.",
    "Create a gateway session first, then all calls use generated Connect RPC clients.",
  ]);

  const clients = useMemo(() => createClients(activeSession?.id), [activeSession?.id]);

  const rows = useMemo(
    () => ({
      sessions: extractRows(dataSets.sessions, ["Sessions", "sessions"]),
      beacons: extractRows(dataSets.beacons, ["Beacons", "beacons"]),
      jobs: extractRows(dataSets.jobs, ["Jobs", "jobs"]),
      loot: extractRows(dataSets.loot, ["Loot", "loot"]),
      builds: extractRows(dataSets.builds, ["Builds", "builds", "ImplantBuilds"]),
      profiles: extractRows(dataSets.profiles, ["Profiles", "profiles"]),
    }),
    [dataSets],
  );

  async function createSession() {
    await runTask("Creating session", async () => {
      const config = parseOperatorConfig(configInput);
      const session = await clients.gateway.createSession(
        new CreateSessionRequest({ config }),
      );
      setActiveSession(session);
      localStorage.setItem(storedSessionKey, session.toJsonString());
      notifications.show({
        color: "green",
        title: "Sliver session created",
        message: `${session.operator} @ ${session.endpoint}`,
      });
      navigate("/overview", { replace: true });
    });
  }

  async function validateStoredSession() {
    if (!activeSession) {
      return;
    }
    await runTask("Validating session", async () => {
      const session = await clients.gateway.getSession(
        new GetSessionRequest({ id: activeSession.id }),
      );
      setActiveSession(session);
      localStorage.setItem(storedSessionKey, session.toJsonString());
    });
  }

  async function deleteSession() {
    if (!activeSession) {
      return;
    }
    await runTask("Deleting session", async () => {
      await clients.gateway.deleteSession(
        new DeleteSessionRequest({ id: activeSession.id }),
      );
      setActiveSession(null);
      setDataSets(emptyDataSets);
      localStorage.removeItem(storedSessionKey);
      navigate("/connect", { replace: true });
    });
  }

  async function handleConfigFile(file: File | null) {
    if (!file) {
      return;
    }
    setConfigInput(await file.text());
  }

  async function refreshAll() {
    await requireSession(async () => {
      await runTask("Refreshing", async () => {
        const [version, operators, sessions, beacons, jobs, loot, builds, profiles] =
          await Promise.all([
            clients.sliver.getVersion(new Empty()),
            clients.sliver.getOperators(new Empty()),
            clients.sliver.getSessions(new Empty()),
            clients.sliver.getBeacons(new Empty()),
            clients.sliver.getJobs(new Empty()),
            clients.sliver.lootAll(new Empty()),
            clients.sliver.implantBuilds(new Empty()),
            clients.sliver.implantProfiles(new Empty()),
          ]);
        setDataSets({
          version: toJson(version),
          operators: toJson(operators),
          sessions: toJson(sessions),
          beacons: toJson(beacons),
          jobs: toJson(jobs),
          loot: toJson(loot),
          builds: toJson(builds),
          profiles: toJson(profiles),
        });
        appendConsole("Refreshed common Sliver resources through Connect RPC.");
      });
    });
  }

  async function refreshJobs() {
    const jobs = await clients.sliver.getJobs(new Empty());
    setDataSets((current) => ({ ...current, jobs: toJson(jobs) }));
  }

  async function startListener(values: ListenerFormValues) {
    await requireSession(async () => {
      await runTask("Starting listener", async () => {
        const result = await startListenerRPC(clients, values);
        appendConsole(`Started ${values.protocol} listener: ${formatJSON(toJson(result))}`);
        await refreshJobs();
      });
    });
  }

  async function killJob(id: unknown) {
    const numericID = Number(id);
    if (!Number.isFinite(numericID)) {
      showError(new Error("Job ID is invalid."));
      return;
    }
    await requireSession(async () => {
      await runTask("Killing job", async () => {
        await clients.sliver.killJob(new KillJobReq({ ID: numericID }));
        appendConsole(`Killed job ${numericID}.`);
        await refreshJobs();
      });
    });
  }

  async function runSessionCommand(values: SessionCommandValues) {
    await requireSession(async () => {
      await runTask("Running command", async () => {
        const result = await runSessionCommandRPC(clients, values);
        appendConsole(formatJSON(toJson(result)));
      });
    });
  }

  async function generateImplant() {
    await requireSession(async () => {
      await runTask("Generating implant", async () => {
        const req = GenerateReq.fromJson(JSON.parse(rawPayload), {
          ignoreUnknownFields: true,
        } as never);
        const result = await clients.sliver.generate(req);
        appendConsole(formatJSON(toJson(result)));
      });
    });
  }

  async function saveImplantProfile() {
    await requireSession(async () => {
      await runTask("Saving implant profile", async () => {
        const req = ImplantProfile.fromJson(JSON.parse(rawPayload), {
          ignoreUnknownFields: true,
        } as never);
        const result = await clients.sliver.saveImplantProfile(req);
        appendConsole(formatJSON(toJson(result)));
      });
    });
  }

  async function fetchLootContent() {
    await requireSession(async () => {
      await runTask("Loading loot", async () => {
        const req = Loot.fromJson(JSON.parse(rawPayload), {
          ignoreUnknownFields: true,
        } as never);
        const result = await clients.sliver.lootContent(req);
        appendConsole(formatJSON(toJson(result)));
      });
    });
  }

  async function requireSession(task: () => Promise<void>) {
    if (!activeSession) {
      navigate("/connect", { replace: true });
      showError(new Error("Create a Sliver session first."));
      return;
    }
    await task();
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
      case "refresh":
        await refreshAll();
        return;
      case "sessions":
        appendConsole(formatJSON(dataSets.sessions));
        return;
      case "beacons":
        appendConsole(formatJSON(dataSets.beacons));
        return;
      case "jobs":
        appendConsole(formatJSON(dataSets.jobs));
        return;
      case "loot":
        appendConsole(formatJSON(dataSets.loot));
        return;
      case "implants":
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

  const isConnected = Boolean(activeSession);

  return (
    <AppShell header={{ height: 64 }} navbar={{ width: 280, breakpoint: "sm" }} padding="md">
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Group gap="sm">
            <Badge size="lg" variant="gradient" gradient={{ from: "cyan", to: "teal" }}>
              S
            </Badge>
            <Box>
              <Title order={3}>Sliver Web Client</Title>
              <Text size="xs" c="dimmed">
                Connect RPC Gateway + Mantine + React Router
              </Text>
            </Box>
          </Group>
          <Group>
            <Badge color={isConnected ? "green" : "yellow"}>
              {isConnected ? "Session active" : "No session"}
            </Badge>
            {loading ? <Badge color="blue">{loading}...</Badge> : null}
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="md">
        <Stack gap="xs">
          <NavLink
            active={location.pathname === "/connect"}
            component={RouterNavLink}
            label="Connect"
            to="/connect"
            variant="filled"
          />
          {navItems.map((item) => (
            <NavLink
              active={location.pathname === item.path}
              component={RouterNavLink}
              disabled={!isConnected}
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
          <Grid align="flex-start">
            {isConnected ? (
              <Grid.Col span={{ base: 12, lg: 3 }}>
                <SessionCard
                  deleteSession={deleteSession}
                  refreshAll={refreshAll}
                  session={activeSession}
                  validateStoredSession={validateStoredSession}
                />
              </Grid.Col>
            ) : null}
            <Grid.Col span={{ base: 12, lg: isConnected ? 9 : 12 }}>
              <Routes>
                <Route
                  path="/connect"
                  element={
                    <ConnectPage
                      configInput={configInput}
                      createSession={createSession}
                      handleConfigFile={handleConfigFile}
                      setConfigInput={setConfigInput}
                    />
                  }
                />
                <Route
                  path="/"
                  element={<Navigate to={isConnected ? "/overview" : "/connect"} replace />}
                />
                <Route element={<RequireSession connected={isConnected} />}>
                  <Route
                    path="/overview"
                    element={
                      <OverviewPage
                        dataSets={dataSets}
                        rows={rows}
                        session={activeSession}
                      />
                    }
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
                      <SessionsPage rows={rows.sessions} runSessionCommand={runSessionCommand} />
                    }
                  />
                  <Route path="/beacons" element={<DataPage rows={rows.beacons} />} />
                  <Route
                    path="/listeners"
                    element={<ListenersPage jobRows={rows.jobs} startListener={startListener} />}
                  />
                  <Route path="/jobs" element={<JobsPage killJob={killJob} rows={rows.jobs} />} />
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
                </Route>
              </Routes>
            </Grid.Col>
          </Grid>
        </Container>
      </AppShell.Main>
    </AppShell>
  );
}

function RequireSession({ connected }: { connected: boolean }) {
  return connected ? <Outlet /> : <Navigate to="/connect" replace />;
}

function ConnectPage({
  configInput,
  createSession,
  handleConfigFile,
  setConfigInput,
}: {
  configInput: string;
  createSession: () => void;
  handleConfigFile: (file: File | null) => void;
  setConfigInput: (value: string) => void;
}) {
  return (
    <Card withBorder radius="lg" p="xl">
      <Stack>
        <Box>
          <Text tt="uppercase" fw={800} size="xs" c="cyan">
            Gateway session
          </Text>
          <Title order={1}>Create a Sliver session first</Title>
          <Text c="dimmed" mt="sm">
            Paste or import a Sliver operator config. The gateway validates the
            config by opening the native mTLS gRPC client and calling
            GetVersion. After success, all Sliver calls are generated Connect RPC
            requests carrying the session id header.
          </Text>
        </Box>
        <Text size="sm" c="dimmed">
          Gateway endpoint: current page origin. In development, Vite proxies
          Connect RPC calls to the Go gateway.
        </Text>
        <Group>
          <FileButton onChange={handleConfigFile} accept=".cfg,.json,application/json">
            {(props) => <Button {...props}>Import sliver.cfg</Button>}
          </FileButton>
          <Button onClick={createSession}>Validate and create session</Button>
        </Group>
        <JsonInput
          autosize
          formatOnBlur
          minRows={16}
          label="Operator config JSON"
          validationError="Invalid JSON"
          value={configInput}
          onChange={setConfigInput}
        />
      </Stack>
    </Card>
  );
}

function SessionCard({
  deleteSession,
  refreshAll,
  session,
  validateStoredSession,
}: {
  deleteSession: () => void;
  refreshAll: () => void;
  session: Session | null;
  validateStoredSession: () => void;
}) {
  return (
    <Card withBorder radius="lg">
      <Stack>
        <Group justify="space-between">
          <Title order={4}>Active session</Title>
          <Badge color="green">Connected</Badge>
        </Group>
        <Summary label="Session ID" value={session?.id ?? "-"} />
        <Summary label="Operator" value={session?.operator ?? "-"} />
        <Summary label="Endpoint" value={session?.endpoint ?? "-"} />
        <Summary label="Version" value={session?.version ?? "-"} />
        <Group grow>
          <Button variant="default" onClick={validateStoredSession}>
            Validate
          </Button>
          <Button onClick={refreshAll}>Refresh</Button>
        </Group>
        <Button color="red" variant="light" onClick={deleteSession}>
          Delete session
        </Button>
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
  rows,
  session,
}: {
  dataSets: DataSets;
  rows: {
    sessions: TableRow[];
    beacons: TableRow[];
    jobs: TableRow[];
    loot: TableRow[];
    builds: TableRow[];
    profiles: TableRow[];
  };
  session: Session | null;
}) {
  return (
    <Stack>
      <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }}>
        <MetricCard label="Sessions" value={rows.sessions.length} />
        <MetricCard label="Beacons" value={rows.beacons.length} />
        <MetricCard label="Jobs" value={rows.jobs.length} />
        <MetricCard label="Operator" value={session?.operator ?? "Not loaded"} />
      </SimpleGrid>
      <SimpleGrid cols={{ base: 1, md: 3 }}>
        <Card withBorder radius="lg">
          <Title order={4}>Connect RPC only</Title>
          <Text c="dimmed" mt="xs">
            Sliver methods are generated from the original protobuf service and
            forwarded method-by-method to the mTLS gRPC client.
          </Text>
        </Card>
        <Card withBorder radius="lg">
          <Title order={4}>Thin gateway</Title>
          <Text c="dimmed" mt="xs">
            The gateway only creates sessions from operator configs and proxies
            Connect RPC calls using the session header.
          </Text>
        </Card>
        <Card withBorder radius="lg">
          <Title order={4}>Validated config</Title>
          <Text c="dimmed" mt="xs">
            Session creation fails unless the config can connect to Sliver and
            complete GetVersion successfully.
          </Text>
        </Card>
      </SimpleGrid>
      <JSONPanel title="Version" data={dataSets.version} />
      <JSONPanel title="Operators" data={dataSets.operators} />
    </Stack>
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
          <Tabs.Tab value="payload">Generated RPC Payload</Tabs.Tab>
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
              label="GenerateReq / ImplantProfile JSON"
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
            <Title order={4}>Run generated session RPC</Title>
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
            <Title order={4}>Start listener via generated RPC</Title>
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
            key={String(row.ID ?? row.id)}
            onClick={() => killJob(row.ID ?? row.id)}
            variant="light"
          >
            Kill job {String(row.ID ?? row.id)}
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
        label="Loot JSON payload"
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
        <Text c="dimmed">No data available. Create a session and refresh first.</Text>
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

function createClients(sessionID?: string) {
  const interceptors: Interceptor[] = [
    (next) => async (req) => {
      if (sessionID) {
        req.header.set(sessionHeader, sessionID);
      }
      return next(req);
    },
  ];
  const transport = createConnectTransport({
    baseUrl: window.location.origin,
    interceptors,
  });
  return {
    gateway: createPromiseClient(GatewaySessionService, transport),
    sliver: createPromiseClient(SliverRPC, transport),
  };
}

function parseOperatorConfig(input: string): OperatorConfig {
  const parsed = JSON.parse(input) as Record<string, unknown>;
  const config = new OperatorConfig({
    operator: stringField(parsed, "operator"),
    token: stringField(parsed, "token"),
    lhost: stringField(parsed, "lhost"),
    lport: numberField(parsed, "lport"),
    caCertificate: stringField(parsed, "ca_certificate"),
    privateKey: stringField(parsed, "private_key"),
    certificate: stringField(parsed, "certificate"),
  });
  return config;
}

function stringField(value: Record<string, unknown>, key: string) {
  const field = value[key];
  if (typeof field !== "string" || !field) {
    throw new Error(`${key} is required`);
  }
  return field;
}

function numberField(value: Record<string, unknown>, key: string) {
  const field = value[key];
  if (typeof field !== "number" || field <= 0) {
    throw new Error(`${key} must be a positive number`);
  }
  return field;
}

async function startListenerRPC(clients: SliverClients, values: ListenerFormValues) {
  switch (values.protocol) {
    case "mtls":
      return clients.sliver.startMTLSListener(
        new MTLSListenerReq({
          Host: values.host,
          Port: values.port,
          Persistent: values.persistent,
        }),
      );
    case "http":
      return clients.sliver.startHTTPListener(newHTTPListenerReq(values, false));
    case "https":
      return clients.sliver.startHTTPSListener(newHTTPListenerReq(values, true));
    case "dns":
      return clients.sliver.startDNSListener(
        new DNSListenerReq({
          Host: values.host,
          Port: values.port,
          Domains: values.domain ? [values.domain] : [],
          Persistent: values.persistent,
          EnforceOTP: values.enforceOtp,
        }),
      );
  }
}

function newHTTPListenerReq(values: ListenerFormValues, secure: boolean) {
  return new HTTPListenerReq({
    Host: values.host,
    Port: values.port,
    Domain: values.domain,
    Website: values.website,
    Secure: secure,
    Persistent: values.persistent,
    EnforceOTP: values.enforceOtp,
  });
}

async function runSessionCommandRPC(clients: SliverClients, values: SessionCommandValues) {
  const request = new SliverRequest({
    Async: values.async,
    SessionID: values.sessionId,
  });
  const args = values.args
    .split(" ")
    .map((arg) => arg.trim())
    .filter(Boolean);

  switch (values.command) {
    case "ping":
      return clients.sliver.ping(new Ping({ Nonce: Date.now() % 2147483647, Request: request }));
    case "ps":
      return clients.sliver.ps(new PsReq({ Request: request }));
    case "pwd":
      return clients.sliver.pwd(new PwdReq({ Request: request }));
    case "ls":
      return clients.sliver.ls(new LsReq({ Path: values.path, Request: request }));
    case "cd":
      return clients.sliver.cd(new CdReq({ Path: values.path, Request: request }));
    case "execute":
      return clients.sliver.execute(
        new ExecuteReq({
          Path: values.path,
          Args: args,
          Output: values.output,
          Request: request,
        }),
      );
    case "shell":
      return clients.sliver.shell(new ShellReq({ Path: values.path, Request: request }));
  }
}

function loadStoredSession() {
  const stored = localStorage.getItem(storedSessionKey);
  if (!stored) {
    return null;
  }
  try {
    return Session.fromJsonString(stored);
  } catch {
    localStorage.removeItem(storedSessionKey);
    return null;
  }
}

function toJson(message: Message) {
  return message.toJson({ emitDefaultValues: false }) as ApiData;
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
