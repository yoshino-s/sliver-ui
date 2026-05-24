package main

import (
	"context"
	"flag"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"sliver-web-client/backend/internal/api"
	"sliver-web-client/backend/internal/sliver"
)

func main() {
	addr := flag.String("addr", envOrDefault("SLIVER_GATEWAY_ADDR", ":8080"), "HTTP listen address")
	configPath := flag.String("config", os.Getenv("SLIVER_CONFIG_PATH"), "Sliver operator config path")
	staticDir := flag.String("static", envOrDefault("SLIVER_WEB_STATIC", "../dist"), "Static web directory")
	flag.Parse()

	gateway := sliver.NewGateway()
	if *configPath != "" {
		ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
		if _, err := gateway.ConnectFromFile(ctx, *configPath); err != nil {
			log.Printf("initial Sliver connection failed: %v", err)
		}
		cancel()
	}

	handler, _ := api.NewHTTPHandler(gateway, *staticDir)
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
	gateway.Disconnect()
	if err := server.Shutdown(ctx); err != nil {
		log.Printf("gateway shutdown failed: %v", err)
	}
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
