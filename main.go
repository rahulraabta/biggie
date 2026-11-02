package main

import (
    "bytes"
    "encoding/json"
    "io"
    "log"
    "net/http"
    "net/http/httputil"
    "net/url"
    "regexp"
    "strings"
    "time"
)

var serverIDPattern = regexp.MustCompile("^(rs|fc|resp|msg)_")

func main() {
    targetURL := "https://agentrouter.org"
    target, _ := url.Parse(targetURL)

    transport := &http.Transport{
        Proxy:                 http.ProxyFromEnvironment,
        MaxIdleConns:          100,
        MaxIdleConnsPerHost:   100,
        IdleConnTimeout:       90 * time.Second,
        TLSHandshakeTimeout:   10 * time.Second,
        ExpectContinueTimeout: 1 * time.Second,
        DisableCompression:    true, 
    }

    proxy := httputil.NewSingleHostReverseProxy(target)
    proxy.Transport = transport
    proxy.FlushInterval = -1 

    proxy.ErrorHandler = func(w http.ResponseWriter, r *http.Request, err error) {
        log.Printf("❌ Proxy Error: %v", err)
        w.WriteHeader(http.StatusBadGateway)
    }

    originalDirector := proxy.Director
    proxy.Director = func(req *http.Request) {
        originalDirector(req)
        req.Host = target.Host
        req.Header.Set("Originator", "codex_cli_rs")
        req.Header.Set("User-Agent", "codex_cli_rs/0.101.0 (Mac OS 26.0.1; arm64) Apple_Terminal/464")
        req.Header.Set("Version", "0.101.0")
        req.Header.Set("Accept", "text/event-stream")

        if strings.HasPrefix(req.URL.Path, "/v1/") {
            req.URL.Path = "/openai" + req.URL.Path
            log.Printf("🔀 Rewrote path to: %s", req.URL.Path)
        }

        if req.Body != nil {
            bodyBytes, err := io.ReadAll(req.Body)
            if err == nil {
                var bodyMap map[string]interface{}
                if err := json.Unmarshal(bodyBytes, &bodyMap); err == nil {
                    delete(bodyMap, "previous_response_id")
                    delete(bodyMap, "client_metadata")
                    delete(bodyMap, "prompt_cache_key")
                    delete(bodyMap, "include")
                    bodyMap["store"] = false

                    if input, ok := bodyMap["input"].([]interface{}); ok {
                        var newInput []interface{}
                        for _, item := range input {
                            if str, ok := item.(string); ok && serverIDPattern.MatchString(str) { continue }
                            if itemMap, ok := item.(map[string]interface{}); ok {
                                if itemType, _ := itemMap["type"].(string); itemType == "item_reference" { continue }
                                if id, ok := itemMap["id"].(string); ok && serverIDPattern.MatchString(id) { delete(itemMap, "id") }
                                if itemType, _ := itemMap["type"].(string); itemType == "agent_message" || itemType == "agent_reasoning" { continue }
                            }
                            newInput = append(newInput, item)
                        }
                        bodyMap["input"] = newInput
                    }

                    if tools, ok := bodyMap["tools"].([]interface{}); ok {
                        var newTools []interface{}
                        for _, tool := range tools {
                            toolMap, ok := tool.(map[string]interface{})
                            if !ok { continue }
                            toolType, _ := toolMap["type"].(string)
                            if toolType == "namespace" || toolType == "tool_search" { continue }
                            newTools = append(newTools, tool)
                        }
                        bodyMap["tools"] = newTools
                    }

                    newBodyBytes, _ := json.Marshal(bodyMap)
                    req.Body = io.NopCloser(bytes.NewReader(newBodyBytes))
                    req.ContentLength = int64(len(newBodyBytes))
                } else {
                    req.Body = io.NopCloser(bytes.NewReader(bodyBytes))
                }
            }
        }
    }

    port := ":8318"
    log.Printf("🚀 ID-Stripping Proxy running on http://localhost%s", port)
    if err := http.ListenAndServe(port, proxy); err != nil {
        log.Fatal("Server error:", err)
    }
}
