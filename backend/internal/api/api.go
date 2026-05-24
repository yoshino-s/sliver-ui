package api

import (
	"context"
	"errors"
	"net/http"
	"os"
	"path/filepath"

	"sliver-web-client/backend/internal/sliver"

	"github.com/danielgtaylor/huma/v2"
	"github.com/danielgtaylor/huma/v2/adapters/humago"
)

type Server struct {
	Gateway *sliver.Gateway
}

type ConnectInput struct {
	Body sliver.OperatorConfig `json:"body"`
}

type ConnectFileInput struct {
	Body struct {
		Path string `json:"path" doc:"Path to a Sliver operator config file on the gateway host"`
	}
}

type ConnectOutput struct {
	Body sliver.ConnectResult
}

type StatusOutput struct {
	Body sliver.Status
}

type JSONOutput struct {
	Body sliver.JSON
}

type MessageOutput struct {
	Body struct {
		Message string `json:"message"`
	}
}

type KillJobInput struct {
	ID uint32 `path:"id" doc:"Sliver job ID"`
}

type DeleteNamedInput struct {
	Name string `path:"name" doc:"Resource name"`
}

type ListenerInput struct {
	Body sliver.ListenerRequest
}

type SessionCommandInput struct {
	Body sliver.SessionCommandRequest
}

type RawRPCInput struct {
	Method string      `path:"method" doc:"Supported raw RPC method"`
	Body   sliver.JSON `json:"body"`
}

type JSONBodyInput struct {
	Body sliver.JSON `json:"body"`
}

func NewHTTPHandler(gateway *sliver.Gateway, staticDir string) (http.Handler, huma.API) {
	mux := http.NewServeMux()
	config := huma.DefaultConfig("Sliver Web Gateway", "0.1.0")
	config.Info.Description = "Browser-safe HTTP API that forwards requests to a Sliver server over mTLS gRPC."
	config.Servers = []*huma.Server{{URL: "http://localhost:8080", Description: "Local gateway"}}

	api := humago.New(mux, config)
	server := &Server{Gateway: gateway}
	server.Register(api)
	if staticDir != "" {
		registerStatic(mux, staticDir)
	}

	return withCORS(mux), api
}

func (s *Server) Register(api huma.API) {
	huma.Get(api, "/api/status", s.status)
	huma.Post(api, "/api/connect", s.connect)
	huma.Post(api, "/api/connect/file", s.connectFromFile)
	huma.Post(api, "/api/disconnect", s.disconnect)

	huma.Get(api, "/api/version", s.version)
	huma.Get(api, "/api/operators", s.operators)
	huma.Get(api, "/api/sessions", s.sessions)
	huma.Get(api, "/api/beacons", s.beacons)
	huma.Get(api, "/api/jobs", s.jobs)
	huma.Delete(api, "/api/jobs/{id}", s.killJob)

	huma.Get(api, "/api/listeners/jobs", s.jobs)
	huma.Post(api, "/api/listeners", s.startListener)

	huma.Get(api, "/api/loot", s.loot)
	huma.Post(api, "/api/loot/content", s.lootContent)

	huma.Get(api, "/api/implants/builds", s.implantBuilds)
	huma.Get(api, "/api/implants/profiles", s.implantProfiles)
	huma.Delete(api, "/api/implants/builds/{name}", s.deleteImplantBuild)
	huma.Delete(api, "/api/implants/profiles/{name}", s.deleteImplantProfile)
	huma.Post(api, "/api/implants/profiles", s.saveImplantProfile)
	huma.Post(api, "/api/implants/generate", s.generateImplant)

	huma.Post(api, "/api/session-command", s.sessionCommand)
	huma.Post(api, "/api/rpc/{method}", s.rawRPC)
}

func (s *Server) status(_ context.Context, _ *struct{}) (*StatusOutput, error) {
	return &StatusOutput{Body: s.Gateway.Status()}, nil
}

func (s *Server) connect(ctx context.Context, input *ConnectInput) (*ConnectOutput, error) {
	result, err := s.Gateway.Connect(ctx, input.Body)
	if err != nil {
		return nil, apiError(err)
	}
	return &ConnectOutput{Body: *result}, nil
}

func (s *Server) connectFromFile(ctx context.Context, input *ConnectFileInput) (*ConnectOutput, error) {
	result, err := s.Gateway.ConnectFromFile(ctx, input.Body.Path)
	if err != nil {
		return nil, apiError(err)
	}
	return &ConnectOutput{Body: *result}, nil
}

func (s *Server) disconnect(_ context.Context, _ *struct{}) (*MessageOutput, error) {
	s.Gateway.Disconnect()
	return message("disconnected"), nil
}

func (s *Server) version(ctx context.Context, _ *struct{}) (*JSONOutput, error) {
	return jsonOutput(s.Gateway.Version(ctx))
}

func (s *Server) operators(ctx context.Context, _ *struct{}) (*JSONOutput, error) {
	return jsonOutput(s.Gateway.Operators(ctx))
}

func (s *Server) sessions(ctx context.Context, _ *struct{}) (*JSONOutput, error) {
	return jsonOutput(s.Gateway.Sessions(ctx))
}

func (s *Server) beacons(ctx context.Context, _ *struct{}) (*JSONOutput, error) {
	return jsonOutput(s.Gateway.Beacons(ctx))
}

func (s *Server) jobs(ctx context.Context, _ *struct{}) (*JSONOutput, error) {
	return jsonOutput(s.Gateway.Jobs(ctx))
}

func (s *Server) killJob(ctx context.Context, input *KillJobInput) (*JSONOutput, error) {
	return jsonOutput(s.Gateway.KillJob(ctx, input.ID))
}

func (s *Server) startListener(ctx context.Context, input *ListenerInput) (*JSONOutput, error) {
	return jsonOutput(s.Gateway.StartListener(ctx, input.Body))
}

func (s *Server) loot(ctx context.Context, _ *struct{}) (*JSONOutput, error) {
	return jsonOutput(s.Gateway.Loot(ctx))
}

func (s *Server) lootContent(ctx context.Context, input *JSONBodyInput) (*JSONOutput, error) {
	return jsonOutput(s.Gateway.LootContent(ctx, input.Body))
}

func (s *Server) implantBuilds(ctx context.Context, _ *struct{}) (*JSONOutput, error) {
	return jsonOutput(s.Gateway.ImplantBuilds(ctx))
}

func (s *Server) implantProfiles(ctx context.Context, _ *struct{}) (*JSONOutput, error) {
	return jsonOutput(s.Gateway.ImplantProfiles(ctx))
}

func (s *Server) deleteImplantBuild(ctx context.Context, input *DeleteNamedInput) (*MessageOutput, error) {
	if err := s.Gateway.DeleteImplantBuild(ctx, input.Name); err != nil {
		return nil, apiError(err)
	}
	return message("implant build deleted"), nil
}

func (s *Server) deleteImplantProfile(ctx context.Context, input *DeleteNamedInput) (*MessageOutput, error) {
	if err := s.Gateway.DeleteImplantProfile(ctx, input.Name); err != nil {
		return nil, apiError(err)
	}
	return message("implant profile deleted"), nil
}

func (s *Server) saveImplantProfile(ctx context.Context, input *JSONBodyInput) (*JSONOutput, error) {
	return jsonOutput(s.Gateway.SaveImplantProfile(ctx, input.Body))
}

func (s *Server) generateImplant(ctx context.Context, input *JSONBodyInput) (*JSONOutput, error) {
	return jsonOutput(s.Gateway.GenerateImplant(ctx, input.Body))
}

func (s *Server) sessionCommand(ctx context.Context, input *SessionCommandInput) (*JSONOutput, error) {
	return jsonOutput(s.Gateway.SessionCommand(ctx, input.Body))
}

func (s *Server) rawRPC(ctx context.Context, input *RawRPCInput) (*JSONOutput, error) {
	return jsonOutput(s.Gateway.RawRPC(ctx, input.Method, input.Body))
}

func jsonOutput(data sliver.JSON, err error) (*JSONOutput, error) {
	if err != nil {
		return nil, apiError(err)
	}
	return &JSONOutput{Body: data}, nil
}

func message(text string) *MessageOutput {
	output := &MessageOutput{}
	output.Body.Message = text
	return output
}

func apiError(err error) error {
	if errors.Is(err, sliver.ErrNotConnected) {
		return huma.Error503ServiceUnavailable("Sliver gateway is not connected", err)
	}
	return huma.Error400BadRequest(err.Error(), err)
}

func withCORS(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET,POST,DELETE,OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type,Authorization")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func registerStatic(mux *http.ServeMux, dir string) {
	fileServer := http.FileServer(http.Dir(dir))
	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		path := filepath.Clean(r.URL.Path)
		if path == "." || path == "/" {
			http.ServeFile(w, r, filepath.Join(dir, "index.html"))
			return
		}

		fullPath := filepath.Join(dir, path)
		if info, err := os.Stat(fullPath); err == nil && !info.IsDir() {
			fileServer.ServeHTTP(w, r)
			return
		}

		http.ServeFile(w, r, filepath.Join(dir, "index.html"))
	})
}
