package persistence

import (
	"os"
	"path/filepath"
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

// LoadDoc implements websocket.PersistenceAdapter.
func (f *FileStore) LoadDoc(room string) ([]byte, error) {
	key := sanitizeRoom(room)
	path := filepath.Join(f.Dir, key+".yjs")

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
	path := filepath.Join(f.Dir, key+".yjs")

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

var _ websocket.PersistenceAdapter = (*FileStore)(nil)
