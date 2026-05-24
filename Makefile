SHELL := /bin/bash

APP_NAME := sliver-ui
BACKEND_BIN := bin/sliver-gateway
BACKEND_PKG := ./cmd/sliver-gateway
BACKEND_DIR := backend
EMBED_DIST := $(BACKEND_DIR)/internal/web/dist
PNPM := pnpm
GO := go
AIR := air

GO_BIN := $(shell $(GO) env GOPATH)/bin
export PATH := $(PATH):$(GO_BIN):$(CURDIR)/node_modules/.bin

.PHONY: help install install-tools install-air generate generate-rpc embed-frontend build release build-frontend build-backend test test-backend check debug dev dev-backend dev-full preview clean

help:
	@echo "$(APP_NAME) build targets"
	@echo ""
	@echo "  make install        Install frontend dependencies and tidy backend modules"
	@echo "  make install-tools  Install Go development tools"
	@echo "  make generate       Generate Connect RPC code from proto files"
	@echo "  make build          Alias for make release"
	@echo "  make release        Build frontend, embed it, and build final gateway binary"
	@echo "  make build-frontend Build Vite frontend"
	@echo "  make build-backend  Build Go gateway binary at $(BACKEND_BIN)"
	@echo "  make test           Run frontend/backend checks"
	@echo "  make check          Full validation: generate + frontend build + backend tests"
	@echo "  make debug          Run Go gateway with air hot reload"
	@echo "  make dev            Start frontend dev server"
	@echo "  make dev-backend    Start Go gateway with air hot reload"
	@echo "  make dev-full       Build frontend and serve it from the Go gateway"
	@echo "  make preview        Preview production frontend build"
	@echo "  make clean          Remove build artifacts"

install:
	$(PNPM) install
	cd $(BACKEND_DIR) && $(GO) mod tidy

install-tools: install-air

install-air:
	@command -v $(AIR) >/dev/null 2>&1 || $(GO) install github.com/air-verse/air@latest

generate: generate-rpc

generate-rpc:
	$(PNPM) run generate:rpc

embed-frontend: build-frontend
	mkdir -p $(EMBED_DIST)
	$(SHELL) -O extglob -c 'rm -rf $(EMBED_DIST)/!(.gitkeep|placeholder.txt)'
	cp -R dist/. $(EMBED_DIST)/

build: release

release: generate-rpc embed-frontend build-backend

build-frontend:
	$(PNPM) run build

build-backend:
	mkdir -p bin
	cd $(BACKEND_DIR) && $(GO) build -o ../$(BACKEND_BIN) $(BACKEND_PKG)

test: check

test-backend:
	cd $(BACKEND_DIR) && $(GO) test ./...

check:
	$(PNPM) run check

debug: dev-backend

dev:
	$(PNPM) run dev

dev-backend: install-air
	$(PNPM) run dev:backend

dev-full:
	$(PNPM) run dev:full

preview:
	$(PNPM) run preview

clean:
	rm -rf dist bin tmp
	$(SHELL) -O extglob -c 'rm -rf $(EMBED_DIST)/!(.gitkeep|placeholder.txt)'
	rm -f $(BACKEND_DIR)/sliver-gateway
