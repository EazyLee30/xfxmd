package main

import (
	"embed"
	"io/fs"
	"log"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/gin-contrib/gzip"
	"github.com/gin-gonic/gin"
	"github.com/reearth/ygo/provider/websocket"

	"github.com/eazylee/xfxmd/backend/persistence"
	"github.com/eazylee/xfxmd/backend/room"
	"github.com/eazylee/xfxmd/backend/timeline"
)

//go:embed all:static
var staticFS embed.FS

type roomInfoResponse struct {
	Room        string `json:"room"`
	Persistence string `json:"persistence"`
	MaxWS       int    `json:"maxWebsocketConnections"`
}

type timelinePostRequest struct {
	Actor   string `json:"actor"`
	Summary string `json:"summary"`
}

func main() {
	dataDir := os.Getenv("DATA_DIR")
	if dataDir == "" {
		dataDir = "./data"
	}
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	store, err := persistence.NewFileStore(dataDir)
	if err != nil {
		log.Fatalf("persistence: %v", err)
	}

	timelineStore := timeline.NewStore(1000)

	wsSrv := websocket.NewServerWithPersistence(store)
	wsSrv.AllowedOrigins = []string{"*"}
	if m := os.Getenv("MAX_WS_CONNECTIONS"); m != "" {
		if n, err := strconv.Atoi(m); err == nil && n > 0 {
			wsSrv.MaxConnections = n
		}
	} else {
		wsSrv.MaxConnections = 500
	}
	if m := os.Getenv("MAX_PEERS_PER_ROOM"); m != "" {
		if n, err := strconv.Atoi(m); err == nil && n > 0 {
			wsSrv.MaxPeersPerRoom = n
		}
	} else {
		wsSrv.MaxPeersPerRoom = 120
	}

	gin.SetMode(gin.ReleaseMode)
	r := gin.New()
	r.Use(gin.Recovery())
	r.Use(gin.LoggerWithFormatter(func(param gin.LogFormatterParams) string {
		return param.TimeStamp.Format(time.RFC3339) + " " + param.Method + " " + param.Path + " " + strconv.Itoa(param.StatusCode) + " " + param.Latency.String() + "\n"
	}))
	r.Use(gzip.Gzip(gzip.DefaultCompression, gzip.WithExcludedPaths([]string{"/yjs"})))

	r.GET("/healthz", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	r.GET("/api/room/:id/info", func(c *gin.Context) {
		id := room.Normalize(c.Param("id"))
		if !room.IsValid(id) {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid room"})
			return
		}
		c.JSON(http.StatusOK, roomInfoResponse{
			Room:        id,
			Persistence: dataDir,
			MaxWS:       wsSrv.MaxConnections,
		})
	})

	r.POST("/api/room/:id/timeline", func(c *gin.Context) {
		id := room.Normalize(c.Param("id"))
		if !room.IsValid(id) {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid room"})
			return
		}
		var req timelinePostRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid payload"})
			return
		}
		actor := strings.TrimSpace(req.Actor)
		summary := strings.TrimSpace(req.Summary)
		if actor == "" {
			actor = "访客"
		}
		if summary == "" {
			summary = "编辑文档"
		}
		entry := timelineStore.Add(id, actor, summary)
		c.JSON(http.StatusOK, gin.H{"ok": true, "entry": entry})
	})

	r.GET("/api/room/:id/timeline", func(c *gin.Context) {
		id := room.Normalize(c.Param("id"))
		if !room.IsValid(id) {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid room"})
			return
		}
		limit := 50
		if q := c.Query("limit"); q != "" {
			if n, err := strconv.Atoi(q); err == nil && n > 0 && n <= 500 {
				limit = n
			}
		}
		c.JSON(http.StatusOK, gin.H{"items": timelineStore.List(id, limit)})
	})

	r.GET("/yjs/:room", func(c *gin.Context) {
		rm := c.Param("room")
		if rm == "" {
			rm = c.Param("Room")
		}
		req := c.Request.Clone(c.Request.Context())
		req.SetPathValue("room", rm)
		wsSrv.ServeHTTP(c.Writer, req)
	})

	sub, err := fs.Sub(staticFS, "static")
	if err != nil {
		log.Fatalf("static embed: %v", err)
	}
	fileServer := http.FileServer(http.FS(sub))
	r.NoRoute(func(c *gin.Context) {
		if c.Request.Method != http.MethodGet && c.Request.Method != http.MethodHead {
			c.AbortWithStatus(http.StatusMethodNotAllowed)
			return
		}
		path := c.Request.URL.Path
		if strings.HasPrefix(path, "/api") || strings.HasPrefix(path, "/yjs") || strings.HasPrefix(path, "/healthz") {
			c.AbortWithStatus(http.StatusNotFound)
			return
		}
		if !strings.Contains(path, ".") {
			c.Request.URL.Path = "/"
		}
		fileServer.ServeHTTP(c.Writer, c.Request)
	})

	addr := ":" + port
	log.Printf("listening on %s (DATA_DIR=%s)", addr, dataDir)
	if err := r.Run(addr); err != nil {
		log.Fatal(err)
	}
}
