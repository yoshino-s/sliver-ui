package main

import (
	"context"
	"encoding/json"
	"flag"
	"fmt"
	"io/fs"
	"log"
	"net/http"
	"os"
	"os/signal"
	"path/filepath"
	"strings"
	"syscall"
	"time"

	"sliver-web-client/backend/internal/gateway"
	"sliver-web-client/backend/internal/generated/connect/gatewaypb/gatewaypbconnect"
	"sliver-web-client/backend/internal/generated/connect/rpcpb/rpcpbconnect"
	"sliver-web-client/backend/internal/generated/gatewaypb"
	"sliver-web-client/backend/internal/web"
)

func main() {
	addr := flag.String("addr", envOrDefault("SLIVER_GATEWAY_ADDR", ":8080"), "HTTP listen address")
	configPath := flag.String("config", os.Getenv("SLIVER_CONFIG_PATH"), "Sliver operator config path")
	staticDir := flag.String("static", os.Getenv("SLIVER_WEB_STATIC"), "Static web directory; uses embedded frontend when empty")
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
	} else if embedded, err := web.StaticFS(); err == nil {
		registerStaticFS(mux, embedded)
	} else {
		log.Printf("embedded frontend unavailable: %v", err)
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
	registerStaticFS(mux, os.DirFS(dir))
}

func registerStaticFS(mux *http.ServeMux, staticFS fs.FS) {
	fileServer := http.FileServer(http.FS(staticFS))
	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		path := filepath.Clean(r.URL.Path)
		if path == "." || path == "/" {
			serveIndex(w, r, staticFS)
			return
		}

		filePath := strings.TrimPrefix(path, "/")
		if info, err := fs.Stat(staticFS, filePath); err == nil && !info.IsDir() {
			fileServer.ServeHTTP(w, r)
			return
		}

		serveIndex(w, r, staticFS)
	})
}

func serveIndex(w http.ResponseWriter, r *http.Request, staticFS fs.FS) {
	index, err := fs.ReadFile(staticFS, "index.html")
	if err != nil {
		http.NotFound(w, r)
		return
	}
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	_, _ = w.Write(index)
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
