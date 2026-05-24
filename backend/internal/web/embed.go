package web

import (
	"embed"
	"io/fs"
)

//go:embed dist
var embedded embed.FS

func StaticFS() (fs.FS, error) {
	return fs.Sub(embedded, "dist")
}
