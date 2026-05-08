package server

import (
	"net/http"
	"os"

	"github.com/dokoola/websocket/internal/controller"
	"github.com/dokoola/websocket/internal/storage"
	"github.com/dokoola/websocket/pkg"
	"go.uber.org/zap"

	"github.com/gorilla/mux"
	"github.com/joho/godotenv"
)

func Run() {
	logger := pkg.Logger("server")

	config := &pkg.GlobalConfig{Logger: logger}

	_ = godotenv.Load()
	r := mux.NewRouter()

	r.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"status":"ok"}`))
	})

	// Storage: Redis if available, otherwise in-memory
	store := storage.NewStorage()
	hub := NewHub(store)
	auth := controller.NewAuthController(store, logger)
	call := controller.NewCallController(store, logger)
	room := controller.NewRoomController(store, logger)

	r.HandleFunc("/ws", WebSocketHandler(hub, auth, call, room, config))

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	logger.Info("INFO Server listening on port %s", zap.String("port", port))
	err := http.ListenAndServe(":"+port, r)
	if err != nil {
		logger.Fatal("FATAL Server error", zap.Error(err))
	}
}
