export function backendOrigin() {
  const configured=process.env.BACKEND_URL?.trim() || (process.env.BACKEND_HOSTPORT?.trim() ? 'http://'+process.env.BACKEND_HOSTPORT.trim() : '')
  if(!configured)throw new Error('BACKEND_URL or BACKEND_HOSTPORT is required')
  const backend=new URL(configured)
  if(!['http:','https:'].includes(backend.protocol)||backend.username||backend.password||backend.pathname!=='/'||backend.search||backend.hash)throw new Error('Invalid backend origin')
  return backend.origin
}
