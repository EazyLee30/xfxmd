package main

import (
	"embed"
	"errors"
	"io/fs"
	"log"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/gin-contrib/gzip"
	"github.com/gin-gonic/gin"
	"github.com/reearth/ygo/crdt"
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
	DeletedAt   int64  `json:"deletedAt,omitempty"`
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
		deletedAt, err := store.DeletedAt(id)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, roomInfoResponse{
			Room:        id,
			Persistence: dataDir,
			MaxWS:       wsSrv.MaxConnections,
			DeletedAt:   deletedAt,
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

	// Admin routes - protected by password
	adminPassword := os.Getenv("ADMIN_PASSWORD")
	if adminPassword == "" {
		adminPassword = "admin123"
	}

	adminAuth := func(c *gin.Context) {
		token := c.GetHeader("X-Admin-Token")
		if token == "" {
			token = c.Query("token")
		}
		if token != adminPassword {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
			c.Abort()
			return
		}
		c.Next()
	}

	admin := r.Group("/api/admin", adminAuth)
	{
		admin.GET("/rooms", func(c *gin.Context) {
			entries, err := os.ReadDir(store.Dir)
			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
				return
			}
			var rooms []gin.H
			for _, e := range entries {
				if e.IsDir() || !strings.HasSuffix(e.Name(), ".yjs") {
					continue
				}
				name := strings.TrimSuffix(e.Name(), ".yjs")
				info, _ := e.Info()
				size := int64(0)
				if info != nil {
					size = info.Size()
				}
				rooms = append(rooms, gin.H{"name": name, "size": size})
			}
			c.JSON(http.StatusOK, gin.H{"rooms": rooms})
		})

		admin.GET("/rooms/:id", func(c *gin.Context) {
			id := c.Param("id")
			data, err := store.LoadDoc(id)
			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
				return
			}
			if data == nil {
				c.JSON(http.StatusNotFound, gin.H{"error": "room not found"})
				return
			}
			c.Data(http.StatusOK, "application/octet-stream", data)
		})

		admin.DELETE("/rooms/:id", func(c *gin.Context) {
			id := c.Param("id")
			key := room.Normalize(id)
			if !room.IsValid(key) {
				c.JSON(http.StatusBadRequest, gin.H{"error": "invalid room"})
				return
			}

			hasLiveRoom := wsSrv.GetDoc(key) != nil
			hasStoredDoc, err := store.HasDoc(key)
			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
				return
			}
			if !hasLiveRoom && !hasStoredDoc {
				c.JSON(http.StatusNotFound, gin.H{"error": "room not found"})
				return
			}

			deletedAt := time.Now().UnixMilli()
			if err := store.MarkDeleted(key, deletedAt); err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
				return
			}

			if hasLiveRoom {
				err := wsSrv.Apply(c.Request.Context(), key, func(doc *crdt.Doc, transact func(func(*crdt.Transaction))) {
					txt := doc.GetText("markdown")
					if txt.Len() == 0 {
						return
					}
					transact(func(txn *crdt.Transaction) {
						txt.Delete(txn, 0, txt.Len())
					})
				})
				if err != nil && !errors.Is(err, websocket.ErrNoChanges) && !errors.Is(err, websocket.ErrRoomNotFound) {
					c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
					return
				}

				if err := wsSrv.CloseRoom(key, true); err != nil && !errors.Is(err, websocket.ErrRoomNotFound) {
					c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
					return
				}
			}

			if _, err := store.DeleteDoc(key, deletedAt); err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
				return
			}
			c.JSON(http.StatusOK, gin.H{"ok": true, "deleted": key, "deletedAt": deletedAt})
		})
	}

	r.GET("/yjs/:room", func(c *gin.Context) {
		rm := c.Param("room")
		if rm == "" {
			rm = c.Param("Room")
		}
		deletedAt, err := store.DeletedAt(rm)
		if err != nil {
			c.AbortWithStatus(http.StatusInternalServerError)
			return
		}
		resetAt, _ := strconv.ParseInt(c.Query("resetAt"), 10, 64)
		if deletedAt > 0 && resetAt < deletedAt {
			c.AbortWithStatus(http.StatusConflict)
			return
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
