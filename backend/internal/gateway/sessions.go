package gateway

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"net/http"
	"sync"
	"time"

	"sliver-web-client/backend/internal/generated/gatewaypb"

	"connectrpc.com/connect"
	"github.com/bishopfox/sliver/client/assets"
	"github.com/bishopfox/sliver/client/transport"
	"github.com/bishopfox/sliver/protobuf/commonpb"
	"github.com/bishopfox/sliver/protobuf/rpcpb"
	"google.golang.org/grpc"
)

const SessionHeader = "X-Sliver-Session-Id"

var ErrSessionNotFound = errors.New("sliver session not found")

type SliverSession struct {
	ID          string
	Client      rpcpb.SliverRPCClient
	Conn        *grpc.ClientConn
	Operator    string
	Endpoint    string
	ConnectedAt time.Time
	Version     string
}

type SessionStore struct {
	mu       sync.RWMutex
	sessions map[string]*SliverSession
}

func NewSessionStore() *SessionStore {
	return &SessionStore{sessions: map[string]*SliverSession{}}
}

func (s *SessionStore) Create(ctx context.Context, config *gatewaypb.OperatorConfig) (*SliverSession, error) {
	if err := validateConfig(config); err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, err)
	}

	clientConfig := &assets.ClientConfig{
		Operator:      config.Operator,
		Token:         config.Token,
		LHost:         config.Lhost,
		LPort:         int(config.Lport),
		CACertificate: config.CaCertificate,
		PrivateKey:    config.PrivateKey,
		Certificate:   config.Certificate,
	}

	client, conn, err := transport.MTLSConnect(clientConfig)
	if err != nil {
		return nil, connect.NewError(connect.CodeUnavailable, fmt.Errorf("connect to Sliver RPC: %w", err))
	}

	version, err := client.GetVersion(ctx, &commonpb.Empty{})
	if err != nil {
		_ = conn.Close()
		return nil, connect.NewError(connect.CodeUnavailable, fmt.Errorf("validate Sliver RPC connection: %w", err))
	}

	session := &SliverSession{
		ID:          newSessionID(),
		Client:      client,
		Conn:        conn,
		Operator:    config.Operator,
		Endpoint:    fmt.Sprintf("%s:%d", config.Lhost, config.Lport),
		ConnectedAt: time.Now().UTC(),
		Version:     fmt.Sprintf("%d.%d.%d %s", version.GetMajor(), version.GetMinor(), version.GetPatch(), version.GetCommit()),
	}

	s.mu.Lock()
	s.sessions[session.ID] = session
	s.mu.Unlock()

	return session, nil
}

func (s *SessionStore) Get(id string) (*SliverSession, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	session, ok := s.sessions[id]
	if !ok {
		return nil, connect.NewError(connect.CodeUnauthenticated, ErrSessionNotFound)
	}
	return session, nil
}

func (s *SessionStore) Delete(id string) error {
	s.mu.Lock()
	session, ok := s.sessions[id]
	if ok {
		delete(s.sessions, id)
	}
	s.mu.Unlock()

	if !ok {
		return connect.NewError(connect.CodeUnauthenticated, ErrSessionNotFound)
	}
	return session.Conn.Close()
}

func (s *SessionStore) ClientFromHeader(header http.Header) (rpcpb.SliverRPCClient, error) {
	sessionID := header.Get(SessionHeader)
	if sessionID == "" {
		return nil, connect.NewError(connect.CodeUnauthenticated, errors.New("missing "+SessionHeader))
	}
	session, err := s.Get(sessionID)
	if err != nil {
		return nil, err
	}
	return session.Client, nil
}

func ToProtoSession(session *SliverSession) *gatewaypb.Session {
	return &gatewaypb.Session{
		Id:          session.ID,
		Operator:    session.Operator,
		Endpoint:    session.Endpoint,
		ConnectedAt: session.ConnectedAt.Format(time.RFC3339),
		Version:     session.Version,
	}
}

func validateConfig(config *gatewaypb.OperatorConfig) error {
	if config == nil {
		return errors.New("config is required")
	}
	switch {
	case config.Operator == "":
		return errors.New("operator is required")
	case config.Token == "":
		return errors.New("token is required")
	case config.Lhost == "":
		return errors.New("lhost is required")
	case config.Lport == 0:
		return errors.New("lport is required")
	case config.CaCertificate == "":
		return errors.New("ca_certificate is required")
	case config.PrivateKey == "":
		return errors.New("private_key is required")
	case config.Certificate == "":
		return errors.New("certificate is required")
	default:
		return nil
	}
}

func newSessionID() string {
	var bytes [16]byte
	if _, err := rand.Read(bytes[:]); err != nil {
		return fmt.Sprintf("%d", time.Now().UnixNano())
	}
	return hex.EncodeToString(bytes[:])
}
