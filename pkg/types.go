package pkg

// User represents an authenticated user session
// Used for presence, call routing, and room membership

type User struct {
	Name     string `json:"name"`
	Avatar   string `json:"avatar"`
	PublicID string `json:"public_id"`
	SocketID string `json:"socket_id"`
}

// CallData represents a call session between two users
// Used for call events and state

type CallData struct {
	CallerID     string `json:"caller_id"`
	RemoteID     string `json:"remote_id"`
	CallType     string `json:"call_type"` // "audio" or "video"
	RoomID       string `json:"room_id"`
	Caller       User   `json:"caller"`
	RemoteUser   User   `json:"remote_user"`
	RemotePeerId string `json:"remotePeerId"` // add this
}

// Room represents a chat room

type Room struct {
	RoomID  string `json:"room_id"`
	Members []User `json:"members"`
	// Messages omitted for brevity
}

type MessageAttachment struct {
	ID         string `json:"id"`
	MessagePK  string `json:"message_pk"`
	FileURL    string `json:"file_url"`
	UploadedAt string `json:"uploaded_at"`
}

type Message struct {
	ID              int                 `json:"id"`
	SenderID        string              `json:"sender_id"`
	RecipientID     string              `json:"recipient_id,omitempty"`
	Recipient       User                `json:"recipient,omitempty"`
	Content         string              `json:"content"`
	IsRead          bool                `json:"is_read,omitempty"`
	IsSeen          bool                `json:"is_seen,omitempty"`
	IsValid         bool                `json:"is_valid,omitempty"`
	IsReply         bool                `json:"is_reply,omitempty"`
	IsEdited        bool                `json:"is_edited,omitempty"`
	IsDeleted       bool                `json:"is_deleted,omitempty"`
	IsDelivered     bool                `json:"is_delivered,omitempty"`
	ThreadUniqueID  string              `json:"thread_unique_id"`
	ParentMessageID string              `json:"parent_message_id,omitempty"`
	CreatedAt       string              `json:"created_at"`
	UpdatedAt       string              `json:"updated_at,omitempty"`
	Attachments     []MessageAttachment `json:"attachments,omitempty"`
}
