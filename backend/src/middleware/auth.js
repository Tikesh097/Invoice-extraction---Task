/**
 * Optional lightweight auth middleware
 * Extracts user-id from header for multi-tenant scoping.
 * Replace with full Supabase JWT auth for production.
 */
export function extractUser(req, res, next) {
  // Accept user ID from header (set by frontend after Supabase auth)
  const userId = req.headers['x-user-id'] || 
                 req.headers['authorization']?.replace('Bearer ', '') ||
                 'anonymous';
  
  req.userId = userId.substring(0, 64); // prevent injection
  next();
}
