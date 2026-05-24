package gateway

import (
	"context"

	"sliver-web-client/backend/internal/generated/gatewaypb"

	"connectrpc.com/connect"
)

type SessionService struct {
	store *SessionStore
}

func NewSessionService(store *SessionStore) *SessionService {
	return &SessionService{store: store}
}

func (s *SessionService) CreateSession(ctx context.Context, req *connect.Request[gatewaypb.CreateSessionRequest]) (*connect.Response[gatewaypb.Session], error) {
	session, err := s.store.Create(ctx, req.Msg.Config)
	if err != nil {
		return nil, err
	}
	return connect.NewResponse(ToProtoSession(session)), nil
}

func (s *SessionService) GetSession(_ context.Context, req *connect.Request[gatewaypb.GetSessionRequest]) (*connect.Response[gatewaypb.Session], error) {
	session, err := s.store.Get(req.Msg.Id)
	if err != nil {
		return nil, err
	}
	return connect.NewResponse(ToProtoSession(session)), nil
}

func (s *SessionService) DeleteSession(_ context.Context, req *connect.Request[gatewaypb.DeleteSessionRequest]) (*connect.Response[gatewaypb.DeleteSessionResponse], error) {
	if err := s.store.Delete(req.Msg.Id); err != nil {
		return nil, err
	}
	return connect.NewResponse(&gatewaypb.DeleteSessionResponse{}), nil
}
