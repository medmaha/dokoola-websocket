package pkg

// User represents an authenticated user session
// Used for presence, call routing, and room membership

type User struct {
	PublicID string `json:"public_id"`
	Name     string `json:"name"`
	Avatar   string `json:"avatar"`
	SocketID string `json:"socket_id"`
}

// CallData represents a call session between two users
// Used for call events and state

type CallData struct {
	CallerID   string `json:"caller_id"`
	RemoteID   string `json:"remote_id"`
	CallType   string `json:"call_type"` // "audio" or "video"
	RoomID     string `json:"room_id"`
}

// Room represents a chat room

type Room struct {
	RoomID  string  `json:"room_id"`
	Members []User  `json:"members"`
	// Messages omitted for brevity
}
