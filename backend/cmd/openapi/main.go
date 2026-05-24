package main

import (
	"encoding/json"
	"log"
	"os"

	"sliver-web-client/backend/internal/api"
	"sliver-web-client/backend/internal/sliver"
)

func main() {
	_, spec := api.NewHTTPHandler(sliver.NewGateway(), "")
	encoder := json.NewEncoder(os.Stdout)
	encoder.SetIndent("", "  ")
	if err := encoder.Encode(spec.OpenAPI()); err != nil {
		log.Fatalf("write OpenAPI spec: %v", err)
	}
}
