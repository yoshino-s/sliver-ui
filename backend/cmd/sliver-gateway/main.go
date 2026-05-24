package main

import (
	"context"
	"encoding/json"
	"flag"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"path/filepath"
	"syscall"
	"time"

	"sliver-web-client/backend/internal/gateway"
	"sliver-web-client/backend/internal/generated/connect/gatewaypb/gatewaypbconnect"
	"sliver-web-client/backend/internal/generated/connect/rpcpb/rpcpbconnect"
	"sliver-web-client/backend/internal/generated/gatewaypb"
)

func main() {
	addr := flag.String("addr", envOrDefault("SLIVER_GATEWAY_ADDR", ":8080"), "HTTP listen address")
	configPath := flag.String("config", os.Getenv("SLIVER_CONFIG_PATH"), "Sliver operator config path")
	staticDir := flag.String("static", envOrDefault("SLIVER_WEB_STATIC", "../dist"), "Static web directory")
	flag.Parse()

	store := gateway.NewSessionStore()
	if *configPath != "" {
		ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
		config, err := readConfig(*configPath)
		if err != nil {
			log.Printf("initial Sliver config read failed: %v", err)
		} else if session, err := store.Create(ctx, config); err != nil {
			log.Printf("initial Sliver connection failed: %v", err)
		} else {
			log.Printf("initial Sliver session %s connected to %s", session.ID, session.Endpoint)
		}
		cancel()
	}

	handler := newHTTPHandler(store, *staticDir)
	server := &http.Server{
		Addr:              *addr,
		Handler:           handler,
		ReadHeaderTimeout: 10 * time.Second,
	}

	go func() {
		log.Printf("sliver web gateway listening on %s", *addr)
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("gateway failed: %v", err)
		}
	}()

	stop := make(chan os.Signal, 1)
	signal.Notify(stop, syscall.SIGINT, syscall.SIGTERM)
	<-stop

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := server.Shutdown(ctx); err != nil {
		log.Printf("gateway shutdown failed: %v", err)
	}
}

func newHTTPHandler(store *gateway.SessionStore, staticDir string) http.Handler {
	mux := http.NewServeMux()

	sessionPath, sessionHandler := gatewaypbconnect.NewGatewaySessionServiceHandler(gateway.NewSessionService(store))
	mux.Handle(sessionPath, sessionHandler)

	sliverPath, sliverHandler := rpcpbconnect.NewSliverRPCHandler(gateway.NewSliverRPCProxy(store))
	mux.Handle(sliverPath, sliverHandler)

	if staticDir != "" {
		registerStatic(mux, staticDir)
	}

	return withCORS(mux)
}

func readConfig(path string) (*gatewaypb.OperatorConfig, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}
	config := &gatewaypb.OperatorConfig{}
	if err := json.Unmarshal(data, config); err != nil {
		return nil, err
	}
	return config, nil
}

func withCORS(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET,POST,OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type,Connect-Protocol-Version,Connect-Timeout-Ms,"+gateway.SessionHeader)
		w.Header().Set("Access-Control-Expose-Headers", "Connect-Protocol-Version,Connect-Timeout-Ms")
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

func envOrDefault(name string, fallback string) string {
	if value := os.Getenv(name); value != "" {
		return value
	}
	return fallback
}

func init() {
	flag.Usage = func() {
		fmt.Fprintf(flag.CommandLine.Output(), "Usage: sliver-gateway [options]\n\n")
		flag.PrintDefaults()
	}
}
