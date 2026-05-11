package persistence

import (
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"sync"

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

func sanitizeRoom(room string) string {
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
	key := sanitizeRoom(room)
	path := docPath(f.Dir, key)

	f.mu.Lock()
	defer f.mu.Unlock()

	if data, ok := f.cache[key]; ok {
		return data, nil
	}

	data, err := os.ReadFile(path)
	if err != nil {
		if os.IsNotExist(err) {
			return nil, nil
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
	key := sanitizeRoom(room)
	path := docPath(f.Dir, key)

	f.mu.Lock()
	defer f.mu.Unlock()

	existing := f.cache[key]
	if len(existing) == 0 {
		if b, err := os.ReadFile(path); err == nil {
			existing = b
		} else if !os.IsNotExist(err) {
			return err
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
	key := sanitizeRoom(room)
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

	if err := writeDeleteMarker(markerPath, deletedAt); err != nil {
		return deleted, err
	}
	return deleted, nil
}

// MarkDeleted records a room reset before live peers are disconnected.
func (f *FileStore) MarkDeleted(room string, deletedAt int64) error {
	key := sanitizeRoom(room)
	path := deleteMarkerPath(f.Dir, key)

	f.mu.Lock()
	defer f.mu.Unlock()

	return writeDeleteMarker(path, deletedAt)
}

// HasDoc reports whether a room has persisted or cached document state.
func (f *FileStore) HasDoc(room string) (bool, error) {
	key := sanitizeRoom(room)
	path := docPath(f.Dir, key)

	f.mu.Lock()
	defer f.mu.Unlock()

	if _, ok := f.cache[key]; ok {
		return true, nil
	}
	if _, err := os.Stat(path); err != nil {
		if os.IsNotExist(err) {
			return false, nil
		}
		return false, err
	}
	return true, nil
}

// DeletedAt returns the most recent admin reset timestamp in milliseconds.
func (f *FileStore) DeletedAt(room string) (int64, error) {
	key := sanitizeRoom(room)
	path := deleteMarkerPath(f.Dir, key)

	f.mu.Lock()
	defer f.mu.Unlock()

	data, err := os.ReadFile(path)
	if err != nil {
		if os.IsNotExist(err) {
			return 0, nil
		}
		return 0, err
	}
	deletedAt, err := strconv.ParseInt(strings.TrimSpace(string(data)), 10, 64)
	if err != nil {
		return 0, nil
	}
	return deletedAt, nil
}

var _ websocket.PersistenceAdapter = (*FileStore)(nil)
