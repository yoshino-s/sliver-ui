SHELL := /bin/bash

APP_NAME := sliver-ui
BACKEND_BIN := bin/sliver-gateway
BACKEND_PKG := ./cmd/sliver-gateway
BACKEND_DIR := backend
NPM := npm
GO := go

GO_BIN := $(shell $(GO) env GOPATH)/bin
export PATH := $(PATH):$(GO_BIN):$(CURDIR)/node_modules/.bin

.PHONY: help install generate generate-rpc build build-frontend build-backend test test-backend check dev dev-backend dev-full preview clean

help:
	@echo "$(APP_NAME) build targets"
	@echo ""
	@echo "  make install        Install frontend dependencies and tidy backend modules"
	@echo "  make generate       Generate Connect RPC code from proto files"
	@echo "  make build          Generate code, build frontend, and build backend binary"
	@echo "  make build-frontend Build Vite frontend"
	@echo "  make build-backend  Build Go gateway binary at $(BACKEND_BIN)"
	@echo "  make test           Run frontend/backend checks"
	@echo "  make check          Full validation: generate + frontend build + backend tests"
	@echo "  make dev            Start frontend dev server"
	@echo "  make dev-backend    Start Go gateway"
	@echo "  make dev-full       Build frontend and serve it from the Go gateway"
	@echo "  make preview        Preview production frontend build"
	@echo "  make clean          Remove build artifacts"

install:
	$(NPM) install
	cd $(BACKEND_DIR) && $(GO) mod tidy

generate: generate-rpc

generate-rpc:
	$(NPM) run generate:rpc

build: generate-rpc build-frontend build-backend

build-frontend:
	$(NPM) run build

build-backend:
	mkdir -p bin
	cd $(BACKEND_DIR) && $(GO) build -o ../$(BACKEND_BIN) $(BACKEND_PKG)

test: check

test-backend:
	cd $(BACKEND_DIR) && $(GO) test ./...

check:
	$(NPM) run check

dev:
	$(NPM) run dev

dev-backend:
	$(NPM) run dev:backend

dev-full:
	$(NPM) run dev:full

preview:
	$(NPM) run preview

clean:
	rm -rf dist bin
	rm -f $(BACKEND_DIR)/sliver-gateway
