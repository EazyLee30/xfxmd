package persistence

import (
	"encoding/base64"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"sync"
	"unicode/utf8"

	"github.com/reearth/ygo/crdt"
	"github.com/reearth/ygo/provider/websocket"
)

// FileStore persists merged Yjs V1 updates per room as files on disk.
type FileStore struct {
	Dir string
	mu  sync.Mutex
	// in-memory merge cache to avoid re-reading disk every StoreUpdate
	cache map[string][]byte
}

const encodedRoomKeyPrefix = "room~"

// NewFileStore creates a FileStore. The directory is created if missing.
func NewFileStore(dir string) (*FileStore, error) {
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return nil, err
	}
	return &FileStore{
		Dir:   dir,
		cache: make(map[string][]byte),
	}, nil
}

func legacyRoomKey(room string) string {
	b := strings.Builder{}
	for _, r := range room {
		switch {
		case r >= 'a' && r <= 'z', r >= 'A' && r <= 'Z', r >= '0' && r <= '9', r == '-', r == '_':
			b.WriteRune(r)
		case r == ' ':
			b.WriteRune('_')
		default:
			// drop other chars (unicode etc.) for safe filenames
		}
	}
	s := b.String()
	if s == "" {
		return "default"
	}
	if len(s) > 200 {
		s = s[:200]
	}
	return s
}

func roomKey(room string) string {
	return encodedRoomKeyPrefix + base64.RawURLEncoding.EncodeToString([]byte(room))
}

func isLegacyCompatibleRoom(room string) bool {
	return room != "" && legacyRoomKey(room) == room
}

func decodeRoomKey(key string) (string, bool) {
	if !strings.HasPrefix(key, encodedRoomKeyPrefix) {
		return "", false
	}
	data, err := base64.RawURLEncoding.DecodeString(strings.TrimPrefix(key, encodedRoomKeyPrefix))
	if err != nil || !utf8.Valid(data) {
		return "", false
	}
	return string(data), true
}

// RoomNameFromDocFilename returns the user-facing room name represented by a
// persisted .yjs filename. Legacy filenames are returned as-is.
func RoomNameFromDocFilename(filename string) (string, bool) {
	if !strings.HasSuffix(filename, ".yjs") {
		return "", false
	}
	key := strings.TrimSuffix(filename, ".yjs")
	if room, ok := decodeRoomKey(key); ok {
		return room, true
	}
	return key, true
}

func docPath(dir, key string) string {
	return filepath.Join(dir, key+".yjs")
}

func deleteMarkerPath(dir, key string) string {
	return filepath.Join(dir, key+".deleted")
}

func writeDeleteMarker(path string, deletedAt int64) error {
	return os.WriteFile(path, []byte(strconv.FormatInt(deletedAt, 10)), 0o644)
}

// LoadDoc implements websocket.PersistenceAdapter.
func (f *FileStore) LoadDoc(room string) ([]byte, error) {
	key := roomKey(room)
	path := docPath(f.Dir, key)

	f.mu.Lock()
	defer f.mu.Unlock()

	if data, ok := f.cache[key]; ok {
		return data, nil
	}

	data, err := os.ReadFile(path)
	if err != nil {
		if os.IsNotExist(err) {
			if !isLegacyCompatibleRoom(room) {
				return nil, nil
			}
			legacyKey := legacyRoomKey(room)
			legacyData, legacyErr := os.ReadFile(docPath(f.Dir, legacyKey))
			if legacyErr != nil {
				if os.IsNotExist(legacyErr) {
					return nil, nil
				}
				return nil, legacyErr
			}
			f.cache[key] = legacyData
			return legacyData, nil
		}
		return nil, err
	}
	f.cache[key] = data
	return data, nil
}

// StoreUpdate implements websocket.PersistenceAdapter.
func (f *FileStore) StoreUpdate(room string, update []byte) error {
	if len(update) == 0 {
		return nil
	}
	key := roomKey(room)
	path := docPath(f.Dir, key)

	f.mu.Lock()
	defer f.mu.Unlock()

	existing := f.cache[key]
	if len(existing) == 0 {
		if b, err := os.ReadFile(path); err == nil {
			existing = b
		} else if !os.IsNotExist(err) {
			return err
		} else if isLegacyCompatibleRoom(room) {
			if b, err := os.ReadFile(docPath(f.Dir, legacyRoomKey(room))); err == nil {
				existing = b
			} else if !os.IsNotExist(err) {
				return err
			}
		}
	}

	var merged []byte
	var err error
	if len(existing) == 0 {
		merged = update
	} else {
		merged, err = crdt.MergeUpdatesV1(existing, update)
		if err != nil {
			return err
		}
	}

	f.cache[key] = merged
	tmp := path + ".tmp"
	if err := os.WriteFile(tmp, merged, 0o644); err != nil {
		return err
	}
	return os.Rename(tmp, path)
}

// DeleteDoc removes persisted state and the in-memory merge cache for a room.
// It also records a reset timestamp so clients can avoid restoring stale local drafts.
func (f *FileStore) DeleteDoc(room string, deletedAt int64) (bool, error) {
	key := roomKey(room)
	path := docPath(f.Dir, key)
	markerPath := deleteMarkerPath(f.Dir, key)

	f.mu.Lock()
	defer f.mu.Unlock()

	delete(f.cache, key)
	_ = os.Remove(path + ".tmp")

	deleted := true
	if err := os.Remove(path); err != nil {
		if os.IsNotExist(err) {
			deleted = false
		} else {
			return false, err
		}
	}

	if !deleted && isLegacyCompatibleRoom(room) {
		legacyKey := legacyRoomKey(room)
		if err := os.Remove(docPath(f.Dir, legacyKey)); err != nil {
			if !os.IsNotExist(err) {
				return false, err
			}
		} else {
			deleted = true
		}
		_ = os.Remove(deleteMarkerPath(f.Dir, legacyKey))
	}

	if err := writeDeleteMarker(markerPath, deletedAt); err != nil {
		return deleted, err
	}
	return deleted, nil
}

// MarkDeleted records a room reset before live peers are disconnected.
func (f *FileStore) MarkDeleted(room string, deletedAt int64) error {
	key := roomKey(room)
	path := deleteMarkerPath(f.Dir, key)

	f.mu.Lock()
	defer f.mu.Unlock()

	return writeDeleteMarker(path, deletedAt)
}

// HasDoc reports whether a room has persisted or cached document state.
func (f *FileStore) HasDoc(room string) (bool, error) {
	key := roomKey(room)
	path := docPath(f.Dir, key)

	f.mu.Lock()
	defer f.mu.Unlock()

	if _, ok := f.cache[key]; ok {
		return true, nil
	}
	if _, err := os.Stat(path); err != nil {
		if os.IsNotExist(err) {
			if !isLegacyCompatibleRoom(room) {
				return false, nil
			}
			if _, legacyErr := os.Stat(docPath(f.Dir, legacyRoomKey(room))); legacyErr != nil {
				if os.IsNotExist(legacyErr) {
					return false, nil
				}
				return false, legacyErr
			}
			return true, nil
		}
		return false, err
	}
	return true, nil
}

// DeletedAt returns the most recent admin reset timestamp in milliseconds.
func (f *FileStore) DeletedAt(room string) (int64, error) {
	key := roomKey(room)
	path := deleteMarkerPath(f.Dir, key)

	f.mu.Lock()
	defer f.mu.Unlock()

	data, err := os.ReadFile(path)
	if err != nil {
		if os.IsNotExist(err) {
			if !isLegacyCompatibleRoom(room) {
				return 0, nil
			}
			legacyData, legacyErr := os.ReadFile(deleteMarkerPath(f.Dir, legacyRoomKey(room)))
			if legacyErr != nil {
				if os.IsNotExist(legacyErr) {
					return 0, nil
				}
				return 0, legacyErr
			}
			data = legacyData
		} else {
			return 0, err
		}
	}
	deletedAt, err := strconv.ParseInt(strings.TrimSpace(string(data)), 10, 64)
	if err != nil {
		return 0, nil
	}
	return deletedAt, nil
}

var _ websocket.PersistenceAdapter = (*FileStore)(nil)
