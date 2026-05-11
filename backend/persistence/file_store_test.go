package persistence

import (
	"os"
	"path/filepath"
	"testing"

	"github.com/reearth/ygo/crdt"
)

func updateForMarkdown(t *testing.T, text string) []byte {
	t.Helper()

	doc := crdt.New()
	ytext := doc.GetText("markdown")
	doc.Transact(func(txn *crdt.Transaction) {
		ytext.Insert(txn, 0, text, nil)
	})
	return crdt.EncodeStateAsUpdateV1(doc, nil)
}

func markdownFromUpdate(t *testing.T, update []byte) string {
	t.Helper()

	doc := crdt.New()
	if len(update) > 0 {
		if err := crdt.ApplyUpdateV1(doc, update, nil); err != nil {
			t.Fatalf("apply update: %v", err)
		}
	}
	return doc.GetText("markdown").ToString()
}

func TestFileStoreDoesNotShareUnicodeRoomPersistence(t *testing.T) {
	store, err := NewFileStore(t.TempDir())
	if err != nil {
		t.Fatalf("new store: %v", err)
	}

	if err := store.StoreUpdate("课堂甲", updateForMarkdown(t, "from room A")); err != nil {
		t.Fatalf("store room A: %v", err)
	}

	roomA, err := store.LoadDoc("课堂甲")
	if err != nil {
		t.Fatalf("load room A: %v", err)
	}
	if got := markdownFromUpdate(t, roomA); got != "from room A" {
		t.Fatalf("room A text = %q, want %q", got, "from room A")
	}

	roomB, err := store.LoadDoc("课堂乙")
	if err != nil {
		t.Fatalf("load room B: %v", err)
	}
	if got := markdownFromUpdate(t, roomB); got != "" {
		t.Fatalf("room B text = %q, want empty", got)
	}
}

func TestFileStoreOnlyUsesLegacyFallbackForExactLegacyRooms(t *testing.T) {
	dir := t.TempDir()
	legacyData := updateForMarkdown(t, "legacy default")
	if err := os.WriteFile(filepath.Join(dir, "default.yjs"), legacyData, 0o644); err != nil {
		t.Fatalf("write legacy data: %v", err)
	}

	store, err := NewFileStore(dir)
	if err != nil {
		t.Fatalf("new store: %v", err)
	}

	defaultDoc, err := store.LoadDoc("default")
	if err != nil {
		t.Fatalf("load default: %v", err)
	}
	if got := markdownFromUpdate(t, defaultDoc); got != "legacy default" {
		t.Fatalf("default text = %q, want legacy default", got)
	}

	unicodeDoc, err := store.LoadDoc("课堂甲")
	if err != nil {
		t.Fatalf("load unicode room: %v", err)
	}
	if got := markdownFromUpdate(t, unicodeDoc); got != "" {
		t.Fatalf("unicode room text = %q, want empty", got)
	}
}

func TestRoomNameFromDocFilenameDecodesNewKeys(t *testing.T) {
	filename := roomKey("课堂甲") + ".yjs"

	got, ok := RoomNameFromDocFilename(filename)
	if !ok {
		t.Fatal("filename was not recognized")
	}
	if got != "课堂甲" {
		t.Fatalf("room name = %q, want %q", got, "课堂甲")
	}
}
