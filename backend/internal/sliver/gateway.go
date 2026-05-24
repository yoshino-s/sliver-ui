package sliver

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"sync"
	"time"

	"github.com/bishopfox/sliver/client/assets"
	"github.com/bishopfox/sliver/client/transport"
	"github.com/bishopfox/sliver/protobuf/clientpb"
	"github.com/bishopfox/sliver/protobuf/commonpb"
	"github.com/bishopfox/sliver/protobuf/rpcpb"
	"github.com/bishopfox/sliver/protobuf/sliverpb"
	"google.golang.org/grpc"
	"google.golang.org/protobuf/encoding/protojson"
	"google.golang.org/protobuf/proto"
)

var ErrNotConnected = errors.New("sliver gateway is not connected")

type OperatorConfig = assets.ClientConfig

type Status struct {
	Connected   bool   `json:"connected" doc:"Whether the gateway has an active Sliver RPC client"`
	Operator    string `json:"operator,omitempty" doc:"Loaded operator name"`
	Endpoint    string `json:"endpoint,omitempty" doc:"Sliver server host:port"`
	ConnectedAt string `json:"connectedAt,omitempty" doc:"Connection timestamp in RFC3339 format"`
	Version     JSON   `json:"version,omitempty" doc:"Sliver server version, when available"`
}

type JSON map[string]any

type ConnectResult struct {
	Status Status `json:"status"`
}

type Gateway struct {
	mu          sync.RWMutex
	rpc         rpcpb.SliverRPCClient
	conn        *grpc.ClientConn
	config      *assets.ClientConfig
	connectedAt time.Time
}

func NewGateway() *Gateway {
	return &Gateway{}
}

func (g *Gateway) Connect(ctx context.Context, config OperatorConfig) (*ConnectResult, error) {
	if err := validateConfig(config); err != nil {
		return nil, err
	}

	client, conn, err := transport.MTLSConnect((*assets.ClientConfig)(&config))
	if err != nil {
		return nil, fmt.Errorf("connect to Sliver RPC: %w", err)
	}

	g.mu.Lock()
	oldConn := g.conn
	g.rpc = client
	g.conn = conn
	g.config = (*assets.ClientConfig)(&config)
	g.connectedAt = time.Now().UTC()
	g.mu.Unlock()

	if oldConn != nil {
		_ = oldConn.Close()
	}

	status := g.Status()
	if version, err := g.Version(ctx); err == nil {
		status.Version = version
	}

	return &ConnectResult{Status: status}, nil
}

func (g *Gateway) ConnectFromFile(ctx context.Context, path string) (*ConnectResult, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf("read config file: %w", err)
	}

	var config OperatorConfig
	if err := json.Unmarshal(data, &config); err != nil {
		return nil, fmt.Errorf("parse config file: %w", err)
	}

	return g.Connect(ctx, config)
}

func (g *Gateway) Disconnect() {
	g.mu.Lock()
	defer g.mu.Unlock()

	if g.conn != nil {
		_ = g.conn.Close()
	}

	g.rpc = nil
	g.conn = nil
	g.config = nil
	g.connectedAt = time.Time{}
}

func (g *Gateway) Status() Status {
	g.mu.RLock()
	defer g.mu.RUnlock()

	status := Status{
		Connected: g.rpc != nil,
	}
	if g.config != nil {
		status.Operator = g.config.Operator
		status.Endpoint = fmt.Sprintf("%s:%d", g.config.LHost, g.config.LPort)
	}
	if !g.connectedAt.IsZero() {
		status.ConnectedAt = g.connectedAt.Format(time.RFC3339)
	}
	return status
}

func (g *Gateway) Version(ctx context.Context) (JSON, error) {
	client, err := g.client()
	if err != nil {
		return nil, err
	}
	return callJSON(ctx, func(ctx context.Context) (proto.Message, error) {
		return client.GetVersion(ctx, &commonpb.Empty{})
	})
}

func (g *Gateway) Operators(ctx context.Context) (JSON, error) {
	client, err := g.client()
	if err != nil {
		return nil, err
	}
	return callJSON(ctx, func(ctx context.Context) (proto.Message, error) {
		return client.GetOperators(ctx, &commonpb.Empty{})
	})
}

func (g *Gateway) Sessions(ctx context.Context) (JSON, error) {
	client, err := g.client()
	if err != nil {
		return nil, err
	}
	return callJSON(ctx, func(ctx context.Context) (proto.Message, error) {
		return client.GetSessions(ctx, &commonpb.Empty{})
	})
}

func (g *Gateway) Beacons(ctx context.Context) (JSON, error) {
	client, err := g.client()
	if err != nil {
		return nil, err
	}
	return callJSON(ctx, func(ctx context.Context) (proto.Message, error) {
		return client.GetBeacons(ctx, &commonpb.Empty{})
	})
}

func (g *Gateway) Jobs(ctx context.Context) (JSON, error) {
	client, err := g.client()
	if err != nil {
		return nil, err
	}
	return callJSON(ctx, func(ctx context.Context) (proto.Message, error) {
		return client.GetJobs(ctx, &commonpb.Empty{})
	})
}

func (g *Gateway) KillJob(ctx context.Context, id uint32) (JSON, error) {
	client, err := g.client()
	if err != nil {
		return nil, err
	}
	return callJSON(ctx, func(ctx context.Context) (proto.Message, error) {
		return client.KillJob(ctx, &clientpb.KillJobReq{ID: id})
	})
}

func (g *Gateway) Loot(ctx context.Context) (JSON, error) {
	client, err := g.client()
	if err != nil {
		return nil, err
	}
	return callJSON(ctx, func(ctx context.Context) (proto.Message, error) {
		return client.LootAll(ctx, &commonpb.Empty{})
	})
}

func (g *Gateway) LootContent(ctx context.Context, payload JSON) (JSON, error) {
	client, err := g.client()
	if err != nil {
		return nil, err
	}
	req := &clientpb.Loot{}
	if err := jsonToProto(payload, req); err != nil {
		return nil, err
	}
	return callJSON(ctx, func(ctx context.Context) (proto.Message, error) {
		return client.LootContent(ctx, req)
	})
}

func (g *Gateway) ImplantBuilds(ctx context.Context) (JSON, error) {
	client, err := g.client()
	if err != nil {
		return nil, err
	}
	return callJSON(ctx, func(ctx context.Context) (proto.Message, error) {
		return client.ImplantBuilds(ctx, &commonpb.Empty{})
	})
}

func (g *Gateway) ImplantProfiles(ctx context.Context) (JSON, error) {
	client, err := g.client()
	if err != nil {
		return nil, err
	}
	return callJSON(ctx, func(ctx context.Context) (proto.Message, error) {
		return client.ImplantProfiles(ctx, &commonpb.Empty{})
	})
}

func (g *Gateway) DeleteImplantBuild(ctx context.Context, name string) error {
	client, err := g.client()
	if err != nil {
		return err
	}
	_, err = client.DeleteImplantBuild(ctx, &clientpb.DeleteReq{Name: name})
	return err
}

func (g *Gateway) DeleteImplantProfile(ctx context.Context, name string) error {
	client, err := g.client()
	if err != nil {
		return err
	}
	_, err = client.DeleteImplantProfile(ctx, &clientpb.DeleteReq{Name: name})
	return err
}

func (g *Gateway) SaveImplantProfile(ctx context.Context, payload JSON) (JSON, error) {
	client, err := g.client()
	if err != nil {
		return nil, err
	}
	req := &clientpb.ImplantProfile{}
	if err := jsonToProto(payload, req); err != nil {
		return nil, err
	}
	return callJSON(ctx, func(ctx context.Context) (proto.Message, error) {
		return client.SaveImplantProfile(ctx, req)
	})
}

func (g *Gateway) GenerateImplant(ctx context.Context, payload JSON) (JSON, error) {
	client, err := g.client()
	if err != nil {
		return nil, err
	}
	req := &clientpb.GenerateReq{}
	if err := jsonToProto(payload, req); err != nil {
		return nil, err
	}
	return callJSON(ctx, func(ctx context.Context) (proto.Message, error) {
		return client.Generate(ctx, req)
	})
}

type ListenerRequest struct {
	Protocol        string   `json:"protocol" enum:"mtls,http,https,dns" doc:"Listener protocol"`
	Host            string   `json:"host" example:"0.0.0.0" doc:"Bind host"`
	Port            uint32   `json:"port" minimum:"1" maximum:"65535" doc:"Bind port"`
	Domain          string   `json:"domain,omitempty" doc:"HTTP/HTTPS domain or primary DNS domain"`
	Domains         []string `json:"domains,omitempty" doc:"DNS listener domains"`
	Website         string   `json:"website,omitempty" doc:"Sliver website name for HTTP/HTTPS listeners"`
	Persistent      bool     `json:"persistent,omitempty" doc:"Make the listener persistent"`
	EnforceOTP      bool     `json:"enforceOtp,omitempty" doc:"Require one-time payload tokens when supported"`
	LongPollTimeout int64    `json:"longPollTimeout,omitempty" doc:"HTTP long-poll timeout"`
	LongPollJitter  int64    `json:"longPollJitter,omitempty" doc:"HTTP long-poll jitter"`
	Canaries        bool     `json:"canaries,omitempty" doc:"Enable DNS canaries"`
	ACME            bool     `json:"acme,omitempty" doc:"Enable ACME for HTTPS listeners"`
	CertPEM         string   `json:"certPem,omitempty" doc:"HTTPS certificate PEM"`
	KeyPEM          string   `json:"keyPem,omitempty" doc:"HTTPS private key PEM"`
}

func (g *Gateway) StartListener(ctx context.Context, req ListenerRequest) (JSON, error) {
	client, err := g.client()
	if err != nil {
		return nil, err
	}

	switch req.Protocol {
	case "mtls":
		return callJSON(ctx, func(ctx context.Context) (proto.Message, error) {
			return client.StartMTLSListener(ctx, &clientpb.MTLSListenerReq{
				Host:       req.Host,
				Port:       req.Port,
				Persistent: req.Persistent,
			})
		})
	case "http":
		return callJSON(ctx, func(ctx context.Context) (proto.Message, error) {
			return client.StartHTTPListener(ctx, httpListenerReq(req, false))
		})
	case "https":
		return callJSON(ctx, func(ctx context.Context) (proto.Message, error) {
			return client.StartHTTPSListener(ctx, httpListenerReq(req, true))
		})
	case "dns":
		domains := req.Domains
		if len(domains) == 0 && req.Domain != "" {
			domains = []string{req.Domain}
		}
		return callJSON(ctx, func(ctx context.Context) (proto.Message, error) {
			return client.StartDNSListener(ctx, &clientpb.DNSListenerReq{
				Domains:    domains,
				Canaries:   req.Canaries,
				Host:       req.Host,
				Port:       req.Port,
				Persistent: req.Persistent,
				EnforceOTP: req.EnforceOTP,
			})
		})
	default:
		return nil, fmt.Errorf("unsupported listener protocol %q", req.Protocol)
	}
}

type SessionCommandRequest struct {
	Command   string   `json:"command" enum:"ping,ps,pwd,ls,cd,execute,shell" doc:"Session command to run"`
	SessionID string   `json:"sessionId" doc:"Target session ID"`
	BeaconID  string   `json:"beaconId,omitempty" doc:"Target beacon ID for async tasks"`
	Async     bool     `json:"async,omitempty" doc:"Run asynchronously when supported"`
	Timeout   int64    `json:"timeout,omitempty" doc:"Request timeout in seconds"`
	Path      string   `json:"path,omitempty" doc:"Path used by ls, cd, execute, or shell"`
	Args      []string `json:"args,omitempty" doc:"Execute arguments"`
	Output    bool     `json:"output,omitempty" doc:"Capture execute output"`
}

func (g *Gateway) SessionCommand(ctx context.Context, req SessionCommandRequest) (JSON, error) {
	client, err := g.client()
	if err != nil {
		return nil, err
	}
	request := &commonpb.Request{
		Async:     req.Async,
		Timeout:   req.Timeout,
		BeaconID:  req.BeaconID,
		SessionID: req.SessionID,
	}

	switch req.Command {
	case "ping":
		return callJSON(ctx, func(ctx context.Context) (proto.Message, error) {
			return client.Ping(ctx, &sliverpb.Ping{Nonce: int32(time.Now().UnixNano()), Request: request})
		})
	case "ps":
		return callJSON(ctx, func(ctx context.Context) (proto.Message, error) {
			return client.Ps(ctx, &sliverpb.PsReq{Request: request})
		})
	case "pwd":
		return callJSON(ctx, func(ctx context.Context) (proto.Message, error) {
			return client.Pwd(ctx, &sliverpb.PwdReq{Request: request})
		})
	case "ls":
		return callJSON(ctx, func(ctx context.Context) (proto.Message, error) {
			return client.Ls(ctx, &sliverpb.LsReq{Path: req.Path, Request: request})
		})
	case "cd":
		return callJSON(ctx, func(ctx context.Context) (proto.Message, error) {
			return client.Cd(ctx, &sliverpb.CdReq{Path: req.Path, Request: request})
		})
	case "execute":
		return callJSON(ctx, func(ctx context.Context) (proto.Message, error) {
			return client.Execute(ctx, &sliverpb.ExecuteReq{
				Path:    req.Path,
				Args:    req.Args,
				Output:  req.Output,
				Request: request,
			})
		})
	case "shell":
		return callJSON(ctx, func(ctx context.Context) (proto.Message, error) {
			return client.Shell(ctx, &sliverpb.ShellReq{Path: req.Path, Request: request})
		})
	default:
		return nil, fmt.Errorf("unsupported session command %q", req.Command)
	}
}

func (g *Gateway) RawRPC(ctx context.Context, method string, payload JSON) (JSON, error) {
	client, err := g.client()
	if err != nil {
		return nil, err
	}

	switch method {
	case "Generate":
		req := &clientpb.GenerateReq{}
		if err := jsonToProto(payload, req); err != nil {
			return nil, err
		}
		return callJSON(ctx, func(ctx context.Context) (proto.Message, error) { return client.Generate(ctx, req) })
	case "SaveImplantProfile":
		req := &clientpb.ImplantProfile{}
		if err := jsonToProto(payload, req); err != nil {
			return nil, err
		}
		return callJSON(ctx, func(ctx context.Context) (proto.Message, error) { return client.SaveImplantProfile(ctx, req) })
	case "LootContent":
		req := &clientpb.Loot{}
		if err := jsonToProto(payload, req); err != nil {
			return nil, err
		}
		return callJSON(ctx, func(ctx context.Context) (proto.Message, error) { return client.LootContent(ctx, req) })
	default:
		return nil, fmt.Errorf("unsupported raw RPC method %q", method)
	}
}

func (g *Gateway) client() (rpcpb.SliverRPCClient, error) {
	g.mu.RLock()
	defer g.mu.RUnlock()

	if g.rpc == nil {
		return nil, ErrNotConnected
	}
	return g.rpc, nil
}

func validateConfig(config OperatorConfig) error {
	switch {
	case config.Operator == "":
		return errors.New("operator is required")
	case config.LHost == "":
		return errors.New("lhost is required")
	case config.LPort == 0:
		return errors.New("lport is required")
	case config.Token == "":
		return errors.New("token is required")
	case config.CACertificate == "":
		return errors.New("ca_certificate is required")
	case config.Certificate == "":
		return errors.New("certificate is required")
	case config.PrivateKey == "":
		return errors.New("private_key is required")
	default:
		return nil
	}
}

func httpListenerReq(req ListenerRequest, secure bool) *clientpb.HTTPListenerReq {
	return &clientpb.HTTPListenerReq{
		Domain:          req.Domain,
		Host:            req.Host,
		Port:            req.Port,
		Secure:          secure,
		Website:         req.Website,
		Cert:            []byte(req.CertPEM),
		Key:             []byte(req.KeyPEM),
		ACME:            req.ACME,
		Persistent:      req.Persistent,
		EnforceOTP:      req.EnforceOTP,
		LongPollTimeout: req.LongPollTimeout,
		LongPollJitter:  req.LongPollJitter,
	}
}

func callJSON(ctx context.Context, call func(context.Context) (proto.Message, error)) (JSON, error) {
	ctx, cancel := context.WithTimeout(ctx, 60*time.Second)
	defer cancel()

	msg, err := call(ctx)
	if err != nil {
		return nil, err
	}
	return protoToJSON(msg)
}

func protoToJSON(msg proto.Message) (JSON, error) {
	data, err := protojson.MarshalOptions{
		EmitUnpopulated: false,
		UseProtoNames:   false,
	}.Marshal(msg)
	if err != nil {
		return nil, err
	}

	var out JSON
	if len(data) == 0 || string(data) == "null" {
		return JSON{}, nil
	}
	if err := json.Unmarshal(data, &out); err != nil {
		return nil, err
	}
	return out, nil
}

func jsonToProto(payload JSON, msg proto.Message) error {
	data, err := json.Marshal(payload)
	if err != nil {
		return err
	}
	return protojson.UnmarshalOptions{
		DiscardUnknown: true,
	}.Unmarshal(data, msg)
}
