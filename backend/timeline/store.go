package timeline

import (
	"sort"
	"sync"
	"time"
)

type Entry struct {
	ID        int64  `json:"id"`
	Room      string `json:"room"`
	Actor     string `json:"actor"`
	Summary   string `json:"summary"`
	CreatedAt string `json:"createdAt"`
}

type Store struct {
	mu      sync.Mutex
	nextID  int64
	byRoom  map[string][]Entry
	maxKeep int
}

func NewStore(maxKeep int) *Store {
	if maxKeep <= 0 {
		maxKeep = 500
	}
	return &Store{
		nextID:  1,
		byRoom:  make(map[string][]Entry),
		maxKeep: maxKeep,
	}
}

func (s *Store) Add(room, actor, summary string) Entry {
	s.mu.Lock()
	defer s.mu.Unlock()

	e := Entry{
		ID:        s.nextID,
		Room:      room,
		Actor:     actor,
		Summary:   summary,
		CreatedAt: time.Now().Format(time.RFC3339),
	}
	s.nextID++

	list := append(s.byRoom[room], e)
	if len(list) > s.maxKeep {
		list = list[len(list)-s.maxKeep:]
	}
	s.byRoom[room] = list
	return e
}

func (s *Store) List(room string, limit int) []Entry {
	s.mu.Lock()
	defer s.mu.Unlock()

	list := s.byRoom[room]
	if len(list) == 0 {
		return nil
	}
	out := make([]Entry, len(list))
	copy(out, list)
	if limit > 0 && len(out) > limit {
		out = out[len(out)-limit:]
	}
	sort.Slice(out, func(i, j int) bool { return out[i].ID > out[j].ID })
	return out
}
