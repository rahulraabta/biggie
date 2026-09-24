package main

import (
	"log"
	"net/http"
	"net/http/httputil"
	"net/url"
)

func main() {
	// The target API we are forwarding to
	targetURL := "https://agentrouter.org"
	target, err := url.Parse(targetURL)
	if err != nil {
		log.Fatal("Failed to parse target URL:", err)
	}

	// Create a built-in reverse proxy
	proxy := httputil.NewSingleHostReverseProxy(target)

	// Intercept and modify the request before it goes out
	originalDirector := proxy.Director
	proxy.Director = func(req *http.Request) {
		originalDirector(req)
		// Override Host header for proper SSL routing at the destination.
		// Do NOT set Originator, User-Agent, or Version headers here —
		// those make AgentRouter think this traffic is OpenAI Codex,
		// which loads the wrong toolset (including the problematic
		// "Artifact" tool that breaks DeepSeek's schema validator).
		req.Host = target.Host
	}

	// Start the server
	port := ":8318"
	log.Printf("Proxy running on http://localhost%s\n", port)
	log.Printf("Configure Bifrost Base URL to: http://localhost%s\n", port)
	if err := http.ListenAndServe(port, proxy); err != nil {
		log.Fatal("Server error:", err)
	}
}