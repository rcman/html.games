class ObjectPool {
    constructor(objectType, initialSize = 0, createFn, resetFn) {
        this.objectType = objectType;
        this.pool = [];
        this.activeObjects = new Map();
        this.createFn = createFn;
        this.resetFn = resetFn;
        
        // Pre-populate the pool
        this.expand(initialSize);
    }
    
    // Expand the pool by creating new objects
    expand(count) {
        for (let i = 0; i < count; i++) {
            const obj = this.createFn();
            obj._poolId = `${this.objectType}_${this.pool.length}`;
            this.pool.push(obj);
        }
    }
    
    // Get an object from the pool
    get() {
        // If pool is empty, expand it
        if (this.pool.length === 0) {
            this.expand(1);
        }
        
        // Get object from pool
        const obj = this.pool.pop();
        
        // Add to active objects
        this.activeObjects.set(obj._poolId, obj);
        
        return obj;
    }
    
    // Return object to the pool
    release(obj) {
        if (!obj || !obj._poolId) return;
        
        // Remove from active objects
        this.activeObjects.delete(obj._poolId);
        
        // Reset object state
        if (this.resetFn) {
            this.resetFn(obj);
        }
        
        // Return to pool
        this.pool.push(obj);
    }
    
    // Get all active objects
    getActiveObjects() {
        return Array.from(this.activeObjects.values());
    }
    
    // Clear all objects and reset pool
    clear() {
        // Release all active objects
        for (const obj of this.activeObjects.values()) {
            this.release(obj);
        }
        
        // Clear active objects map
        this.activeObjects.clear();
    }
}