package room

import "strings"

// Normalize validates and trims a room name for URLs and storage.
func Normalize(name string) string {
	name = strings.TrimSpace(name)
	if name == "" {
		return "default"
	}
	return name
}

// IsValid reports whether the room name is allowed by ygo (printable, length).
func IsValid(name string) bool {
	if len(name) == 0 || len(name) > 255 {
		return false
	}
	if name == "." || name == ".." {
		return false
	}
	for _, r := range name {
		if r < 0x20 {
			return false
		}
	}
	return true
}
