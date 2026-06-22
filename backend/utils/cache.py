"""Cache management utilities for SD Gallery."""


class ImageCache:
    """Image cache manager with time-based expiration."""

    def __init__(self):
        self._cache = {}
        self._cache_dirty = False

    def get(self, key='images'):
        """Get cached data."""
        return self._cache.get(key, [])

    def set(self, data, key='images', mtime=None):
        """Set cache data with optional filesystem mtime tracking."""
        self._cache[key] = data
        if mtime is not None:
            self._cache['_mtime'] = mtime
        self._cache_dirty = False

    def mark_dirty(self):
        """Mark cache as dirty (needs refresh after mutations)."""
        self._cache_dirty = True

    def is_dirty(self):
        """Check if cache has been marked dirty."""
        return self._cache_dirty

    def get_mtime(self):
        """Get cached filesystem modification time."""
        return self._cache.get('_mtime', 0)