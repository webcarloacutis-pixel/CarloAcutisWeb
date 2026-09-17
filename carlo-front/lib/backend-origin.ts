export function backendOrigin() {
  const hostport=process.env.BACKEND_HOSTPORT?.trim()
  // A public Render Web Service uses HTTPS. Private hostports remain opt-in legacy configuration.
  const publicHostport=hostport && /^[a-z0-9-]+\.onrender\.com(?::443)?$/i.test(hostport)
  const configured=process.env.BACKEND_URL?.trim() || (hostport ? (publicHostport?'https://':'http://')+hostport : '')
  if(!configured)throw new Error('BACKEND_URL or BACKEND_HOSTPORT is required')
  const backend=new URL(configured)
  if(!['http:','https:'].includes(backend.protocol)||backend.username||backend.password||backend.pathname!=='/'||backend.search||backend.hash)throw new Error('Invalid backend origin')
  if(backend.hostname.endsWith('.onrender.com') && backend.protocol!=='https:')throw new Error('Public Render backend requires HTTPS')
  return backend.origin
}
